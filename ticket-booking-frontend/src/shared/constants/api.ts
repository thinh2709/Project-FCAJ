export const API_ENDPOINTS = {
  EVENTS: {
    LIST: '/api/matches', // We use "matches" endpoint but abstract it as events in UI
    DETAIL: (id: string) => `/api/matches/${id}`,
  },
  AUTH: {
    SYNC: '/api/auth/sync',
    ME: '/api/auth/me',
  }
} as const;
