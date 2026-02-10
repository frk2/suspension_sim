import { describe, it, expect } from 'vitest';
import {
  axlePosition,
  lowerMountPosition,
  shockLength,
  shockCompression,
  motionRatio,
  springForce,
  wheelRate,
  computeSag,
  fullyExtendedAngle,
  fullyCompressedAngle,
  findPerpendicularAngle,
} from '../src/physics.js';
import { DEFAULTS } from '../src/constants.js';

function makeParams(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}

describe('geometry basics', () => {
  it('axle position at theta=0 is (swingarmLength, 0)', () => {
    const pos = axlePosition(0, 550);
    expect(pos.x).toBeCloseTo(550, 5);
    expect(pos.y).toBeCloseTo(0, 5);
  });

  it('lower mount position at theta=0', () => {
    const pos = lowerMountPosition(0, 250);
    expect(pos.x).toBeCloseTo(250, 5);
    expect(pos.y).toBeCloseTo(0, 5);
  });

  it('shock length is positive', () => {
    const params = makeParams();
    const len = shockLength(0, params);
    expect(len).toBeGreaterThan(0);
  });

  it('fully extended angle gives zero compression', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = shockCompression(ext, params);
    expect(Math.abs(comp)).toBeLessThan(0.1);
  });

  it('fully compressed angle gives compression equal to stroke', () => {
    const params = makeParams();
    const compAngle = fullyCompressedAngle(params);
    const comp = shockCompression(compAngle, params);
    expect(comp).toBeCloseTo(params.shockStroke, 0);
  });
});

describe('motion ratio', () => {
  it('is positive within valid range', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const mid = (ext + comp) / 2;
    const mr = motionRatio(mid, params);
    expect(mr).toBeGreaterThan(0);
  });

  it('is lowest near the perpendicular angle', () => {
    const params = makeParams();
    const perpAngle = findPerpendicularAngle(params);
    const mrPerp = motionRatio(perpAngle, params);

    // Check a few nearby angles have higher MR
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const mrExt = motionRatio(ext, params);
    const mrComp = motionRatio(comp, params);

    expect(mrPerp).toBeLessThanOrEqual(mrExt + 0.001);
    expect(mrPerp).toBeLessThanOrEqual(mrComp + 0.001);
  });

  it('strictly decreases approaching perpendicular from extended side, then increases', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const perpAngle = findPerpendicularAngle(params);

    // 5 angles from extended to perpendicular — MR decreases
    const descending = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const angle = ext + t * (perpAngle - ext);
      descending.push(motionRatio(angle, params));
    }
    for (let i = 1; i < descending.length; i++) {
      expect(descending[i]).toBeLessThan(descending[i - 1] + 0.0001);
    }

    // 5 angles from perpendicular to compressed — MR increases
    const ascending = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const angle = perpAngle + t * (comp - perpAngle);
      ascending.push(motionRatio(angle, params));
    }
    for (let i = 1; i < ascending.length; i++) {
      expect(ascending[i]).toBeGreaterThan(ascending[i - 1] - 0.0001);
    }
  });
});

describe('spring force', () => {
  it('is zero at fully extended with no preload', () => {
    const params = makeParams({ preload: 0 });
    const ext = fullyExtendedAngle(params);
    const force = springForce(ext, params);
    expect(force).toBeCloseTo(0, 0);
  });

  it('increases with compression', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const mid = (ext + comp) / 2;
    const fExt = springForce(ext, params);
    const fMid = springForce(mid, params);
    const fComp = springForce(comp, params);
    expect(fMid).toBeGreaterThan(fExt);
    expect(fComp).toBeGreaterThan(fMid);
  });
});

describe('sag', () => {
  it('increasing spring rate strictly reduces sag', () => {
    const rates = [400, 600, 800, 1000];
    const sags = rates.map((rate) => {
      const params = makeParams({ springRate: rate });
      return computeSag(params).sagMM;
    });
    for (let i = 1; i < sags.length; i++) {
      expect(sags[i]).toBeLessThan(sags[i - 1]);
    }
  });

  it('increasing load strictly increases sag', () => {
    const loads = [100, 150, 200, 250];
    const sags = loads.map((load) => {
      const params = makeParams({ load });
      return computeSag(params).sagMM;
    });
    for (let i = 1; i < sags.length; i++) {
      expect(sags[i]).toBeGreaterThan(sags[i - 1]);
    }
  });

  it('sag is positive with default params', () => {
    const params = makeParams();
    const sag = computeSag(params);
    expect(sag.sagMM).toBeGreaterThan(0);
  });

  it('sag angle is between extended and compressed', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const sag = computeSag(params);
    const minA = Math.min(ext, comp);
    const maxA = Math.max(ext, comp);
    expect(sag.angle).toBeGreaterThanOrEqual(minA - 0.01);
    expect(sag.angle).toBeLessThanOrEqual(maxA + 0.01);
  });
});

describe('wheel rate', () => {
  it('is positive', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const mid = (ext + comp) / 2;
    expect(wheelRate(mid, params)).toBeGreaterThan(0);
  });

  it('equals springRate / MR^2', () => {
    const params = makeParams();
    const ext = fullyExtendedAngle(params);
    const comp = fullyCompressedAngle(params);
    const mid = (ext + comp) / 2;
    const mr = motionRatio(mid, params);
    const wr = wheelRate(mid, params);
    expect(wr).toBeCloseTo(params.springRate / (mr * mr), 2);
  });
});
