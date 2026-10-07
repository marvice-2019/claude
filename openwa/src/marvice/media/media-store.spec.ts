import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mediaBlobPath, mediaTypeOf, readMediaMeta, safeFilename, saveMedia } from './media-store';
import { publicOrigin } from './media.controller';

describe('Marvice campaign media store', () => {
  let dir: string;
  const env = { ...process.env };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'marvice-media-'));
    process.env.MARVICE_MEDIA_DIR = dir;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    process.env = { ...env };
  });

  it('keeps file names readable but path- and header-safe', () => {
    expect(safeFilename('../../etc/passwd')).toBe('passwd');
    expect(safeFilename('Diwali Menu "2026".pdf')).toBe('Diwali-Menu-2026.pdf');
    expect(safeFilename('...hidden')).toBe('hidden');
    expect(safeFilename('')).toBe('file');
  });

  it('maps MIME types onto WhatsApp message types', () => {
    expect(mediaTypeOf('image/jpeg')).toBe('image');
    expect(mediaTypeOf('image/svg+xml')).toBe('document');
    expect(mediaTypeOf('video/mp4')).toBe('video');
    expect(mediaTypeOf('audio/ogg')).toBe('audio');
    expect(mediaTypeOf('application/pdf')).toBe('document');
  });

  it('stores a file under a random id and reads it back', async () => {
    const meta = await saveMedia({
      originalname: 'menu.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF'),
    });
    expect(meta).toMatchObject({ filename: 'menu.pdf', mimetype: 'application/pdf', size: 4, mediaType: 'document' });
    expect(meta.id).toMatch(/^[a-f0-9]{32}$/);
    expect(await readMediaMeta(meta.id)).toEqual(meta);
    expect(readFileSync(mediaBlobPath(meta.id), 'utf8')).toBe('%PDF');
  });

  it('rejects malformed or unknown ids without touching the filesystem outside the store', async () => {
    expect(await readMediaMeta('../../etc')).toBeNull();
    expect(await readMediaMeta('a'.repeat(32))).toBeNull();
  });

  it('builds public links from BASE_URL, else from the forwarded host', () => {
    process.env.BASE_URL = 'https://whatsapp.example.com/';
    expect(publicOrigin({ headers: {} })).toBe('https://whatsapp.example.com');
    delete process.env.BASE_URL;
    expect(publicOrigin({ headers: { 'x-forwarded-host': 'wa.example.com, proxy', host: 'openwa:2785' } })).toBe(
      'https://wa.example.com',
    );
    expect(publicOrigin({ headers: { host: 'wa.example.com' } })).toBe('https://wa.example.com');
  });
});
