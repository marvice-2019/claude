// Marvice Modules — Contacts page: lists, CSV import, WhatsApp verification, opt-outs.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { useSessionsQuery } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import {
  type Contact,
  type ContactList,
  type ImportSummary,
  useContactListsQuery,
  useContactsMutations,
  useContactsQuery,
} from './contactsApi';
import './Contacts.css';

const PAGE_SIZE = 50;
const STATUS_FILTERS = ['', 'on_whatsapp', 'not_on_whatsapp', 'pending', 'check_failed', 'opted_out'] as const;

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function StatusBadge({ contact }: { contact: Contact }) {
  const { t } = useTranslation();
  if (!contact.optedIn) {
    return (
      <span className="mc-badge mc-badge-muted">
        <ShieldOff size={12} /> {t('marvice.contacts.status.opted_out')}
      </span>
    );
  }
  const icon = {
    on_whatsapp: <CheckCircle2 size={12} />,
    not_on_whatsapp: <XCircle size={12} />,
    pending: <Clock size={12} />,
    check_failed: <AlertCircle size={12} />,
  }[contact.waStatus];
  return (
    <span className={`mc-badge mc-badge-${contact.waStatus}`}>
      {icon} {t(`marvice.contacts.status.${contact.waStatus}`)}
    </span>
  );
}

export function Contacts() {
  const { t } = useTranslation();
  useDocumentTitle(t('marvice.contacts.title'));
  const { canWrite } = useRole();
  const toast = useToast();
  const { data: sessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const [sessionId, setSessionId] = useState('');
  const [listId, setListId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showNewList, setShowNewList] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteList, setDeleteList] = useState<ContactList | null>(null);

  useEffect(() => {
    if (sessions.some(s => s.id === sessionId)) return;
    setSessionId(sessions[0]?.id ?? '');
  }, [sessions, sessionId]);

  const { data: lists = [], isLoading: loadingLists, error: listsError } = useContactListsQuery(sessionId);
  useEffect(() => {
    if (lists.some(l => l.id === listId)) return;
    setListId(lists[0]?.id ?? '');
  }, [lists, listId]);
  useEffect(() => setPage(1), [listId, search, status]);

  const list = lists.find(l => l.id === listId);
  const query = useMemo(
    () => ({ page, limit: PAGE_SIZE, search: search.trim() || undefined, status: status || undefined }),
    [page, search, status],
  );
  const { data: contactPage, isFetching: loadingContacts } = useContactsQuery(
    sessionId,
    listId,
    query,
    !!list?.verifying,
  );
  const m = useContactsMutations(sessionId);
  const pages = Math.max(1, Math.ceil((contactPage?.total ?? 0) / PAGE_SIZE));

  const verifyNow = async () => {
    if (!list) return;
    try {
      const { queued } = await m.verify.mutateAsync(list.id);
      toast.success(t('marvice.contacts.toasts.verifyStarted', { count: queued }));
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    }
  };

  const toggleOptIn = async (c: Contact) => {
    try {
      await m.updateContact.mutateAsync({ id: c.id, body: { optedIn: !c.optedIn } });
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    }
  };

  const removeContact = async (c: Contact) => {
    try {
      await m.deleteContact.mutateAsync(c.id);
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    }
  };

  if (loadingSessions) {
    return (
      <div className="mc-page mc-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="mc-page">
      <PageHeader
        title={t('marvice.contacts.title')}
        subtitle={t('marvice.contacts.subtitle')}
        actions={
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
        }
      />

      {sessions.length === 0 ? (
        <div className="mc-empty">
          <Users size={48} strokeWidth={1} />
          <h3>{t('marvice.contacts.noSessions')}</h3>
        </div>
      ) : (
        <div className="mc-workspace">
          <aside className="mc-lists">
            <div className="mc-lists-head">
              <h2>{t('marvice.contacts.lists')}</h2>
              <button className="btn-primary mc-small" onClick={() => setShowNewList(true)} disabled={!canWrite}>
                <Plus size={16} /> {t('marvice.contacts.newList')}
              </button>
            </div>
            {loadingLists ? (
              <div className="mc-center">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : listsError && lists.length === 0 ? (
              <div className="mc-empty mc-compact" role="alert">
                <AlertCircle size={32} strokeWidth={1} />
                <p>
                  {(listsError as { status?: number }).status === 403
                    ? t('marvice.contacts.forbidden')
                    : listsError.message}
                </p>
              </div>
            ) : lists.length === 0 ? (
              <div className="mc-empty mc-compact">
                <Users size={32} strokeWidth={1} />
                <p>{t('marvice.contacts.noLists')}</p>
              </div>
            ) : (
              <div role="list">
                {lists.map(l => (
                  <button
                    key={l.id}
                    role="listitem"
                    type="button"
                    className={`mc-list-item ${l.id === listId ? 'selected' : ''}`}
                    onClick={() => setListId(l.id)}
                  >
                    <span className="mc-list-name">
                      {l.name}
                      {l.verifying && <Loader2 className="animate-spin" size={12} />}
                    </span>
                    <span className="mc-list-meta">
                      {t('marvice.contacts.listMeta', { total: l.counts.total, on: l.counts.onWhatsapp })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="mc-main">
            {!list ? (
              <div className="mc-empty">
                <Upload size={48} strokeWidth={1} />
                <h3>{t('marvice.contacts.startTitle')}</h3>
                <p>{t('marvice.contacts.startDesc')}</p>
              </div>
            ) : (
              <>
                <div className="mc-list-header">
                  <div>
                    <h2>{list.name}</h2>
                    {list.description && <p className="mc-muted">{list.description}</p>}
                  </div>
                  <div className="mc-actions">
                    <button className="btn-primary" onClick={() => setShowImport(true)} disabled={!canWrite}>
                      <Upload size={16} /> {t('marvice.contacts.import')}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => void verifyNow()}
                      disabled={!canWrite || list.verifying || m.verify.isPending}
                    >
                      <RefreshCw size={16} className={list.verifying ? 'animate-spin' : ''} />
                      {list.verifying ? t('marvice.contacts.verifying') : t('marvice.contacts.verify')}
                    </button>
                    <button
                      className="icon-btn danger"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      onClick={() => setDeleteList(list)}
                      disabled={!canWrite}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mc-stats">
                  {(
                    [
                      ['total', list.counts.total, ''],
                      ['on_whatsapp', list.counts.onWhatsapp, 'on_whatsapp'],
                      ['not_on_whatsapp', list.counts.notOnWhatsapp, 'not_on_whatsapp'],
                      ['pending', list.counts.pending, 'pending'],
                      ['check_failed', list.counts.checkFailed, 'check_failed'],
                      ['opted_out', list.counts.optedOut, 'opted_out'],
                    ] as const
                  ).map(([key, value, filter]) => (
                    <button
                      key={key}
                      type="button"
                      className={`mc-stat ${status === filter ? 'active' : ''}`}
                      onClick={() => setStatus(filter)}
                    >
                      <span className="mc-stat-value">{value.toLocaleString()}</span>
                      <span className="mc-stat-label">
                        {key === 'total' ? t('marvice.contacts.total') : t(`marvice.contacts.status.${key}`)}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mc-filters">
                  <div className="mc-search">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={t('marvice.contacts.searchPlaceholder')}
                      aria-label={t('common.search')}
                    />
                  </div>
                  <select
                    className="mc-select"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    aria-label={t('marvice.contacts.filter')}
                  >
                    {STATUS_FILTERS.map(s => (
                      <option key={s} value={s}>
                        {s ? t(`marvice.contacts.status.${s}`) : t('marvice.contacts.allStatuses')}
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
                        <th>{t('marvice.contacts.col.tags')}</th>
                        <th>{t('marvice.contacts.col.status')}</th>
                        <th>{t('marvice.contacts.col.optIn')}</th>
                        <th aria-label={t('marvice.contacts.col.actions')} />
                      </tr>
                    </thead>
                    <tbody>
                      {(contactPage?.items ?? []).map(c => (
                        <tr key={c.id}>
                          <td className="mc-mono">+{c.phone}</td>
                          <td>{c.name || <span className="mc-muted">—</span>}</td>
                          <td>
                            {(c.tags ?? '')
                              .split(',')
                              .filter(Boolean)
                              .map(tag => (
                                <span key={tag} className="mc-tag">
                                  {tag}
                                </span>
                              ))}
                          </td>
                          <td>
                            <StatusBadge contact={c} />
                          </td>
                          <td>
                            <label className="mc-switch" title={t('marvice.contacts.optInHint')}>
                              <input
                                type="checkbox"
                                checked={c.optedIn}
                                disabled={!canWrite || m.updateContact.isPending}
                                onChange={() => void toggleOptIn(c)}
                              />
                              <span />
                            </label>
                          </td>
                          <td>
                            {canWrite && (
                              <button
                                className="icon-btn danger"
                                title={t('common.delete')}
                                aria-label={t('common.delete')}
                                onClick={() => void removeContact(c)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loadingContacts && (contactPage?.items.length ?? 0) === 0 && (
                    <div className="mc-empty mc-compact">
                      <p>{t('marvice.contacts.noContacts')}</p>
                    </div>
                  )}
                </div>

                <div className="mc-pager">
                  <span className="mc-muted">{t('marvice.contacts.showing', { count: contactPage?.total ?? 0 })}</span>
                  <div>
                    <button className="btn-secondary mc-small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      ‹
                    </button>
                    <span className="mc-page-num">
                      {page} / {pages}
                    </span>
                    <button
                      className="btn-secondary mc-small"
                      disabled={page >= pages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showNewList && (
        <NewListModal
          onClose={() => setShowNewList(false)}
          onCreate={async (name, description) => {
            try {
              const created = await m.createList.mutateAsync({ name, description: description || undefined });
              setListId(created.id);
              setShowNewList(false);
              toast.success(t('marvice.contacts.toasts.listCreated'));
            } catch (err) {
              toast.error(errorMessage(err, t('common.unknownError')));
            }
          }}
          busy={m.createList.isPending}
        />
      )}

      {showImport && list && (
        <ImportModal
          listName={list.name}
          busy={m.importCsv.isPending}
          onClose={() => setShowImport(false)}
          onImport={async (csv, defaultCountryCode, verify) =>
            m.importCsv.mutateAsync({ listId: list.id, csv, defaultCountryCode, verify })
          }
        />
      )}

      {deleteList && (
        <Modal
          open
          onClose={() => setDeleteList(null)}
          title={t('marvice.contacts.deleteListTitle')}
          className="modal-sm"
          closeLabel={t('common.close')}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setDeleteList(null)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn-danger"
                disabled={m.deleteList.isPending}
                onClick={async () => {
                  try {
                    await m.deleteList.mutateAsync(deleteList.id);
                    setDeleteList(null);
                    toast.success(t('marvice.contacts.toasts.listDeleted'));
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
          <p>{t('marvice.contacts.deleteListConfirm', { name: deleteList.name, count: deleteList.counts.total })}</p>
        </Modal>
      )}
    </div>
  );
}

function NewListModal({
  onClose,
  onCreate,
  busy,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title={t('marvice.contacts.newList')}
      className="modal-sm"
      closeLabel={t('common.close')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn-primary"
            disabled={busy || !name.trim()}
            onClick={() => void onCreate(name, description)}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {t('marvice.contacts.create')}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label htmlFor="mc-list-name">{t('common.name')}</label>
        <input
          id="mc-list-name"
          value={name}
          maxLength={100}
          onChange={e => setName(e.target.value)}
          placeholder={t('marvice.contacts.listNamePlaceholder')}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label htmlFor="mc-list-desc">{t('marvice.contacts.description')}</label>
        <input
          id="mc-list-desc"
          value={description}
          maxLength={500}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('marvice.contacts.descriptionPlaceholder')}
        />
      </div>
    </Modal>
  );
}

function ImportModal({
  listName,
  busy,
  onClose,
  onImport,
}: {
  listName: string;
  busy: boolean;
  onClose: () => void;
  onImport: (csv: string, countryCode: string, verify: boolean) => Promise<ImportSummary>;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [consent, setConsent] = useState(false);
  const [verify, setVerify] = useState(true);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState('');

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError(t('marvice.contacts.importDialog.tooLarge'));
      return;
    }
    setFileName(file.name);
    setCsv(await file.text());
    setError('');
  };

  const submit = async () => {
    setError('');
    try {
      setResult(await onImport(csv, countryCode, verify));
    } catch (err) {
      setError(errorMessage(err, t('common.unknownError')));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('marvice.contacts.importDialog.title', { name: listName })}
      closeLabel={t('common.close')}
      footer={
        result ? (
          <button className="btn-primary" onClick={onClose}>
            {t('marvice.contacts.importDialog.done')}
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" disabled={busy || !csv.trim() || !consent} onClick={() => void submit()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{' '}
              {t('marvice.contacts.importDialog.submit')}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="mc-result">
          <p>
            <CheckCircle2 size={18} />{' '}
            {t('marvice.contacts.importDialog.saved', { added: result.added, updated: result.updated })}
          </p>
          <ul>
            <li>{t('marvice.contacts.importDialog.rows', { count: result.totalRows })}</li>
            {result.invalid > 0 && (
              <li>
                {t('marvice.contacts.importDialog.invalid', { count: result.invalid })}
                {result.invalidSamples.length > 0 && (
                  <span className="mc-muted"> ({result.invalidSamples.join(', ')})</span>
                )}
              </li>
            )}
            {result.duplicates > 0 && (
              <li>{t('marvice.contacts.importDialog.duplicates', { count: result.duplicates })}</li>
            )}
            {result.overLimit > 0 && (
              <li>{t('marvice.contacts.importDialog.overLimit', { count: result.overLimit })}</li>
            )}
            {result.columns.variables.length > 0 && (
              <li>
                {t('marvice.contacts.importDialog.variables')}{' '}
                {result.columns.variables.map(v => (
                  <code key={v}>{`{{${v}}}`}</code>
                ))}
              </li>
            )}
            {result.verificationQueued > 0 && (
              <li>{t('marvice.contacts.importDialog.verifying', { count: result.verificationQueued })}</li>
            )}
            {result.verificationSkipped && (
              <li className="mc-warn">{t('marvice.contacts.importDialog.verifySkipped')}</li>
            )}
          </ul>
        </div>
      ) : (
        <>
          <p className="mc-muted">{t('marvice.contacts.importDialog.help')}</p>
          <div
            className="mc-drop"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              void readFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
          >
            <Upload size={24} />
            <span>{fileName || t('marvice.contacts.importDialog.drop')}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              aria-label={t('marvice.contacts.importDialog.drop')}
              onChange={e => void readFile(e.target.files?.[0])}
            />
          </div>
          <div className="form-group">
            <label htmlFor="mc-csv">{t('marvice.contacts.importDialog.paste')}</label>
            <textarea
              id="mc-csv"
              rows={5}
              value={csv}
              onChange={e => setCsv(e.target.value)}
              placeholder={'phone,name,tags,city\n9876543210,Rahul,vip,Pune'}
              className="mc-mono"
            />
          </div>
          <div className="mc-row">
            <div className="form-group">
              <label htmlFor="mc-cc">{t('marvice.contacts.importDialog.countryCode')}</label>
              <input
                id="mc-cc"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value.replace(/[^\d+]/g, '').slice(0, 5))}
              />
            </div>
            <label className="mc-check">
              <input type="checkbox" checked={verify} onChange={e => setVerify(e.target.checked)} />
              {t('marvice.contacts.importDialog.verify')}
            </label>
          </div>
          <label className="mc-check mc-consent">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            {t('marvice.contacts.importDialog.consent')}
          </label>
          {error && (
            <p className="mc-error" role="alert">
              <AlertCircle size={16} /> {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
