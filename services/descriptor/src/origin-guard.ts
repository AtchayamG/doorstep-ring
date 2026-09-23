import type { NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';

/**
 * Who may call this service from a browser.
 *
 * /api/describe runs Amazon Bedrock inference on the operator's AWS account,
 * and the service holds a Ring Developers Playground token. It used to answer
 * every origin with `Access-Control-Allow-Origin: *` and listen on every
 * network interface, so any web page the operator had open - or anyone on the
 * same network - could drive Bedrock calls billed to that account.
 *
 *  1. Origin allowlist, enforced on the server. Browsers attach Origin to
 *     cross-site writes and pages cannot forge it; CORS headers alone only
 *     stop the attacker reading the reply, after the call has already run.
 *     The service's own origin is always allowed, because it also serves the
 *     built surface itself.
 *  2. Host allowlist, against DNS rebinding.
 *
 * A request with no Origin is a non-browser caller already on this machine
 * (curl, the ops scripts, the test suite) and is allowed.
 */

const DEFAULT_ORIGINS = [
  'http://127.0.0.1:5174',
  'http://localhost:5174',
  'http://127.0.0.1:4174',
  'http://localhost:4174'
];

const DEFAULT_HOSTNAMES = ['127.0.0.1', 'localhost', '[::1]', '::1'];

function fromEnv(name: string): string[] | null {
  const raw = process.env[name];
  if (!raw) return null;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function allowedOrigins(): string[] {
  return fromEnv('DOORSTEP_ALLOWED_ORIGINS') ?? DEFAULT_ORIGINS;
}

export function allowedHostnames(): string[] {
  return fromEnv('DOORSTEP_ALLOWED_HOSTS') ?? DEFAULT_HOSTNAMES;
}

function hostnameOf(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null;
  if (hostHeader.startsWith('[')) {
    const end = hostHeader.indexOf(']');
    return end > 0 ? hostHeader.slice(0, end + 1) : hostHeader;
  }
  return hostHeader.split(':')[0].toLowerCase();
}

function isAllowedOrigin(origin: string, hostHeader: string | undefined): boolean {
  if (allowedOrigins().includes(origin)) return true;
  // Same-origin: the built surface served by this process at its own address.
  return !!hostHeader && (origin === `http://${hostHeader}` || origin === `https://${hostHeader}`);
}

export function originGuard(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const host = hostnameOf(req.headers.host);
    if (!host || !allowedHostnames().includes(host)) {
      return res.status(403).json({
        error: `Host "${req.headers.host ?? ''}" is not allowed`,
        code: 'HOST_NOT_ALLOWED'
      });
    }
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin, req.headers.host)) {
      return res.status(403).json({
        error: `Origin "${origin}" is not allowed to use this service`,
        code: 'ORIGIN_NOT_ALLOWED'
      });
    }
    return next();
  };
}

/** CORS grants only for allowlisted or same origins - never "*". */
export function corsForAllowedOrigins(): RequestHandler {
  return (req, res, next) =>
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, false);
        return callback(null, isAllowedOrigin(origin, req.headers.host) ? origin : false);
      }
    })(req, res, next);
}
