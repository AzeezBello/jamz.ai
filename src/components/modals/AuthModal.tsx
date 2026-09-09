import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Loader2, Lock, Mail, MailCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

type View = 'login' | 'signup' | 'forgot' | 'check-email';

const MIN_PASSWORD_LENGTH = 8;

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { signIn, signUp, requestPasswordReset } = useAuthStore();

  const [view, setView] = useState<View>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setPassword('');
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    onClose();
    // Give the dialog time to animate out before snapping back to the tab.
    setTimeout(() => {
      setView(defaultTab);
      reset();
    }, 200);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password, rememberMe);
      toast.success('Welcome back.');
      handleClose();
    } catch (err) {
      // Deliberately generic: distinguishing "no such account" from "wrong
      // password" tells an attacker which emails are registered.
      setError(
        err instanceof Error && /confirm/i.test(err.message)
          ? 'Confirm your email address first — check your inbox.'
          : 'That email and password combination is not correct.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, password, name.trim());
      if (needsConfirmation) {
        setView('check-email');
      } else {
        toast.success('Account created.');
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setView('check-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  const emailField = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/70">
        Email
      </Label>
      <div className="relative">
        <Mail
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          required
        />
      </div>
    </div>
  );

  const passwordField = (
    id: string,
    autoComplete: string,
    visible: boolean,
    onToggle: () => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/70">
        Password
      </Label>
      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
          aria-hidden="true"
        />
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white">
        {view === 'check-email' ? (
          <div className="text-center py-6">
            <MailCheck className="w-12 h-12 text-[#ff6b6b] mx-auto mb-4" aria-hidden="true" />
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Check your inbox</DialogTitle>
              <DialogDescription className="text-white/60 mt-2">
                We sent a link to <span className="text-white">{email}</span>. Open it to finish.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleClose} className="mt-6 gradient-coral text-black font-semibold">
              Got it
            </Button>
          </div>
        ) : view === 'forgot' ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Reset your password</DialogTitle>
              <DialogDescription className="text-white/60">
                We'll email you a link to choose a new one.
              </DialogDescription>
            </DialogHeader>

            {emailField('forgot-email')}
            {error && (
              <p className="text-[#ff6b6b] text-sm" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-coral text-black font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setView('login');
                reset();
              }}
              className="w-full text-white/50 hover:text-white text-sm"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Welcome to JAMZ</DialogTitle>
              <DialogDescription className="sr-only">
                Sign in or create an account.
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={view}
              onValueChange={(v) => {
                setView(v as View);
                reset();
              }}
            >
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  {emailField('login-email')}
                  {passwordField('login-password', 'current-password', showLoginPassword, () =>
                    setShowLoginPassword((visible) => !visible),
                  )}

                  <label className="flex items-center gap-2 text-white/50 text-sm cursor-pointer">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="border-white/30 data-[state=checked]:bg-[#ff6b6b] data-[state=checked]:border-[#ff6b6b] data-[state=checked]:text-black"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      reset();
                    }}
                    className="text-white/50 hover:text-white text-xs"
                  >
                    Forgot your password?
                  </button>

                  {error && (
                    <p className="text-[#ff6b6b] text-sm" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-coral text-black font-semibold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-white/70">
                      Name
                    </Label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                        aria-hidden="true"
                      />
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        required
                      />
                    </div>
                  </div>

                  {emailField('signup-email')}
                  {passwordField('signup-password', 'new-password', showSignupPassword, () =>
                    setShowSignupPassword((visible) => !visible),
                  )}

                  <p className="text-white/30 text-xs">
                    At least {MIN_PASSWORD_LENGTH} characters. By signing up you agree to our{' '}
                    {/* Consent has to be reachable at the point it is given. */}
                    <Link to="/legal/terms" className="underline hover:text-white">
                      terms
                    </Link>{' '}
                    and{' '}
                    <Link to="/legal/ai-disclosure" className="underline hover:text-white">
                      AI disclosure
                    </Link>
                    .
                  </p>

                  {error && (
                    <p className="text-[#ff6b6b] text-sm" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-coral text-black font-semibold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
