import createClient from 'openapi-fetch';

import { API_BASE_URL } from '@/api/config';
import { createLanguageMiddleware } from '@/api/languageMiddleware';
import type { paths } from '@/api/schema';

/**
 * Le client **sans authentification**, pour les routes que le contrat déclare `security: []`.
 *
 * Il est séparé du client authentifié pour une raison mécanique, pas esthétique : c'est lui
 * qui porte l'appel de rafraîchissement. Le faire passer par le middleware d'auth rendrait un
 * 401 sur `/api/auth/refresh` capable de déclencher… un rafraîchissement, qui rendrait un 401,
 * et ainsi de suite.
 *
 * Il n'échappe pas pour autant au middleware de langue : un refus d'identifiants se lit aussi,
 * et le `detail` d'un `ProblemDetails` est du texte traduit comme le reste.
 */
export const publicApi = createClient<paths>({ baseUrl: API_BASE_URL });

publicApi.use(createLanguageMiddleware());
