import { requireOptionalNativeModule } from 'expo';

import type { SportNativeBridge } from '../../../modules/grrind-health/src/SportTogether.types';

const native = requireOptionalNativeModule<SportNativeBridge>('GrrindHealth');
// Un ancien development build doit afficher « reconstruire », sans casser le reste de l'app.
export const sportNative = typeof native?.setSportOwner === 'function' ? native : null;
