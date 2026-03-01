import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Library, CreditCard, LogOut, Sparkles } from 'lucide-react';
import AuthModal from './modals/AuthModal';

interface UserMenuProps {
  onOpenDashboard: () => void;
}

export default function UserMenu({ onOpenDashboard }: UserMenuProps) {
  const { user, isAuthenticated, logout } = useStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  
  const handleLoginClick = () => {
    setAuthTab('login');
    setShowAuthModal(true);
  };
  
  const handleSignupClick = () => {
    setAuthTab('signup');
    setShowAuthModal(true);
  };
  
  const handleLogout = () => {
    logout();
  };
  
  if (!isAuthenticated || !user) {
    return (
      <>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleLoginClick}
            className="text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium"
          >
            Sign In
          </Button>
          <Button
            onClick={handleSignupClick}
            className="gradient-coral text-black font-semibold px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Button>
        </div>
        
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          defaultTab={authTab}
        />
      </>
    );
  }
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-white hover:bg-white/10"
          >
            <div className="w-8 h-8 rounded-full gradient-coral flex items-center justify-center">
              <span className="text-black font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:inline text-sm">{user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-[#0a0a0a] border-white/10 text-white"
        >
          <DropdownMenuLabel className="text-white/50">
            <div className="flex flex-col">
              <span className="text-white">{user.name}</span>
              <span className="text-xs">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-white/10" />
          
          <DropdownMenuItem 
            onClick={onOpenDashboard}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Library className="w-4 h-4 mr-2" />
            My Library
          </DropdownMenuItem>
          
          <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
            <Sparkles className="w-4 h-4 mr-2" />
            <span>Credits: {user.credits}</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
            <CreditCard className="w-4 h-4 mr-2" />
            Subscription
            <span className="ml-auto text-xs text-[#ff6b6b] capitalize">{user.plan}</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-white/10" />
          
          <DropdownMenuItem 
            onClick={handleLogout}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-[#ff6b6b]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultTab={authTab}
      />
    </>
  );
}
