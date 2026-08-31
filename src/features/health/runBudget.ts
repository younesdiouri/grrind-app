/**
 * Faire courir un appel contre un budget, sans dépendre de son abandon.
 *
 * ————— Le défaut que ce fichier corrige (revue de la #141) ——————————————————————————————
 *
 * `perform()` (`sync.ts`) posait `deadline.signal` sur le `GET` et le `POST`, puis se relisait
 * *après* l'`await` (`exceeded(deadline)`). Ça suppose que l'`await` **revient** à temps pour
 * que la ligne suivante s'exécute — et c'est précisément ce qui manque dans le cas le plus
 * fréquent :
 *
 * - quand le budget expire **pendant** l'attente, `fetch` rejette sur `AbortError`, et
 *   `openapi-fetch` relance cette exception après l'avoir proposée aux middlewares
 *   (`onError` de `authMiddleware.ts` ne fait que nettoyer sa map, il ne l'absorbe pas). Le
 *   point de contrôle posé après l'`await` ne s'exécute donc **jamais** : l'exception saute
 *   par-dessus. Elle atterrissait chez `sync()`, `failureFrom(AbortError)` la classait
 *   `OFFLINE`, et l'écran affichait « hors ligne » là où le ticket #140 demandait
 *   « interrompue après 12 s ».
 * - et quand le rejeu post-refresh d'`authMiddleware.ts` (`options.fetch(attempt.replay)`) ne
 *   respecte pas le signal — l'hypothèse même du docblock de `sync.ts`, `Request.clone()`
 *   n'étant pas garanti de le propager sous le polyfill RN — l'appel ne revient tout
 *   simplement pas à temps. Aucun point de contrôle posé *après* un `await` ne peut jamais
 *   s'exécuter pour une étape qui ne revient pas.
 *
 * ————— Ce que `withinBudget` fait à la place ———————————————————————————————————————————
 *
 * Elle court l'appel contre le budget au lieu de le suivre : `Promise.race`, en substance,
 * entre la promesse fournie et l'événement `abort` du signal. Le budget peut donc gagner dans
 * les deux cas ci-dessus :
 *
 * - si le signal se propage et que l'appel rejette sur `AbortError`, le rejet est ignoré (on a
 *   déjà rendu la main sur `BudgetExceeded`) plutôt que classé `OFFLINE` ;
 * - si le signal ne se propage pas, `withinBudget` rend quand même la main à l'heure — la
 *   requête sous-jacente continue dans le vide, ce qui est sans conséquence : l'issue est de
 *   toute façon inconnue, et `anchorPolicy.ts` n'y fait pas avancer l'ancre.
 *
 * Une vraie panne de transport, elle, reste ce qu'elle est : `withinBudget` ne requalifie en
 * `BudgetExceeded` que ce que le signal a effectivement abattu — jamais une exception qui
 * survient pendant que le budget tient encore.
 *
 * Aucune dépendance d'exécution : `Promise` et `AbortSignal` sont globaux sous Node comme sous
 * React Native, ce qui permet de la prouver sous `node --test` sans monter `api`.
 */

/**
 * Le budget a coupé avant que l'appel n'ait rendu son verdict.
 *
 * Distincte de toute erreur de transport : `perform()` la reconnaît par son type, jamais en
 * supposant qu'une exception passée pendant l'attente est forcément un abandon — voir le
 * docblock ci-dessus.
 */
export class BudgetExceeded extends Error {
  constructor() {
    super('budget exceeded');
    this.name = 'BudgetExceeded';
  }
}

/**
 * Court `promise` contre `signal` : rend sa valeur si elle l'emporte, jette `BudgetExceeded`
 * si le signal s'abat le premier — déjà abattu compris.
 *
 * `signal` vaut `undefined` en avant-plan (`runBudgetMsFor`, `retryPolicy.ts`) : pas de budget,
 * `promise` est rendue telle quelle, sans le détour par `Promise.race`.
 *
 * Les deux gestionnaires posés sur `promise` s'exécutent toujours, y compris quand le budget a
 * déjà tranché : une promesse qu'on cesse d'attendre sans jamais lire son verdict resterait
 * rejetée sans personne pour l'attraper, ce que Node signale comme un rejet non géré.
 */
export function withinBudget<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const onAbort = (): void => {
      if (!settled) {
        settled = true;
        reject(new BudgetExceeded());
      }
    };

    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        if (!settled) {
          settled = true;
          resolve(value);
        }
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        if (!settled) {
          settled = true;
          reject(error);
        }
      },
    );
  });
}
