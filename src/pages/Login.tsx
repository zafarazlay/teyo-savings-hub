import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Crown, Eye, EyeOff } from 'lucide-react';

const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email, password, name);
      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account created',
          description: 'Please check your email to verify your account, then sign in.',
        });
        setIsSignUp(false);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, hsl(225 30% 12%), hsl(225 30% 5%))' }}>
      
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ background: 'hsl(38 92% 50% / 0.06)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl" style={{ background: 'hsl(165 55% 38% / 0.06)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'hsl(38 92% 50% / 0.04)' }} />
      </div>

      {/* Developer Watermark */}
      <div className="fixed bottom-3 right-4 z-50 pointer-events-none select-none">
        <div className="flex items-center gap-1.5 opacity-40">
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-light">Crafted by</span>
          <span className="text-[11px] font-semibold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Zafar Ali Azlay
          </span>
          <span className="text-amber-400/50 text-[8px]">✦</span>
        </div>
      </div>

      <Card className="w-full max-w-md animate-fade-in relative z-10 border-border/30 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(145deg, hsl(225 25% 13% / 0.8), hsl(225 25% 8% / 0.9))', backdropFilter: 'blur(20px)' }}>
        {/* Gold top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        
        <CardHeader className="text-center space-y-4 relative pt-8">
          <div className="mx-auto relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl scale-125" style={{ background: 'hsl(38 92% 50% / 0.15)' }} />
            <img src={logoUrl} alt="TE&YO Logo" className="h-24 w-24 rounded-2xl object-contain relative z-10 shadow-lg" 
              style={{ boxShadow: '0 0 30px -5px hsl(38 92% 50% / 0.3), 0 8px 24px -8px hsl(0 0% 0% / 0.4)' }} />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold font-serif">
              <span className="gold-text">TE&YO Savings</span>
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
              <Crown className="h-3 w-3 text-amber-500/60" />
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>
            <CardDescription className="mt-2">
              {isSignUp ? 'Create your account' : 'Sign in to manage your savings'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@teyo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold tracking-wide text-sm transition-all duration-300 shadow-lg hover:shadow-xl" disabled={isLoading}
              style={{ background: 'linear-gradient(135deg, hsl(38 92% 45%), hsl(38 80% 55%))', color: 'hsl(225 30% 7%)' }}>
              {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            {isSignUp ? (
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <button type="button" className="text-amber-400 hover:text-amber-300 font-medium transition-colors" onClick={() => setIsSignUp(false)}>
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <button type="button" className="text-amber-400 hover:text-amber-300 font-medium transition-colors" onClick={() => setIsSignUp(true)}>
                  Sign Up
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
