// Serveur de test uniquement : réponses synthétiques de présentation sur une timeline capturée.
// node scripts/combat-presentation-server.mjs ; puis .maestro/combat-presentation.yaml.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const battle = JSON.parse(readFileSync(new URL('../fixtures/battle/victoire.json', import.meta.url)));
const images = Object.fromEntries(['idle', 'attack', 'hit'].map((pose) => [pose,
  readFileSync(new URL(`../assets/images/enemies/al-kasal/${pose}.png`, import.meta.url))]));
const scenarios = new Set(['complete', 'dialogue', 'missing', 'slow', 'silent', 'legacy', 'effects', 'limit', 'long']);
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path.startsWith('/battle/')) {
    const scenario = path.slice('/battle/'.length);
    if (!scenarios.has(scenario)) { response.writeHead(404).end(); return; }
    const imageUrls = Object.fromEntries(Object.keys(images).map((pose) => [pose,
      `http://127.0.0.1:8099/images/${scenario}/${pose}.png`]));
    response.setHeader('Content-Type', 'application/json');
    const sample = ['effects', 'limit', 'long'].includes(scenario) ? synthetic(scenario) : battle;
    response.end(JSON.stringify({ ...sample, enemy: { ...sample.enemy, name: 'Gardien du repos',
      ...(scenario === 'legacy' ? {} : {
        imageUrls: scenario === 'dialogue' ? null : imageUrls,
        introduction: ['silent', 'effects', 'limit', 'long'].includes(scenario) ? null : 'Cette réplique vient de la réponse du combat.',
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

// Valeurs choisies pour la QA de présentation, pas un simulateur de règles métier.
function synthetic(scenario) {
  const events = [
    { type: 'BATTLE_STARTED', playerHp: 140, enemyHp: 120 },
    { type: 'DODGE', attacker: 'PLAYER', atTick: 1000, actionIndex: 1, attackIndex: 1, powerPermille: 990 },
    { type: 'COMBO', actor: 'PLAYER', atTick: 1000, actionIndex: 1, attackIndex: 2 },
    { type: 'ATTACK', attacker: 'PLAYER', atTick: 1000, actionIndex: 1, attackIndex: 2, damage: 24, mitigated: 4,
      critical: true, guarded: true, guardReduction: 24, powerPermille: 950, targetHpRemaining: 96 },
    { type: 'COMBO', actor: 'PLAYER', atTick: 1000, actionIndex: 1, attackIndex: 3 },
    { type: 'ATTACK', attacker: 'PLAYER', atTick: 1000, actionIndex: 1, attackIndex: 3, damage: 12,
      powerPermille: 900, targetHpRemaining: 84 },
    { type: 'DODGE', attacker: 'ENEMY', atTick: 1100, actionIndex: 2, attackIndex: 4, powerPermille: 980 },
    { type: 'COMBO', actor: 'ENEMY', atTick: 1100, actionIndex: 2, attackIndex: 5 },
    { type: 'ATTACK', attacker: 'ENEMY', atTick: 1100, actionIndex: 2, attackIndex: 5, damage: 30, mitigated: 6,
      critical: true, guarded: true, guardReduction: 30, powerPermille: 880, targetHpRemaining: 110 },
  ];
  if (scenario === 'long') {
    for (let index = 6; index <= 10000; index++) events.push({ type: 'DODGE', attacker: index % 2 ? 'PLAYER' : 'ENEMY',
      atTick: index * 1000, actionIndex: index - 3, attackIndex: index, powerPermille: 500 });
  }
  const limit = scenario !== 'effects';
  if (!limit) events.push({ type: 'ATTACK', attacker: 'PLAYER', atTick: 2000, actionIndex: 3,
    attackIndex: 6, damage: 84, targetHpRemaining: 0, powerPermille: 800 });
  const attackCount = scenario === 'long' ? 10000 : limit ? 5 : 6;
  const actionCount = scenario === 'long' ? 9997 : limit ? 2 : 3;
  const elapsedTicks = scenario === 'long' ? 10000000 : limit ? 1100 : 2000;
  const endReason = limit ? 'ATTACK_LIMIT' : 'KO';
  events.push({ type: 'BATTLE_FINISHED', result: 'VICTORY', endReason, attackCount, actionCount, atTick: elapsedTicks });
  return { ...battle, id: `synthetic-${scenario}`, events, attackCount, actionCount, elapsedTicks, endReason,
    player: { ...battle.player, hp: 140 }, enemy: { ...battle.enemy, hp: 120 },
    rewards: { loot: [], coins: { gained: 0, before: 0, after: 0 } } };
}
