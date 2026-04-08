import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PreviewRow {
  name: string;
  type: string;
  amount: number;
  date: string;
  notes: string;
  [key: string]: any;
}

const ImportData = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

      if (json.length === 0) {
        toast({ title: 'Empty file', description: 'No data found in the Excel file.', variant: 'destructive' });
        return;
      }

      setHeaders(Object.keys(json[0]));
      setPreview(json.slice(0, 10));
    };
    reader.readAsArrayBuffer(selected);
  };

  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
      // Excel serial date
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    // Try to parse string date
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  };

  const normalizeType = (val: string): string => {
    const lower = (val || '').toLowerCase().trim();
    const map: Record<string, string> = {
      'monthly': 'monthly',
      'yearly': 'yearly',
      'first share': 'first_share',
      'first_share': 'first_share',
      'withdrawal': 'withdrawal',
      'profit': 'profit',
      'late fee': 'late_fee',
      'late_fee': 'late_fee',
    };
    return map[lower] || 'monthly';
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

      // Fetch existing members
      const { data: existingMembers } = await supabase
        .from('profiles')
        .select('id, name');

      const memberMap = new Map<string, string>();
      (existingMembers ?? []).forEach((m) => {
        memberMap.set(m.name.toLowerCase().trim(), m.id);
      });

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)

        // Find member name - try common column names
        const name = (row.name || row.Name || row.member || row.Member || row['Member Name'] || row['member_name'] || '').toString().trim();
        if (!name) {
          errors.push(`Row ${rowNum}: No member name found`);
          failed++;
          continue;
        }

        const memberId = memberMap.get(name.toLowerCase());
        if (!memberId) {
          errors.push(`Row ${rowNum}: Member "${name}" not found in database`);
          failed++;
          continue;
        }

        const type = normalizeType(row.type || row.Type || row['Transaction Type'] || 'monthly');
        const amount = parseFloat(row.amount || row.Amount || row.amount_paid || 0);
        const date = parseExcelDate(row.date || row.Date || row['Payment Date']);
        const notes = (row.notes || row.Notes || row.remarks || row.Remarks || '').toString();

        if (!amount || amount <= 0) {
          errors.push(`Row ${rowNum}: Invalid amount for "${name}"`);
          failed++;
          continue;
        }

        const { error } = await supabase.from('transactions').insert({
          member_id: memberId,
          type,
          amount,
          date,
          notes: notes || `Imported from Excel`,
          recorded_by: user?.id,
        });

        if (error) {
          errors.push(`Row ${rowNum}: ${error.message}`);
          failed++;
        } else {
          success++;
        }
      }

      setResult({ success, failed, errors });
      setImporting(false);

      if (success > 0) {
        toast({ title: 'Import complete', description: `${success} transactions imported successfully.` });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Import Data from Excel</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Excel file mein yeh columns hone chahiye: <strong>Name</strong> (member ka naam jo database mein hai), <strong>Type</strong> (monthly/yearly/first_share/withdrawal/profit/late_fee), <strong>Amount</strong>, <strong>Date</strong>, <strong>Notes</strong> (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : 'Choose File'}
            </Button>
            {file && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="gap-2"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? 'Importing...' : 'Import Transactions'}
              </Button>
            )}
          </div>

          {/* Preview Table */}
          {preview.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Preview (first 10 rows):</h3>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length === 10 && (
                <p className="text-xs text-muted-foreground mt-1">Showing first 10 rows only...</p>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-4">
                {result.success > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {result.success} imported
                  </span>
                )}
                {result.failed > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {result.failed} failed
                  </span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="bg-destructive/10 rounded p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive mb-1">Errors:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excel Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">Ahmed Ali</td>
                  <td className="px-3 py-2">monthly</td>
                  <td className="px-3 py-2">1000</td>
                  <td className="px-3 py-2">2025-04-15</td>
                  <td className="px-3 py-2">April payment</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Sara Khan</td>
                  <td className="px-3 py-2">first_share</td>
                  <td className="px-3 py-2">5000</td>
                  <td className="px-3 py-2">2025-01-10</td>
                  <td className="px-3 py-2">Initial share</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Member names must exactly match the names in the Members list. Type values: monthly, yearly, first_share, withdrawal, profit, late_fee
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportData;
