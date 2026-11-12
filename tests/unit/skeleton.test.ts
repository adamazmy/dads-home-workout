import { describe, expect, it } from 'vitest';
import { checkTimeline } from '../../src/anim/checks';
import { BODY, STANDING, dist, elbowFlexion, kneeFlexion, solve, solveTwoBone, vec, wrap } from '../../src/anim/skeleton';
import { Timeline, easeInOut } from '../../src/anim/timeline';
import * as anims from '../../src/data/animations';

describe('skeleton maths', () => {
  it('wraps angles into (-180, 180]', () => {
    expect(wrap(190)).toBe(-170);
    expect(wrap(-180)).toBe(180);
    expect(wrap(720)).toBe(0);
  });

  it('stands with feet flat on the floor and the hip at ~53% of height', () => {
    const f = solve({ pose: STANDING, anchorMode: 'feet', anchor: vec(0, BODY.ankleH) });
    expect(f.legN.heel.y).toBeCloseTo(0, 5);
    expect(f.legN.toe.y).toBeCloseTo(0, 5);
    expect(f.hip.y / 175).toBeCloseTo(0.53, 2);
    expect(f.head.y + BODY.headR).toBeCloseTo(175, -1);
  });

  it('IK reaches a reachable target and bends the joint the anatomical way', () => {
    const root = vec(0, 90);
    const target = vec(30, 20);
    const [a1, a2] = solveTwoBone(root, target, BODY.thigh, BODY.shin, 'leg');
    expect(kneeFlexion([a1, a2, 90])).toBeGreaterThan(0);
    const arm = solveTwoBone(vec(0, 140), vec(25, 130), BODY.upperArm, BODY.forearm + BODY.grip, 'arm');
    expect(elbowFlexion(arm)).toBeGreaterThan(0);
  });

  it('keeps pinned hands on target', () => {
    const f = solve({
      pose: { ...STANDING, torso: 60 },
      anchorMode: 'feet',
      anchor: vec(0, BODY.ankleH),
      pins: { armF: { world: vec(40, 60) } },
    });
    expect(dist(f.armF.hand, vec(40, 60))).toBeLessThan(0.01);
  });

  it('eases in and out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
});

describe('exercise animations', () => {
  for (const [name, anim] of Object.entries(anims)) {
    it(`${name}: anatomically valid at every keyframe and through every transition`, () => {
      expect(checkTimeline(new Timeline(anim), 240)).toEqual([]);
    });

    // The carry is a walk, not a lift: it has no lowering phase.
    it.skipIf(name === 'carry')(`${name}: tempo is slow (a phase ≥ 1.5 s, loop ≥ 4 s)`, () => {
      const tl = new Timeline(anim);
      expect(tl.duration).toBeGreaterThanOrEqual(4);
      expect(Math.max(...anim.keyframes.map((k) => k.dur))).toBeGreaterThanOrEqual(1.5);
    });
  }

  it('planted feet never slide (feet-anchored exercises)', () => {
    for (const anim of Object.values(anims).filter((a) => a.anchorMode === 'feet')) {
      const tl = new Timeline(anim);
      const ref = tl.sample(0).figure.legN.ankle;
      for (let i = 0; i < 100; i++) {
        expect(dist(tl.sample((tl.duration * i) / 100).figure.legN.ankle, ref)).toBeLessThan(0.01);
      }
    }
  });
});
