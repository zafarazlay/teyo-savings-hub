import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, AlertTriangle, Users } from 'lucide-react';

interface StatsData {
  totalFund: number;
  totalMembers: number;
  monthlyAmount: number;
  totalLateFees: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<StatsData>({ totalFund: 0, totalMembers: 0, monthlyAmount: 0, totalLateFees: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const { role } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch total fund (sum of all deposits minus withdrawals)
      const { data: txns } = await supabase.from('transactions').select('type, amount');
      
      let totalFund = 0;
      let totalLateFees = 0;
      if (txns) {
        txns.forEach((t) => {
          if (t.type === 'withdrawal') {
            totalFund -= Number(t.amount);
          } else if (t.type === 'late_fee') {
            totalLateFees += Number(t.amount);
            totalFund += Number(t.amount);
          } else {
            totalFund += Number(t.amount);
          }
        });
      }

      // Fetch member count
      const { count: memberCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch current year settings
      const currentYear = new Date().getFullYear();
      const { data: settings } = await supabase
        .from('settings')
        .select('monthly_amount')
        .eq('year', currentYear)
        .maybeSingle();

      setStats({
        totalFund,
        totalMembers: memberCount ?? 0,
        monthlyAmount: settings?.monthly_amount ?? 0,
        totalLateFees,
      });

      // Fetch recent transactions
      const { data: recent } = await supabase
        .from('transactions')
        .select('*, profiles(name)')
        .order('date', { ascending: false })
        .limit(10);

      setRecentTransactions(recent ?? []);
    };

    if (role === 'admin') {
      fetchStats();
    }
  }, [role]);

  const statCards = [
    {
      title: 'Total Fund',
      value: `PKR ${stats.totalFund.toLocaleString()}`,
      icon: Wallet,
      color: 'text-primary',
    },
    {
      title: 'Active Members',
      value: stats.totalMembers.toString(),
      icon: Users,
      color: 'text-secondary',
    },
    {
      title: 'Monthly Rate',
      value: `PKR ${stats.monthlyAmount.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'Late Fees Collected',
      value: `PKR ${stats.totalLateFees.toLocaleString()}`,
      icon: AlertTriangle,
      color: 'text-warning',
    },
  ];

  const typeLabels: Record<string, string> = {
    monthly: 'Monthly',
    yearly: 'Yearly',
    first_share: 'First Share',
    withdrawal: 'Withdrawal',
    profit: 'Profit',
    late_fee: 'Late Fee',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Member</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="data-table-row">
                      <td className="py-3">{(tx.profiles as any)?.name ?? '—'}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.type === 'late_fee'
                              ? 'bg-warning/10 text-warning'
                              : tx.type === 'withdrawal'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {typeLabels[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{tx.date}</td>
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

export default AdminDashboard;
