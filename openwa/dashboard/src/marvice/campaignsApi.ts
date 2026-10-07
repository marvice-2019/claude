// Marvice Modules — Campaigns: API client + React Query hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../services/api';

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
export type RecipientStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'skipped';

export interface Campaign {
  id: string;
  sessionId: string;
  listId: string;
  name: string;
  message: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'audio' | 'document' | null;
  status: CampaignStatus;
  delayMs: number;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  lastError: string | null;
  createdAt: string;
}

export type CampaignDetail = Campaign & { counts: Record<RecipientStatus, number> };

export interface Recipient {
  id: string;
  phone: string;
  name: string | null;
  status: RecipientStatus;
  messageId: string | null;
  error: string | null;
  sentAt: string | null;
}

export interface RecipientPage {
  items: Recipient[];
  total: number;
  page: number;
  limit: number;
}

export interface CampaignPreview {
  recipients: number;
  sample: { phone: string; name: string | null; text: string }[];
  variables: string[];
  unknownVariables: string[];
}

export interface UploadedMedia {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  mediaType: 'image' | 'video' | 'audio' | 'document';
}

/** Server-side cap for uploaded campaign files. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export interface NewCampaign {
  name: string;
  listId: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  delayMs: number;
  scheduledAt?: string;
  onlyVerified?: boolean;
  tag?: string;
  startNow?: boolean;
}

const base = (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/marvice/campaigns`;

export const campaignsApi = {
  list: (sessionId: string) => request<Campaign[]>(base(sessionId)),
  get: (sessionId: string, id: string) => request<CampaignDetail>(`${base(sessionId)}/${id}`),
  preview: (sessionId: string, body: { listId: string; message: string; onlyVerified?: boolean; tag?: string }) =>
    request<CampaignPreview>(`${base(sessionId)}/preview`, { method: 'POST', body: JSON.stringify(body) }),
  create: (sessionId: string, body: NewCampaign) =>
    request<Campaign>(base(sessionId), { method: 'POST', body: JSON.stringify(body) }),
  action: (sessionId: string, id: string, action: 'start' | 'pause' | 'cancel' | 'retry') =>
    request<Campaign>(`${base(sessionId)}/${id}/${action}`, { method: 'POST' }),
  remove: (sessionId: string, id: string) => request<void>(`${base(sessionId)}/${id}`, { method: 'DELETE' }),
  uploadMedia: (sessionId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadedMedia>(`/sessions/${encodeURIComponent(sessionId)}/marvice/media`, {
      method: 'POST',
      body: form,
    });
  },
  recipients: (sessionId: string, id: string, q: { page: number; limit: number; status?: string }) => {
    const params = new URLSearchParams({ page: String(q.page), limit: String(q.limit) });
    if (q.status) params.set('status', q.status);
    return request<RecipientPage>(`${base(sessionId)}/${id}/recipients?${params.toString()}`);
  },
};

const LIVE: CampaignStatus[] = ['running', 'scheduled'];

export function useCampaignsQuery(sessionId: string) {
  return useQuery({
    queryKey: ['marvice', 'campaigns', sessionId],
    queryFn: () => campaignsApi.list(sessionId),
    enabled: !!sessionId,
    refetchInterval: query => (query.state.data?.some(c => LIVE.includes(c.status)) ? 4000 : false),
  });
}

export function useCampaignQuery(sessionId: string, id: string) {
  return useQuery({
    queryKey: ['marvice', 'campaigns', sessionId, id],
    queryFn: () => campaignsApi.get(sessionId, id),
    enabled: !!sessionId && !!id,
    refetchInterval: query => (query.state.data && LIVE.includes(query.state.data.status) ? 4000 : false),
  });
}

export function useRecipientsQuery(sessionId: string, id: string, page: number, status: string, live: boolean) {
  return useQuery({
    queryKey: ['marvice', 'campaigns', sessionId, id, 'recipients', page, status],
    queryFn: () => campaignsApi.recipients(sessionId, id, { page, limit: 50, status: status || undefined }),
    enabled: !!sessionId && !!id,
    placeholderData: prev => prev,
    refetchInterval: live ? 5000 : false,
  });
}

export function useCampaignMutations(sessionId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['marvice', 'campaigns', sessionId] });
  return {
    create: useMutation({ mutationFn: (b: NewCampaign) => campaignsApi.create(sessionId, b), onSuccess: refresh }),
    action: useMutation({
      mutationFn: (p: { id: string; action: 'start' | 'pause' | 'cancel' | 'retry' }) =>
        campaignsApi.action(sessionId, p.id, p.action),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => campaignsApi.remove(sessionId, id), onSuccess: refresh }),
  };
}

/** Every recipient (optionally one status), paged through the API, as CSV text for download. */
export async function exportRecipientsCsv(sessionId: string, id: string, status?: RecipientStatus): Promise<string> {
  const rows: Recipient[] = [];
  for (let page = 1; ; page++) {
    const res = await campaignsApi.recipients(sessionId, id, { page, limit: 200, status });
    rows.push(...res.items);
    if (rows.length >= res.total || res.items.length === 0) break;
  }
  const cell = (v: string | null) => {
    const s = v ?? '';
    // Quote, and neutralise spreadsheet formulas in user-supplied text.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const lines = ['phone,name,status,sent_at,error,message_id'];
  for (const r of rows) {
    lines.push([`+${r.phone}`, r.name, r.status, r.sentAt, r.error, r.messageId].map(cell).join(','));
  }
  return lines.join('\n') + '\n';
}
