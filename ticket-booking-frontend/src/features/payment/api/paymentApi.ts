import apiClient from '@/api/client';

export interface MoMoPaymentRequest {
  bookingId: string;
  requestType?: 'captureWallet' | 'payWithATM' | 'payWithCC';
}

export interface MoMoPaymentResponse {
  payUrl: string;
  qrCodeUrl?: string;
  deeplink?: string;
}

export const createMoMoPayment = async (data: MoMoPaymentRequest): Promise<MoMoPaymentResponse> => {
  const response = await apiClient.post<{ data: MoMoPaymentResponse }>('/api/payments/momo/create', data);
  return response.data.data;
};

export const checkPaymentStatus = async (bookingId: string, orderId?: string): Promise<any> => {
  const url = orderId 
    ? `/api/payments/momo/check/${bookingId}?orderId=${orderId}`
    : `/api/payments/momo/check/${bookingId}`;
  const response = await apiClient.get<{ data: any }>(url);
  return response.data.data;
};
