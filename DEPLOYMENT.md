# Panduan Deployment ke Vercel

## Persiapan Sebelum Deploy

### 1. Environment Variables
Sebelum deploy, pastikan kamu sudah menyiapkan semua environment variables berikut:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_HUGGINGFACE_TOKEN=your-hf-token (optional, untuk TTS)
```

### 2. Supabase Setup
Pastikan Supabase project sudah dikonfigurasi:
- Database tables sudah di-migrate (lihat `supabase/migrations/`)
- Storage bucket `vrm-models` dan `backgrounds` sudah dibuat
- RLS policies sudah aktif
- Authentication providers sudah dikonfigurasi

### 3. File VRM Models
**PENTING:** File VRM (22-23 MB) TIDAK boleh di-commit ke repo. Upload ke Supabase Storage:

```bash
# Upload via Supabase Dashboard:
# Storage > vrm-models > Upload files
# - VRoid_V110_Female_v1.1.3.vrm
# - VRoid_V110_Male_v1.1.3.vrm
```

## Deploy ke Vercel

### Via Vercel Dashboard (Recommended)

1. **Import Project**
   - Buka [vercel.com/new](https://vercel.com/new)
   - Import repository ini dari GitHub
   - Framework Preset: Vite
   - Root Directory: `./`

2. **Configure Environment Variables**
   - Di Vercel dashboard, buka Settings > Environment Variables
   - Tambahkan semua env vars dari `.env.example`
   - Pastikan semua variables tersedia untuk Production, Preview, dan Development

3. **Deploy**
   - Klik "Deploy"
   - Tunggu build selesai (~2-3 menit)
   - Vercel akan otomatis deploy setiap push ke branch `main`

### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy ke production
vercel --prod
```

## Build Configuration

Build sudah dioptimasi dengan:
- ✅ Code splitting untuk Three.js, VRM, Face API (chunks terpisah)
- ✅ Lazy loading untuk semua halaman
- ✅ Tree shaking untuk dependencies
- ✅ Minification dan compression
- ✅ SPA fallback routing via `vercel.json`

## Post-Deployment Checklist

- [ ] Test authentication flow (login/register)
- [ ] Test VRM model upload dan preview
- [ ] Test TTS (Web Speech API dan ElevenLabs jika ada)
- [ ] Test chat dengan AI
- [ ] Test responsive layout (mobile + desktop)
- [ ] Test background selector
- [ ] Test camera controls
- [ ] Check browser console untuk errors
- [ ] Test di berbagai browser (Chrome, Firefox, Safari, Edge)

## Performance Optimization

### Lighthouse Score Target
- Performance: >80
- Accessibility: >90
- Best Practices: >90
- SEO: >90

### Tips Optimasi
1. **Lazy load images** - Background images sudah lazy load
2. **CDN untuk assets** - Vercel otomatis serve via CDN
3. **Compress images** - Gunakan WebP untuk backgrounds
4. **Cache headers** - Vercel otomatis set cache headers
5. **Preload critical fonts** - Sudah dikonfigurasi di `index.html`

## Troubleshooting

### Build Gagal
```bash
# Clear cache dan rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Environment Variables Tidak Terbaca
- Pastikan prefix `VITE_` ada di semua env vars
- Restart Vercel deployment setelah update env vars
- Check di Vercel dashboard: Settings > Environment Variables

### Model VRM Tidak Muncul
- Check Supabase Storage bucket permissions (public read)
- Check CORS settings di Supabase
- Check browser console untuk CORS errors

### TTS Tidak Bekerja
- Web Speech API: Check browser support (Chrome/Edge only)
- ElevenLabs: Check API key dan quota
- Check browser console untuk errors

## Monitoring

### Vercel Analytics
Enable di Vercel dashboard untuk monitoring:
- Page views
- Performance metrics
- Error tracking
- User analytics

### Supabase Logs
Monitor di Supabase dashboard:
- Database queries
- Storage access
- Authentication events
- Edge function logs

## Rollback

Jika deployment bermasalah:
```bash
# Via Vercel dashboard
# Deployments > [pilih deployment sebelumnya] > Promote to Production

# Via CLI
vercel rollback
```

## Custom Domain

Setup custom domain di Vercel:
1. Settings > Domains
2. Add domain
3. Configure DNS records sesuai instruksi Vercel
4. Wait for SSL certificate (otomatis via Let's Encrypt)

## Support

Jika ada masalah:
- Check Vercel deployment logs
- Check Supabase logs
- Check browser console
- Review TODO.md untuk known issues
