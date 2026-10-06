// Marvice Modules — WhatsApp Profile: sender name, display picture and About for each session.
// Uses the upstream /sessions/:id/profile routes; nothing fork-specific on the server.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ImagePlus, Loader2, Save, ShieldCheck, Trash2, UserCircle2 } from 'lucide-react';
import { useSessionsQuery } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { request, type ProfilePictureResponse } from '../services/api';
import './Contacts.css';
import './Profile.css';

const NAME_MAX = 25;
const ABOUT_MAX = 139;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const base = (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/profile`;

/** Centre-crop to a 640×640 JPEG: WhatsApp shows a square, and a smaller upload is accepted faster. */
async function toSquareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Unreadable image'));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 640, 640);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function Profile() {
  const { t } = useTranslation();
  useDocumentTitle(t('marvice.profile.title'));
  const { canWrite } = useRole();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: sessions = [] } = useSessionsQuery();
  const [sessionId, setSessionId] = useState('');
  const session = sessions.find(s => s.id === sessionId);
  const ready = session?.status === 'ready';

  useEffect(() => {
    if (sessions.some(s => s.id === sessionId)) return;
    setSessionId((sessions.find(s => s.status === 'ready') ?? sessions[0])?.id ?? '');
  }, [sessions, sessionId]);

  const ownId = session?.phone ? `${session.phone.replace(/\D/g, '')}@c.us` : '';
  const { data: pic, isFetching: loadingPic } = useQuery({
    queryKey: ['marvice', 'profile', sessionId, 'picture', ownId],
    queryFn: () =>
      request<ProfilePictureResponse>(
        `/sessions/${encodeURIComponent(sessionId)}/contacts/${encodeURIComponent(ownId)}/profile-picture`,
      ),
    enabled: ready && !!ownId,
    retry: false,
  });

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'name' | 'about' | 'photo' | 'remove'>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(session?.pushName ?? '');
    setAbout('');
    setPhoto(null);
  }, [sessionId, session?.pushName]);

  const run = async (kind: typeof busy, fn: () => Promise<unknown>, okKey: string) => {
    setBusy(kind);
    try {
      await fn();
      toast.success(t(`marvice.profile.toasts.${okKey}`));
      await qc.invalidateQueries({ queryKey: ['marvice', 'profile', sessionId] });
      await qc.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    } finally {
      setBusy('');
    }
  };

  const saveName = () =>
    run(
      'name',
      () => request(`${base(sessionId)}/name`, { method: 'PUT', body: JSON.stringify({ name: name.trim() }) }),
      'name',
    );
  const saveAbout = () =>
    run(
      'about',
      () => request(`${base(sessionId)}/status`, { method: 'PUT', body: JSON.stringify({ status: about.trim() }) }),
      'about',
    );
  const savePhoto = () =>
    run(
      'photo',
      async () => {
        await request(`${base(sessionId)}/picture`, {
          method: 'PUT',
          body: JSON.stringify({ base64: photo, mimetype: 'image/jpeg' }),
        });
        setPhoto(null);
      },
      'photo',
    );
  const removePhoto = () => run('remove', () => request(`${base(sessionId)}/picture`, { method: 'DELETE' }), 'removed');

  const pickFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error(t('marvice.profile.notImage'));
    if (file.size > PHOTO_MAX_BYTES) return toast.error(t('marvice.profile.tooLarge'));
    try {
      setPhoto(await toSquareJpeg(file));
    } catch (err) {
      toast.error(errorMessage(err, t('common.unknownError')));
    }
  };

  const shown = photo ?? pic?.url ?? null;
  const disabled = !canWrite || !ready || !!busy;

  return (
    <div className="mc-page">
      <PageHeader
        title={t('marvice.profile.title')}
        subtitle={t('marvice.profile.subtitle')}
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
                {s.phone ? ` · +${s.phone}` : ''}
              </option>
            ))}
          </select>
        }
      />

      {session && !ready && (
        <p className="mc-warn mpf-banner" role="status">
          {t('marvice.profile.notReady')}
        </p>
      )}

      <div className="mpf-grid">
        <section className="mc-main">
          <h2>{t('marvice.profile.picture')}</h2>
          <div className="mpf-photo-row">
            <div className="mpf-avatar">
              {loadingPic && !photo ? (
                <Loader2 className="animate-spin" size={28} />
              ) : shown ? (
                <img src={shown} alt={t('marvice.profile.picture')} />
              ) : (
                <UserCircle2 size={72} strokeWidth={1} />
              )}
            </div>
            <div className="mpf-photo-actions">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                aria-label={t('marvice.profile.choose')}
                onChange={e => void pickFile(e.target.files?.[0])}
              />
              <button className="btn-secondary" disabled={disabled} onClick={() => fileRef.current?.click()}>
                <ImagePlus size={16} /> {t('marvice.profile.choose')}
              </button>
              <button className="btn-primary" disabled={disabled || !photo} onClick={() => void savePhoto()}>
                {busy === 'photo' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{' '}
                {t('marvice.profile.savePhoto')}
              </button>
              <button className="btn-secondary" disabled={disabled || !pic?.url} onClick={() => void removePhoto()}>
                <Trash2 size={16} /> {t('marvice.profile.removePhoto')}
              </button>
              <p className="mc-muted">{t('marvice.profile.photoHint')}</p>
            </div>
          </div>
        </section>

        <section className="mc-main">
          <h2>{t('marvice.profile.identity')}</h2>
          <div className="form-group">
            <label htmlFor="mpf-name">{t('marvice.profile.name')}</label>
            <div className="mpf-inline">
              <input
                id="mpf-name"
                value={name}
                maxLength={NAME_MAX}
                placeholder="Marvice Media"
                onChange={e => setName(e.target.value)}
              />
              <button
                className="btn-primary"
                disabled={disabled || !name.trim() || name.trim() === (session?.pushName ?? '')}
                onClick={() => void saveName()}
              >
                {busy === 'name' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{' '}
                {t('common.save', 'Save')}
              </button>
            </div>
            <span className="mc-muted">
              {name.length}/{NAME_MAX} · {t('marvice.profile.nameHint')}
            </span>
          </div>
          <div className="form-group">
            <label htmlFor="mpf-about">{t('marvice.profile.about')}</label>
            <div className="mpf-inline">
              <input
                id="mpf-about"
                value={about}
                maxLength={ABOUT_MAX}
                placeholder={t('marvice.profile.aboutPlaceholder')}
                onChange={e => setAbout(e.target.value)}
              />
              <button className="btn-primary" disabled={disabled || !about.trim()} onClick={() => void saveAbout()}>
                {busy === 'about' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{' '}
                {t('common.save', 'Save')}
              </button>
            </div>
            <span className="mc-muted">
              {about.length}/{ABOUT_MAX}
            </span>
          </div>
        </section>
      </div>

      <section className="mc-main">
        <h2>
          <ShieldCheck size={18} /> {t('marvice.profile.visibilityTitle')}
        </h2>
        <p className="mc-muted">{t('marvice.profile.visibilityIntro')}</p>
        <ul className="mpf-checklist">
          {(['name', 'photo', 'about', 'business'] as const).map(k => (
            <li key={k}>
              <CheckCircle2 size={16} /> <span>{t(`marvice.profile.visibility.${k}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
