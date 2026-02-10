/**
 * Pure physics functions for motorcycle rear suspension simulation.
 *
 * Coordinate system: origin at swingarm pivot, +X right, +Y up.
 * Swingarm angle θ measured from horizontal (negative = wheel below pivot).
 */

export function axlePosition(theta, swingarmLength) {
  return {
    x: swingarmLength * Math.cos(theta),
    y: swingarmLength * Math.sin(theta),
  };
}

export function lowerMountPosition(theta, lowerMountDist) {
  return {
    x: lowerMountDist * Math.cos(theta),
    y: lowerMountDist * Math.sin(theta),
  };
}

export function shockLength(theta, params) {
  const lower = lowerMountPosition(theta, params.lowerMountDist);
  const dx = params.upperMountX - lower.x;
  const dy = params.upperMountY - lower.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function shockCompression(theta, params) {
  return params.shockFreeLength - shockLength(theta, params);
}

/**
 * Find swingarm angle where shock reaches a target length.
 * Uses bisection search over a wide angular range.
 */
export function findAngleForShockLength(targetLength, params) {
  // Search from -90° to +45° (covers any reasonable swingarm position)
  let lo = -Math.PI / 2;
  let hi = Math.PI / 4;

  // Determine which direction shock length changes
  const lenLo = shockLength(lo, params);
  const lenHi = shockLength(hi, params);

  // If target is outside the range, clamp
  if ((targetLength - lenLo) * (targetLength - lenHi) > 0) {
    // Target not bracketed — find the closer end
    return Math.abs(targetLength - lenLo) < Math.abs(targetLength - lenHi) ? lo : hi;
  }

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const lenMid = shockLength(mid, params);
    if (Math.abs(lenMid - targetLength) < 0.001) return mid;

    if ((lenMid - targetLength) * (lenLo - targetLength) < 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

/** Angle where shock is fully extended (zero compression). */
export function fullyExtendedAngle(params) {
  return findAngleForShockLength(params.shockFreeLength, params);
}

/** Angle where shock is fully compressed (max compression = stroke). */
export function fullyCompressedAngle(params) {
  return findAngleForShockLength(params.shockFreeLength - params.shockStroke, params);
}

/**
 * Instantaneous motion ratio: |Δaxle_y / Δshock_compression|
 * Convention: wheel travel / shock travel (>1 means wheel moves more than shock)
 */
export function motionRatio(theta, params) {
  const eps = 0.0001;
  const compPlus = shockCompression(theta + eps, params);
  const compMinus = shockCompression(theta - eps, params);
  const axlePlus = axlePosition(theta + eps, params.swingarmLength);
  const axleMinus = axlePosition(theta - eps, params.swingarmLength);
  const dComp = compPlus - compMinus;
  const dAxleY = axlePlus.y - axleMinus.y;
  if (Math.abs(dComp) < 1e-10) return 0;
  return Math.abs(dAxleY / dComp);
}

/**
 * Spring force at a given swingarm angle (lbs).
 * Force = springRate × (compression + preload) converted to inches.
 */
export function springForce(theta, params) {
  const comp_mm = shockCompression(theta, params);
  const comp_inches = (comp_mm + params.preload) / 25.4;
  return params.springRate * Math.max(0, comp_inches);
}

/**
 * Wheel rate at a given angle (lbs/inch).
 * wheelRate = springRate / MR²
 */
export function wheelRate(theta, params) {
  const mr = motionRatio(theta, params);
  if (mr < 1e-10) return 0;
  return params.springRate / (mr * mr);
}

/**
 * Compute the angle at which the shock is perpendicular to the swingarm.
 * This is where MR is minimized (shock moves most per unit wheel travel).
 * Uses golden-section search for minimum.
 */
export function findPerpendicularAngle(params) {
  const extAngle = fullyExtendedAngle(params);
  const compAngle = fullyCompressedAngle(params);
  let a = Math.min(extAngle, compAngle);
  let b = Math.max(extAngle, compAngle);

  const gr = (Math.sqrt(5) + 1) / 2;
  const tol = 1e-8;

  let c = b - (b - a) / gr;
  let d = a + (b - a) / gr;

  while (Math.abs(b - a) > tol) {
    if (motionRatio(c, params) < motionRatio(d, params)) {
      b = d;
    } else {
      a = c;
    }
    c = b - (b - a) / gr;
    d = a + (b - a) / gr;
  }
  return (a + b) / 2;
}

/**
 * Compute sag: the vertical axle drop from fully extended to equilibrium.
 *
 * Walk from fully extended angle in small steps. At each step, compare:
 *   - Spring torque about pivot (shock force × perpendicular lever arm)
 *   - Load torque about pivot (load × horizontal distance to axle)
 * Equilibrium when spring torque >= load torque.
 */
export function computeSag(params) {
  const extAngle = fullyExtendedAngle(params);
  const compAngle = fullyCompressedAngle(params);

  // Determine step direction (extended → compressed)
  const step = extAngle < compAngle ? 0.0005 : -0.0005;
  const extAxle = axlePosition(extAngle, params.swingarmLength);

  let theta = extAngle;
  const limit = extAngle < compAngle ? compAngle : compAngle;

  for (let i = 0; i < 200000; i++) {
    theta += step;

    // Check if we've gone past the compressed limit
    if (step > 0 && theta > compAngle) break;
    if (step < 0 && theta < compAngle) break;

    // Spring force along shock axis
    const sf = springForce(theta, params);
    if (sf <= 0) continue;

    // Shock direction vector (lower mount → upper mount)
    const lower = lowerMountPosition(theta, params.lowerMountDist);
    const dx = params.upperMountX - lower.x;
    const dy = params.upperMountY - lower.y;
    const shockLen = Math.sqrt(dx * dx + dy * dy);
    const shockUnitX = dx / shockLen;
    const shockUnitY = dy / shockLen;

    // Torque from shock about pivot = r × F (cross product z-component)
    // r = vector from pivot (origin) to lower mount
    // F = sf * shockUnit (force along shock toward upper mount, compressive)
    const springTorque = Math.abs(lower.x * shockUnitY - lower.y * shockUnitX) * sf;

    // Torque from load about pivot
    // Load is downward at the axle
    const axle = axlePosition(theta, params.swingarmLength);
    const loadTorque = params.load * Math.abs(axle.x);

    if (springTorque >= loadTorque) {
      const sagMM = axle.y - extAxle.y;
      return { angle: theta, sagMM };
    }
  }

  // If we never found equilibrium, the suspension bottoms out
  const compAxle = axlePosition(compAngle, params.swingarmLength);
  return { angle: compAngle, sagMM: compAxle.y - extAxle.y };
}
