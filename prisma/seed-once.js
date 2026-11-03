const SEED_KEY = 'demo-v1';

function redactConnectionStrings(value) {
  return value.replace(/\bpostgres(?:ql)?:\/\/[^\s"'`]+|\bmysql:\/\/[^\s"'`]+/gi, '[redacted database URL]');
}

function getCallSite() {
  return new Error().stack
    ?.split('\n')
    .slice(1)
    .filter((line) => !line.includes('getCallSite') && !line.includes('node_modules'))
    .slice(0, 5)
    .join('\n');
}

function reportOperationError(model, action, callSite, error) {
  const cause = error instanceof Error ? error : new Error(String(error));
  console.error(JSON.stringify({
    event: 'Prisma seed operation failed',
    model,
    action,
    callSite,
    error: {
      name: cause.name,
      message: redactConnectionStrings(cause.message),
      code: cause.code,
    },
  }, null, 2));
}

function addQueryDiagnostics(client) {
  return new Proxy(client, {
    get(target, property) {
      const value = Reflect.get(target, property, target);

      if (typeof value === 'function' && typeof property === 'string' && property.startsWith('$')) {
        return async (...args) => {
          const callSite = getCallSite();
          try {
            return await value.apply(target, args);
          } catch (error) {
            reportOperationError('database', property, callSite, error);
            throw error;
          }
        };
      }

      if (!value || typeof value !== 'object') {
        return value;
      }

      return new Proxy(value, {
        get(delegate, action) {
          const operation = Reflect.get(delegate, action, delegate);
          if (typeof operation !== 'function') {
            return operation;
          }

          return async (...args) => {
            const callSite = getCallSite();
            try {
              return await operation.apply(delegate, args);
            } catch (error) {
              reportOperationError(String(property), String(action), callSite, error);
              throw error;
            }
          };
        },
      });
    },
  });
}

async function runSeedOnce(prisma, seed) {
  return prisma.$transaction(async (tx) => {
    const db = addQueryDiagnostics(tx);
    await db.$queryRaw`
      WITH advisory_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(202611031403::bigint)
      )
      SELECT 1 AS locked FROM advisory_lock
    `;

    const completed = await db.seedState.findUnique({
      where: { key: SEED_KEY },
      select: { key: true },
    });

    if (completed) {
      return false;
    }

    await seed(db);
    await db.seedState.create({ data: { key: SEED_KEY } });
    return true;
  }, {
    maxWait: 10_000,
    timeout: 120_000,
  });
}

module.exports = { runSeedOnce };
