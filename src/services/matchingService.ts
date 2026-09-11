import axios from 'axios';
import type { PropertyRequest, RequestStatus } from '../types';
import type { MatchingResponse, ShareMatchPayload } from '../types/matching';

export async function getMatchingRequests(): Promise<PropertyRequest[]> {
  const { data } = await axios.get<unknown>('/api/matching/requests');
  return Array.isArray(data) ? (data as PropertyRequest[]) : [];
}

export async function getMatches(requestId: number, minScore = 35): Promise<MatchingResponse> {
  const { data } = await axios.get<MatchingResponse>(`/api/matching/requests/${requestId}/matches`, {
    params: { minScore },
  });
  return data;
}

export async function updateRequestStatus(id: number, status: RequestStatus): Promise<void> {
  await axios.put(`/api/matching/requests/${id}`, { status });
}

export async function createPropertyRequest(payload: Omit<PropertyRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<PropertyRequest> {
  const { data } = await axios.post<PropertyRequest>('/api/matching/requests', payload);
  return data;
}

export async function shareMatch(payload: ShareMatchPayload): Promise<{ channel: string }> {
  const { data } = await axios.post<{ channel: string }>('/api/matching/share', payload);
  return data;
}
