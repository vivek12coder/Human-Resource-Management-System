import { Users, ArrowLeft, Bell, Settings2, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import UserSwitchModal from '../UserSwitchModal';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const AppHeader = () => {
  const { user, logout, isSwitched, originalUser, switchBack } = useAuthStore();
  const navigate = useNavigate();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const canSwitchAccounts = user?.role === 'SUPER_ADMIN';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 px-4">
      {/* Left */}
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        {/* Switched indicator */}
        {isSwitched && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <button
              onClick={() => {
                switchBack();
                toast.success('Switched back to your account');
              }}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              Switch Back to {originalUser?.name}
            </button>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 p-0 hover:scale-105 transition-transform">
              <Avatar className="h-9 w-9 rounded-full">
                <AvatarFallback className="rounded-full bg-gradient-to-br from-teal-400 via-emerald-500 to-green-500 text-white font-bold text-sm">
                  {user?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                {isSwitched && (
                  <div className="mb-1 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Switched to {user?.name}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-teal-400 via-emerald-500 to-green-500 text-white font-bold">
                      {user?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0 h-4">
                      {user?.role.replace('_', ' ')}
                      {isSwitched && ' (Switched)'}
                    </Badge>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canSwitchAccounts && (
              <DropdownMenuItem onClick={() => setShowSwitchModal(true)}>
                <Users className="w-4 h-4" />
                Switch Account
              </DropdownMenuItem>
            )}
            {isSwitched && (
              <DropdownMenuItem
                onClick={() => {
                  switchBack();
                  toast.success('Switched back to your account');
                }}
                className="text-amber-500"
              >
                <ArrowLeft className="w-4 h-4" />
                Switch Back to {originalUser?.name}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings2 className="w-4 h-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <UserSwitchModal isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)} />
    </header>
  );
};

export default AppHeader;
