// Marvice Modules — Contacts: API client + React Query hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../services/api';

export type WaStatus = 'pending' | 'on_whatsapp' | 'not_on_whatsapp' | 'check_failed';

export interface ContactListCounts {
  total: number;
  onWhatsapp: number;
  notOnWhatsapp: number;
  pending: number;
  checkFailed: number;
  optedOut: number;
}

export interface ContactList {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  createdAt: string;
  counts: ContactListCounts;
  verifying: boolean;
}

export interface Contact {
  id: string;
  listId: string;
  phone: string;
  name: string | null;
  tags: string | null;
  variables: string | null;
  whatsappId: string | null;
  waStatus: WaStatus;
  optedIn: boolean;
  optOutSource: string | null;
  createdAt: string;
}

export interface ContactPage {
  items: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportSummary {
  totalRows: number;
  added: number;
  updated: number;
  invalid: number;
  duplicates: number;
  overLimit: number;
  invalidSamples: string[];
  columns: { phone: string; name: string | null; tags: string | null; variables: string[] };
  verificationQueued: number;
}

export interface ContactQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

const base = (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/marvice/contacts`;

export const contactsApi = {
  lists: (sessionId: string) => request<ContactList[]>(`${base(sessionId)}/lists`),
  createList: (sessionId: string, body: { name: string; description?: string }) =>
    request<ContactList>(`${base(sessionId)}/lists`, { method: 'POST', body: JSON.stringify(body) }),
  deleteList: (sessionId: string, listId: string) =>
    request<void>(`${base(sessionId)}/lists/${listId}`, { method: 'DELETE' }),
  importCsv: (
    sessionId: string,
    listId: string,
    body: { csv: string; defaultCountryCode: string; consent: boolean; verify: boolean },
  ) =>
    request<ImportSummary>(`${base(sessionId)}/lists/${listId}/import`, { method: 'POST', body: JSON.stringify(body) }),
  verify: (sessionId: string, listId: string) =>
    request<{ queued: number }>(`${base(sessionId)}/lists/${listId}/verify`, { method: 'POST' }),
  contacts: (sessionId: string, listId: string, q: ContactQuery) => {
    const params = new URLSearchParams({ page: String(q.page), limit: String(q.limit) });
    if (q.search) params.set('search', q.search);
    if (q.status) params.set('status', q.status);
    return request<ContactPage>(`${base(sessionId)}/lists/${listId}/contacts?${params.toString()}`);
  },
  updateContact: (sessionId: string, id: string, body: { name?: string; tags?: string; optedIn?: boolean }) =>
    request<Contact>(`${base(sessionId)}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteContact: (sessionId: string, id: string) => request<void>(`${base(sessionId)}/${id}`, { method: 'DELETE' }),
};

const keys = {
  lists: (sessionId: string) => ['marvice', 'contacts', sessionId, 'lists'] as const,
  contacts: (sessionId: string, listId: string, q: ContactQuery) =>
    ['marvice', 'contacts', sessionId, 'list', listId, q] as const,
  any: (sessionId: string) => ['marvice', 'contacts', sessionId] as const,
};

export function useContactListsQuery(sessionId: string) {
  return useQuery({
    queryKey: keys.lists(sessionId),
    queryFn: () => contactsApi.lists(sessionId),
    enabled: !!sessionId,
    // Poll while a verification runs so the counts move live.
    refetchInterval: query => (query.state.data?.some(l => l.verifying) ? 4000 : false),
  });
}

export function useContactsQuery(sessionId: string, listId: string, q: ContactQuery, verifying: boolean) {
  return useQuery({
    queryKey: keys.contacts(sessionId, listId, q),
    queryFn: () => contactsApi.contacts(sessionId, listId, q),
    enabled: !!sessionId && !!listId,
    placeholderData: prev => prev,
    refetchInterval: verifying ? 4000 : false,
  });
}

export function useContactsMutations(sessionId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.any(sessionId) });
  return {
    createList: useMutation({
      mutationFn: (body: { name: string; description?: string }) => contactsApi.createList(sessionId, body),
      onSuccess: refresh,
    }),
    deleteList: useMutation({
      mutationFn: (listId: string) => contactsApi.deleteList(sessionId, listId),
      onSuccess: refresh,
    }),
    importCsv: useMutation({
      mutationFn: (p: { listId: string; csv: string; defaultCountryCode: string; verify: boolean }) =>
        contactsApi.importCsv(sessionId, p.listId, {
          csv: p.csv,
          defaultCountryCode: p.defaultCountryCode,
          consent: true,
          verify: p.verify,
        }),
      onSuccess: refresh,
    }),
    verify: useMutation({ mutationFn: (listId: string) => contactsApi.verify(sessionId, listId), onSuccess: refresh }),
    updateContact: useMutation({
      mutationFn: (p: { id: string; body: { name?: string; tags?: string; optedIn?: boolean } }) =>
        contactsApi.updateContact(sessionId, p.id, p.body),
      onSuccess: refresh,
    }),
    deleteContact: useMutation({
      mutationFn: (id: string) => contactsApi.deleteContact(sessionId, id),
      onSuccess: refresh,
    }),
  };
}
