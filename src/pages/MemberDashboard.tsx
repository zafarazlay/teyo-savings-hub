import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';

const MemberDashboard = () => {
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [profitShare, setProfitShare] = useState(0);
  const [lateFees, setLateFees] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', profile.id)
        .order('date', { ascending: false });

      if (txns) {
        setTransactions(txns);
        let bal = 0;
        let fees = 0;
        let profit = 0;
        txns.forEach((t) => {
          const amt = Number(t.amount);
          if (t.type === 'withdrawal') bal -= amt;
          else if (t.type === 'late_fee') fees += amt;
          else if (t.type === 'profit') { profit += amt; bal += amt; }
          else bal += amt;
        });
        setBalance(bal);
        setLateFees(fees);
        setProfitShare(profit);
      }
    };

    fetchData();
  }, [profile]);

  const typeLabels: Record<string, string> = {
    monthly: 'Monthly',
    yearly: 'Yearly',
    first_share: 'First Share',
    withdrawal: 'Withdrawal',
    profit: 'Profit',
    late_fee: 'Late Fee',
  };

  const statCards = [
    { title: 'My Balance', value: `PKR ${balance.toLocaleString()}`, icon: Wallet, color: 'text-primary' },
    { title: 'Profit Earned', value: `PKR ${profitShare.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
    { title: 'Late Fees', value: `PKR ${lateFees.toLocaleString()}`, icon: AlertTriangle, color: 'text-warning' },
    { title: 'Total Deposits', value: transactions.filter(t => !['withdrawal', 'late_fee'].includes(t.type)).length.toString(), icon: Calendar, color: 'text-secondary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Welcome, {profile?.name ?? 'Member'}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No transactions yet.</p>
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
                  {transactions.slice(0, 20).map((tx) => (
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

export default MemberDashboard;
