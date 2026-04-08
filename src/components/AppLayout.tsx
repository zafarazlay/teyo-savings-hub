import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/40 px-4 shrink-0"
            style={{ background: 'linear-gradient(90deg, hsl(225 25% 9%), hsl(225 25% 11%))' }}>
            <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto relative">
            {children}
          </main>
          {/* Developer Watermark */}
          <div className="fixed bottom-3 right-4 z-50 pointer-events-none select-none">
            <div className="flex items-center gap-1.5 opacity-40 hover:opacity-70 transition-opacity">
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-light">Crafted by</span>
              <span className="text-[11px] font-semibold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                Zafar Ali Azlay
              </span>
              <span className="text-amber-400/50 text-[8px]">✦</span>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
