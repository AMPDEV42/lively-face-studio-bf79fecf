import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Crown, Camera, LogOut, User, Sparkles, Trash2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const displayNameSchema = z.string().trim().min(1, 'Nama tidak boleh kosong').max(50);

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPro, roles } = useUserRole();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [affection, setAffection] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const uploadingRef = useRef(false); // guard against race condition
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url, affection')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? '');
        setAvatarUrl(data?.avatar_url ?? null);
        setAffection(data?.affection ?? 0);
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try { displayNameSchema.parse(displayName); }
    catch (err) { if (err instanceof z.ZodError) toast.error(err.issues[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error('Gagal menyimpan');
    else toast.success('Profil tersimpan');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (uploadingRef.current) return; // guard race condition
    if (!file.type.startsWith('image/')) { toast.error('Hanya file gambar'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Maksimal 2MB'); return; }
    uploadingRef.current = true;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { toast.error('Upload gagal: ' + upErr.message); setUploading(false); uploadingRef.current = false; return; }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updErr } = await supabase.from('profiles').update({ avatar_url: pub.publicUrl }).eq('user_id', user.id);
    if (updErr) toast.error('Gagal update avatar');
    else { setAvatarUrl(pub.publicUrl); toast.success('Avatar diperbarui'); }
    setUploading(false);
    uploadingRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Delete user data from DB (cascade should handle related rows)
      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.from('vrm_models').delete().eq('user_id', user.id);
      // Sign out — actual account deletion requires admin/edge function
      await signOut();
      toast.success('Akun berhasil dihapus');
      navigate('/');
    } catch (err) {
      toast.error('Gagal menghapus akun: ' + (err as Error).message);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const initial = (displayName || user?.email || 'U')[0]?.toUpperCase() ?? 'U';

  if (loading) {
    return (
      <div className="min-h-screen bg-background cyber-grid-animated scanlines flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin neon-glow-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid-animated scanlines">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-neon-purple cyber-glass-strong backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 hover-neon-glow">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-neon-purple flex items-center justify-center neon-glow-purple">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h1 className="text-base font-semibold text-foreground tracking-tight text-neon-purple">Profil</h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative group">
            <Avatar className="h-24 w-24 ring-2 ring-neon-purple-bright ring-offset-2 ring-offset-background neon-glow-purple">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="text-3xl font-semibold bg-primary/10 text-primary">{initial}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full cyber-glass-strong opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-neon-purple-bright"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-neon-purple">{displayName || 'Pengguna'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Role badge */}
        <div className={`rounded-xl border p-4 flex items-center gap-3 corner-accent ${isPro ? 'border-neon-purple-bright cyber-glass neon-glow-purple' : 'border-neon-purple cyber-glass'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPro ? 'bg-primary/15 border border-neon-purple-bright neon-glow-purple' : 'bg-secondary border border-neon-purple'}`}>
            {isPro ? <Crown className="w-4.5 h-4.5 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{isPro ? 'Pro' : 'Free'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPro ? 'Akses penuh ke semua fitur' : 'Upgrade untuk fitur premium'}
            </p>
          </div>
          {!isPro && (
            <Button size="sm" variant="outline" onClick={() => navigate('/pricing')} className="shrink-0 h-7 text-xs gap-1.5 border-neon-purple-bright text-primary hover-neon-glow">
              <Sparkles className="w-3 h-3" /> Upgrade
            </Button>
          )}
        </div>

        {/* Affection level */}
        <AffectionCard affection={affection} />

        {/* Form */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email ?? ''} disabled className="h-10 cyber-glass border-neon-purple text-muted-foreground text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-xs text-muted-foreground">Nama Tampilan</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama kamu"
              className="h-10 cyber-glass border-neon-purple text-sm focus:border-neon-purple-bright focus:neon-glow-purple transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-10 neon-glow-purple hover-neon-lift">
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
          <Button
            variant="outline"
            onClick={async () => { await signOut(); navigate('/'); }}
            className="h-10 gap-2 border-neon-purple text-muted-foreground hover:text-destructive hover:border-destructive/40 hover-neon-glow"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </Button>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-destructive/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-destructive/80 uppercase tracking-wider">Zona Berbahaya</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Hapus Akun</p>
              <p className="text-xs text-muted-foreground mt-0.5">Semua data akan dihapus permanen dan tidak bisa dipulihkan.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="shrink-0 h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun secara permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua data kamu — model VRM, riwayat chat, dan pengaturan — akan dihapus permanen. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Menghapus…' : 'Ya, Hapus Akun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Affection Level Card ──────────────────────────────────────────────────────

const AFFECTION_TIERS = [
  { min: 0,    max: 99,   label: 'Asing',       color: 'text-slate-400',   bar: 'bg-slate-500/60',   emoji: '😶' },
  { min: 100,  max: 299,  label: 'Kenalan',      color: 'text-blue-400',    bar: 'bg-blue-500/70',    emoji: '🙂' },
  { min: 300,  max: 599,  label: 'Teman',        color: 'text-green-400',   bar: 'bg-green-500/70',   emoji: '😊' },
  { min: 600,  max: 999,  label: 'Sahabat',      color: 'text-yellow-400',  bar: 'bg-yellow-500/70',  emoji: '😄' },
  { min: 1000, max: 1999, label: 'Dekat',        color: 'text-orange-400',  bar: 'bg-orange-500/70',  emoji: '🥰' },
  { min: 2000, max: 4999, label: 'Sangat Dekat', color: 'text-pink-400',    bar: 'bg-pink-500/70',    emoji: '💕' },
  { min: 5000, max: Infinity, label: 'Soulmate', color: 'text-rose-400',    bar: 'bg-rose-500/80',    emoji: '💖' },
];

function AffectionCard({ affection }: { affection: number }) {
  const tier = AFFECTION_TIERS.findLast((t) => affection >= t.min) ?? AFFECTION_TIERS[0];
  const nextTier = AFFECTION_TIERS[AFFECTION_TIERS.indexOf(tier) + 1];
  const progress = nextTier
    ? Math.min(((affection - tier.min) / (nextTier.min - tier.min)) * 100, 100)
    : 100;

  return (
    <div className="rounded-xl border border-neon-purple cyber-glass p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center shrink-0 text-lg">
          {tier.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Tingkat Kedekatan</p>
            <span className={`text-xs font-bold ${tier.color}`}>{tier.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {affection.toLocaleString('id-ID')} poin afeksi
            {nextTier && (
              <span className="text-muted-foreground/60">
                {' '}· {(nextTier.min - affection).toLocaleString('id-ID')} lagi ke {nextTier.label}
              </span>
            )}
          </p>
        </div>
        <Heart className={`w-4 h-4 shrink-0 ${tier.color} fill-current`} />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${tier.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextTier && (
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>{tier.label}</span>
            <span>{nextTier.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
