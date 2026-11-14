/** Les clés encore rejouables, indexées par intention plutôt que par un « dernier geste ». */
export type ActionKeyRecord = Record<string, string>;

export type ActionKeysDeps = {
  read: () => Promise<ActionKeyRecord>;
  write: (record: ActionKeyRecord) => Promise<void>;
  mint: () => string;
};

export type ActionKeys = {
  keyFor: (intention: string, legacyIntention?: string) => Promise<string>;
  forget: (intention: string) => Promise<void>;
};

/**
 * Une clé par action logique en attente de verdict.
 *
 * L'achat et l'ouverture peuvent être interrompus à des instants différents. Un seul
 * enregistrement « dernière clé » ferait perdre le retry du premier quand le joueur essaie le
 * second ; le magasin conserve donc les deux, et sérialise sa lecture-modification-écriture.
 */
export function createActionKeys(deps: ActionKeysDeps): ActionKeys {
  let queue: Promise<unknown> = Promise.resolve();

  function serialize<T>(work: () => Promise<T>): Promise<T> {
    const run = queue.then(work, work);
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    keyFor: (intention, legacyIntention) =>
      serialize(async () => {
        const record = await deps.read();
        const held = record[intention];
        if (held !== undefined) {
          return held;
        }

        const legacy = legacyIntention === undefined ? undefined : record[legacyIntention];
        // Une ancienne intention sans owner reste rejouable une fois par compte, sans
        // attribuer arbitrairement son achat au premier compte connecté après mise à jour.
        const inherited = legacy !== undefined && record[`adopted:${intention}`] !== legacy;
        const key = inherited ? legacy : deps.mint();
        await deps.write({ ...record, ...(inherited ? { [`adopted:${intention}`]: legacy } : {}), [intention]: key });
        return key;
      }),
    forget: (intention) =>
      serialize(async () => {
        const record = await deps.read();
        if (record[intention] === undefined) {
          return;
        }

        const { [intention]: _forgotten, ...remaining } = record;
        await deps.write(remaining);
      }),
  };
}
