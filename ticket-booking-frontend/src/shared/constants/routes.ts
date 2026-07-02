export const ROUTES = {
  HOME: '/',
  EVENTS: {
    DETAIL: (id: string) => `/events?id=${id}`,
  },
  QUEUE: {
    WAITING_ROOM: (eventId: string) => `/queue/${eventId}`,
  },
  BOOKING: {
    SEATMAP: (eventId: string) => `/booking/${eventId}/seats`,
    CHECKOUT: (bookingId: string) => `/booking/checkout/${bookingId}`,
  },
  AUTH: {
    LOGIN: '/auth/login',
  },
  ERROR: {
    404: '/404',
    500: '/500',
    MAINTENANCE: '/maintenance',
  }
} as const;
