import { api } from '@/api/client';
import type { EquipmentSlot } from '@/design/tokens';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import type { Inventory } from './inventory.ts';

export type EquipmentOutcome =
  | { ok: true; inventory: Inventory }
  | { ok: false; failure: Failure };

/**
 * `PUT /api/inventory/equipment/{slot}` — porter un objet.
 *
 * **La réponse est l'inventaire entier**, et c'est ce qui fait tout l'intérêt de ces deux
 * fonctions : l'échange — l'ancien occupant de l'emplacement qui retourne au sac — est déjà
 * décidé côté serveur, dans la même transaction. Le rejouer localement serait le décider une
 * seconde fois, différemment, et les deux versions divergeraient au premier cas tordu (un
 * objet en double, un emplacement libéré par ailleurs). L'appelant remplace donc son état par
 * `inventory`, il ne le rapièce pas.
 *
 * **Idempotent** : réappliquer le même objet au même emplacement rend le même état, pas une
 * erreur. Aucun garde ici pour un cas que le serveur traite déjà — vérifier avant d'envoyer
 * ferait dépendre le geste d'un sac qui peut avoir dix minutes de retard.
 */
export async function equipItem(slot: EquipmentSlot, itemKey: string): Promise<EquipmentOutcome> {
  try {
    const { data, error } = await api.PUT('/api/inventory/equipment/{slot}', {
      params: { path: { slot } },
      body: { itemKey },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, inventory: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}

/**
 * `DELETE /api/inventory/equipment/{slot}` — libérer un emplacement.
 *
 * Idempotent lui aussi : « le vider alors qu'il l'était déjà rend la même réponse », dit le
 * contrat. L'objet retourne au sac, il ne disparaît pas — rien ne se vend ni ne se jette en v1.
 */
export async function unequipSlot(slot: EquipmentSlot): Promise<EquipmentOutcome> {
  try {
    const { data, error } = await api.DELETE('/api/inventory/equipment/{slot}', {
      params: { path: { slot } },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, inventory: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
