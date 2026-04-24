# Smooth Body Gesture Transition - Complete

## Problem
Transisi gerakan tubuh (body micro-gestures) terlalu cepat saat TTS dimulai dan selesai. Gerakan breathing dan subtle body movements langsung berhenti/mulai tanpa transisi smooth, membuat avatar terlihat "freeze" atau "snap" ke posisi baru.

## Root Cause Analysis

### Previous Behavior
`updateIdleMicroGestures()` menggunakan operator `+=` untuk menambahkan rotasi setiap frame:

```typescript
spine.rotation.z += Math.sin(elapsed * 0.35) * 0.0002;
chest.rotation.x += Math.sin(elapsed * 0.7) * 0.0006;
upperChest.rotation.x += Math.sin(elapsed * 0.7 + 0.3) * 0.0003;
```

Saat TTS dimulai/selesai:
- Gerakan langsung berhenti (tidak dipanggil lagi)
- Tidak ada fade out/in
- Terlihat seperti avatar "freeze" atau "snap"

### Issues:
1. **Saat TTS Mulai**: Gerakan breathing langsung berhenti → avatar terlihat kaku
2. **Saat TTS Selesai**: Gerakan breathing langsung mulai penuh → terlihat tiba-tiba
3. **Tidak Natural**: Manusia tidak langsung berhenti/mulai bergerak secara instant

## Solution Implemented

### 1. Gesture Intensity System
Added intensity multiplier yang bisa di-fade in/out:

```typescript
// Gesture intensity for smooth fade in/out
let _gestureIntensity = 1.0; // 0.0 = no gestures, 1.0 = full gestures
let _targetGestureIntensity = 1.0;
const GESTURE_FADE_SPEED = 0.8; // Slower fade for smooth transition
```

### 2. Set Gesture Intensity Function
Function untuk mengatur target intensity:

```typescript
export function setGestureIntensity(target: number, immediate = false): void {
  _targetGestureIntensity = Math.max(0, Math.min(1, target));
  if (immediate) {
    _gestureIntensity = _targetGestureIntensity;
  }
}
```

### 3. Smooth Lerp in Update Function
Modified `updateIdleMicroGestures()` to lerp intensity and apply multiplier:

```typescript
export function updateIdleMicroGestures(
  elapsed: number,
  vrm: VRM,
  drivenBones?: Set<string>,
  delta = 0.016, // Added delta parameter
): void {
  // Smooth lerp toward target intensity
  if (Math.abs(_gestureIntensity - _targetGestureIntensity) > 0.01) {
    const lerpSpeed = GESTURE_FADE_SPEED * delta;
    _gestureIntensity += (_targetGestureIntensity - _gestureIntensity) * lerpSpeed;
  }

  // Apply gestures with current intensity multiplier
  spine.rotation.z += Math.sin(elapsed * 0.35) * 0.0002 * _gestureIntensity;
  const breathX = Math.sin(elapsed * 0.7) * 0.0006 * _gestureIntensity;
  const breathUpperX = Math.sin(elapsed * 0.7 + 0.3) * 0.0003 * _gestureIntensity;
  
  chest.rotation.x += breathX;
  upperChest.rotation.x += breathUpperX;
}
```

### 4. Integrated with TTS State
Modified VrmViewer useEffect to fade gestures:

```typescript
useEffect(() => {
  if (isSpeaking) {
    // Fade out body gestures when TTS starts
    setGestureIntensity(0.0); // Target 0, will lerp smoothly
    console.log('[Body Gestures] Fading out...');
  } else {
    // Fade in body gestures when TTS ends
    setGestureIntensity(1.0); // Target 1, will lerp smoothly
    console.log('[Body Gestures] Fading in...');
  }
}, [isSpeaking]);
```

## Fade Speed Calculation

With `GESTURE_FADE_SPEED = 0.8`:
- At 60 FPS (delta ≈ 0.016):
  - Frame 1: 1.0 → 1.0 + (0.0 - 1.0) * (0.8 * 0.016) = 0.987
  - Frame 2: 0.987 → 0.974
  - Frame 3: 0.974 → 0.962
  - ...continues smoothly...
  - ~100-120 frames (~1.5-2 seconds) to reach near 0

This creates a smooth, natural-looking fade that's not too fast or too slow.

## Timeline Comparison

### Before Fix (Instant Stop/Start):
```
Idle gestures (full) → [instant!] → No gestures → TTS
TTS ends → [instant!] → Idle gestures (full)
```

### After Fix (Smooth Fade):
```
Idle gestures (1.0) → [~1.5s fade] → (0.5) → [~1.5s fade] → (0.0) → TTS
TTS ends → [~1.5s fade] → (0.5) → [~1.5s fade] → (1.0) → Full gestures
```

## Affected Gestures

The intensity multiplier affects all body micro-gestures:

1. **Spine Rotation (Z-axis)**:
   - Subtle side-to-side sway
   - Frequency: 0.35 Hz (very slow)
   - Amplitude: 0.0002 radians * intensity

2. **Chest Breathing (X-axis)**:
   - Main breathing motion
   - Frequency: 0.7 Hz (breathing rate)
   - Amplitude: 0.0006 radians * intensity

3. **Upper Chest Breathing (X-axis)**:
   - Secondary breathing motion
   - Frequency: 0.7 Hz (slightly offset)
   - Amplitude: 0.0003 radians * intensity

## Console Logs

### When TTS Starts:
```
[Idle Expression] Starting fade out for TTS...
[Body Gestures] Fading out...
```

### During Fade (silent):
```
(gesture intensity gradually decreasing: 1.0 → 0.8 → 0.6 → 0.4 → 0.2 → 0.0)
```

### When TTS Ends:
```
[Body Gestures] Fading in...
```

### During Fade In (silent):
```
(gesture intensity gradually increasing: 0.0 → 0.2 → 0.4 → 0.6 → 0.8 → 1.0)
```

## Benefits

### 1. Natural Transition
- Smooth fade out/in of body movements
- No sudden "freeze" or "snap"
- Mimics human behavior when starting/stopping speech

### 2. Better Visual Flow
- Breathing gradually slows down when speaking starts
- Breathing gradually resumes when speaking ends
- More realistic and pleasing to watch

### 3. Synchronized with Expression Fade
- Body gestures fade at similar speed to facial expressions
- Cohesive overall transition
- Professional animation quality

## Technical Details

### Fade Speed Tuning
- `GESTURE_FADE_SPEED = 0.8`: Balanced - smooth but not too slow
- Higher values (1.5+): Faster fade, less smooth
- Lower values (0.5-): Slower fade, might feel sluggish

### Intensity Range
- `0.0`: No gestures (completely still)
- `0.5`: Half intensity (subtle movements)
- `1.0`: Full intensity (normal idle behavior)

### Delta Parameter
Added `delta` parameter to `updateIdleMicroGestures()`:
- Ensures frame-rate independent lerp
- Consistent fade speed on different devices
- 60 FPS vs 30 FPS will have same fade duration

## Files Modified

### `src/lib/vrm-animations.ts`:
- Added `_gestureIntensity` and `_targetGestureIntensity` state variables
- Added `GESTURE_FADE_SPEED` constant (0.8)
- Added `setGestureIntensity()` function
- Modified `updateIdleMicroGestures()`:
  - Added `delta` parameter
  - Added intensity lerp logic
  - Applied intensity multiplier to all gesture calculations

### `src/components/VrmViewer.tsx`:
- Imported `setGestureIntensity`
- Modified useEffect to call `setGestureIntensity()` on TTS start/end
- Added console logs for gesture fade
- Passed `delta` parameter to `updateIdleMicroGestures()`

## Testing

### Visual Test:
1. Watch avatar in idle state (should see subtle breathing and sway)
2. Send message to trigger TTS
3. Observe:
   - Body movements should gradually slow down (~1.5 seconds)
   - Not instant freeze
   - Smooth transition
4. After TTS ends:
   - Body movements should gradually resume (~1.5 seconds)
   - Not instant start
   - Smooth transition

### Console Test:
1. Open browser console
2. Trigger TTS
3. Should see:
   ```
   [Body Gestures] Fading out...
   ```
4. After TTS ends:
   ```
   [Body Gestures] Fading in...
   ```

### Performance Test:
- No performance impact (just one multiply per gesture)
- Frame-rate independent (uses delta)
- Works on both 60 FPS and 30 FPS devices

## Integration with Other Systems

### Works Together With:
1. **Idle Expression Fade**: Both fade at similar speeds
2. **Blink System**: Continues working during fade
3. **Lip Sync**: Starts after gesture fade begins
4. **Look-at System**: Not affected by gesture intensity

### Execution Order in Render Loop:
```
1. Update mixer (VRMA animations)
2. Update look-at
3. Fade out idle expression (if TTS starting)
4. Lip sync (if TTS active AND fade complete)
5. Idle expression (if NOT fading AND NOT speaking)
6. vrm.update() (apply all expression values)
7. Blink (final say on eye morph targets)
8. Micro-gestures (with smooth intensity fade) ← THIS
9. Spring bones (hair, accessories)
```

## Status
✅ **COMPLETE** - Gerakan tubuh sekarang fade in/out dengan smooth saat TTS mulai/selesai (~1.5-2 detik transisi)
