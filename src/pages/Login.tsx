import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Landmark className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">TE&YO Savings</CardTitle>
            <CardDescription className="mt-1">
              {isSignUp ? 'Create a new account' : 'Sign in to manage your savings account'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@teyo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button type="button" className="text-primary underline" onClick={() => setIsSignUp(false)}>
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button type="button" className="text-primary underline" onClick={() => setIsSignUp(true)}>
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
