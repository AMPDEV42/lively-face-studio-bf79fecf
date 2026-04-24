# Transition Speed Adjustment - Very Slow & Very Natural

## Changes Made
Memperlambat semua transisi lebih lanjut untuk membuat gerakan sangat natural dan sangat smooth.

## Latest Adjustments (Round 2)

### 1. Idle Expression Lerp Speed

**Previous (Round 1)**:
```typescript
const LERP_SPEED_MIN = 0.8;
const LERP_SPEED_MAX = 1.8;
const LERP_SPEED_RESUME = 0.4;
```

**Now (Round 2)**:
```typescript
const LERP_SPEED_MIN = 0.4;  // 50% slower again
const LERP_SPEED_MAX = 1.0;  // 44% slower again
const LERP_SPEED_RESUME = 0.2; // 50% slower again
```

**Impact**: 
- Transisi ekspresi normal: 4-6 detik (was 2-3 detik)
- Transisi pertama setelah TTS: 8-10 detik (was 4-5 detik)

### 2. Expression Fade Out Speed (ke TTS)

**Previous (Round 1)**:
```typescript
const FADE_SPEED = 0.8;
```

**Now (Round 2)**:
```typescript
const FADE_SPEED = 0.5; // 38% slower
```

**Impact**:
- Fade out duration: ~3-4 detik (was ~2-2.5 detik)
- Sangat smooth saat transisi ke TTS

### 3. Body Gesture Fade Speed

**Previous (Round 1)**:
```typescript
const GESTURE_FADE_SPEED = 0.4;
```

**Now (Round 2)**:
```typescript
const GESTURE_FADE_SPEED = 0.25; // 38% slower
```

**Impact**:
- Gesture fade in/out: ~5-6 detik (was ~3-4 detik)
- Gerakan tubuh fade sangat halus dan sangat natural

### 4. Neutral Hold After TTS

**Previous (Round 1)**:
```typescript
_holdTarget = 5 + Math.random() * 3; // 5-8 seconds
```

**Now (Round 2)**:
```typescript
_holdTarget = 7 + Math.random() * 4; // 7-11 seconds
```

**Impact**:
- Avatar tetap neutral lebih lama lagi setelah TTS selesai
- Memberi waktu sangat cukup untuk "settle" sebelum ekspresi baru

### 5. Gradual Speed Increase After Resume

**Previous (Round 1)**:
```typescript
// 3 transitions: 0.4 → 0.6 → 0.8 → normal
if (_resumeTransitionCount < 3) {
  _lerpSpeed = LERP_SPEED_RESUME + (_resumeTransitionCount * 0.2);
}
```

**Now (Round 2)**:
```typescript
// 4 transitions: 0.2 → 0.35 → 0.5 → 0.65 → normal
if (_resumeTransitionCount < 4) {
  _lerpSpeed = LERP_SPEED_RESUME + (_resumeTransitionCount * 0.15);
}
```

**Impact**:
- Transisi 1: lerp 0.2 (~10 detik) - sangat sangat lambat
- Transisi 2: lerp 0.35 (~6 detik) - sangat lambat
- Transisi 3: lerp 0.5 (~4 detik) - lambat
- Transisi 4: lerp 0.65 (~3 detik) - agak lambat
- Transisi 5+: lerp 0.4-1.0 (~2-5 detik) - normal

## Timeline Comparison

### Original (Fast):
```
Idle expression → [1s fade] → TTS → [3s neutral] → [2s transition] → Next expression
Body gestures   → [1.5s fade] → Stop → [1.5s fade] → Resume
```

### Round 1 (Slower):
```
Idle expression → [2.5s fade] → TTS → [5-8s neutral] → [5s] → [3.5s] → [2.5s] → Normal
Body gestures   → [3-4s fade] → Stop → [3-4s fade] → Resume
```

### Round 2 (Very Slow):
```
Idle expression → [3-4s fade] → TTS → [7-11s neutral] → [10s] → [6s] → [4s] → [3s] → Normal
Body gestures   → [5-6s fade] → Stop → [5-6s fade] → Resume
```

## Expected Behavior

### Saat TTS Dimulai:
1. Expression fade out: **3-4 detik** (was 2-2.5 detik)
2. Body gestures fade out: **5-6 detik** (was 3-4 detik)
3. Transisi terasa sangat smooth dan sangat natural

### Saat TTS Selesai:
1. Neutral hold: **7-11 detik** (was 5-8 detik) - sangat lama
2. Body gestures fade in: **5-6 detik** (was 3-4 detik)
3. Transisi 1 ke expression baru: **~10 detik** (was ~5 detik) - sangat sangat lambat
4. Transisi 2: **~6 detik** (was ~3.5 detik) - sangat lambat
5. Transisi 3: **~4 detik** (was ~2.5 detik) - lambat
6. Transisi 4: **~3 detik** (new) - agak lambat
7. Transisi 5+: **~2-5 detik** (was ~1.5-2.5 detik) - normal

### Transisi Normal (Idle):
- Expression change: **4-6 detik** (was 2-3 detik)
- Sangat smooth dan sangat natural

## Speed Reduction Summary

| Component | Original | Round 1 | Round 2 | Total Reduction |
|-----------|----------|---------|---------|-----------------|
| Expression fade out | 1-1.5s | 2-2.5s | 3-4s | **~3x slower** |
| Body gesture fade | 1.5-2s | 3-4s | 5-6s | **~3x slower** |
| Neutral hold | 3-5s | 5-8s | 7-11s | **~2x longer** |
| First transition | 2s | 5s | 10s | **5x slower** |
| Normal transition | 1-1.5s | 2-3s | 4-6s | **~4x slower** |

## Console Logs Example

```
[Idle Expression] Starting fade out for TTS...
[Body Gestures] Fading out...
(~3-4 seconds fade)
[Idle Expression] Fade out complete - paused for TTS

(TTS playing...)

[Idle Expression] Resumed - holding neutral for 9.2 seconds before next expression
[Body Gestures] Fading in...
(~9.2 seconds neutral hold - very long)
[Idle Expression] → happy [slow transition 1/4] (6.2s, intensity: 0.68, lerp: 0.2)
(~10 seconds transition - very very slow)
[Idle Expression] ✓ happy
[Idle Expression] → relaxed [slow transition 2/4] (7.8s, intensity: 0.72, lerp: 0.35)
(~6 seconds transition - very slow)
[Idle Expression] ✓ relaxed
[Idle Expression] → neutral [slow transition 3/4] (8.4s, intensity: 0.00, lerp: 0.5)
(~4 seconds transition - slow)
[Idle Expression] ✓ neutral
[Idle Expression] → surprised [slow transition 4/4] (3.2s, intensity: 0.58, lerp: 0.65)
(~3 seconds transition - somewhat slow)
[Idle Expression] ✓ surprised
[Idle Expression] → happy (5.1s, intensity: 0.64, lerp: 0.7)
(~2.5 seconds transition - back to normal speed)
```

## Files Modified
- `src/lib/idle-expression-advanced.ts`:
  - `LERP_SPEED_MIN`: 0.8 → 0.4
  - `LERP_SPEED_MAX`: 1.8 → 1.0
  - `LERP_SPEED_RESUME`: 0.4 → 0.2
  - `FADE_SPEED` in fadeOutIdleExpressions: 0.8 → 0.5
  - Neutral hold: 5-8s → 7-11s
  - Gradual speed increase: 3 steps → 4 steps
  
- `src/lib/vrm-animations.ts`:
  - `GESTURE_FADE_SPEED`: 0.4 → 0.25

## Status
✅ **COMPLETE** - Semua transisi diperlambat lagi untuk gerakan yang sangat natural dan sangat smooth (total ~3-5x lebih lambat dari original)
