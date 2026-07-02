import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/shared/constants/api';
import { Event, PaginatedResponse } from '../types';

interface GetEventsParams {
  page?: number;
  limit?: number;
}

export const getEvents = async (params?: GetEventsParams): Promise<PaginatedResponse<Event>> => {
  const response = await apiClient.get(API_ENDPOINTS.EVENTS.LIST, { params });
  return response.data;
};

export const useEvents = (params?: GetEventsParams) => {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => getEvents(params),
  });
};
