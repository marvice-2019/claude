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
}

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

export async function saveMedia(file: {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}): Promise<StoredMedia> {
  const id = randomBytes(16).toString('hex');
  const mimetype = file.mimetype || 'application/octet-stream';
  const meta: StoredMedia = {
    id,
    filename: safeFilename(file.originalname),
    mimetype,
    size: file.buffer.length,
    mediaType: mediaTypeOf(mimetype),
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
