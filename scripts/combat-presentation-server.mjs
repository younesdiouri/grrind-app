// Serveur de test uniquement : réponses synthétiques de présentation sur une timeline capturée.
// node scripts/combat-presentation-server.mjs ; puis .maestro/combat-presentation.yaml.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const battle = JSON.parse(readFileSync(new URL('../fixtures/battle/victoire.json', import.meta.url)));
const images = Object.fromEntries(['idle', 'attack', 'hit'].map((pose) => [pose,
  readFileSync(new URL(`../assets/images/enemies/al-kasal/${pose}.png`, import.meta.url))]));
const scenarios = new Set(['complete', 'dialogue', 'missing', 'slow', 'silent', 'legacy']);
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path.startsWith('/battle/')) {
    const scenario = path.slice('/battle/'.length);
    if (!scenarios.has(scenario)) { response.writeHead(404).end(); return; }
    const imageUrls = Object.fromEntries(Object.keys(images).map((pose) => [pose,
      `http://127.0.0.1:8099/images/${scenario}/${pose}.png`]));
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ ...battle, enemy: { ...battle.enemy, name: 'Gardien du repos',
      ...(scenario === 'legacy' ? {} : {
        imageUrls: scenario === 'dialogue' ? null : imageUrls,
        introduction: scenario === 'silent' ? null : 'Cette réplique vient de la réponse du combat.',
      }),
    } }));
    return;
  }
  const match = path.match(/^\/images\/([a-z]+)\/(idle|attack|hit)\.png$/);
  if (!match || match[1] === 'missing') { response.writeHead(404).end(); return; }
  const send = () => {
    response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    response.end(images[match[2]]);
  };
  if (match[1] === 'slow') {
    const timer = setTimeout(send, 15_000);
    response.on('close', () => clearTimeout(timer));
  } else send();
});
server.listen(8099, '127.0.0.1', () => console.log('Scénarios de présentation sur http://127.0.0.1:8099'));
