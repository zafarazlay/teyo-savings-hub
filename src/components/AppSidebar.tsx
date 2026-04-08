import {
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  TrendingUp,
  Megaphone,
  LogOut,
  UserCircle,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';

const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Language } from '@/lib/translations';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const adminItems = [
  { titleKey: 'dashboard', url: '/', icon: LayoutDashboard },
  { titleKey: 'members', url: '/members', icon: Users },
  { titleKey: 'transactions', url: '/transactions', icon: Receipt },
  { titleKey: 'profit', url: '/profit', icon: TrendingUp },
  { titleKey: 'announcements', url: '/announcements', icon: Megaphone },
  { titleKey: 'importData', url: '/import', icon: FileSpreadsheet },
  { titleKey: 'settings', url: '/settings', icon: Settings },
];

const memberItems = [
  { titleKey: 'myDashboard', url: '/', icon: LayoutDashboard },
  { titleKey: 'myTransactions', url: '/my-transactions', icon: Receipt },
  { titleKey: 'announcements', url: '/announcements', icon: Megaphone },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const { t, language, setLanguage, languageNames } = useLanguage();
  const collapsed = state === 'collapsed';
  const items = role === 'admin' ? adminItems : memberItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <img src={logoUrl} alt="TE&YO" className="h-8 w-8 rounded-lg object-contain shrink-0 shadow-md" 
            style={{ boxShadow: '0 0 12px -3px hsl(38 92% 50% / 0.3)' }} />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm gold-text font-serif tracking-wide">{t('teyoSavings')}</span>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'hsl(38 70% 55%)' }}>
            {role === 'admin' ? t('management') : t('account')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent transition-all duration-200 rounded-lg"
                      activeClassName="bg-sidebar-accent text-amber-400 font-medium border-l-2 border-amber-500"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="text-sm">{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Language Selector */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'hsl(38 70% 55%)' }}>
            {t('language')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2">
              {collapsed ? (
                <Button variant="ghost" size="icon" className="w-full text-sidebar-muted hover:text-amber-400 transition-colors" title={t('language')}>
                  <Globe className="h-4 w-4" />
                </Button>
              ) : (
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger className="h-8 text-xs bg-sidebar-accent/50 border-sidebar-border hover:border-amber-500/30 transition-colors">
                    <Globe className="mr-1 h-3 w-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(languageNames).map(([code, name]) => (
                      <SelectItem key={code} value={code} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(38 92% 45%), hsl(38 80% 55%))', color: 'hsl(225 30% 7%)' }}>
              {(profile?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {profile?.name || 'User'}
              </p>
              <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'hsl(38 70% 55%)' }}>{role}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={signOut}
          className="w-full text-sidebar-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">{t('signOut')}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
