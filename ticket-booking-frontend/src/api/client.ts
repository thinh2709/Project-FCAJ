import axios from 'axios';
import { env } from '@/shared/config/env';
import { setupInterceptors } from './interceptors';

const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

setupInterceptors(apiClient);

export default apiClient;
