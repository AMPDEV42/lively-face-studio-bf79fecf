import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

/**
 * Natural look-at system for three-vrm v3.
 *
 * Features:
 * - Eyes follow mouse via vrm.lookAt.lookAt() (three-vrm handles eye bones)
 * - Head/neck follow with natural lag behind eyes
 * - Micro-saccades: tiny random eye movements like real human eyes
 * - Attention blink: quick blink when gaze shifts significantly
 * - Soft easing: movement feels organic, not mechanical
 * - Auto-return to neutral when mouse is idle
 */

// ── Config ────────────────────────────────────────────────────────────────────
const EYE_SMOOTH_IN   = 6.0;  // eye lerp speed toward target
const EYE_SMOOTH_OUT  = 4.0;  // eye lerp speed returning to neutral (faster = snappier return)
const HEAD_SMOOTH_IN  = 2.8;  // head follows eyes with lag
const HEAD_SMOOTH_OUT = 3.0;  // head return speed — faster than in so it doesn't lag behind
const IDLE_AFTER      = 5.0;  // seconds before returning to neutral
const TARGET_DIST     = 2.0;  // metres in front for neutral gaze

// Head turn limits (radians)
const MAX_HEAD_YAW   = 0.40; // ~23°
const MAX_HEAD_PITCH = 0.28; // ~16°

// Micro-saccade config (Anime/Companion style - fast, expressive eyes)
const SACCADE_INTERVAL_MIN = 0.5;  // seconds between saccades (more frequent darting)
const SACCADE_INTERVAL_MAX = 2.5;
const SACCADE_AMPLITUDE    = 0.025; // world units — increased for visible cartoon eye movement
const SACCADE_DURATION     = 0.12;  // slightly longer so it registers well on 60fps

// ── State ─────────────────────────────────────────────────────────────────────
let _mouseNdcX    = 0;
let _mouseNdcY    = 0;
let _lastMoveTime = 0;
let _mouseInside  = false;  // true only while pointer is inside the container
let _enabled      = true;
let _ready        = false;
let _forcedNeutral = false;

// Smoothed world-space targets
const _eyeTarget     = new THREE.Vector3(); // current smoothed eye target
const _goalTarget    = new THREE.Vector3(); // where we want to look
const _neutralTarget = new THREE.Vector3();

// Micro-saccade state
const _saccadeOffset = new THREE.Vector3();
let _saccadeTimer    = 0;
let _saccadeNext     = 2.0;
let _saccadePhase    = 0; // 0 = idle, 1 = moving out, 2 = moving back
let _saccadeProgress = 0;
const _saccadeDir    = new THREE.Vector3();

// Smoothed head angles (radians)
let _headYaw   = 0;
let _headPitch = 0;

// Previous eye target for blink-on-shift detection
const _prevEyeTarget = new THREE.Vector3();
let _shiftAccum      = 0;

// Reusable
const _ndcVec  = new THREE.Vector2();
const _ray     = new THREE.Raycaster();
const _headPos = new THREE.Vector3();

// Stable head position — updated only when head bone is at rest (no rotation applied yet)
// This prevents feedback loop: rotated head → shifted world pos → new target → more rotation
const _stableHeadPos = new THREE.Vector3();
let _stableHeadPosReady = false;

// ── Mouse tracking ────────────────────────────────────────────────────────────
export function initLookAt(container: HTMLElement): () => void {
  _ready        = false;
  _lastMoveTime = 0;
  _mouseInside  = false;
  _mouseNdcX    = 0;
  _mouseNdcY    = 0;
  _headYaw      = 0;
  _headPitch    = 0;
  _shiftAccum   = 0;
  _saccadeTimer = 0;
  _saccadeNext  = 2.0;
  _saccadePhase = 0;
  _saccadeOffset.set(0, 0, 0);
  _stableHeadPosReady = false;

  const onMove = (e: MouseEvent) => {
    const r = container.getBoundingClientRect();
    _mouseNdcX =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    _mouseNdcY = -((e.clientY - r.top)  / r.height) * 2 + 1;
    _lastMoveTime = performance.now() / 1000;
    _mouseInside  = true;
  };
  const onLeave = () => { _lastMoveTime = 0; _mouseInside = false; };

  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseleave', onLeave);
  return () => {
    container.removeEventListener('mousemove', onMove);
    container.removeEventListener('mouseleave', onLeave);
  };
}

export function setLookAtEnabled(v: boolean): void {
  _enabled = v;
  if (!v) { _headYaw = 0; _headPitch = 0; }
}

/** 
 * Force the character to look straight ahead smoothly (standard lerp).
 * Useful during interactions like headpats where you want a natural return to center.
 */
export function forceNeutral(v: boolean): void {
  _forcedNeutral = v;
}

/** 
 * Force reset head and eyes to neutral immediately. 
 * Useful before disabling look-at to prevent "stuck" tilted poses.
 */
export function resetLookAt(vrm: VRM): void {
  _headYaw = 0;
  _headPitch = 0;

  // Reset internal eye target
  const headBone = vrm.humanoid?.getNormalizedBoneNode('head');
  if (headBone) {
    headBone.getWorldPosition(_headPos);
    _neutralTarget.set(_headPos.x, _headPos.y, _headPos.z + TARGET_DIST);
    _eyeTarget.copy(_neutralTarget);
    _goalTarget.copy(_neutralTarget);
    vrm.lookAt?.lookAt(_neutralTarget);
  }

  // Reset bone rotations
  ['neck', 'head'].forEach(bone => {
    const node = vrm.humanoid?.getNormalizedBoneNode(bone as any);
    if (node) node.rotation.set(0, 0, 0);
  });
}

/** Smooth ease-in-out for natural motion */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── Per-frame update ──────────────────────────────────────────────────────────
export function updateLookAt(
  delta: number,
  vrm: VRM,
  camera: THREE.PerspectiveCamera,
  _drivenBones: Set<string>,
): void {
  if (!_enabled || !vrm.lookAt || !vrm.humanoid) return;

  const now  = performance.now() / 1000;
  // Idle when: forced, OR mouse left container OR hasn't moved for IDLE_AFTER seconds
  const idle = _forcedNeutral || !_mouseInside || _lastMoveTime === 0 || (now - _lastMoveTime) > IDLE_AFTER;

  // Get head world position in rest-pose.
  // We temporarily zero head/neck rotations before sampling world position,
  // so the position is not affected by our own rotation from the previous frame.
  const headBone = vrm.humanoid.getNormalizedBoneNode('head');
  const neckBoneStable = vrm.humanoid.getNormalizedBoneNode('neck');
  if (!headBone) return;

  // Save → zero → sample → restore
  const savedHeadY = headBone.rotation.y;
  const savedHeadX = headBone.rotation.x;
  const savedNeckY = neckBoneStable ? neckBoneStable.rotation.y : 0;
  const savedNeckX = neckBoneStable ? neckBoneStable.rotation.x : 0;

  headBone.rotation.y = 0;
  headBone.rotation.x = 0;
  if (neckBoneStable) {
    neckBoneStable.rotation.y = 0;
    neckBoneStable.rotation.x = 0;
  }
  headBone.updateWorldMatrix(true, false);
  headBone.getWorldPosition(_headPos);

  headBone.rotation.y = savedHeadY;
  headBone.rotation.x = savedHeadX;
  if (neckBoneStable) {
    neckBoneStable.rotation.y = savedNeckY;
    neckBoneStable.rotation.x = savedNeckX;
  }

  // Cache stable position — only update if character actually moved (> 1cm)
  if (!_stableHeadPosReady) {
    _stableHeadPos.copy(_headPos);
    _stableHeadPosReady = true;
  } else if (_headPos.distanceToSquared(_stableHeadPos) > 0.0001) {
    _stableHeadPos.copy(_headPos);
  }

  // Neutral: straight ahead
  _neutralTarget.set(_stableHeadPos.x, _stableHeadPos.y, _stableHeadPos.z + TARGET_DIST);

  if (!_ready) {
    _eyeTarget.copy(_neutralTarget);
    _prevEyeTarget.copy(_neutralTarget);
    _ready = true;
  }

  // ── Compute goal target from mouse ───────────────────────────────────────
  if (!idle) {
    _ndcVec.set(_mouseNdcX, _mouseNdcY);
    _ray.setFromCamera(_ndcVec, camera);
    const depth = _stableHeadPos.distanceTo(camera.position);
    _ray.ray.at(depth, _goalTarget);
  } else {
    _goalTarget.copy(_neutralTarget);
  }

  // ── Micro-saccades ────────────────────────────────────────────────────────
  // Only when not idle — real eyes make tiny involuntary movements
  if (!idle) {
    _saccadeTimer += delta;
    if (_saccadePhase === 0 && _saccadeTimer >= _saccadeNext) {
      // Start a new saccade
      _saccadeTimer = 0;
      _saccadeNext  = SACCADE_INTERVAL_MIN + Math.random() * (SACCADE_INTERVAL_MAX - SACCADE_INTERVAL_MIN);
      _saccadePhase    = 1;
      _saccadeProgress = 0;
      // Random direction in XY plane
      const angle = Math.random() * Math.PI * 2;
      _saccadeDir.set(
        Math.cos(angle) * SACCADE_AMPLITUDE,
        Math.sin(angle) * SACCADE_AMPLITUDE * 0.6, // less vertical
        0,
      );
    }

    if (_saccadePhase === 1) {
      _saccadeProgress += delta / SACCADE_DURATION;
      if (_saccadeProgress >= 1) {
        _saccadeProgress = 0;
        _saccadePhase = 2;
      }
      const e = easeInOut(Math.min(_saccadeProgress, 1));
      _saccadeOffset.copy(_saccadeDir).multiplyScalar(e);
    } else if (_saccadePhase === 2) {
      _saccadeProgress += delta / (SACCADE_DURATION * 1.5);
      if (_saccadeProgress >= 1) {
        _saccadeProgress = 0;
        _saccadePhase = 0;
        _saccadeOffset.set(0, 0, 0);
      } else {
        const e = 1 - easeInOut(Math.min(_saccadeProgress, 1));
        _saccadeOffset.copy(_saccadeDir).multiplyScalar(e);
      }
    }
  } else {
    _saccadeOffset.set(0, 0, 0);
    _saccadePhase = 0;
  }

  // ── Smooth eye target ─────────────────────────────────────────────────────
  const eyeSpeed = !idle ? EYE_SMOOTH_IN : EYE_SMOOTH_OUT;
  const eyeT = Math.min(eyeSpeed * delta, 1);
  _eyeTarget.lerp(_goalTarget, eyeT);

  // Apply saccade offset to eye target (not head target)
  const eyeWithSaccade = _eyeTarget.clone().add(_saccadeOffset);

  // ── Eyes via three-vrm lookAt ─────────────────────────────────────────────
  vrm.lookAt.autoUpdate = false;
  vrm.lookAt.lookAt(eyeWithSaccade);
  vrm.lookAt.update(delta);

  // ── Head/neck: derive from look direction, lag behind eyes ───────────────
  // IMPORTANT: Do NOT use vrm.lookAt.getLookAtWorldDirection() here — that reads
  // from the already-rotated head bone, creating a feedback loop that causes vibration.
  // Instead, compute yaw/pitch directly from the goal target vs stable head position.
  const headSpeed = !idle ? HEAD_SMOOTH_IN : HEAD_SMOOTH_OUT;
  const headT = Math.min(headSpeed * delta, 1);

  if (idle) {
    _headYaw   += (0 - _headYaw)   * headT;
    _headPitch += (0 - _headPitch) * headT;
  } else {
    // Compute direction from stable head pos to goal target (no bone rotation involved)
    const dx = _goalTarget.x - _stableHeadPos.x;
    const dy = _goalTarget.y - _stableHeadPos.y;
    const dz = _goalTarget.z - _stableHeadPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const yawTarget   = Math.atan2(dx, dz);
    const pitchTarget = -Math.atan2(dy, dist);

    const yawClamped   = Math.max(-MAX_HEAD_YAW,   Math.min(MAX_HEAD_YAW,   yawTarget));
    const pitchClamped = Math.max(-MAX_HEAD_PITCH,  Math.min(MAX_HEAD_PITCH, pitchTarget));

    _headYaw   += (yawClamped   - _headYaw)   * headT;
    _headPitch += (pitchClamped - _headPitch) * headT;
  }

  // Apply to neck (40%) and head (60%)
  if (neckBoneStable) {
    neckBoneStable.rotation.y = _headYaw   * 0.4;
    neckBoneStable.rotation.x = _headPitch * 0.4;
  }

  const hBone = vrm.humanoid.getNormalizedBoneNode('head');
  if (hBone) {
    hBone.rotation.y = _headYaw   * 0.6;
    hBone.rotation.x = _headPitch * 0.6;
  }

  _prevEyeTarget.copy(_eyeTarget);
}
