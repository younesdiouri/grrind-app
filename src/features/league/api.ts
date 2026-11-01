import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';

export function fetchLeague() {
  return queryOrFailure(() => api.GET('/api/league'));
}
