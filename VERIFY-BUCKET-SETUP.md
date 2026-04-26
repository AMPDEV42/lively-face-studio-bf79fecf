# Verify Bucket Setup 🔍

## 🎯 Testing Supabase Bucket `backgrounds`

Sekarang bucket sudah dibuat, mari kita test apakah sistem bisa detect dan upload dengan benar.

### 1. **Check Console Logs**

Refresh aplikasi dan buka background selector. Perhatikan console logs:

#### Expected Success Logs:
```
[BackgroundManager] Checking Supabase bucket...
[BackgroundManager] Bucket exists: true
[BackgroundManager] Found files: 0
```

#### If Bucket Not Detected:
```
[BackgroundManager] Bucket exists: false
[BackgroundManager] Backgrounds bucket not found, using localStorage fallback
```

### 2. **Test Upload Functionality**

#### For Pro Users:
1. **Open Background Selector** - Click image icon
2. **Try Upload** - Click "Upload Image" button
3. **Select Image File** - Choose any JPG/PNG under 10MB
4. **Watch Console** - Should see upload progress logs

#### Expected Upload Success:
```
[BackgroundSelector] Starting upload: test.jpg 1234567 bytes
[BackgroundManager] Attempting Supabase upload...
[BackgroundManager] Bucket exists: true
[BackgroundManager] Uploading to path: {user-id}/1777031234567.jpg
[BackgroundManager] Upload successful!
[BackgroundSelector] Upload completed: {background-object}
```

#### If Upload Fails:
```
[BackgroundManager] Upload error: {error-details}
[BackgroundManager] Supabase upload failed, using localStorage: {error}
[BackgroundManager] Using localStorage fallback
```

### 3. **Common Issues & Solutions**

#### Issue: "Bucket exists: false"
**Possible Causes:**
- Bucket name mismatch (should be exactly "backgrounds")
- Bucket not public
- RLS policies blocking access

**Solution:**
```sql
-- Verify bucket exists and is public
SELECT * FROM storage.buckets WHERE name = 'backgrounds';

-- Should return:
-- id: backgrounds
-- name: backgrounds  
-- public: true
```

#### Issue: "Upload error: new row violates row-level security policy"
**Cause:** Missing RLS policies for storage.objects
**Solution:** Run RLS setup commands

#### Issue: "Upload error: permission denied"
**Cause:** Bucket permissions or authentication issue
**Solution:** Check user authentication and bucket policies

### 4. **Setup RLS Policies (If Needed)**

If upload fails with permission errors, run these in Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to their folder
CREATE POLICY "Allow authenticated uploads to backgrounds" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'backgrounds' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access to all backgrounds
CREATE POLICY "Allow public read access to backgrounds" ON storage.objects
FOR SELECT USING (bucket_id = 'backgrounds');

-- Policy: Allow users to delete their own backgrounds
CREATE POLICY "Allow users to delete own backgrounds" ON storage.objects
FOR DELETE USING (
  bucket_id = 'backgrounds' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 5. **Test Results Checklist**

#### ✅ Bucket Detection:
- [ ] Console shows "Bucket exists: true"
- [ ] No "bucket not found" warnings
- [ ] Background gallery loads without errors

#### ✅ Upload Functionality:
- [ ] Upload button visible for Pro users
- [ ] File selection works
- [ ] Upload progress shows in console
- [ ] Success message appears
- [ ] Uploaded background appears in gallery

#### ✅ Background Application:
- [ ] Uploaded backgrounds can be selected
- [ ] Background changes in 3D scene
- [ ] No console errors during selection

### 6. **Fallback Verification**

Even if Supabase fails, localStorage fallback should work:

#### ✅ localStorage Fallback:
- [ ] Upload still works (saves to localStorage)
- [ ] Uploaded backgrounds persist after refresh
- [ ] No app crashes or errors
- [ ] Smooth user experience

---

## 🚀 **Next Steps Based on Results**

### If Everything Works:
- ✅ Supabase integration successful
- ✅ Ready for production use
- ✅ Users can upload and share backgrounds

### If Issues Found:
1. **Share Console Logs** - Copy exact error messages
2. **Check Supabase Dashboard** - Verify bucket settings
3. **Test RLS Policies** - Run policy setup commands
4. **Verify Authentication** - Ensure user is logged in

---

**Ready to Test!** 🧪

Bucket `backgrounds` sudah dibuat dan kode sudah dioptimasi dengan detailed logging. Silakan test upload functionality dan share hasilnya!