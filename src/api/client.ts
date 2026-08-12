import createClient from 'openapi-fetch';

import { createAuthMiddleware } from '@/api/authMiddleware';
import { API_BASE_URL } from '@/api/config';
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

api.use(createAuthMiddleware({ getAccessToken, refresh }));
