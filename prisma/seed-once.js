const SEED_KEY = 'demo-v1';

async function runSeedOnce(prisma, seed) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      WITH advisory_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(202611031403::bigint)
      )
      SELECT 1 AS locked FROM advisory_lock
    `;

    const completed = await tx.seedState.findUnique({
      where: { key: SEED_KEY },
      select: { key: true },
    });

    if (completed) {
      return false;
    }

    await seed(tx);
    await tx.seedState.create({ data: { key: SEED_KEY } });
    return true;
  }, {
    maxWait: 10_000,
    timeout: 120_000,
  });
}

module.exports = { runSeedOnce };
