import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export const setupInterceptors = (apiClient: AxiosInstance) => {
  apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Setup Cognito Token for Sprint 3
      const { userPool } = await import('@/features/auth/api/cognito');
      const user = userPool.getCurrentUser();
      if (user) {
        try {
          const session = await new Promise<any>((resolve, reject) => {
            user.getSession((err: any, session: any) => {
              if (err) reject(err);
              else resolve(session);
            });
          });
          const token = session.getAccessToken().getJwtToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (e) {
          console.error("Failed to get session token", e);
        }
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access (e.g., redirect to login)
      }
      return Promise.reject(error);
    }
  );
};
