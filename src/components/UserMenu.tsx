import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditCard, Library, LogOut, Settings, Sparkles } from 'lucide-react';
import AuthModal from './modals/AuthModal';
import { useAuthStore } from '@/store/authStore';

export default function UserMenu() {
  const navigate = useNavigate();
  const { session, profile, user, signOut } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  const openAuth = (tab: 'login' | 'signup') => {
    setAuthTab(tab);
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out.');
    navigate('/', { replace: true });
  };

  if (!session) {
    return (
      <>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => openAuth('login')}
            className="text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium"
          >
            Sign In
          </Button>
          <Button
            onClick={() => openAuth('signup')}
            className="gradient-coral text-black font-semibold px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Button>
        </div>
        {/*
          Keyed on the tab so switching between Sign In and Sign Up remounts
          the dialog. AuthModal seeds its tab with useState(defaultTab), which
          ignores later prop changes — without this, clicking "Sign Up" opened
          the modal on the sign-in form.
        */}
        <AuthModal
          key={authTab}
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultTab={authTab}
        />
      </>
    );
  }

  const name = profile?.display_name || user?.email?.split('@')[0] || 'You';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
          <span
            className="w-8 h-8 rounded-full gradient-coral flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-black font-semibold text-sm">{name.charAt(0).toUpperCase()}</span>
          </span>
          <span className="hidden sm:inline text-sm">{name}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0a] border-white/10 text-white">
        <DropdownMenuLabel className="text-white/50">
          <span className="flex flex-col">
            <span className="text-white">{name}</span>
            <span className="text-xs">{user?.email}</span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/dashboard">
            <Library className="w-4 h-4 mr-2" aria-hidden="true" /> My Library
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/billing">
            <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
            Credits
            <span className="ml-auto text-xs text-[#ff6b6b]">{profile?.credit_balance ?? 0}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/billing">
            <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
            Subscription
            <span className="ml-auto text-xs text-[#ff6b6b] capitalize">
              {profile?.plan_id ?? 'free'}
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/settings">
            <Settings className="w-4 h-4 mr-2" aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-[#ff6b6b] focus:text-[#ff6b6b]"
        >
          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
