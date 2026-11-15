import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Children, createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';
import { Button } from './Button.tsx';
import { PlayerProfile } from './PlayerProfile.tsx';
import { PlayerIdentity } from './PlayerIdentity.tsx';

const player = { displayName: 'Sam', title: null, level: 80, avatar: DEFAULT_AVATAR,
  league: { tier: 'BRONZE' as const, tierOrder: 0, lootLuckPercent: 0 }, guild: null };

test('le profil public garde identité, défi et avatar seul, sans inventaire ni statistiques', () => {
  const markup = renderToStaticMarkup(createElement(PlayerProfile, {
    player,
    equipment: { HEAD: { key: 'BANDEAU_ECLAIR', artworkVersion: null },
      WEAPON: { key: 'FER_PLAY', artworkVersion: null } },
    action: createElement(Button, { label: 'Défier', onPress() {} }),
  }));
  assert.match(markup, /Ligue Bronze/);
  assert.ok(!markup.includes('>Ligue Bronze<'), 'La ligue reste accessible sans libellé redondant');
  assert.ok(markup.includes('Sans guilde'), 'Un joueur sans guilde reste explicite');
  assert.ok(!markup.includes('role="link"'), 'Aucun lien de guilde sans adhésion');
  assert.equal([...markup.matchAll(/Niveau 80/g)].length, 1);
  assert.match(markup, /Défier/);
  assert.equal([...markup.matchAll(/role="button"/g)].length, 1);
  assert.doesNotMatch(markup, /Équipement|Sac|Statistiques|Voir le personnage en 3D|Vitalité|Progression du personnage/);
  assert.match(markup, /Portrait de Sam[^"<]*Bandeau éclair/);
});

test('le nom de guilde long garde son nom accessible complet et déclenche son ouverture', () => {
  const guild = { id: 'guild', name: 'Les sportifs qui continuent au-delà des montagnes' };
  let opened = 0;
  const props = { player: { ...player, guild }, onGuildPress: () => { opened += 1; } };
  const markup = renderToStaticMarkup(createElement(PlayerProfile, { ...props, equipment: {} }));
  assert.ok(markup.includes(`aria-label="Ouvrir la guilde ${guild.name}"`), 'Le nom accessible est complet');
  assert.ok(markup.includes('role="link"'), 'La guilde est un lien');
  const identity = PlayerIdentity(props);
  const link = Children.toArray(identity.props.children).find(child =>
    isValidElement<{ accessibilityRole?: string }>(child) && child.props.accessibilityRole === 'link');
  assert.ok(isValidElement<{ onPress(): void }>(link), 'Le lien est actionnable');
  link.props.onPress();
  assert.equal(opened, 1);
});

test('son propre profil conserve Ma semaine sans remettre le texte de ligue', () => {
  const markup = renderToStaticMarkup(createElement(PlayerProfile, { player, equipment: {}, onLeaguePress() {} }));
  assert.ok(markup.includes('Ligue Bronze · Ma semaine'));
  assert.ok(markup.includes('Ma semaine ›'));
  assert.ok(!markup.includes('>Ligue Bronze'));
});
