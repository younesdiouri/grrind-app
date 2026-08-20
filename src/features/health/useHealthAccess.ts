import { useCallback, useEffect, useState } from 'react';

import { enableBackgroundWakeup } from '@/features/health/backgroundWakeup';
import { healthProvider } from '@/features/health/current';
import type { AuthorizationPrompt } from '@/features/health/provider';

/**
 * Ce que l'app sait de son accès à la santé — c'est-à-dire **très peu**, et c'est le sujet.
 *
 * ————— Le piège, en premier, parce qu'il conditionne tout l'écran ————————————————————————
 *
 * **HealthKit ne dit jamais si l'utilisateur a refusé une autorisation de lecture.** Les trois
 * valeurs de `HKAuthorizationStatus` sont toutes formulées en termes d'écriture ; en lecture,
 * l'API rend `notDetermined` que l'utilisateur ait accepté ou refusé. C'est délibéré chez
 * Apple : une app ne doit pas pouvoir déduire qu'un utilisateur a quelque chose à cacher.
 *
 * Conséquence directe : **on ne peut pas afficher « accès refusé »**. La seule chose observable
 * est « la requête ne rend aucun workout » — ce qui est aussi ce que voit une app dont
 * l'utilisateur n'a simplement pas fait de sport cette semaine.
 *
 * Ce hook ne prétend donc pas connaître un état d'autorisation. Il ne porte que ce qui est
 * réellement observable : le fournisseur existe-t-il, et redemander servirait-il à quelque
 * chose. L'écran fait le reste avec le **résultat de la synchronisation**, seul témoin de ce
 * qui remonte vraiment.
 */

export type HealthAccess =
  | { step: 'checking' }
  /** Pas de HealthKit sur cet appareil — un iPad, un simulateur mal configuré. */
  | { step: 'unavailable' }
  /** La question n'a pas encore été posée. C'est le moment d'expliquer avant de la poser. */
  | { step: 'explain' }
  /** La feuille système est ouverte. */
  | { step: 'asking' }
  /**
   * La question a été posée. **On ne sait pas ce qui a été répondu et on ne le saura pas.**
   * L'écran passe la main à la synchronisation, dont le résultat est le seul témoin.
   */
  | { step: 'asked' }
  | { step: 'failed'; message: string };

export function useHealthAccess(): { access: HealthAccess; ask: () => void } {
  const [access, setAccess] = useState<HealthAccess>({ step: 'checking' });

  const look = useCallback(async (): Promise<HealthAccess> => {
    if (!(await healthProvider.isAvailable())) {
      return { step: 'unavailable' };
    }

    const prompt: AuthorizationPrompt = await healthProvider.authorizationPrompt();

    // `unknown` se range avec `needed` : redemander est sans conséquence, ne jamais demander
    // en a une.
    return { step: prompt === 'alreadyAsked' ? 'asked' : 'explain' };
  }, []);

  useEffect(() => {
    let current = true;

    void look().then(
      (next) => {
        if (current) {
          setAccess(next);
        }
      },
      () => {
        if (current) {
          setAccess({ step: 'unavailable' });
        }
      },
    );

    return () => {
      current = false;
    };
  }, [look]);

  const ask = useCallback(() => {
    setAccess({ step: 'asking' });

    void healthProvider.requestAuthorization().then(
      () => {
        // La feuille s'est fermée. On passe à `asked` **sans rien conclure** : `void` est le
        // contrat du port, précisément parce qu'il n'y a rien à conclure.
        //
        // C'est aussi le premier moment où l'inscription au réveil HealthKit (#55) a une
        // chance d'aboutir : elle échoue tant que rien n'a été accordé. Ne pas attendre le
        // prochain lancement pour l'obtenir — `enableBackgroundWakeup` est un no-op sur les
        // plateformes qui n'ont pas de réveil.
        void enableBackgroundWakeup();
        setAccess({ step: 'asked' });
      },
      (error: unknown) => {
        // Une panne, pas un refus. Un refus n'est pas observable, donc il ne peut pas arriver
        // ici — ce qui passe par là est un vrai problème système.
        const message =
          error instanceof Error ? error.message : "La demande d'accès n'a pas pu aboutir.";
        setAccess({ step: 'failed', message });
      },
    );
  }, []);

  return { access, ask };
}
