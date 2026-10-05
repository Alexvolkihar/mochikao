import type { IncomingMessage, ServerResponse } from 'node:http';
import { mochikao } from '../src/index.ts';
import { animals } from '../src/families/animals.ts';
import { produce } from '../src/families/produce.ts';
import { parseParams } from '../src/params.ts';

const FAMILIES = [animals, produce];

const MAX_NAME = 256;

/**
 * GET /api/<nom>.svg?size=&bg=&hue=&tone=&expression=&animate=&family=&shape=&eyes=&mouth=&extra=...
 * Renvoie true si la requête a été traitée.
 */
export function handle(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const match = /^\/api\/(.+)\.svg$/.exec(url.pathname);
  if (!match) return false;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return true;
  }

  let name: string;
  try {
    name = decodeURIComponent(match[1]!);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('nom mal encodé');
    return true;
  }
  if (name.length > MAX_NAME) {
    res.writeHead(414, { 'content-type': 'text/plain; charset=utf-8' }).end('nom trop long');
    return true;
  }

  const svg = mochikao(parseParams(name, url.searchParams, FAMILIES));
  res.writeHead(200, {
    'content-type': 'image/svg+xml; charset=utf-8',
    // Même entrée, même sortie : cacheable pour toujours.
    'cache-control': 'public, max-age=31536000, immutable',
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  res.end(req.method === 'HEAD' ? undefined : svg);
  return true;
}
