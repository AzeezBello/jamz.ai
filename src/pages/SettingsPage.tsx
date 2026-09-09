import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { deleteAccount } from '@/lib/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, saveProfile, updatePassword, signOut } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [notify, setNotify] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setHandle(profile.handle ?? '');
    setBio(profile.bio ?? '');
    setNotify(profile.notify_on_complete);
    setMarketing(profile.marketing_opt_in);
  }, [profile]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await saveProfile({
        display_name: displayName.trim(),
        handle: handle.trim() || null,
        bio: bio.trim(),
        notify_on_complete: notify,
        marketing_opt_in: marketing,
      });
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      setPassword('');
      toast.success('Password updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();
    setDeleting(true);
    try {
      await deleteAccount(confirmEmail);
      await signOut();
      toast.success('Your account has been deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete your account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pt-8 pb-32 space-y-10">
      <h1 className="text-3xl font-bold">Settings</h1>

      <form onSubmit={handleProfileSubmit} className="space-y-5">
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/70">
            Email
          </Label>
          <Input
            id="email"
            value={user?.email ?? ''}
            readOnly
            aria-describedby="email-help"
            className="bg-white/5 border-white/10 text-white/50"
          />
          <p id="email-help" className="text-white/30 text-xs">
            Change your email from the billing portal or by contacting support.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name" className="text-white/70">
            Display name
          </Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="handle" className="text-white/70">
            Handle
          </Label>
          <Input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourname"
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-white/70">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="notify" className="text-white/70 font-normal">
            Notify me when a song finishes
          </Label>
          <Switch
            id="notify"
            checked={notify}
            onCheckedChange={setNotify}
            className="data-[state=checked]:bg-[#ff6b6b]"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="marketing" className="text-white/70 font-normal">
            Product news and offers
          </Label>
          <Switch
            id="marketing"
            checked={marketing}
            onCheckedChange={setMarketing}
            className="data-[state=checked]:bg-[#ff6b6b]"
          />
        </div>

        <Button
          type="submit"
          disabled={savingProfile}
          className="gradient-coral text-black font-semibold"
        >
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
        </Button>
      </form>

      <Separator className="bg-white/10" />

      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <h2 className="text-lg font-semibold">Password</h2>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/70">
            New password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={savingPassword || !password}
          className="border-white/20 text-white hover:bg-white/10"
        >
          {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
        </Button>
      </form>

      <Separator className="bg-white/10" />

      <form onSubmit={handleDelete} className="space-y-4">
        <h2 className="text-lg font-semibold text-[#ff6b6b]">Delete account</h2>
        <p className="text-white/50 text-sm">
          This cancels any subscription, deletes your songs and audio files, and cannot be undone.
          Type <span className="text-white">{user?.email}</span> to confirm.
        </p>
        <Input
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          aria-label="Type your email to confirm deletion"
          placeholder={user?.email ?? 'you@example.com'}
          className="bg-white/5 border-white/10 text-white max-w-sm"
        />
        <Button
          type="submit"
          disabled={deleting || confirmEmail.toLowerCase() !== (user?.email ?? '').toLowerCase()}
          className="bg-[#ff6b6b] text-black font-semibold hover:bg-[#ff8e8e]"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete my account'}
        </Button>
      </form>
    </div>
  );
}
