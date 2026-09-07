import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link puts a session in place; without one there is nothing
  // to update and the user needs a fresh email.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) setError('This reset link has expired. Request a new one.');
    });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      toast.success('Password updated.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 pt-24">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Choose a new password</h1>

        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-white/70">
            New password
          </Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-white/70">
            Confirm password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            required
          />
        </div>

        {error && (
          <p className="text-[#ff6b6b] text-sm" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={saving || !ready}
          className="w-full gradient-coral text-black font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
