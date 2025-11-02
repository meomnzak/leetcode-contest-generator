// src/selectGoogleContest.ts
import pool from "../google_pool.json" assert { type: "json" };

export type Mix = { easy: number; medium: number; hard: number };
export type ContestSpec = {
  durationMinutes: number;
  problems: number;
  mix?: Mix; // overrides default
};

function sample<T>(arr: T[], k: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

export function buildContest(spec?: Partial<ContestSpec>) {
  const conf = {
    durationMinutes: spec?.durationMinutes ?? pool.defaultContest.durationMinutes,
    mix: spec?.mix ?? pool.defaultContest.mix
  };
  const byDiff = { easy: [], medium: [], hard: [] } as Record<string, any[]>;
  for (const p of pool.problems) byDiff[p.difficulty].push(p);

  const pick = [
    ...sample(byDiff.easy, conf.mix.easy),
    ...sample(byDiff.medium, conf.mix.medium),
    ...sample(byDiff.hard, conf.mix.hard)
  ];

  // Shuffle final order: E→M→H order can hint difficulty
  const final = sample(pick, pick.length);

  return {
    name: `${pool.meta.name} — ${conf.mix.easy}/${conf.mix.medium}/${conf.mix.hard} — ${conf.durationMinutes}m`,
    durationMinutes: conf.durationMinutes,
    problems: final.map(p => ({
      slug: p.slug,
      url: `https://leetcode.com/problems/${p.slug}/`,
      difficulty: p.difficulty,
      tags: p.tags
    }))
  };
}
