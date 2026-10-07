import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import type { Request, Response } from 'express';
import { Public, RequireRole } from '../../modules/auth/decorators/auth.decorators';
import { ApiKeyRole } from '../../modules/auth/entities/api-key.entity';
import { MAX_MEDIA_BYTES, mediaBlobPath, readMediaMeta, saveMedia } from './media-store';

/** The public origin the request came in on: behind Traefik that is the forwarded https host. */
export function publicOrigin(req: Pick<Request, 'headers'>): string {
  const fromEnv = (process.env.BASE_URL ?? '').trim();
  if (/^https:\/\//i.test(fromEnv)) return new URL(fromEnv).origin;
  const forwarded = req.headers['x-forwarded-host'];
  const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.headers.host;
  if (!host) throw new BadRequestException('Cannot work out the public address of this server');
  return `https://${host}`;
}

// Marvice Modules — campaign media uploads. Upload is OPERATOR-only; the download is public on
// purpose (the bulk sender fetches it like any media link) and guarded by a 128-bit random id.
@ApiTags('marvice-media')
@Controller()
export class MarviceMediaController {
  @Post('sessions/:sessionId/marvice/media')
  @RequireRole(ApiKeyRole.OPERATOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Upload a file for a campaign and get back its public https link' })
  @ApiParam({ name: 'sessionId', description: 'Session ID', schema: { type: 'string' } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'Stored: { url, filename, mimetype, size, mediaType }' })
  @ApiResponse({ status: 400, description: 'No file, or the file is empty' })
  @ApiResponse({ status: 413, description: 'File larger than 50 MB' })
  async upload(
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
    @Req() req: Request,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file to upload');
    const meta = await saveMedia(file);
    const url = `${publicOrigin(req)}/api/marvice/media/${meta.id}/${encodeURIComponent(meta.filename)}`;
    return { url, filename: meta.filename, mimetype: meta.mimetype, size: meta.size, mediaType: meta.mediaType };
  }

  @Get('marvice/media/:id/:name')
  @Public()
  @ApiOperation({ summary: 'Download an uploaded campaign file (public, unguessable link)' })
  @ApiParam({ name: 'id', description: 'File id (32 hex characters)', schema: { type: 'string' } })
  @ApiParam({ name: 'name', description: 'File name (informational)', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'The file' })
  @ApiResponse({ status: 404, description: 'Unknown file' })
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const meta = await readMediaMeta(id);
    if (!meta) throw new NotFoundException('File not found');
    res.setHeader('Content-Type', meta.mimetype);
    res.setHeader('Content-Length', String(meta.size));
    res.setHeader('Content-Disposition', `inline; filename="${meta.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(mediaBlobPath(meta.id))
      .on('error', () => {
        if (!res.headersSent) res.status(404).end();
        else res.destroy();
      })
      .pipe(res);
  }
}
