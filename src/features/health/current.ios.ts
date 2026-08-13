import { appleHealthProvider } from '@/features/health/appleHealth';
import type { HealthProvider } from '@/features/health/provider';

/** Sur iPhone, la santé c'est HealthKit. */
export const healthProvider: HealthProvider = appleHealthProvider;
