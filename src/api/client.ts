import createClient from 'openapi-fetch';

import { createAuthMiddleware } from '@/api/authMiddleware';
import { API_BASE_URL } from '@/api/config';
import { createLanguageMiddleware } from '@/api/languageMiddleware';
import type { paths } from '@/api/schema';
import { getAccessToken, refresh } from '@/features/auth/session';

/**
 * Le client authentifié — celui que tout le reste de l'app utilise.
 *
 * Il est créé **une fois**, pour la durée du processus, et lit le jeton à chaque requête au
 * lieu de le porter dans sa configuration. Un client recréé à chaque changement de jeton
 * perdrait les requêtes en vol exactement au moment où il ne faut pas : celui du
 * rafraîchissement.
 */
export const api = createClient<paths>({ baseUrl: API_BASE_URL });

// L'ordre compte, et ce n'est pas un détail d'imports à ranger alphabétiquement :
// `authMiddleware` clone la requête pour son rejeu (`request.clone()`, avant l'envoi) sur le
// `Request` tel qu'il le reçoit. Si le langage se posait après lui, la copie de rejeu partirait
// sans `Accept-Language` — et toute requête rejouée après un rafraîchissement reviendrait en
// anglais, de façon intermittente et invisible depuis l'écran. Le langage se pose donc en premier.
api.use(createLanguageMiddleware());
api.use(createAuthMiddleware({ getAccessToken, refresh }));
