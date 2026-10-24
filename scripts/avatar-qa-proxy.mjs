// Local QA only: forward to the running backend, fail the first avatar PATCH before saving.
// node scripts/avatar-qa-proxy.mjs ; E2E_API_URL=http://localhost:8099 for dev and flow.
import { createServer } from 'node:http';

let failNextSave = true;
createServer(async (request, response) => {
  try {
    if (!request.url?.startsWith('/')) { response.writeHead(400).end(); return; }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (failNextSave && request.method === 'PATCH' && request.url === '/api/me' && JSON.parse(body).avatar) {
      failNextSave = false;
      console.log('Injected avatar save network failure; retry will reach the backend.');
      request.socket.destroy();
      return;
    }
    const headers = { ...request.headers }; delete headers.host;
    const upstream = await fetch(`http://127.0.0.1:8080${request.url}`, {
      method: request.method, headers, body: body.length ? body : undefined, redirect: 'manual',
    });
    const outgoing = Object.fromEntries([...upstream.headers].filter(([key]) =>
      !['content-encoding', 'content-length', 'transfer-encoding'].includes(key)));
    response.writeHead(upstream.status, outgoing).end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  }
}).listen(8099, '127.0.0.1', () => console.log('Avatar QA proxy on 127.0.0.1:8099 → local backend 8080'));
