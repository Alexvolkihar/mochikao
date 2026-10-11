import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from './handler.ts';

// Point d'entrée Vercel : vercel.json réécrit /api/<nom>.svg vers /api/svg?_name=<nom>.
// On remet l'URL d'origine pour réutiliser le même handler que l'API Node et le dev.
export default function (req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const name = url.searchParams.get('_name') ?? '';
  url.searchParams.delete('_name');
  req.url = `/api/${encodeURIComponent(name)}.svg${url.search}`;
  if (!handle(req, res)) res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('introuvable');
}
