import { createServer } from 'node:http';
import { handle } from './handler.ts';

const port = Number(process.env.PORT ?? 8787);

createServer((req, res) => {
  if (req.url === '/health') return void res.end('ok');
  if (!handle(req, res)) res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('introuvable — essaie /api/alex.svg');
}).listen(port, () => {
  console.log(`mochikao api → http://localhost:${port}/api/alex.svg?bg=circle`);
});
