import { useQuery } from '@tanstack/react-query';
import { getUserBookings } from './bookingApi';

export const useUserBookings = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['userBookings', page, limit],
    queryFn: () => getUserBookings(page, limit),
  });
};
