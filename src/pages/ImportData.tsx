import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, Receipt } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const ImportData = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [membersPreview, setMembersPreview] = useState<any[]>([]);
  const [ledgerPreview, setLedgerPreview] = useState<any[]>([]);
  const [membersHeaders, setMembersHeaders] = useState<string[]>([]);
  const [ledgerHeaders, setLedgerHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'idle' | 'preview' | 'importing-members' | 'importing-ledger' | 'done'>('idle');
  const [membersResult, setMembersResult] = useState<ImportResult | null>(null);
  const [ledgerResult, setLedgerResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    const str = String(val).trim();
    // Handle "1-Jan-25" format
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      let year = d.getFullYear();
      if (year < 100) year += 2000;
      return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const normalizeType = (val: string): string => {
    const lower = (val || '').toLowerCase().trim();
    const map: Record<string, string> = {
      'monthly': 'monthly',
      'yearly': 'yearly',
      'first time': 'first_share',
      'first_time': 'first_share',
      'first share': 'first_share',
      'first_share': 'first_share',
      'withdrawal': 'withdrawal',
      'profit': 'profit',
      'late fee': 'late_fee',
      'late_fee': 'late_fee',
      'entry fee': 'first_share',
    };
    return map[lower] || 'monthly';
  };

  const normalizeStatus = (val: string): string => {
    const lower = (val || '').toLowerCase().trim();
    if (lower === 'active') return 'active';
    if (lower === 'inactive') return 'inactive';
    return 'active';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setMembersResult(null);
    setLedgerResult(null);
    setStep('idle');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      workbookRef.current = workbook;
      setSheetNames(workbook.SheetNames);

      const membersSheetName = workbook.SheetNames.find(
        (s) => s.toLowerCase().includes('member')
      );
      const ledgerSheetName = workbook.SheetNames.find(
        (s) => s.toLowerCase().includes('ledger')
      );

      if (membersSheetName) {
        const sheet = workbook.Sheets[membersSheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
        setMembersHeaders(json.length > 0 ? Object.keys(json[0]) : []);
        setMembersPreview(json.slice(0, 5));
      }

      if (ledgerSheetName) {
        const sheet = workbook.Sheets[ledgerSheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
        setLedgerHeaders(json.length > 0 ? Object.keys(json[0]) : []);
        setLedgerPreview(json.slice(0, 5));
      }

      if (!membersSheetName && !ledgerSheetName) {
        toast({
          title: 'Sheets not found',
          description: `Found sheets: ${workbook.SheetNames.join(', ')}. Need a sheet with "member" or "ledger" in the name.`,
          variant: 'destructive',
        });
        return;
      }

      setStep('preview');
    };
    reader.readAsArrayBuffer(selected);
  };

  const importMembers = async (): Promise<Map<string, string>> => {
    const workbook = workbookRef.current;
    if (!workbook) return new Map();

    const membersSheetName = workbook.SheetNames.find(
      (s) => s.toLowerCase().includes('member')
    );
    if (!membersSheetName) return new Map();

    const sheet = workbook.Sheets[membersSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

    // Check existing members
    const { data: existingMembers } = await supabase.from('profiles').select('id, name');
    const existingMap = new Map<string, string>();
    (existingMembers ?? []).forEach((m) => {
      existingMap.set(m.name.toLowerCase().trim(), m.id);
    });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const memberMap = new Map<string, string>(existingMap);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = (row['Member Name'] || row['member_name'] || row.Name || row.name || '').toString().trim();
      if (!name) {
        errors.push(`Row ${rowNum}: No member name`);
        failed++;
        continue;
      }

      // Skip if already exists
      if (existingMap.has(name.toLowerCase().trim())) {
        memberMap.set(name.toLowerCase().trim(), existingMap.get(name.toLowerCase().trim())!);
        success++;
        continue;
      }

      const memberId = (row.MemberID || row.memberid || row['Member ID'] || (i + 1)).toString();
      const phone = (row.Phone || row.phone || '').toString().trim();
      const joinDate = parseExcelDate(row.JoinDate || row.joindate || row['Join Date']);
      const status = normalizeStatus(row.Status || row.status);

      // Create placeholder email from member name
      const emailName = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '');
      const email = `${emailName}.m${memberId}@teyo.member`;
      const tempPassword = `TeyoMember_${memberId}_${Date.now()}`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: { data: { name } },
      });

      if (authError) {
        errors.push(`Row ${rowNum} "${name}": ${authError.message}`);
        failed++;
        continue;
      }

      if (!authData.user) {
        errors.push(`Row ${rowNum} "${name}": User creation failed`);
        failed++;
        continue;
      }

      const { data: profileData, error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        name,
        phone: phone || null,
        join_date: joinDate,
        status: status as any,
      }).select('id').single();

      if (profileError) {
        errors.push(`Row ${rowNum} "${name}": ${profileError.message}`);
        failed++;
        continue;
      }

      // Assign member role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'member',
      });

      memberMap.set(name.toLowerCase().trim(), profileData.id);
      success++;
    }

    setMembersResult({ success, failed, errors });
    return memberMap;
  };

  const importLedger = async (memberMap: Map<string, string>) => {
    const workbook = workbookRef.current;
    if (!workbook) return;

    const ledgerSheetName = workbook.SheetNames.find(
      (s) => s.toLowerCase().includes('ledger')
    );
    if (!ledgerSheetName) return;

    const sheet = workbook.Sheets[ledgerSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const batch: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = (row['Member Name'] || row['member_name'] || row.Name || row.name || '').toString().trim();
      if (!name) {
        errors.push(`Row ${rowNum}: No member name`);
        failed++;
        continue;
      }

      const memberId = memberMap.get(name.toLowerCase().trim());
      if (!memberId) {
        errors.push(`Row ${rowNum}: Member "${name}" not found`);
        failed++;
        continue;
      }

      const type = normalizeType(row.Type || row.type || '');
      const amount = parseFloat(row.Amount || row.amount || 0);
      const date = parseExcelDate(row.Date || row.date);
      const notes = (row.Notes || row.notes || row.Remarks || '').toString();

      if (!amount || amount <= 0) {
        errors.push(`Row ${rowNum}: Invalid amount for "${name}"`);
        failed++;
        continue;
      }

      batch.push({
        member_id: memberId,
        type,
        amount,
        date,
        notes: notes || null,
        recorded_by: user?.id,
      });

      // Insert in batches of 50
      if (batch.length >= 50) {
        const { error } = await supabase.from('transactions').insert([...batch]);
        if (error) {
          errors.push(`Batch error at row ${rowNum}: ${error.message}`);
          failed += batch.length;
        } else {
          success += batch.length;
        }
        batch.length = 0;
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase.from('transactions').insert([...batch]);
      if (error) {
        errors.push(`Final batch error: ${error.message}`);
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    setLedgerResult({ success, failed, errors });
  };

  const handleImport = async () => {
    setImporting(true);
    setMembersResult(null);
    setLedgerResult(null);

    try {
      // Step 1: Import members
      setStep('importing-members');
      const memberMap = await importMembers();

      // Step 2: Import ledger transactions
      setStep('importing-ledger');
      await importLedger(memberMap);

      setStep('done');
      toast({ title: 'Import complete!' });
    } catch (err: any) {
      toast({ title: 'Import error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const ResultDisplay = ({ title, result }: { title: string; result: ImportResult | null }) => {
    if (!result) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-4">
          {result.success > 0 && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              {result.success} successful
            </span>
          )}
          {result.failed > 0 && (
            <span className="flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {result.failed} failed
            </span>
          )}
        </div>
        {result.errors.length > 0 && (
          <div className="bg-destructive/10 rounded p-3 max-h-40 overflow-y-auto">
            {result.errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive">{err}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PreviewTable = ({ title, icon: Icon, headers, rows }: { title: string; icon: any; headers: string[]; rows: any[] }) => {
    if (rows.length === 0) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4" />
          {title} (first {rows.length} rows)
        </h3>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 whitespace-nowrap">{String(row[h] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
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
            Apni Excel file upload karein jis mein 2 sheets hon:<br />
            <strong>1. "members details"</strong> — MemberID, Member Name, Father Name, Phone, JoinDate, Status<br />
            <strong>2. "Ledger"</strong> — Date, Type, MemberID, Member Name, Amount, Notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : 'Choose Excel File'}
            </Button>
            {step === 'preview' && (
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import All Data
              </Button>
            )}
          </div>

          {sheetNames.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Sheets found: {sheetNames.map((s) => `"${s}"`).join(', ')}
            </p>
          )}

          {step !== 'idle' && (
            <div className="space-y-4">
              <PreviewTable title="Members" icon={Users} headers={membersHeaders} rows={membersPreview} />
              <PreviewTable title="Ledger" icon={Receipt} headers={ledgerHeaders} rows={ledgerPreview} />
            </div>
          )}

          {step === 'importing-members' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Step 1/2: Members import ho rahe hain...
            </div>
          )}
          {step === 'importing-ledger' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Step 2/2: Ledger transactions import ho rahi hain...
            </div>
          )}

          <ResultDisplay title="Members Import Result" result={membersResult} />
          <ResultDisplay title="Ledger Import Result" result={ledgerResult} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportData;
