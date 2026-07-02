import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/shared/constants/api';
import { EventDetail, SingleResponse } from '../types';

export const getEventById = async (id: string): Promise<SingleResponse<EventDetail>> => {
  const response = await apiClient.get(API_ENDPOINTS.EVENTS.DETAIL(id));
  return response.data;
};

export const useEventById = (id: string) => {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id),
    enabled: !!id,
  });
};
