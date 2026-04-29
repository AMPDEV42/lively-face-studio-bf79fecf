import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, User as UserIcon, Settings as SettingsIcon, Crown, Wand2, ChevronRight, Menu, Heart, BarChart2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePlan } from '@/hooks/usePlan';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TokenUsageBar from './TokenUsageBar';

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPro, isAdmin } = useUserRole();
  const { messagePercent, planConfig } = usePlan();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; affection: number | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url, affection')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/auth')}
        className="h-8 text-xs btn-overlay"
      >
        Sign In
      </Button>
    );
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const initial = displayName[0]?.toUpperCase() ?? 'U';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center justify-center h-10 w-10 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary btn-overlay"
          title="Menu"
        >
          <Menu className="w-5 h-5" />

        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 z-50 p-1.5 panel-overlay shadow-xl">
        {/* User info header */}
        <div className="px-2 py-2.5 mb-1 rounded-md" style={{ background: 'rgba(168,85,247,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 shrink-0" style={{ boxShadow: '0 0 0 1.5px rgba(168,85,247,0.4)' }}>
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs font-bold"
                style={{ background: 'rgba(10,8,20,0.90)', color: '#c084fc' }}>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate leading-none">{displayName}</p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(192,168,255,0.6)' }}>{user.email}</p>
              {/* Affection mini bar */}
              {profile?.affection != null && profile.affection > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Heart className="w-2.5 h-2.5 shrink-0 fill-current" style={{ color: '#f472b6' }} />
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((profile.affection / 5000) * 100, 100)}%`,
                        background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                      }}
                    />
                  </div>
                  <span className="text-[9px] tabular-nums shrink-0" style={{ color: 'rgba(192,168,255,0.5)' }}>
                    {profile.affection.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>
            {isPro && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold rounded-full px-1.5 py-0.5"
                style={{ background: 'rgba(168,85,247,0.25)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.5)' }}>
                <Crown className="w-2.5 h-2.5" /> Pro
              </span>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" style={{ background: 'rgba(168,85,247,0.2)' }} />

        {/* Usage mini bar */}
        <div className="px-2 py-2 mb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Penggunaan</span>
            <button
              onClick={() => navigate('/usage')}
              className="text-[10px] text-violet-400/70 hover:text-violet-400 transition-colors"
            >
              Detail →
            </button>
          </div>
          <TokenUsageBar variant="compact" />
          {!isPro && messagePercent >= 80 && (
            <button
              onClick={() => navigate('/pricing')}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(147,51,234,0.3))',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#c084fc',
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Upgrade Pro
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="my-1" style={{ background: 'rgba(168,85,247,0.2)' }} />

        <DropdownMenuItem
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-2 py-2.5 rounded-md text-sm cursor-pointer text-foreground/90 focus:text-foreground focus:bg-primary/10"
        >
          <UserIcon className="w-4 h-4" style={{ color: '#a78bfa' }} />
          <span className="flex-1">Profil</span>
          <ChevronRight className="w-3 h-3 opacity-40" />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate('/usage')}
          className="flex items-center gap-2 px-2 py-2.5 rounded-md text-sm cursor-pointer text-foreground/90 focus:text-foreground focus:bg-primary/10"
        >
          <BarChart2 className="w-4 h-4" style={{ color: '#a78bfa' }} />
          <span className="flex-1">Penggunaan & Paket</span>
          <ChevronRight className="w-3 h-3 opacity-40" />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-2 py-2.5 rounded-md text-sm cursor-pointer text-foreground/90 focus:text-foreground focus:bg-primary/10"
        >
          <SettingsIcon className="w-4 h-4" style={{ color: '#a78bfa' }} />
          <span className="flex-1">Pengaturan</span>
          <ChevronRight className="w-3 h-3 opacity-40" />
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem
            onClick={() => navigate('/admin/animations')}
            className="flex items-center gap-2 px-2 py-2.5 rounded-md text-sm cursor-pointer text-foreground/90 focus:text-foreground focus:bg-primary/10"
          >
            <Wand2 className="w-4 h-4" style={{ color: '#a78bfa' }} />
            <span className="flex-1">Animation Studio</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1" style={{ background: 'rgba(168,85,247,0.2)' }} />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 px-2 py-2.5 rounded-md text-sm cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
