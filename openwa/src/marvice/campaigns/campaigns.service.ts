import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CampaignRecipient, RecipientStatus } from './entities/campaign-recipient.entity';
import { ContactList } from '../contacts/entities/contact-list.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Session, SessionStatus } from '../../modules/session/entities/session.entity';
import { BulkMessageService } from '../../modules/message/bulk-message.service';
import { BatchMessageStatus, BatchStatus } from '../../modules/message/entities/message-batch.entity';
import { SendBulkMessageDto } from '../../modules/message/dto/bulk-message.dto';
import { createLogger } from '../../common/services/logger.service';
import { CreateCampaignDto, ListRecipientsQueryDto, PreviewCampaignDto } from './dto/campaigns.dto';
import { placeholdersOf, recipientVars, renderForRecipient } from './render';

/** Upstream bulk batches hold at most 100 messages; a campaign feeds them through one at a time. */
export const CHUNK_SIZE = 100;
const TICK_MS = 5000;
const INSERT_CHUNK = 200;
const TERMINAL_BATCH = new Set<string>([BatchStatus.COMPLETED, BatchStatus.CANCELLED, BatchStatus.FAILED]);

export interface CampaignCounts {
  pending: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class CampaignsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('MarviceCampaigns');
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    @InjectRepository(Campaign, 'data') private readonly campaigns: Repository<Campaign>,
    @InjectRepository(CampaignRecipient, 'data') private readonly recipients: Repository<CampaignRecipient>,
    @InjectRepository(ContactList, 'data') private readonly lists: Repository<ContactList>,
    @InjectRepository(Contact, 'data') private readonly contacts: Repository<Contact>,
    @InjectRepository(Session, 'data') private readonly sessions: Repository<Session>,
    private readonly bulk: BulkMessageService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async list(sessionId: string): Promise<Campaign[]> {
    return this.campaigns.find({ where: { sessionId }, order: { createdAt: 'DESC' }, take: 200 });
  }

  async get(sessionId: string, id: string): Promise<Campaign & { counts: CampaignCounts }> {
    const c = await this.require(sessionId, id);
    return { ...c, counts: await this.counts(c.id) };
  }

  async preview(sessionId: string, dto: PreviewCampaignDto) {
    const list = await this.requireList(sessionId, dto.listId);
    const audience = await this.audience(list.id, dto);
    const sample = audience.slice(0, 3).map(c => ({
      phone: c.phone,
      name: c.name,
      text: renderForRecipient(dto.message, recipientVars(c)),
    }));
    const available = new Set(['name', 'first_name', 'phone']);
    for (const c of audience.slice(0, 50)) for (const k of Object.keys(recipientVars(c))) available.add(k);
    const used = placeholdersOf(dto.message);
    return {
      recipients: audience.length,
      sample,
      variables: [...available],
      unknownVariables: used.filter(v => !available.has(v)),
    };
  }

  async create(sessionId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const list = await this.requireList(sessionId, dto.listId);
    if (dto.mediaUrl && !dto.mediaType) throw new BadRequestException('mediaType is required with mediaUrl');
    const audience = await this.audience(list.id, dto);
    if (!audience.length) throw new BadRequestException('No eligible contacts in this list (opted-in, on WhatsApp)');

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    let status: CampaignStatus = 'draft';
    if (dto.startNow) status = 'running';
    else if (scheduledAt) status = 'scheduled';

    const campaign = await this.campaigns.save(
      this.campaigns.create({
        sessionId,
        listId: list.id,
        name: dto.name.trim(),
        message: dto.mediaType === 'audio' ? '' : dto.message,
        mediaUrl: dto.mediaUrl ?? null,
        mediaType: dto.mediaUrl ? (dto.mediaType ?? null) : null,
        delayMs: dto.delayMs ?? 8000,
        scheduledAt,
        status,
        startedAt: status === 'running' ? new Date() : null,
        total: audience.length,
      }),
    );
    const rows = audience.map(c =>
      this.recipients.create({
        campaignId: campaign.id,
        contactId: c.id,
        phone: c.phone,
        name: c.name,
        variables: c.variables,
        status: 'pending',
      }),
    );
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) await this.recipients.save(rows.slice(i, i + INSERT_CHUNK));
    this.logger.log('Campaign created', { sessionId, campaignId: campaign.id, recipients: rows.length, status });
    return campaign;
  }

  async start(sessionId: string, id: string): Promise<Campaign> {
    const c = await this.require(sessionId, id);
    if (!['draft', 'scheduled', 'paused'].includes(c.status)) {
      throw new ConflictException(`Campaign is ${c.status}`);
    }
    await this.campaigns.update(c.id, { status: 'running', startedAt: c.startedAt ?? new Date(), lastError: null });
    return this.require(sessionId, id);
  }

  async pause(sessionId: string, id: string): Promise<Campaign> {
    const c = await this.require(sessionId, id);
    if (c.status !== 'running' && c.status !== 'scheduled') throw new ConflictException(`Campaign is ${c.status}`);
    await this.campaigns.update(c.id, { status: 'paused' });
    await this.cancelCurrentBatch(c);
    return this.require(sessionId, id);
  }

  async cancel(sessionId: string, id: string): Promise<Campaign> {
    const c = await this.require(sessionId, id);
    if (c.status === 'completed' || c.status === 'cancelled') throw new ConflictException(`Campaign is ${c.status}`);
    await this.campaigns.update(c.id, { status: 'cancelled', finishedAt: new Date() });
    await this.cancelCurrentBatch(c);
    if (!c.currentBatchId) await this.skipRemaining(c.id, 'Campaign cancelled');
    return this.require(sessionId, id);
  }

  async remove(sessionId: string, id: string): Promise<void> {
    const c = await this.require(sessionId, id);
    if (c.status === 'running' || c.currentBatchId) {
      throw new ConflictException('Pause or cancel the campaign before deleting it');
    }
    await this.campaigns.delete(c.id);
  }

  async listRecipients(sessionId: string, id: string, q: ListRecipientsQueryDto) {
    const c = await this.require(sessionId, id);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const where = { campaignId: c.id, ...(q.status ? { status: q.status as RecipientStatus } : {}) };
    const [items, total] = await this.recipients.findAndCount({
      where,
      order: { sentAt: 'DESC', phone: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  // ── Runner ─────────────────────────────────────────────────────────────

  /** One pass over every campaign that needs attention. Never throws (it runs on a timer). */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      // Compared in JS: SQLite and Postgres store the timestamp differently, so a SQL <= is not portable.
      const scheduled = await this.campaigns.find({ where: { status: 'scheduled' } });
      const now = Date.now();
      for (const c of scheduled) {
        if (c.scheduledAt && new Date(c.scheduledAt).getTime() <= now) {
          await this.campaigns.update(c.id, { status: 'running', startedAt: new Date() });
        }
      }

      const active = await this.campaigns
        .createQueryBuilder('c')
        .where('c.status = :running', { running: 'running' })
        .orWhere('c.currentBatchId IS NOT NULL')
        .getMany();
      for (const c of active) {
        try {
          await this.advance(c);
        } catch (err) {
          this.logger.warn('Campaign step failed', { campaignId: c.id, error: String(err) });
        }
      }
    } catch (err) {
      this.logger.warn('Campaign tick failed', { error: String(err) });
    } finally {
      this.ticking = false;
    }
  }

  /** Settle the in-flight batch, then (if still running) queue the next chunk or finish. */
  async advance(c: Campaign): Promise<void> {
    if (c.currentBatchId) {
      const settled = await this.settleBatch(c);
      if (!settled) return;
      c = await this.campaigns.findOneByOrFail({ id: c.id });
    }

    if (c.status === 'cancelled') {
      await this.skipRemaining(c.id, 'Campaign cancelled');
      await this.refreshCounts(c.id);
      return;
    }
    if (c.status !== 'running') return;

    if (!(await this.isSessionReady(c.sessionId))) {
      await this.campaigns.update(c.id, { lastError: 'Waiting for the WhatsApp session to connect' });
      return;
    }

    const chunk = await this.recipients.find({
      where: { campaignId: c.id, status: 'pending' },
      order: { phone: 'ASC' },
      take: CHUNK_SIZE,
    });
    if (!chunk.length) {
      await this.refreshCounts(c.id);
      await this.campaigns.update(c.id, { status: 'completed', finishedAt: new Date(), lastError: null });
      this.logger.log('Campaign completed', { campaignId: c.id });
      return;
    }

    // Opt-outs that arrived after the campaign was created still win.
    const live = await this.contacts.find({
      where: { id: In(chunk.map(r => r.contactId)) },
      select: { id: true, optedIn: true },
    });
    const optedIn = new Set(live.filter(x => x.optedIn).map(x => x.id));
    const skip = chunk.filter(r => !optedIn.has(r.contactId));
    const send = chunk.filter(r => optedIn.has(r.contactId));
    if (skip.length) {
      await this.recipients.update({ id: In(skip.map(r => r.id)) }, { status: 'skipped', error: 'Opted out' });
    }
    if (!send.length) {
      await this.refreshCounts(c.id);
      return;
    }

    const seq = c.batchSeq + 1;
    const batchId = `mc_${c.id.slice(0, 8)}_${seq}`;
    try {
      await this.bulk.createBatch(c.sessionId, this.buildBatch(c, send, batchId));
    } catch (err) {
      // Session not started yet, or too many batches in flight: try again next tick.
      await this.campaigns.update(c.id, { lastError: err instanceof Error ? err.message : String(err) });
      return;
    }
    await this.recipients.update({ id: In(send.map(r => r.id)) }, { status: 'queued', batchId });
    await this.campaigns.update(c.id, { currentBatchId: batchId, batchSeq: seq, lastError: null });
    await this.refreshCounts(c.id);
  }

  buildBatch(c: Campaign, rows: CampaignRecipient[], batchId: string): SendBulkMessageDto {
    const messages = rows.map(r => {
      const text = renderForRecipient(c.message, recipientVars(r));
      const chatId = `${r.phone}@c.us`;
      if (c.mediaUrl && c.mediaType === 'audio') {
        // A voice note: WhatsApp shows it as recorded audio and carries no caption.
        return { chatId, type: 'audio' as const, content: { audio: { url: c.mediaUrl, ptt: true } } };
      }
      if (c.mediaUrl && c.mediaType) {
        const media =
          c.mediaType === 'document' ? { url: c.mediaUrl, filename: fileNameOf(c.mediaUrl) } : { url: c.mediaUrl };
        return { chatId, type: c.mediaType, content: { [c.mediaType]: media, caption: text } };
      }
      return { chatId, type: 'text' as const, content: { text } };
    });
    return {
      batchId,
      messages,
      options: { delayBetweenMessages: c.delayMs, randomizeDelay: true, stopOnError: false },
    };
  }

  /** Copy a finished batch's results onto its recipients. Returns false while it is still sending. */
  private async settleBatch(c: Campaign): Promise<boolean> {
    const batchId = c.currentBatchId ?? '';
    let batch;
    try {
      batch = await this.bulk.getBatchStatus(c.sessionId, batchId);
    } catch {
      batch = null; // vanished (restore, manual cleanup): treat everything queued as not sent
    }
    if (batch && !TERMINAL_BATCH.has(batch.status)) return false;

    const byChat = new Map((batch?.results ?? []).map(r => [r.chatId, r]));
    const queued = await this.recipients.find({ where: { campaignId: c.id, batchId, status: 'queued' } });
    const now = new Date();
    for (const r of queued) {
      const res = byChat.get(`${r.phone}@c.us`);
      if (res?.status === BatchMessageStatus.SENT) {
        await this.recipients.update(r.id, {
          status: 'sent',
          messageId: res.messageId ?? null,
          sentAt: res.sentAt ?? now,
          error: null,
        });
      } else if (res?.status === BatchMessageStatus.FAILED) {
        await this.recipients.update(r.id, { status: 'failed', error: res.error?.message ?? 'Send failed' });
      } else {
        // Never attempted (paused/cancelled mid-batch): back in the queue.
        await this.recipients.update(r.id, { status: 'pending', batchId: null });
      }
    }
    await this.campaigns.update(c.id, { currentBatchId: null });
    await this.refreshCounts(c.id);
    return true;
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async audience(listId: string, f: { onlyVerified?: boolean; tag?: string }): Promise<Contact[]> {
    const qb = this.contacts
      .createQueryBuilder('c')
      .where('c.listId = :listId', { listId })
      .andWhere('c.optedIn = :t', { t: true });
    if (f.onlyVerified) qb.andWhere('c.waStatus = :on', { on: 'on_whatsapp' });
    else qb.andWhere('c.waStatus <> :off', { off: 'not_on_whatsapp' });
    if (f.tag?.trim())
      qb.andWhere('LOWER(c.tags) LIKE :tag', { tag: `%${f.tag.trim().toLowerCase().replace(/[%_]/g, '')}%` });
    return qb.orderBy('c.createdAt', 'ASC').getMany();
  }

  async counts(campaignId: string): Promise<CampaignCounts> {
    const rows = await this.recipients
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'n')
      .where('r.campaignId = :campaignId', { campaignId })
      .groupBy('r.status')
      .getRawMany<{ status: RecipientStatus; n: string | number }>();
    const counts: CampaignCounts = { pending: 0, queued: 0, sent: 0, failed: 0, skipped: 0 };
    for (const r of rows) counts[r.status] = Number(r.n);
    return counts;
  }

  private async refreshCounts(campaignId: string): Promise<void> {
    const k = await this.counts(campaignId);
    await this.campaigns.update(campaignId, { sent: k.sent, failed: k.failed, skipped: k.skipped });
  }

  private async skipRemaining(campaignId: string, reason: string): Promise<void> {
    await this.recipients.update(
      { campaignId, status: In(['pending', 'queued']) },
      { status: 'skipped', error: reason },
    );
    await this.refreshCounts(campaignId);
  }

  private async cancelCurrentBatch(c: Campaign): Promise<void> {
    if (!c.currentBatchId) return;
    try {
      await this.bulk.cancelBatch(c.sessionId, c.currentBatchId);
    } catch {
      // Already finished: the next tick settles it.
    }
  }

  private async isSessionReady(sessionId: string): Promise<boolean> {
    return this.sessions.exists({ where: { id: sessionId, status: SessionStatus.READY } });
  }

  private async require(sessionId: string, id: string): Promise<Campaign> {
    const c = await this.campaigns.findOneBy({ id, sessionId });
    if (!c) throw new NotFoundException(`Campaign '${id}' not found`);
    return c;
  }

  private async requireList(sessionId: string, listId: string): Promise<ContactList> {
    const list = await this.lists.findOneBy({ id: listId, sessionId });
    if (!list) throw new NotFoundException(`Contact list '${listId}' not found`);
    return list;
  }
}

function fileNameOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'document');
  } catch {
    return 'document';
  }
}
