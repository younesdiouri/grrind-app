// Relais local de QA : simule une réponse perdue après écriture, sans modifier le backend.
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { createServer, request } from 'node:http';

const upstream = new URL(process.env.E2E_API_URL ?? 'http://localhost:8080');
if (!['localhost', '127.0.0.1'].includes(upstream.hostname) || upstream.protocol !== 'http:') {
  throw new Error('Le relais QA accepte seulement une API HTTP locale.');
}
const port = Number(process.env.CHAT_QA_PORT ?? 8090);
const origin = `http://localhost:${port}`;
let loseNextSend = false;
let expireNextSend = false;
let hubUnavailable = false;
const streams = new Set();
mkdirSync('artifacts/e2e', { recursive: true });
const trace = (event) => appendFileSync('artifacts/e2e/chat-network.jsonl',
  `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, { mode: 0o600 });

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/__qa/expire-next-send') {
    expireNextSend = true; res.end('armed'); return;
  }
  if (req.method === 'POST' && req.url === '/__qa/lose-next-send') {
    loseNextSend = true;
    res.end('armed');
    return;
  }
  if (req.method === 'POST' && req.url === '/__qa/toggle-hub') {
    hubUnavailable = !hubUnavailable;
    for (const stream of streams) stream.destroy();
    trace({ event: 'hub-availability', available: !hubUnavailable });
    res.end(hubUnavailable ? 'unavailable' : 'available');
    return;
  }
  const isStream = req.url.startsWith('/.well-known/mercure');
  if (isStream && hubUnavailable) {
    res.writeHead(503); res.end(); return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const isSend = req.method === 'POST' && /\/chat\/messages$/.test(req.url);
  const isSubscription = req.method === 'POST' && /\/chat\/subscription$/.test(req.url);
  if (isSend && expireNextSend) {
    expireNextSend = false;
    trace({ event: 'forced-expired-access', status: 401 });
    res.writeHead(401, { 'Content-Type': 'application/problem+json' });
    res.end(JSON.stringify({ type: 'https://grrind.app/problems/access-token-expired', title: 'QA expired token', status: 401 }));
    return;
  }
  const loseResponse = isSend && loseNextSend;
  if (loseResponse) loseNextSend = false;
  if (isSend) trace({ event: 'send', bodySha256: createHash('sha256').update(body).digest('hex') });
  const forwarded = request(new URL(req.url, upstream), {
    method: req.method, headers: { ...req.headers, host: upstream.host },
  }, (response) => {
    const headers = { ...response.headers };
    if (isStream) {
      trace({ event: 'sse-open', status: response.statusCode });
      streams.add(response);
      response.on('close', () => { streams.delete(response); trace({ event: 'sse-close' }); });
      response.on('data', (chunk) => {
        if (chunk.includes('chat.changed')) trace({ event: 'sse-signal' });
      });
      res.on('close', () => response.destroy());
    }
    if (loseResponse || isSubscription) {
      const data = [];
      response.on('data', (chunk) => data.push(chunk));
      response.on('end', () => {
        if (loseResponse && response.statusCode < 300) {
          trace({ event: 'accepted-response-lost', status: response.statusCode });
          res.writeHead(503, { 'Content-Type': 'application/problem+json', 'Retry-After': '1' });
          res.end(JSON.stringify({ type: 'about:blank', title: 'QA lost response', status: 503 }));
          return;
        }
        let output = Buffer.concat(data);
        if (isSubscription && response.statusCode < 300) {
          const subscription = JSON.parse(output.toString());
          const url = new URL(subscription.url);
          subscription.url = `${origin}${url.pathname}${url.search}`;
          output = Buffer.from(JSON.stringify(subscription));
        }
        delete headers['transfer-encoding'];
        headers['content-length'] = String(output.length);
        res.writeHead(response.statusCode, headers); res.end(output);
      });
    } else {
      trace({ event: 'http', method: req.method, path: req.url.split('?')[0], status: response.statusCode });
      res.writeHead(response.statusCode, headers); response.pipe(res);
    }
  });
  forwarded.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  forwarded.end(body);
}).listen(port, '127.0.0.1', () => console.log(`Relais QA local : ${origin}`));
