// Marvice Modules — Campaigns page: create, schedule, track and report on broadcasts to a contact list.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Type,
  Upload,
  Video,
  XCircle,
} from 'lucide-react';
import { useSessionsQuery } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { useContactListsQuery } from './contactsApi';
import {
  type Campaign,
  type CampaignPreview,
  type NewCampaign,
  type RecipientStatus,
  MAX_UPLOAD_BYTES,
  campaignsApi,
  exportRecipientsCsv,
  useCampaignMutations,
  useCampaignQuery,
  useCampaignsQuery,
  useRecipientsQuery,
} from './campaignsApi';
import './Contacts.css';
import './Campaigns.css';

const REPORT_FILTERS: ('' | RecipientStatus)[] = ['', 'sent', 'failed', 'skipped', 'pending'];
const SPEEDS = [
  { ms: 15000, key: 'safe' },
  { ms: 8000, key: 'normal' },
  { ms: 4000, key: 'fast' },
] as const;

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';
// The bulk sender handles these five. Location, contact, sticker and poll messages are single-send only.
const MESSAGE_TYPES: { key: MessageType; Icon: typeof FileText }[] = [
  { key: 'text', Icon: Type },
  { key: 'image', Icon: ImageIcon },
  { key: 'video', Icon: Video },
  { key: 'audio', Icon: Mic },
  { key: 'document', Icon: FileText },
];
const UPLOAD_ACCEPT: Record<Exclude<MessageType, 'text'>, string> = {
  image: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/3gpp,video/quicktime',
  audio: 'audio/*',
  document: '*/*',
};

const MEDIA_PLACEHOLDER: Record<Exclude<MessageType, 'text'>, string> = {
  image: 'https://…/offer.jpg',
  video: 'https://…/promo.mp4',
  audio: 'https://…/voice-note.ogg',
  document: 'https://…/menu.pdf',
};

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusPill({ status }: { status: Campaign['status'] }) {
  const { t } = useTranslation();
  return <span className={`mc-badge mcp-status-${status}`}>{t(`marvice.campaigns.status.${status}`)}</span>;
}

function Progress({ c }: { c: Campaign }) {
  const done = c.sent + c.failed + c.skipped;
  return (
    <div
      className="mcp-progress"
      role="progressbar"
      aria-valuenow={pct(done, c.total)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="mcp-bar-sent" style={{ width: `${pct(c.sent, c.total)}%` }} />
      <span className="mcp-bar-failed" style={{ width: `${pct(c.failed, c.total)}%` }} />
      <span className="mcp-bar-skipped" style={{ width: `${pct(c.skipped, c.total)}%` }} />
    </div>
  );
}

export function Campaigns() {
  const { t } = useTranslation();
  useDocumentTitle(t('marvice.campaigns.title'));
  const { canWrite } = useRole();
  const { data: sessions = [] } = useSessionsQuery();
  const [sessionId, setSessionId] = useState('');
  const [selected, setSelected] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (sessions.some(s => s.id === sessionId)) return;
    setSessionId(sessions[0]?.id ?? '');
  }, [sessions, sessionId]);

  const { data: campaigns = [], isLoading, error } = useCampaignsQuery(sessionId);
  useEffect(() => {
    if (campaigns.some(c => c.id === selected)) return;
    setSelected(campaigns[0]?.id ?? '');
  }, [campaigns, selected]);

  return (
    <div className="mc-page">
      <PageHeader
        title={t('marvice.campaigns.title')}
        subtitle={t('marvice.campaigns.subtitle')}
        actions={
          <div className="mc-actions">
            <select
              className="mc-select"
              aria-label={t('marvice.contacts.session')}
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
            >
              {sessions.length === 0 && <option value="">{t('marvice.contacts.noSessions')}</option>}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => setShowNew(true)} disabled={!canWrite || !sessionId}>
              <Plus size={16} /> {t('marvice.campaigns.new')}
            </button>
          </div>
        }
      />

      <div className="mc-workspace">
        <aside className="mc-lists">
          <div className="mc-lists-head">
            <h2>{t('marvice.campaigns.all')}</h2>
          </div>
          {isLoading ? (
            <div className="mc-center">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : error && campaigns.length === 0 ? (
            <p className="mc-error" role="alert">
              {(error as { status?: number }).status === 403 ? t('marvice.contacts.forbidden') : error.message}
            </p>
          ) : campaigns.length === 0 ? (
            <div className="mc-empty mc-compact">
              <Megaphone size={32} strokeWidth={1} />
              <p>{t('marvice.campaigns.none')}</p>
            </div>
          ) : (
            <div role="list">
              {campaigns.map(c => (
                <button
                  key={c.id}
                  role="listitem"
                  type="button"
                  className={`mc-list-item mcp-item ${c.id === selected ? 'selected' : ''}`}
                  onClick={() => setSelected(c.id)}
                >
                  <span className="mc-list-name">{c.name}</span>
                  <span className="mcp-item-meta">
                    <StatusPill status={c.status} />
                    <span className="mc-list-meta">
                      {t('marvice.campaigns.sentOf', { sent: c.sent, total: c.total })}
                    </span>
                  </span>
                  <Progress c={c} />
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="mc-main">
          {selected ? (
            <CampaignReport sessionId={sessionId} id={selected} canWrite={canWrite} />
          ) : (
            <div className="mc-empty">
              <Send size={48} strokeWidth={1} />
              <h3>{t('marvice.campaigns.startTitle')}</h3>
              <p>{t('marvice.campaigns.startDesc')}</p>
            </div>
          )}
        </section>
      </div>

      {showNew && (
        <NewCampaignModal
          sessionId={sessionId}
          onClose={() => setShowNew(false)}
          onCreated={id => {
            setShowNew(false);
            setSelected(id);
          }}
        />
      )}
    </div>
  );
}

function CampaignReport({ sessionId, id, canWrite }: { sessionId: string; id: string; canWrite: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: c } = useCampaignQuery(sessionId, id);
  const [filter, setFilter] = useState<'' | RecipientStatus>('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const live = c?.status === 'running';
  const { data: rows } = useRecipientsQuery(sessionId, id, page, filter, live);
  const m = useCampaignMutations(sessionId);
  useEffect(() => setPage(1), [id, filter]);

  if (!c) {
    return (
      <div className="mc-center">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  const act = async (action: 'start' | 'pause' | 'cancel' | 'retry') => {
    try {
      await m.action.mutateAsync({ id: c.id, action });
      toast.success(t(`marvice.campaigns.toasts.${action}`));
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    }
  };

  const exportCsv = async (status?: RecipientStatus) => {
    setExporting(true);
    try {
      const csv = await exportRecipientsCsv(sessionId, c.id, status);
      download(`${c.name.replace(/[^\w-]+/g, '_')}_${status ?? 'all'}.csv`, csv);
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    } finally {
      setExporting(false);
    }
  };

  const k = c.counts;
  const pages = Math.max(1, Math.ceil((rows?.total ?? 0) / 50));
  const tiles: { key: '' | RecipientStatus; value: number }[] = [
    { key: '', value: c.total },
    { key: 'sent', value: k.sent },
    { key: 'failed', value: k.failed },
    { key: 'skipped', value: k.skipped },
    { key: 'pending', value: k.pending + k.queued },
  ];

  return (
    <>
      <div className="mc-list-header">
        <div>
          <h2>
            {c.name} <StatusPill status={c.status} />
          </h2>
          <p className="mc-muted">
            {t('marvice.campaigns.meta', {
              started: fmt(c.startedAt),
              finished: fmt(c.finishedAt),
              rate: pct(k.sent, k.sent + k.failed),
            })}
          </p>
        </div>
        <div className="mc-actions">
          {['draft', 'scheduled', 'paused'].includes(c.status) && (
            <button
              className="btn-primary"
              disabled={!canWrite || m.action.isPending}
              onClick={() => void act('start')}
            >
              <Play size={16} />{' '}
              {c.status === 'paused' ? t('marvice.campaigns.resume') : t('marvice.campaigns.sendNow')}
            </button>
          )}
          {['running', 'scheduled'].includes(c.status) && (
            <button
              className="btn-secondary"
              disabled={!canWrite || m.action.isPending}
              onClick={() => void act('pause')}
            >
              <Pause size={16} /> {t('marvice.campaigns.pause')}
            </button>
          )}
          {!['completed', 'cancelled'].includes(c.status) && (
            <button
              className="btn-secondary"
              disabled={!canWrite || m.action.isPending}
              onClick={() => void act('cancel')}
            >
              <XCircle size={16} /> {t('marvice.campaigns.cancel')}
            </button>
          )}
          {k.failed > 0 && !['draft', 'cancelled'].includes(c.status) && (
            <button
              className="btn-primary"
              disabled={!canWrite || m.action.isPending}
              onClick={() => void act('retry')}
            >
              <RotateCcw size={16} /> {t('marvice.campaigns.retryFailed', { count: k.failed })}
            </button>
          )}
          <button className="btn-secondary" disabled={exporting} onClick={() => void exportCsv()}>
            <Download size={16} /> {t('marvice.campaigns.exportAll')}
          </button>
          <button
            className="btn-secondary"
            disabled={exporting || k.failed === 0}
            onClick={() => void exportCsv('failed')}
          >
            <Download size={16} /> {t('marvice.campaigns.exportFailed')}
          </button>
          {c.status !== 'running' && (
            <button
              className="icon-btn danger"
              title={t('common.delete')}
              aria-label={t('common.delete')}
              disabled={!canWrite}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {c.lastError && c.status === 'running' && (
        <p className="mc-warn mcp-banner" role="status">
          {c.lastError}
        </p>
      )}

      <Progress c={{ ...c, sent: k.sent, failed: k.failed, skipped: k.skipped }} />

      <div className="mc-stats">
        {tiles.map(tile => (
          <button
            key={tile.key || 'total'}
            type="button"
            className={`mc-stat mcp-stat-${tile.key || 'total'} ${filter === tile.key ? 'active' : ''}`}
            onClick={() => setFilter(tile.key)}
          >
            <span className="mc-stat-value">{tile.value}</span>
            <span className="mc-stat-label">{t(`marvice.campaigns.report.${tile.key || 'total'}`)}</span>
          </button>
        ))}
      </div>

      <details className="mcp-message">
        <summary>{t('marvice.campaigns.messageLabel')}</summary>
        <p>{c.message}</p>
        {c.mediaUrl && <p className="mc-muted mc-mono">{c.mediaUrl}</p>}
      </details>

      <div className="mc-filters">
        <select
          className="mc-select"
          value={filter}
          onChange={e => setFilter(e.target.value as '' | RecipientStatus)}
          aria-label={t('marvice.contacts.filter')}
        >
          {REPORT_FILTERS.map(s => (
            <option key={s || 'all'} value={s}>
              {t(`marvice.campaigns.report.${s || 'total'}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="mc-table-wrap">
        <table className="mc-table">
          <thead>
            <tr>
              <th>{t('marvice.contacts.col.phone')}</th>
              <th>{t('marvice.contacts.col.name')}</th>
              <th>{t('marvice.contacts.col.status')}</th>
              <th>{t('marvice.campaigns.sentAt')}</th>
              <th>{t('marvice.campaigns.error')}</th>
            </tr>
          </thead>
          <tbody>
            {(rows?.items ?? []).map(r => (
              <tr key={r.id}>
                <td className="mc-mono">+{r.phone}</td>
                <td>{r.name || <span className="mc-muted">—</span>}</td>
                <td>
                  <span className={`mc-badge mcp-r-${r.status}`}>{t(`marvice.campaigns.report.${r.status}`)}</span>
                </td>
                <td>{fmt(r.sentAt)}</td>
                <td className="mcp-error-cell">{r.error || <span className="mc-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(rows?.items.length ?? 0) === 0 && <p className="mc-empty mc-compact">{t('marvice.campaigns.noRows')}</p>}
      </div>

      {pages > 1 && (
        <div className="mc-pager">
          <button className="btn-secondary mc-small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ‹
          </button>
          <span className="mc-page-num">
            {page} / {pages}
          </span>
          <button className="btn-secondary mc-small" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            ›
          </button>
        </div>
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(false)}
          title={t('marvice.campaigns.deleteTitle')}
          className="modal-sm"
          closeLabel={t('common.close')}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn-danger"
                disabled={m.remove.isPending}
                onClick={async () => {
                  try {
                    await m.remove.mutateAsync(c.id);
                    setConfirmDelete(false);
                  } catch (err) {
                    toast.error(errorMessage(err, t('common.unknownError')));
                  }
                }}
              >
                <Trash2 size={16} /> {t('common.delete')}
              </button>
            </>
          }
        >
          <p>{t('marvice.campaigns.deleteConfirm', { name: c.name })}</p>
        </Modal>
      )}
    </>
  );
}

function NewCampaignModal({
  sessionId,
  onClose,
  onCreated,
}: {
  sessionId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: lists = [] } = useContactListsQuery(sessionId);
  const m = useCampaignMutations(sessionId);
  const [name, setName] = useState('');
  const [listId, setListId] = useState('');
  const [message, setMessage] = useState('Hi {{first_name}}, ');
  const [tag, setTag] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [msgType, setMsgType] = useState<MessageType>('text');
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');

  const uploadFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t('marvice.campaigns.uploadTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const res = await campaignsApi.uploadMedia(sessionId, file);
      setMediaUrl(res.url);
      setUploadedName(res.filename);
      // An upload of a different kind (e.g. a PDF while "Image" is picked) switches the type to match.
      if (msgType !== 'text' && res.mediaType !== msgType) setMsgType(res.mediaType);
      toast.success(t('marvice.campaigns.uploaded', { name: res.filename }));
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    } finally {
      setUploading(false);
    }
  };
  const isAudio = msgType === 'audio';
  // A voice note has no caption; the preview still needs a body to count the audience.
  const previewBody = isAudio ? '🎤' : message;
  const [delayMs, setDelayMs] = useState(8000);
  const [when, setWhen] = useState<'now' | 'later' | 'draft'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    if (!listId && lists[0]) setListId(lists[0].id);
  }, [lists, listId]);

  // Live preview: audience size + the message rendered for real contacts.
  useEffect(() => {
    if (!listId || !previewBody.trim()) return;
    const timer = setTimeout(() => {
      campaignsApi
        .preview(sessionId, { listId, message: previewBody, onlyVerified, tag: tag.trim() || undefined })
        .then(p => {
          setPreview(p);
          setPreviewError('');
        })
        .catch((err: unknown) => setPreviewError(errorMessage(err, '')));
    }, 400);
    return () => clearTimeout(timer);
  }, [sessionId, listId, previewBody, onlyVerified, tag]);

  const insert = (v: string) => setMessage(prev => `${prev}{{${v}}}`);

  const submit = async () => {
    const body: NewCampaign = {
      name: name.trim(),
      listId,
      message: isAudio ? '' : message,
      delayMs,
      onlyVerified,
      tag: tag.trim() || undefined,
      startNow: when === 'now',
      scheduledAt: when === 'later' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      ...(msgType !== 'text' ? { mediaUrl: mediaUrl.trim(), mediaType: msgType } : {}),
    };
    try {
      const created = await m.create.mutateAsync(body);
      toast.success(t('marvice.campaigns.toasts.created'));
      onCreated(created.id);
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    }
  };

  const canSubmit =
    name.trim() &&
    listId &&
    (isAudio || message.trim()) &&
    (msgType === 'text' || /^https:\/\/\S+$/.test(mediaUrl.trim())) &&
    (preview?.recipients ?? 0) > 0 &&
    (when !== 'later' || scheduledAt);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('marvice.campaigns.new')}
      closeLabel={t('common.close')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" disabled={!canSubmit || m.create.isPending} onClick={() => void submit()}>
            {m.create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{' '}
            {t(`marvice.campaigns.submit.${when}`, { count: preview?.recipients ?? 0 })}
          </button>
        </>
      }
    >
      {lists.length === 0 ? (
        <p className="mc-warn">{t('marvice.campaigns.noLists')}</p>
      ) : (
        <div className="mcp-form">
          <div className="form-group">
            <label htmlFor="mcp-name">{t('common.name')}</label>
            <input
              id="mcp-name"
              value={name}
              maxLength={100}
              placeholder={t('marvice.campaigns.namePlaceholder')}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="mc-row">
            <div className="form-group">
              <label htmlFor="mcp-list">{t('marvice.campaigns.list')}</label>
              <select id="mcp-list" className="mc-select" value={listId} onChange={e => setListId(e.target.value)}>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.counts.total})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="mcp-tag">{t('marvice.campaigns.tag')}</label>
              <input
                id="mcp-tag"
                value={tag}
                maxLength={60}
                placeholder={t('marvice.campaigns.tagPlaceholder')}
                onChange={e => setTag(e.target.value)}
              />
            </div>
          </div>
          <label className="mc-check">
            <input type="checkbox" checked={onlyVerified} onChange={e => setOnlyVerified(e.target.checked)} />
            {t('marvice.campaigns.onlyVerified')}
          </label>

          <div className="form-group">
            <span className="mcp-label">{t('marvice.campaigns.messageType')}</span>
            <div className="mcp-types" role="radiogroup" aria-label={t('marvice.campaigns.messageType')}>
              {MESSAGE_TYPES.map(({ key, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={msgType === key}
                  className={`mcp-type ${msgType === key ? 'active' : ''}`}
                  onClick={() => setMsgType(key)}
                >
                  <Icon size={16} /> {t(`marvice.campaigns.types.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {msgType !== 'text' && (
            <div className="form-group">
              <label htmlFor="mcp-media">{t(`marvice.campaigns.mediaLink.${msgType}`)}</label>
              <div className="mcp-upload">
                <input
                  id="mcp-media"
                  type="url"
                  value={mediaUrl}
                  placeholder={MEDIA_PLACEHOLDER[msgType]}
                  onChange={e => {
                    setMediaUrl(e.target.value);
                    setUploadedName('');
                  }}
                />
                <label className={`btn-secondary mcp-upload-btn ${uploading ? 'disabled' : ''}`}>
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{' '}
                  {uploading ? t('marvice.campaigns.uploading') : t('marvice.campaigns.uploadFile')}
                  <input
                    type="file"
                    hidden
                    aria-label={t('marvice.campaigns.uploadFile')}
                    accept={UPLOAD_ACCEPT[msgType]}
                    disabled={uploading}
                    onChange={e => {
                      void uploadFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <span className="mc-muted">
                {uploadedName
                  ? t('marvice.campaigns.uploadedHint', { name: uploadedName })
                  : t('marvice.campaigns.mediaHint')}
              </span>
            </div>
          )}

          <div className="form-group" hidden={isAudio}>
            <label htmlFor="mcp-message">
              {msgType === 'text' ? t('marvice.campaigns.messageLabel') : t('marvice.campaigns.captionLabel')}
            </label>
            <textarea
              id="mcp-message"
              rows={5}
              maxLength={4096}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="mcp-chips">
              {(preview?.variables ?? ['name', 'first_name', 'phone']).map(v => (
                <button key={v} type="button" className="mc-tag mcp-chip" onClick={() => insert(v)}>
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            {preview && preview.unknownVariables.length > 0 && (
              <p className="mc-warn">
                {t('marvice.campaigns.unknownVars', { vars: preview.unknownVariables.join(', ') })}
              </p>
            )}
          </div>

          {isAudio && <p className="mc-muted">{t('marvice.campaigns.audioNote')}</p>}

          <div className="mc-row">
            <div className="form-group">
              <label htmlFor="mcp-speed">{t('marvice.campaigns.speed')}</label>
              <select
                id="mcp-speed"
                className="mc-select"
                value={delayMs}
                onChange={e => setDelayMs(Number(e.target.value))}
              >
                {SPEEDS.map(s => (
                  <option key={s.ms} value={s.ms}>
                    {t(`marvice.campaigns.speeds.${s.key}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="mcp-when">{t('marvice.campaigns.when')}</label>
              <select
                id="mcp-when"
                className="mc-select"
                value={when}
                onChange={e => setWhen(e.target.value as 'now' | 'later' | 'draft')}
              >
                <option value="now">{t('marvice.campaigns.whenNow')}</option>
                <option value="later">{t('marvice.campaigns.whenLater')}</option>
                <option value="draft">{t('marvice.campaigns.whenDraft')}</option>
              </select>
            </div>
            {when === 'later' && (
              <div className="form-group">
                <label htmlFor="mcp-at">{t('marvice.campaigns.at')}</label>
                <input
                  id="mcp-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="mcp-preview">
            <strong>{t('marvice.campaigns.previewTitle', { count: preview?.recipients ?? 0 })}</strong>
            {previewError && <p className="mc-error">{previewError}</p>}
            {(preview?.sample ?? []).map(s => (
              <div key={s.phone} className="mcp-bubble">
                <span className="mc-muted mc-mono">+{s.phone}</span>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
