import * as SecureStore from 'expo-secure-store';
import { api } from '@/api/client';
import { createTogetherInbox } from '@/features/health/togetherInbox';

// Le serveur conserve les reçus relisibles ; seul l'acquittement par compte est nécessaire sur disque.
export const togetherInbox = createTogetherInbox({
  readCursor: (owner) => SecureStore.getItemAsync(`grrind.together.cursor.${owner}`),
  writeCursor: (owner, id) => SecureStore.setItemAsync(`grrind.together.cursor.${owner}`, id),
  async fetchPage(after) {
    const response = await api.GET('/api/workouts/together-bonuses', { params: { query: { after, limit: 50 } } });
    if (!response.data) throw new Error('Compléments indisponibles.');
    return response.data;
  },
});
