#!/usr/bin/env node
'use strict';
const assert = require('assert');
const M = require('./sync-merge.js');

let passed = 0;
function t(name, fn) {
  fn();
  passed++;
  console.log('ok  ' + name);
}

function localS(over) {
  return Object.assign({
    speed: 1, engine: 'mp3', showKana: true, spd1: 1, turns: 1,
    review: {}, unf: {}, done: {}, quiz: {}
  }, over);
}

// 1. first login: empty cloud + 131 local review items upload intact
t('first login uploads 131 local review items intact', () => {
  const review = {};
  for (let i = 0; i < 131; i++) {
    review['L' + (1 + (i % 18)) + '-T1:' + i] = { n: 1 + (i % 3), t: 1700000000000 + i * 1000, why: i % 2 ? 'idk' : 'quiz' };
  }
  const S = localS({ review, unf: { 'L1-T1:0': 1700000000000 }, done: { '1-T1': true }, quiz: { '1-T1': 80 } });
  const packed = M.packLocal(S, 1800000000000);
  const merged = M.merge(packed, M.emptyPacked());
  assert.strictEqual(Object.keys(merged.review).length, 131);
  for (let i = 0; i < 131; i++) {
    const k = 'L' + (1 + (i % 18)) + '-T1:' + i;
    const src = review[k];
    const got = merged.review[k];
    assert.ok(got && !got.deleted, k + ' missing');
    assert.strictEqual(got.n, src.n);
    assert.strictEqual(got.t, src.t);
    assert.strictEqual(got.why, src.why);
  }
  const S2 = localS({ speed: 1 });
  M.applyToLocal(S2, merged);
  assert.strictEqual(Object.keys(S2.review).length, 131);
  assert.strictEqual(S2.review['L1-T1:0'].why, review['L1-T1:0'].why);
  assert.strictEqual(S2.speed, 1);
});

// 2. union of different keys
t('review union across devices', () => {
  const local = M.packLocal(localS({ review: { a: { n: 1, t: 10, why: 'x' } } }), 10);
  const cloud = M.packLocal(localS({ review: { b: { n: 2, t: 11, why: 'y' } } }), 11);
  const m = M.merge(local, cloud);
  assert.strictEqual(m.review.a.n, 1);
  assert.strictEqual(m.review.b.n, 2);
  assert.ok(!m.review.a.deleted && !m.review.b.deleted);
});

// 3. same key, newer metadata wins
t('same review key keeps most recent timestamp/state', () => {
  const a = { review: { k: { n: 1, t: 100, why: 'old', updatedAt: 100 } }, unf: {}, done: {}, quiz: {}, updatedAt: 100 };
  const b = { review: { k: { n: 3, t: 200, why: 'new', updatedAt: 200 } }, unf: {}, done: {}, quiz: {}, updatedAt: 200 };
  const m = M.merge(a, b);
  assert.strictEqual(m.review.k.n, 3);
  assert.strictEqual(m.review.k.why, 'new');
  assert.strictEqual(m.review.k.t, 200);
});

// 4. un-review (tomb) propagates if newer
t('un-review tomb propagates to the other device', () => {
  const S = localS({ review: { k: { n: 1, t: 100, why: 'x' } } });
  M.tomb(S, 'review', 'k', 300);
  delete S.review.k;
  const packed = M.packLocal(S, 300);
  const cloud = { review: { k: { n: 1, t: 100, why: 'x', updatedAt: 100 } }, unf: {}, done: {}, quiz: {}, updatedAt: 100 };
  const m = M.merge(packed, cloud);
  assert.ok(m.review.k.deleted);
  const S2 = localS({ review: { k: { n: 1, t: 100, why: 'x' } } });
  M.applyToLocal(S2, m);
  assert.ok(!S2.review.k);
  assert.strictEqual(S2.tomb.review.k, 300);
});

// 5. older tomb does not delete newer live
t('older tomb does not remove a newer re-added item', () => {
  const local = { review: { k: { n: 1, t: 400, why: 'again', updatedAt: 400 } }, unf: {}, done: {}, quiz: {}, updatedAt: 400 };
  const cloud = { review: { k: { deleted: true, updatedAt: 300 } }, unf: {}, done: {}, quiz: {}, updatedAt: 300 };
  const m = M.merge(local, cloud);
  assert.ok(!m.review.k.deleted);
  assert.strictEqual(m.review.k.why, 'again');
});

// 6. re-add after local tomb: live wins at pack time, then vs older cloud tomb
t('re-adding a review after tomb keeps the new item', () => {
  const S = localS({ review: {} });
  M.tomb(S, 'review', 'k', 200);
  S.review.k = { n: 1, t: 500, why: 'again' };
  const m = M.merge(M.packLocal(S, 500), { review: { k: { deleted: true, updatedAt: 200 } }, unf: {}, done: {}, quiz: {}, updatedAt: 200 });
  assert.ok(!m.review.k.deleted);
  assert.strictEqual(m.review.k.t, 500);
});

// 7. unf union + uncheck tomb
t('unf union and uncheck tomb propagate', () => {
  const S = localS({ unf: { a: 100 } });
  const cloud = M.packLocal(localS({ unf: { a: 100, b: 150 } }), 150);
  let m = M.merge(M.packLocal(S, 100), cloud);
  assert.strictEqual(m.unf.a.t, 100);
  assert.strictEqual(m.unf.b.t, 150);
  M.tomb(S, 'unf', 'a', 400);
  delete S.unf.a;
  m = M.merge(M.packLocal(S, 400), cloud);
  assert.ok(m.unf.a.deleted);
  assert.ok(!m.unf.b.deleted);
  const S2 = localS({ unf: { a: 100, b: 150 } });
  M.applyToLocal(S2, m);
  assert.ok(!S2.unf.a);
  assert.strictEqual(S2.unf.b, 150);
});

// 8. done union
t('done is a union of live keys', () => {
  const a = M.packLocal(localS({ done: { x: true }, doneAt: { x: 10 } }), 10);
  const b = M.packLocal(localS({ done: { y: true }, doneAt: { y: 20 } }), 20);
  const m = M.merge(a, b);
  assert.ok(m.done.x && !m.done.x.deleted);
  assert.ok(m.done.y && !m.done.y.deleted);
  const S = localS();
  M.applyToLocal(S, m);
  assert.strictEqual(S.done.x, true);
  assert.strictEqual(S.done.y, true);
});

// 9. rsAll tombs wipe cloud progress when newer
t('rsAll tombs remove review, done, quiz on the other device', () => {
  const S = localS({
    review: { k: { n: 1, t: 50, why: 'x' } },
    done: { d: true }, doneAt: { d: 50 },
    quiz: { d: 80 }, quizAt: { d: 50 }
  });
  const cloud = M.packLocal(JSON.parse(JSON.stringify(S)), 50);
  M.tombAll(S, 'review', 90);
  M.tombAll(S, 'done', 90);
  M.tombAll(S, 'quiz', 90);
  S.review = {}; S.done = {}; S.quiz = {};
  const m = M.merge(M.packLocal(S, 90), cloud);
  assert.ok(m.review.k.deleted);
  assert.ok(m.done.d.deleted);
  assert.ok(m.quiz.d.deleted);
  const S2 = localS({ review: { k: { n: 1, t: 50, why: 'x' } }, done: { d: true }, quiz: { d: 80 } });
  M.applyToLocal(S2, m);
  assert.deepStrictEqual(S2.review, {});
  assert.deepStrictEqual(S2.done, {});
  assert.deepStrictEqual(S2.quiz, {});
});

// 10-11. quiz keeps best score
t('quiz keeps the best score even if a later score is lower', () => {
  const a = { review: {}, unf: {}, done: {}, quiz: { d: { score: 90, updatedAt: 10 } }, updatedAt: 10 };
  const b = { review: {}, unf: {}, done: {}, quiz: { d: { score: 60, updatedAt: 80 } }, updatedAt: 80 };
  const m = M.merge(a, b);
  assert.strictEqual(m.quiz.d.score, 90);
  assert.ok(!m.quiz.d.deleted);
});

t('quiz later higher score wins', () => {
  const a = { review: {}, unf: {}, done: {}, quiz: { d: { score: 40, updatedAt: 10 } }, updatedAt: 10 };
  const b = { review: {}, unf: {}, done: {}, quiz: { d: { score: 95, updatedAt: 80 } }, updatedAt: 80 };
  const m = M.merge(a, b);
  assert.strictEqual(m.quiz.d.score, 95);
});

// 12. newer quiz tomb removes it
t('newer quiz tomb removes the score', () => {
  const live = { review: {}, unf: {}, done: {}, quiz: { d: { score: 90, updatedAt: 10 } }, updatedAt: 10 };
  const tomb = { review: {}, unf: {}, done: {}, quiz: { d: { deleted: true, updatedAt: 50 } }, updatedAt: 50 };
  const m = M.merge(live, tomb);
  assert.ok(m.quiz.d.deleted);
});

// 13. pack/apply roundtrip preserves UI shapes
t('pack/apply roundtrip keeps UI shapes and device prefs', () => {
  const S = localS({
    speed: 0.7, engine: 'tts', showKana: false,
    review: { '1-T1:0': { n: 2, t: 123, why: 'idk' } },
    unf: { '1-T1:0': 456 },
    done: { '1-T1': true },
    quiz: { '1-T1': 80 }
  });
  const packed = M.packLocal(S, 1000);
  assert.ok(!('speed' in packed) && !('engine' in packed));
  const S2 = localS({ speed: 0.7, engine: 'tts', showKana: false });
  M.applyToLocal(S2, packed);
  assert.deepStrictEqual(S2.review['1-T1:0'], { n: 2, t: 123, why: 'idk' });
  assert.strictEqual(S2.unf['1-T1:0'], 456);
  assert.strictEqual(S2.done['1-T1'], true);
  assert.strictEqual(S2.quiz['1-T1'], 80);
  assert.strictEqual(S2.speed, 0.7);
  assert.strictEqual(S2.engine, 'tts');
  assert.strictEqual(S2.showKana, false);
});

// 14. equal timestamp prefers live over deleted
t('equal updatedAt prefers live over tomb', () => {
  const a = { review: { k: { n: 1, t: 10, why: 'x', updatedAt: 10 } }, unf: {}, done: {}, quiz: {}, updatedAt: 10 };
  const b = { review: { k: { deleted: true, updatedAt: 10 } }, unf: {}, done: {}, quiz: {}, updatedAt: 10 };
  const m = M.merge(a, b);
  assert.ok(!m.review.k.deleted);
  assert.strictEqual(m.review.k.n, 1);
});

// 15. mergeInto convenience
t('mergeInto writes merged state back onto S', () => {
  const S = localS({ review: { a: { n: 1, t: 10, why: 'x' } } });
  const cloud = M.packLocal(localS({ review: { b: { n: 1, t: 20, why: 'y' } } }), 20);
  M.mergeInto(S, cloud, 30);
  assert.ok(S.review.a && S.review.b);
});

console.log('\n' + passed + ' tests passed');
