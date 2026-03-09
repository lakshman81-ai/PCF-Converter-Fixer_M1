// ══════════════════════════════════════════════
// SMART FIXER — VECTOR MATH (Region A)
// ══════════════════════════════════════════════

export const vec = {
  sub: (a, b) => {
    if (!a || !b) return { x: 0, y: 0, z: 0 };
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },
  add: (a, b) => {
    if (!a || !b) return { x: 0, y: 0, z: 0 };
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },
  scale: (v, s) => {
    if (!v) return { x: 0, y: 0, z: 0 };
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },
  dot: (a, b) => {
    if (!a || !b) return 0;
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },
  cross: (a, b) => {
    if (!a || !b) return { x: 0, y: 0, z: 0 };
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },
  mag: (v) => {
    if (!v) return 0;
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },
  normalize: (v) => {
    if (!v) return { x: 0, y: 0, z: 0 };
    const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return m > 0 ? { x: v.x / m, y: v.y / m, z: v.z / m } : { x: 0, y: 0, z: 0 };
  },
  dist: (a, b) => {
    if (!a || !b) return 0;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  },
  mid: (a, b) => {
    if (!a || !b) return { x: 0, y: 0, z: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
  },
  approxEqual: (a, b, tol = 1.0) => {
    if (!a || !b) return false;
    return Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.z - b.z) <= tol;
  },
  isZero: (v) => {
    if (!v) return true;
    return v.x === 0 && v.y === 0 && v.z === 0;
  },
};
