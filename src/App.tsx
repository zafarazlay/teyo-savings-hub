import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import MemberDashboard from "@/pages/MemberDashboard";
import Members from "@/pages/Members";
import Transactions from "@/pages/Transactions";
import Profit from "@/pages/Profit";
import SettingsPage from "@/pages/Settings";
import Announcements from "@/pages/Announcements";
import MyTransactions from "@/pages/MyTransactions";
import NotFound from "@/pages/NotFound";
import ImportData from "@/pages/ImportData";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at top, hsl(225 30% 12%), hsl(225 30% 5%))' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />;
  
  return <AppLayout>{children}</AppLayout>;
};

const DashboardRouter = () => {
  const { role } = useAuth();
  return role === 'admin' ? <AdminDashboard /> : <MemberDashboard />;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at top, hsl(225 30% 12%), hsl(225 30% 5%))' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute adminOnly><Members /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute adminOnly><Transactions /></ProtectedRoute>} />
      <Route path="/profit" element={<ProtectedRoute adminOnly><Profit /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute adminOnly><ImportData /></ProtectedRoute>} />
      <Route path="/my-transactions" element={<ProtectedRoute><MyTransactions /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/teyo-savings-hub">
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
