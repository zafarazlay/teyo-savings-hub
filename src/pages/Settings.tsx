import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Crown } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [form, setForm] = useState({ year: new Date().getFullYear(), monthly_amount: 1000, yearly_amount: 8000, late_fee: 150 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').order('year', { ascending: false });
    setSettings(data ?? []);
    if (data && data.length > 0) {
      const current = data[0];
      setForm({
        year: current.year,
        monthly_amount: current.monthly_amount,
        yearly_amount: current.yearly_amount,
        late_fee: current.late_fee,
      });
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from('settings').upsert({
      year: form.year,
      monthly_amount: form.monthly_amount,
      yearly_amount: form.yearly_amount,
      late_fee: form.late_fee,
    }, { onConflict: 'year' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully' });
      fetchSettings();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-amber-400" />
        <h1 className="page-header">Settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="vip-card overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-serif">Savings Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Monthly Savings Amount (PKR)</Label>
                <Input type="number" min="0" value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Yearly Savings Amount (PKR)</Label>
                <Input type="number" min="0" value={form.yearly_amount} onChange={(e) => setForm({ ...form, yearly_amount: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Late Fee (PKR)</Label>
                <Input type="number" min="0" value={form.late_fee} onChange={(e) => setForm({ ...form, late_fee: parseFloat(e.target.value) })} />
              </div>
              <Button type="submit" disabled={isSubmitting} className="gap-2 font-semibold shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(38 92% 45%), hsl(38 80% 55%))', color: 'hsl(225 30% 7%)' }}>
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="vip-card overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-serif">Historical Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {settings.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No settings configured.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Year</th>
                      <th className="pb-3 font-medium text-right">Monthly</th>
                      <th className="pb-3 font-medium text-right">Yearly</th>
                      <th className="pb-3 font-medium text-right">Late Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map((s) => (
                      <tr key={s.id} className="data-table-row cursor-pointer" onClick={() => setForm({ year: s.year, monthly_amount: s.monthly_amount, yearly_amount: s.yearly_amount, late_fee: s.late_fee })}>
                        <td className="py-3 font-medium">{s.year}</td>
                        <td className="py-3 currency">PKR {Number(s.monthly_amount).toLocaleString()}</td>
                        <td className="py-3 currency">PKR {Number(s.yearly_amount).toLocaleString()}</td>
                        <td className="py-3 currency">PKR {Number(s.late_fee).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
