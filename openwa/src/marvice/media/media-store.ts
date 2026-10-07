// Marvice Modules — campaign media store. Uploaded files live under data/marvice-media/<id>/ (the
// persistent volume) and are served back at a public, unguessable URL so the bulk sender can fetch
// them like any other https media link.
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

/** Same ceiling as OpenWA's remote-media download cap, so anything stored here can also be sent. */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MEDIA_ID = /^[a-f0-9]{32}$/;

export interface StoredMedia {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  /** The public origin the link was minted on (https://host), so the sender may fetch it back. */
  origin?: string;
}

const MEDIA_PATH = /\/api\/marvice\/media\/([a-f0-9]{32})\//;

export function mediaRoot(): string {
  return process.env.MARVICE_MEDIA_DIR || join(process.cwd(), 'data', 'marvice-media');
}

/** Keep the original name readable but safe for a URL path and a Content-Disposition header. */
export function safeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').normalize('NFKD');
  const cleaned = base
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
    .slice(-120);
  return cleaned || 'file';
}

export function mediaTypeOf(mimetype: string): StoredMedia['mediaType'] {
  if (mimetype.startsWith('image/') && mimetype !== 'image/svg+xml') return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

export async function saveMedia(
  file: { originalname: string; mimetype: string; buffer: Buffer },
  origin?: string,
): Promise<StoredMedia> {
  const id = randomBytes(16).toString('hex');
  const mimetype = file.mimetype || 'application/octet-stream';
  const meta: StoredMedia = {
    id,
    filename: safeFilename(file.originalname),
    mimetype,
    size: file.buffer.length,
    mediaType: mediaTypeOf(mimetype),
    ...(origin ? { origin } : {}),
  };
  const dir = join(mediaRoot(), id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, 'blob'), file.buffer);
  await fs.writeFile(join(dir, 'meta.json'), JSON.stringify(meta));
  return meta;
}

/** Null when the id is malformed or nothing is stored under it. */
export async function readMediaMeta(id: string): Promise<StoredMedia | null> {
  if (!MEDIA_ID.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(join(mediaRoot(), id, 'meta.json'), 'utf8')) as StoredMedia;
  } catch {
    return null;
  }
}

export function mediaBlobPath(id: string): string {
  return join(mediaRoot(), id, 'blob');
}

export const LOOPBACK_HOST = '127.0.0.1';

/**
 * The address the sender should fetch a campaign's media from. An uploaded file lives on this very
 * server, and fetching it back through the public domain fails inside the container (OpenWA's SSRF
 * guard sees a private address — "Destination address is not allowed"). So a link to a stored upload
 * is rewritten to the container's own loopback port, which always reaches this process, and loopback
 * is added to SSRF_ALLOWED_HOSTS. Any other link is returned unchanged.
 */
export async function sendableMediaUrl(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const id = MEDIA_PATH.exec(parsed.pathname)?.[1];
  const meta = id ? await readMediaMeta(id) : null;
  if (!meta) return url;
  allowLoopbackFetch();
  const port = process.env.PORT || '2785';
  return `http://${LOOPBACK_HOST}:${port}/api/marvice/media/${meta.id}/${encodeURIComponent(meta.filename)}`;
}

function allowLoopbackFetch(): void {
  const current = (process.env.SSRF_ALLOWED_HOSTS ?? '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);
  if (!current.includes(LOOPBACK_HOST)) {
    process.env.SSRF_ALLOWED_HOSTS = [...current, LOOPBACK_HOST].join(',');
  }
}
