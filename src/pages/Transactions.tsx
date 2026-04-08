import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Filter } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

const Transactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({
    member_id: '',
    type: 'monthly' as TransactionType,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const [{ data: txns }, { data: mems }] = await Promise.all([
      supabase.from('transactions').select('*, profiles(name)').order('date', { ascending: false }),
      supabase.from('profiles').select('id, name').order('name'),
    ]);
    setTransactions(txns ?? []);
    setMembers(mems ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.member_id || !form.amount) return;
    setIsSubmitting(true);

    let lateFeeNeeded = false;
    if (form.type === 'monthly') {
      const day = new Date(form.date).getDate();
      if (day > 15) lateFeeNeeded = true;
    }

    const { error } = await supabase.from('transactions').insert({
      member_id: form.member_id,
      type: form.type,
      amount: parseFloat(form.amount),
      date: form.date,
      notes: form.notes || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      if (lateFeeNeeded) {
        const { data: settings } = await supabase
          .from('settings')
          .select('late_fee')
          .eq('year', new Date(form.date).getFullYear())
          .maybeSingle();
        
        const lateFee = settings?.late_fee ?? 150;
        await supabase.from('transactions').insert({
          member_id: form.member_id,
          type: 'late_fee',
          amount: lateFee,
          date: form.date,
          notes: `Auto-applied late fee for late ${form.date} payment`,
        });
        toast({ title: 'Transaction recorded', description: `Late fee of PKR ${lateFee} was also applied.` });
      } else {
        toast({ title: 'Transaction recorded successfully' });
      }
      setForm({ member_id: '', type: 'monthly', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setDialogOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Transaction deleted' });
      fetchData();
    }
    setDeleteTarget(null);
  };

  const typeLabels: Record<string, string> = {
    monthly: 'Monthly', yearly: 'Yearly', first_share: 'First Share',
    withdrawal: 'Withdrawal', profit: 'Profit', late_fee: 'Late Fee',
  };

  const filtered = transactions.filter((tx) => {
    if (filterMember !== 'all' && tx.member_id !== filterMember) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Transactions</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Record Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Member *</Label>
                <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TransactionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Savings</SelectItem>
                    <SelectItem value="yearly">Yearly Savings</SelectItem>
                    <SelectItem value="first_share">First Share (5000 PKR)</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="profit">Profit Distribution</SelectItem>
                    <SelectItem value="late_fee">Late Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (PKR) *</Label>
                <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record Transaction'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={filterMember} onValueChange={setFilterMember}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Members" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="first_share">First Share</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="profit">Profit</SelectItem>
            <SelectItem value="late_fee">Late Fee</SelectItem>
          </SelectContent>
        </Select>
        {(filterMember !== 'all' || filterType !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterMember('all'); setFilterType('all'); }}>
            Clear filters
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Kya aap yeh transaction delete karna chahte hain?<br />
                  <strong>{(deleteTarget.profiles as any)?.name}</strong> — {typeLabels[deleteTarget.type]} — PKR {Number(deleteTarget.amount).toLocaleString()} ({deleteTarget.date})<br /><br />
                  Yeh action undo nahi ho sakta. Dashboard totals bhi update ho jayenge.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Member</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Notes</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="data-table-row">
                      <td className="py-3 font-medium">{(tx.profiles as any)?.name ?? '—'}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          tx.type === 'late_fee' ? 'bg-warning/10 text-warning'
                          : tx.type === 'withdrawal' ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                        }`}>
                          {typeLabels[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{tx.date}</td>
                      <td className="py-3 text-muted-foreground max-w-[200px] truncate">{tx.notes || '—'}</td>
                      <td className="py-3 currency">PKR {Number(tx.amount).toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(tx)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
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

export default Transactions;
