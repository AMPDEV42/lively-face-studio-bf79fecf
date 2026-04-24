# Lip Sync Immediate Start Fix - Complete

## Problem
Setelah memperlambat transisi fade out, lip sync tidak langsung mulai saat TTS dimulai. Mulut tidak bergerak selama 5-6 detik (durasi fade out), membuat avatar terlihat tidak sinkron dengan audio.

## Root Cause

### Previous Behavior
```typescript
// Lip sync hanya dimulai SETELAH fade out selesai
if (isSpeakingRef.current && !isFadingOutRef.current) {
  updateLipSync(level, vrm, delta);
}
```

**Masalah**:
- Fade out expression: 5-6 detik
- Lip sync menunggu fade out selesai
- Mulut tidak bergerak selama 5-6 detik pertama TTS
- Audio dan visual tidak sinkron

## Solution Implemented

### 1. Lip Sync Starts Immediately
Modified render loop to allow lip sync to start immediately:

```typescript
// 4. Lip sync - starts immediately when speaking
// Lip sync can run in parallel with fade out
if (isSpeakingRef.current) {
  updateLipSync(level, vrm, delta);
}
```

**Benefit**: Lip sync mulai langsung saat TTS dimulai, tidak menunggu fade out.

### 2. Fade Out Skips Mouth Expressions
Modified `fadeOutIdleExpressions()` to NOT fade mouth expressions:

```typescript
export function fadeOutIdleExpressions(delta: number, vrm: VRM): boolean {
  // Mouth expressions that should NOT be faded (reserved for lip sync)
  const mouthExpressions = new Set(['aa', 'ih', 'ou', 'ee', 'oh']);
  
  // Lerp all current weights toward 0 (except mouth expressions)
  for (const [key, value] of Object.entries(_currentWeights)) {
    // Skip mouth expressions - let lip sync handle them
    if (mouthExpressions.has(key)) {
      continue;
    }
    
    // Fade other expressions normally
    const newValue = value * (1 - FADE_SPEED * delta);
    _currentWeights[key] = newValue;
    em.setValue(key, Math.max(0, newValue));
  }
}
```

**Benefit**: 
- Mouth expressions (aa, ih, ou, ee, oh) tidak di-fade
- Lip sync bisa langsung mengontrol mulut
- Tidak ada konflik antara fade out dan lip sync

## How It Works Now

### Timeline Saat TTS Dimulai:

```
Time 0s:
  - TTS audio starts
  - Lip sync starts IMMEDIATELY ✅
  - Fade out starts (for non-mouth expressions)
  - Body gestures start fading out

Time 0-6s:
  - Lip sync active (mouth moving) ✅
  - Happy/sad/angry expressions fading out (slow)
  - Body gestures fading out (slow)

Time 6s+:
  - Lip sync continues ✅
  - Fade out complete (non-mouth expressions at 0)
  - Body gestures at 0
  - Only lip sync controls the face
```

### What Gets Faded vs What Doesn't:

**Faded Out (Slow)**:
- ✅ happy
- ✅ sad
- ✅ angry
- ✅ surprised
- ✅ relaxed
- ✅ neutral
- ✅ Body gestures

**NOT Faded (Immediate Control to Lip Sync)**:
- ❌ aa (mouth open)
- ❌ ih (mouth narrow)
- ❌ ou (mouth round)
- ❌ ee (mouth wide)
- ❌ oh (mouth O-shape)

## Execution Order in Render Loop

```
1. Update mixer (VRMA animations)
2. Update look-at
3. Fade out idle expression (skip mouth expressions) ← Runs in parallel
4. Lip sync (controls mouth immediately) ← Runs in parallel
5. Idle expression (skipped when paused)
6. vrm.update() (apply all expression values)
7. Blink (final say on eye morph targets)
8. Micro-gestures (with smooth intensity fade)
9. Spring bones
```

## Benefits

### 1. Perfect Audio-Visual Sync
- Mulut bergerak LANGSUNG saat audio mulai
- Tidak ada delay 5-6 detik
- Lip sync dan audio selalu sinkron

### 2. Smooth Transition
- Facial expressions (happy, sad, etc.) tetap fade out smooth
- Body gestures tetap fade out smooth
- Hanya mouth expressions yang langsung dikontrol lip sync

### 3. No Conflicts
- Fade out tidak menyentuh mouth expressions
- Lip sync punya kontrol penuh atas mulut
- Tidak ada "fighting" antara fade out dan lip sync

## Console Logs

```
[Idle Expression] Starting fade out for TTS...
[Body Gestures] Fading out...
(Lip sync starts immediately - mouth moving)
(~5-6 seconds fade out for facial expressions)
[Idle Expression] Fade out complete - paused for TTS
(Lip sync continues - mouth still moving)
```

## Testing

### Visual Test:
1. Avatar showing idle expression (e.g., happy)
2. Send message to trigger TTS
3. Observe:
   - ✅ Mulut langsung bergerak saat audio mulai
   - ✅ Happy expression perlahan fade out (5-6 detik)
   - ✅ Body gestures perlahan fade out (8-10 detik)
   - ✅ Tidak ada delay pada lip sync

### Audio-Visual Sync Test:
1. Play TTS with clear phonemes
2. Watch mouth movements
3. Should see:
   - ✅ Mouth opens for "aa" sounds immediately
   - ✅ Mouth narrows for "ih" sounds immediately
   - ✅ Perfect sync with audio throughout

## Files Modified

### `src/components/VrmViewer.tsx`:
- Removed `!isFadingOutRef.current` condition from lip sync
- Lip sync now runs immediately when `isSpeakingRef.current` is true
- Added comment explaining parallel execution

### `src/lib/idle-expression-advanced.ts`:
- Added `mouthExpressions` Set to identify mouth-related expressions
- Modified fade loop to skip mouth expressions
- Added comment explaining why mouth expressions are skipped
- Updated function documentation

## Status
✅ **COMPLETE** - Lip sync sekarang mulai LANGSUNG saat TTS dimulai, tidak menunggu fade out selesai
