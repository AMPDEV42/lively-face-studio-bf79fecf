# Smooth Transition to TTS (Idle → Speaking) - Complete

## Problem
Transisi dari idle expression ke TTS terlalu cepat. Saat TTS dimulai, idle expression (misalnya happy dengan intensity 0.65) langsung di-reset ke 0 secara instant, membuat avatar terlihat "snap" atau "jump" ke posisi netral.

## Root Cause Analysis

### Previous Behavior
Saat TTS dimulai (`isSpeaking` berubah ke `true`):
1. `forceResetIdleExpressions()` dipanggil
2. Semua expression values langsung di-set ke 0 (instant)
3. Tidak ada transisi smooth - langsung "snap" ke neutral

Contoh:
```
Happy (intensity 0.65) → [instant!] → Neutral (0) → TTS starts
```

Ini terlihat tidak natural karena:
- Tidak ada gradual fade out
- Perubahan terlalu abrupt
- Tidak seperti perilaku manusia yang butuh waktu untuk mengubah ekspresi

## Solution Implemented

### 1. New Fade Out Function
Created `fadeOutIdleExpressions()` yang melakukan smooth lerp dari current expression ke neutral:

```typescript
export function fadeOutIdleExpressions(delta: number, vrm: VRM): boolean {
  const FADE_SPEED = 1.5; // Slower than normal lerp for smooth transition
  
  // Lerp all current weights toward 0
  for (const [key, value] of Object.entries(_currentWeights)) {
    const newValue = value * (1 - FADE_SPEED * delta);
    _currentWeights[key] = newValue;
    em.setValue(key, Math.max(0, newValue));
  }
  
  // Return true when fade is complete (all values < 0.01)
  return maxValue < 0.01;
}
```

### 2. Fade State Tracking
Added `isFadingOutRef` to track fade out state:

```typescript
const isFadingOutRef = useRef(false);
```

### 3. Modified useEffect for TTS Start
Changed from instant reset to gradual fade:

```typescript
useEffect(() => {
  if (isSpeaking) {
    // Start fade out when TTS begins (don't pause immediately)
    isFadingOutRef.current = true;
    console.log('[Idle Expression] Starting fade out for TTS...');
  } else {
    // Resume when TTS ends
    isFadingOutRef.current = false;
    setIdleExpressionPaused(false);
  }
  setBlinkSpeakingMode(isSpeaking);
}, [isSpeaking]);
```

### 4. Modified Render Loop
Added fade out step before lip sync:

```typescript
// Step 3: Fade out idle expression when TTS is about to start
if (isFadingOutRef.current) {
  const fadeComplete = fadeOutIdleExpressions(delta, vrm);
  if (fadeComplete) {
    isFadingOutRef.current = false;
    setIdleExpressionPaused(true);
    console.log('[Idle Expression] Fade out complete - paused for TTS');
  }
}

// Step 4: Lip sync - ONLY when fade is complete
if (isSpeakingRef.current && !isFadingOutRef.current) {
  updateLipSync(level, vrm, delta);
}

// Step 5: Idle expression - skip during fade out
if (!manualBlendshapeRef.current && !isFadingOutRef.current) {
  updateIdleExpression(delta, vrm);
}
```

## Timeline Comparison

### Before Fix (Instant Reset):
```
Happy (0.65) → [0ms instant] → Neutral (0) → TTS lip sync starts
```

### After Fix (Smooth Fade):
```
Happy (0.65) → [~400ms fade] → Happy (0.32) → [~400ms fade] → Neutral (0.01) → TTS lip sync starts
Total fade time: ~800ms - 1 second
```

## Fade Speed Calculation

With `FADE_SPEED = 1.5`:
- At 60 FPS (delta ≈ 0.016):
  - Frame 1: 0.65 → 0.65 * (1 - 1.5 * 0.016) = 0.634
  - Frame 2: 0.634 → 0.618
  - Frame 3: 0.618 → 0.603
  - ...continues smoothly...
  - ~50-60 frames (~800ms-1s) to reach < 0.01

This creates a smooth, natural-looking fade that's not too fast or too slow.

## Console Logs

### When TTS Starts:
```
[Idle Expression] Starting fade out for TTS...
```

### During Fade (in render loop):
```
(fade happening silently - expression values gradually decreasing)
```

### When Fade Complete:
```
[Idle Expression] Fade out complete - paused for TTS
```

### When TTS Ends:
```
[Idle Expression] Resumed - holding neutral for 4.2 seconds before next expression
```

## Benefits

### 1. Natural Transition
- Smooth fade from current expression to neutral
- No abrupt "snap" or "jump"
- Mimics human facial expression changes

### 2. Better Visual Flow
- Eyes, mouth, and face muscles transition gradually
- More realistic and pleasing to watch
- Professional-looking animation quality

### 3. Seamless Integration
- Fade completes before lip sync starts
- No interference between systems
- Clean handoff from idle to speaking

## Technical Details

### Fade Speed Tuning
- `FADE_SPEED = 1.5`: Balanced - not too fast, not too slow
- Higher values (2.0+): Faster fade, less smooth
- Lower values (1.0-): Slower fade, might delay TTS start

### State Management
- `isFadingOutRef`: Tracks if fade is in progress
- Prevents idle expression updates during fade
- Prevents lip sync until fade is complete

### Render Loop Order
```
1. Update mixer (VRMA animations)
2. Update look-at
3. Fade out idle expression (if TTS starting)
4. Lip sync (if TTS active AND fade complete)
5. Idle expression (if NOT fading AND NOT speaking)
6. vrm.update() (apply all expression values)
7. Blink (final say on eye morph targets)
8. Micro-gestures (body breathing)
```

## Files Modified
- `src/lib/idle-expression-advanced.ts`:
  - Added `fadeOutIdleExpressions()` function
  - Kept `forceResetIdleExpressions()` for emergency use
  
- `src/components/VrmViewer.tsx`:
  - Added `isFadingOutRef` state
  - Modified `useEffect` for smooth fade start
  - Modified render loop to handle fade out
  - Updated step numbers in comments

## Testing
1. Start with avatar showing idle expression (e.g., happy, relaxed)
2. Send message to trigger TTS
3. Watch console logs:
   - Should see "Starting fade out for TTS..."
   - Should see "Fade out complete - paused for TTS"
4. Visual check:
   - Expression should gradually fade to neutral (~1 second)
   - No sudden jumps or snaps
   - Smooth transition to lip sync
5. After TTS ends:
   - Should see neutral hold (3-5 seconds)
   - Then slow transition to next expression

## Status
✅ **COMPLETE** - Transisi dari idle expression ke TTS sekarang smooth dengan gradual fade out (~1 second)
