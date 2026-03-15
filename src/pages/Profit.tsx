import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp } from 'lucide-react';

const Profit = () => {
  const [distributions, setDistributions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ total_profit: '', year: new Date().getFullYear().toString() });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from('profit_distribution').select('*').order('year', { ascending: false });
    setDistributions(data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.total_profit) return;
    setIsSubmitting(true);

    const totalProfit = parseFloat(form.total_profit);
    const year = parseInt(form.year);

    // Get all active members and their total contributions
    const { data: members } = await supabase.from('profiles').select('id').eq('status', 'active');
    
    if (!members || members.length === 0) {
      toast({ title: 'No active members found', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    // Get total contributions per member for proportional distribution
    const { data: allTxns } = await supabase
      .from('transactions')
      .select('member_id, amount, type')
      .in('type', ['monthly', 'yearly', 'first_share']);

    const memberTotals: Record<string, number> = {};
    let grandTotal = 0;
    allTxns?.forEach((t) => {
      const amt = Number(t.amount);
      memberTotals[t.member_id] = (memberTotals[t.member_id] || 0) + amt;
      grandTotal += amt;
    });

    if (grandTotal === 0) {
      // Equal distribution if no contributions yet
      const share = totalProfit / members.length;
      for (const m of members) {
        await supabase.from('transactions').insert({
          member_id: m.id,
          type: 'profit',
          amount: Math.round(share * 100) / 100,
          date: new Date().toISOString().split('T')[0],
          notes: `Profit distribution for year ${year}`,
        });
      }
    } else {
      // Proportional distribution
      for (const m of members) {
        const contribution = memberTotals[m.id] || 0;
        const share = (contribution / grandTotal) * totalProfit;
        if (share > 0) {
          await supabase.from('transactions').insert({
            member_id: m.id,
            type: 'profit',
            amount: Math.round(share * 100) / 100,
            date: new Date().toISOString().split('T')[0],
            notes: `Profit distribution for year ${year} (proportional)`,
          });
        }
      }
    }

    // Record distribution
    await supabase.from('profit_distribution').insert({
      total_profit: totalProfit,
      year,
    });

    toast({ title: 'Profit distributed', description: `PKR ${totalProfit.toLocaleString()} distributed to ${members.length} members.` });
    setDialogOpen(false);
    setForm({ total_profit: '', year: new Date().getFullYear().toString() });
    fetchData();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Profit Distribution</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><TrendingUp className="mr-2 h-4 w-4" />Distribute Profit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Distribute Bank Profit</DialogTitle></DialogHeader>
            <form onSubmit={handleDistribute} className="space-y-4">
              <div className="space-y-2">
                <Label>Total Profit (PKR) *</Label>
                <Input type="number" min="0" value={form.total_profit} onChange={(e) => setForm({ ...form, total_profit: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              </div>
              <p className="text-xs text-muted-foreground">
                Profit will be distributed proportionally based on each member's total contributions.
              </p>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Distributing...' : 'Distribute Profit'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Distribution History</CardTitle></CardHeader>
        <CardContent>
          {distributions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No profit distributions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Year</th>
                    <th className="pb-3 font-medium">Distribution Date</th>
                    <th className="pb-3 font-medium text-right">Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d) => (
                    <tr key={d.id} className="data-table-row">
                      <td className="py-3 font-medium">{d.year}</td>
                      <td className="py-3 text-muted-foreground">{d.distributed_date}</td>
                      <td className="py-3 currency">PKR {Number(d.total_profit).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profit;
