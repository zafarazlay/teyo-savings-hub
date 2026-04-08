import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Wallet, TrendingUp, AlertTriangle, Users, Search, Crown } from 'lucide-react';

interface StatsData {
  totalFund: number;
  totalMembers: number;
  monthlyAmount: number;
  totalLateFees: number;
}

interface MemberSavings {
  name: string;
  total: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<StatsData>({ totalFund: 0, totalMembers: 0, monthlyAmount: 0, totalLateFees: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [memberSavings, setMemberSavings] = useState<MemberSavings[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
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

      // Calculate individual member savings
      const { data: allTxns } = await supabase
        .from('transactions')
        .select('member_id, type, amount, profiles(name)');

      const savingsMap = new Map<string, { name: string; total: number }>();
      (allTxns ?? []).forEach((t) => {
        const memberId = t.member_id;
        const name = (t.profiles as any)?.name ?? 'Unknown';
        if (!savingsMap.has(memberId)) {
          savingsMap.set(memberId, { name, total: 0 });
        }
        const entry = savingsMap.get(memberId)!;
        if (t.type === 'withdrawal') {
          entry.total -= Number(t.amount);
        } else {
          entry.total += Number(t.amount);
        }
      });

      const savingsArr = Array.from(savingsMap.values()).sort((a, b) => b.total - a.total);
      setMemberSavings(savingsArr);
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
      gradient: 'from-amber-500/20 to-yellow-500/5',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Active Members',
      value: stats.totalMembers.toString(),
      icon: Users,
      gradient: 'from-emerald-500/20 to-teal-500/5',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Monthly Rate',
      value: `PKR ${stats.monthlyAmount.toLocaleString()}`,
      icon: TrendingUp,
      gradient: 'from-blue-500/20 to-cyan-500/5',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Late Fees Collected',
      value: `PKR ${stats.totalLateFees.toLocaleString()}`,
      icon: AlertTriangle,
      gradient: 'from-orange-500/20 to-red-500/5',
      iconColor: 'text-orange-400',
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
      <div className="flex items-center gap-3">
        <Crown className="h-7 w-7 text-amber-400" />
        <h1 className="page-header">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.title} className="stat-card relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="relative">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Member Individual Savings */}
      <Card className="vip-card overflow-hidden">
        <CardHeader className="border-b border-border/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-serif">Member Savings</CardTitle>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member..."
                className="pl-9 h-8 text-sm bg-background/50 border-border/50"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {memberSavings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">Member</th>
                    <th className="pb-3 font-medium text-right">Total Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSavings
                    .filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map((m, i) => (
                    <tr key={i} className="data-table-row">
                      <td className="py-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 font-medium">{m.name}</td>
                      <td className="py-3 text-right currency">PKR {m.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="vip-card overflow-hidden">
        <CardHeader className="border-b border-border/30">
          <CardTitle className="text-lg font-serif">Recent Transactions</CardTitle>
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
