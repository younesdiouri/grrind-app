/**
 * L'adresse de l'API.
 *
 * `EXPO_PUBLIC_API_URL` est **inlinée au build** par Metro : il n'y a pas de `process.env`
 * à l'exécution sur l'appareil, donc la lecture doit rester une propriété littérale — un
 * accès dynamique (`process.env[nom]`) ne serait pas remplacé et vaudrait `undefined`.
 *
 * Elle vit dans `.env.local`, jamais versionnée, et pointe l'**IP LAN du Mac** dès qu'on
 * développe sur iPhone physique : là-bas, `localhost` désigne le téléphone.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
