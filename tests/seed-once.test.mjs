import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runSeedOnce } = require('../prisma/seed-once.js');

function createPrismaMock(completedMarker = null) {
  const calls = [];
  const tx = {
    $queryRaw: async (query) => calls.push(['lock', query.join('')]),
    seedState: {
      findUnique: async (args) => {
        calls.push(['findUnique', args]);
        return completedMarker;
      },
      create: async (args) => calls.push(['create', args]),
    },
  };

  return {
    calls,
    prisma: {
      $transaction: async (callback, options) => {
        calls.push(['transaction', options]);
        return callback(tx);
      },
    },
  };
}

test('one-time seed acquires a lock, seeds, then records completion', async () => {
  const { calls, prisma } = createPrismaMock();
  let seedCalls = 0;

  const seeded = await runSeedOnce(prisma, async () => {
    seedCalls += 1;
    calls.push(['seed']);
  });

  assert.equal(seeded, true);
  assert.equal(seedCalls, 1);
  assert.deepEqual(calls.map(([name]) => name), [
    'transaction',
    'lock',
    'findUnique',
    'seed',
    'create',
  ]);
  assert.match(calls[1][1], /pg_advisory_xact_lock/);
  assert.match(calls[1][1], /MATERIALIZED/);
  assert.match(calls[1][1], /SELECT 1 AS locked/);
  assert.equal(calls[0][1].timeout, 120_000);
});

test('one-time seed skips an already completed database', async () => {
  const { calls, prisma } = createPrismaMock({ key: 'demo-v1' });
  let seedCalls = 0;

  const seeded = await runSeedOnce(prisma, async () => {
    seedCalls += 1;
  });

  assert.equal(seeded, false);
  assert.equal(seedCalls, 0);
  assert.deepEqual(calls.map(([name]) => name), [
    'transaction',
    'lock',
    'findUnique',
  ]);
});

test('seed failure does not create the completion marker', async () => {
  const { calls, prisma } = createPrismaMock();

  await assert.rejects(
    runSeedOnce(prisma, async () => {
      throw new Error('seed failed');
    }),
    /seed failed/,
  );

  assert.equal(calls.some(([name]) => name === 'create'), false);
});
