// Contrat du pont natif local, sans correspondance avec un DTO/enum serveur.
export type SportPermission = { permission: 'allowed' | 'denied' | 'undetermined'; precise: boolean };
export type SportEvidenceSummary = {
  id: string;
  origin: 'phone' | 'route';
  state: string;
  startedAt: number;
  endedAt: number | null;
  pointCount: number;
  firstPointAt: number | null;
  lastPointAt: number | null;
  maxGapSeconds: number;
  worstAccuracyMeters: number | null;
  workoutId: string | null;
  expiresAt: number;
};
export type SportStatus = { captures: SportEvidenceSummary[]; storageFailed: boolean; permission: SportPermission; activeCaptureId: string | null;
  uploads?: { enabled: boolean; pending: number; delivered: number } };
export type SportWorkout = {
  externalId: string;
  startedAt: number;
  endedAt: number;
  activityType: string;
  provider: string;
  device: string;
};
export type SportNativeBridge = {
  setSportOwner(owner: string | null): Promise<void>;
  sportStatus(): Promise<SportStatus>;
  requestSportLocation(): Promise<SportPermission>;
  startSportCapture(owner: string): Promise<void>;
  stopSportCapture(): Promise<void>;
  clearSportEvidence(): Promise<void>;
  requestSportRoutes(): Promise<void>;
  sportWorkouts(): Promise<SportWorkout[]>;
  collectSportRoutes(workoutId: string): Promise<void>;
  setSportUploadsEnabled(owner: string, enabled: boolean): Promise<void>;
  prepareSportUploads(owner: string, specifications: string): Promise<void>;
  uploadNextSportEvidence(owner: string, endpoint: string, accessToken: string): Promise<{ status: number; batchId: string | null; problemType?: string | null }>;
};
