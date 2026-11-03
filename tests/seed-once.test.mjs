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

test('database errors log the Prisma operation and source call site', async () => {
  const { prisma } = createPrismaMock();
  const tx = {
    $queryRaw: async () => [],
    seedState: {
      findUnique: async () => null,
      create: async () => {},
    },
    user: {
      upsert: async () => {
        throw new Error('Unique constraint failed');
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  const originalConsoleError = console.error;
  const messages = [];
  console.error = (message) => messages.push(message);

  try {
    await assert.rejects(
      runSeedOnce(prisma, async (db) => db.user.upsert({ where: { id: 'demo' } })),
      /Unique constraint failed/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(messages.length, 1);
  const diagnostic = JSON.parse(messages[0]);
  assert.equal(diagnostic.event, 'Prisma seed operation failed');
  assert.equal(diagnostic.model, 'user');
  assert.equal(diagnostic.action, 'upsert');
  assert.match(diagnostic.callSite, /seed-once\.test\.mjs/);
  assert.equal(diagnostic.error.message, 'Unique constraint failed');
});

test('database URLs are redacted from Prisma error logs', async () => {
  const { prisma } = createPrismaMock();
  const tx = {
    $queryRaw: async () => [],
    seedState: {
      findUnique: async () => null,
      create: async () => {},
    },
    user: {
      upsert: async () => {
        throw new Error('Connection failed: postgresql://user:secret@example.com/db');
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  const originalConsoleError = console.error;
  const messages = [];
  console.error = (message) => messages.push(message);

  try {
    await assert.rejects(
      runSeedOnce(prisma, async (db) => db.user.upsert({ where: { id: 'demo' } })),
      /Connection failed/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.doesNotMatch(messages[0], /user:secret/);
  assert.match(messages[0], /\[redacted database URL\]/);
});
