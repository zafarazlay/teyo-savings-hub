import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';

const MyTransactions = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', profile.id)
        .order('date', { ascending: false });
      setTransactions(data ?? []);
    };
    fetch();
  }, [profile]);

  const typeLabels: Record<string, string> = {
    monthly: 'Monthly', yearly: 'Yearly', first_share: 'First Share',
    withdrawal: 'Withdrawal', profit: 'Profit', late_fee: 'Late Fee',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-amber-400" />
        <h1 className="page-header">My Transactions</h1>
      </div>
      <Card className="vip-card overflow-hidden">
        <CardContent className="pt-6">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Notes</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="data-table-row">
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
                      <td className="py-3 text-muted-foreground">{tx.notes || '—'}</td>
                      <td className="py-3 currency">
                        {tx.type === 'withdrawal' ? '-' : '+'}PKR {Number(tx.amount).toLocaleString()}
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

export default MyTransactions;
