const rateLimitStore = new Map();

export function validateRequiredEnv() {
  const required = ['DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key] || !String(process.env[key]).trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

export function getSecureCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  };
}

export function getClientIp(request) {
  const forwarded = request?.headers?.get?.('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request?.headers?.get?.('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown-client';
}

export function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, 255) || fallback;
}

export function checkRateLimit(key, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return { allowed: true, remaining: limit - entry.count };
}
