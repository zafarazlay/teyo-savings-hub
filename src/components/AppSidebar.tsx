import {
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  TrendingUp,
  Megaphone,
  LogOut,
  Landmark,
  UserCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const adminItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Members', url: '/members', icon: Users },
  { title: 'Transactions', url: '/transactions', icon: Receipt },
  { title: 'Profit', url: '/profit', icon: TrendingUp },
  { title: 'Announcements', url: '/announcements', icon: Megaphone },
  { title: 'Import Data', url: '/import', icon: FileSpreadsheet },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const memberItems = [
  { title: 'My Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'My Transactions', url: '/my-transactions', icon: Receipt },
  { title: 'Announcements', url: '/announcements', icon: Megaphone },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const items = role === 'admin' ? adminItems : memberItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <Landmark className="h-6 w-6 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-sidebar-foreground text-sm">TE&YO Savings</span>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            {role === 'admin' ? 'Management' : 'Account'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <UserCircle className="h-5 w-5 text-sidebar-muted shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.name || 'User'}
              </p>
              <p className="text-xs text-sidebar-muted capitalize">{role}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={signOut}
          className="w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
