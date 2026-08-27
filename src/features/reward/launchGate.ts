/**
 * Ce qu'on montre au joueur qui vient d'ouvrir l'app, et quand.
 *
 * ————— La règle ————————————————————————————————————————————————————————————————————
 *
 * Un joueur qui ouvre l'app doit voir sa progression **s'il ne l'a jamais vue**. Pas s'il
 * pense à aller la chercher : l'écran de récompense est *l'*écran du produit, il ne se
 * mérite pas.
 *
 * ————— Les deux cas, qui n'ont pas le même coût ————————————————————————————————————
 *
 * **Une progression déjà en attente ne demande aucun réseau.** Elle est sur le disque, la
 * lecture est synchrone, et elle se joue immédiatement — hors ligne compris. C'est le cas
 * qui compte, parce que c'est celui où l'animation avait déjà failli se perdre.
 *
 * **Une progression découverte à l'instant** demande un aller-retour, et c'est là qu'un
 * arbitrage s'impose. Attendre sans borne ferait dépendre l'ouverture de l'app d'un
 * serveur : dans le métro, l'app ne démarre pas. Ne pas attendre du tout ferait surgir un
 * plein écran par-dessus un accueil déjà lu, une seconde après — une interruption, pas un
 * moment. D'où la **borne**.
 *
 * ————— Pourquoi 1,5 s ————————————————————————————————————————————————————————————————
 *
 * Un aller-retour réel tient entre 300 ms et 1,2 s. Et surtout, `app/_layout.tsx` retient
 * déjà l'écran de lancement le temps que le trousseau réponde : **l'attente se glisse
 * dedans** au lieu de s'ajouter après. Le coût perçu est bien plus faible que le coût réel.
 *
 * Au-delà de la borne, rien n'est perdu : le résumé reste marqué non joué et sera joué au
 * prochain lancement, immédiatement cette fois.
 *
 * ————— Pourquoi ce fichier n'importe rien —————————————————————————————————————————————
 *
 * Aucune dépendance : ni disque, ni réseau, ni horloge réelle. C'est ce qui permet de
 * prouver une borne d'une seconde et demie en une milliseconde, et de vérifier le chemin
 * d'ouverture de l'app sans monter l'app. Le câblage vit dans `launch.ts`, comme
 * `syncCoordinator.ts` est au pur ce que `sync.ts` est au câblé.
 */

export const LAUNCH_WAIT_MS = 1_500;

export type LaunchGateDeps = {
  /** Une progression non jouée attend-elle déjà sur le disque. Lecture synchrone. */
  hasPending: () => boolean;
  /** Le compteur de verdicts de synchronisation. */
  settledRevision: () => number;
  subscribeToSync: (listener: () => void) => () => void;
  /** La borne, injectée : un test ne doit pas attendre une seconde et demie pour la prouver. */
  timeoutMs: number;
  /** L'horloge, injectée pour la même raison. */
  setTimer: (run: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
};

export type LaunchGate = {
  /** Ouvre la fenêtre d'attente. **Idempotent** : les appels suivants ne font rien. */
  begin: (signedIn: boolean) => void;
  isSettled: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

/**
 * Le lancement rend la main — c'est-à-dire retire l'écran de démarrage — dès qu'une de ces
 * conditions tombe :
 *
 * - personne n'est connecté : rien à synchroniser, rien à attendre ;
 * - une progression est **déjà** en attente : immédiat, aucun réseau ;
 * - la synchronisation de lancement a rendu son verdict, **quel qu'il soit** — une panne est
 *   un verdict comme un autre, et l'app doit s'ouvrir dans tous les cas ;
 * - la borne est atteinte.
 *
 * Une fois posé, l'état ne revient jamais en arrière : le lancement n'a lieu qu'une fois.
 */
export function createLaunchGate(deps: LaunchGateDeps): LaunchGate {
  let settled = false;
  let started = false;
  const listeners = new Set<() => void>();

  function settle(): void {
    if (settled) {
      return;
    }

    settled = true;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    begin(signedIn) {
      if (started) {
        return;
      }

      started = true;

      if (!signedIn || deps.hasPending()) {
        settle();
        return;
      }

      const before = deps.settledRevision();

      // Un verdict est déjà tombé. Les effets de React s'exécutent des enfants vers les
      // parents, donc la synchronisation de lancement part avant que ce portillon s'arme ;
      // rien ne garantit qu'elle n'ait pas déjà répondu. Sans ce test, on attendrait le
      // verdict *suivant* — c'est-à-dire la borne entière, pour une réponse déjà là.
      if (before > 0) {
        settle();
        return;
      }

      let unsubscribe: (() => void) | null = null;
      let timer: unknown = null;

      const finish = (): void => {
        if (timer !== null) {
          deps.clearTimer(timer);
        }
        unsubscribe?.();
        settle();
      };

      timer = deps.setTimer(finish, deps.timeoutMs);

      unsubscribe = deps.subscribeToSync(() => {
        // Le compteur de verdicts, et non le statut : il ne bouge qu'aux issues, donc le
        // passage `idle → syncing` ne retire pas l'écran de démarrage pour rien.
        if (deps.settledRevision() !== before) {
          finish();
        }
      });
    },

    isSettled: () => settled,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Le joueur a-t-il déjà touché l'écran.
 *
 * Une progression dont le verdict tombe **après** la borne fait quand même surgir
 * l'animation — sauf ici. Quelqu'un qui a commencé à faire défiler sa liste est en train de
 * faire quelque chose, et lui coller un plein écran dessus n'est pas un cadeau. Sa
 * progression reste non jouée et l'attendra au prochain lancement, où elle sera immédiate.
 *
 * Un drapeau de module plutôt qu'un état React : il n'est jamais rendu, il ne concerne
 * qu'une décision de navigation, et le remonter dans l'arbre ferait rendre toute l'app au
 * premier contact avec l'écran.
 */
let interacted = false;

export function markInteracted(): void {
  interacted = true;
}

export function hasInteracted(): boolean {
  return interacted;
}

/**
 * Une progression a-t-elle le droit de prendre l'écran, maintenant ?
 *
 * Trois faits, une décision, et **aucune dépendance** : `usePendingReward` fournit les trois,
 * ce fichier tranche, et la règle se prouve sous `node --test` sans monter de composant ni
 * simuler un cycle de vie d'app.
 *
 * ————— Les deux gardes ne se valent pas ——————————————————————————————————————————————
 *
 * `active` est **absolue**. Personne devant l'écran veut dire personne, quel qu'ait été le
 * geste à l'origine de la synchronisation : un réveil HealthKit relance le processus entier
 * dans une app que personne ne regarde, et une animation qui s'y jouerait serait perdue pour
 * de bon — le dommage exact que `pending.ts` existe pour empêcher.
 *
 * `interacted` **cède devant une demande explicite** (#97). Elle protège d'une progression qui
 * *arrive* pendant qu'on lit son historique. Elle n'a rien à dire d'une progression qu'on vient
 * de *réclamer* en tapant « Synchroniser maintenant » ou en tirant pour rafraîchir : dans ce
 * cas `interacted` est vrai **parce que** le joueur a touché l'écran pour l'obtenir, et le lui
 * opposer transforme sa demande en refus.
 */
export function mayOpenReward(state: {
  /** L'app est-elle au premier plan ? */
  active: boolean;
  /** Le joueur a-t-il touché l'écran depuis le lancement ? */
  interacted: boolean;
  /** A-t-il demandé cette progression, par un geste explicite ? */
  solicited: boolean;
}): boolean {
  if (!state.active) {
    return false;
  }

  return !state.interacted || state.solicited;
}
