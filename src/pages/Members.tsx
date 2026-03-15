import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserPlus } from 'lucide-react';

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    setMembers(data ?? []);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    setIsSubmitting(true);

    // Create auth user first, then profile via admin
    // For simplicity, we create the user with a temp password
    const tempPassword = `TempPass_${Date.now()}`;
    
    // We'll use supabase auth admin via edge function in production
    // For now, sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newMember.email,
      password: tempPassword,
      options: { data: { name: newMember.name } },
    });

    if (authError) {
      toast({ title: 'Error', description: authError.message, variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    if (authData.user) {
      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        name: newMember.name,
        phone: newMember.phone || null,
        address: newMember.address || null,
        status: 'active',
      });

      if (profileError) {
        toast({ title: 'Error creating profile', description: profileError.message, variant: 'destructive' });
      } else {
        // Add member role
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'member',
        });

        toast({ title: 'Member added', description: `${newMember.name} has been added. Temp password: ${tempPassword}` });
        setNewMember({ name: '', email: '', phone: '', address: '' });
        setDialogOpen(false);
        fetchMembers();
      }
    }
    setIsSubmitting(false);
  };

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone && m.phone.includes(search))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Members</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={newMember.address} onChange={(e) => setNewMember({ ...newMember, address: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Join Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="data-table-row">
                      <td className="py-3 font-medium">{m.name}</td>
                      <td className="py-3 text-muted-foreground">{m.phone || '—'}</td>
                      <td className="py-3 text-muted-foreground">{m.join_date}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === 'active' ? 'bg-primary/10 text-primary'
                          : m.status === 'pending' ? 'bg-warning/10 text-warning'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                          {m.status}
                        </span>
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

export default Members;
