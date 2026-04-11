import Redis from "ioredis";

const SESSION_CACHE_TTL_SECONDS = 60 * 60 * 24;

function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!globalThis.__scoutclawRedis) {
    globalThis.__scoutclawRedis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }

  return globalThis.__scoutclawRedis;
}

export async function cacheSessionState(sessionKey, state) {
  const client = getRedisClient();
  if (!client || !sessionKey) {
    return;
  }

  try {
    if (client.status !== "ready") {
      await client.connect();
    }
    await client.set(getSessionCacheKey(sessionKey), JSON.stringify(state), "EX", SESSION_CACHE_TTL_SECONDS);
  } catch {
    return;
  }
}

export async function getCachedSessionState(sessionKey) {
  const client = getRedisClient();
  if (!client || !sessionKey) {
    return null;
  }

  try {
    if (client.status !== "ready") {
      await client.connect();
    }
    const raw = await client.get(getSessionCacheKey(sessionKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSessionCacheKey(sessionKey) {
  return `scoutclaw:session:${sessionKey}`;
}
