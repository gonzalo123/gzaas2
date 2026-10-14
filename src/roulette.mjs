// Style roulette: fast flashes that decelerate and land on a chosen preset.
export const ROULETTE_STEPS = 7;

// Delays ease out from ~70 ms to ~380 ms (≈1.4 s in total).
export function rouletteSchedule(steps = ROULETTE_STEPS) {
  const first = 70, last = 380;
  return Array.from({length: steps}, (_, i) => {
    const t = steps === 1 ? 1 : i / (steps - 1);
    return Math.round(first + (last - first) * t * t);
  });
}

// Indices of the presets flashed before landing on `finalIndex`.
// No index repeats consecutively and none equals the final one.
export function rouletteSequence(count, finalIndex, steps = ROULETTE_STEPS, random = Math.random) {
  if (count < 3) return [];
  const sequence = [];
  let previous = -1;
  for (let i = 0; i < steps - 1; i++) {
    const pool = [];
    for (let c = 0; c < count; c++) if (c !== previous && c !== finalIndex) pool.push(c);
    previous = pool[Math.floor(random() * pool.length)];
    sequence.push(previous);
  }
  return sequence;
}
