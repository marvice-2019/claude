import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { ContactList } from './entities/contact-list.entity';
import { Contact } from './entities/contact.entity';
import { Session, SessionStatus } from '../../modules/session/entities/session.entity';
import { ContactService } from '../../modules/contact/contact.service';
import { createLogger } from '../../common/services/logger.service';
import { isUniqueViolation } from '../../common/utils/db-errors';
import { parseContactsCsv } from './csv-import';
import { CreateContactListDto, ImportContactsDto, ListContactsQueryDto, UpdateContactDto } from './dto';

export interface ContactListSummary {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  counts: {
    total: number;
    onWhatsapp: number;
    notOnWhatsapp: number;
    pending: number;
    checkFailed: number;
    optedOut: number;
  };
  verifying: boolean;
}

export interface ImportSummary {
  listId: string;
  totalRows: number;
  added: number;
  updated: number;
  invalid: number;
  duplicates: number;
  overLimit: number;
  invalidSamples: string[];
  columns: { phone: string; name: string | null; tags: string | null; variables: string[] };
  verificationQueued: number;
  /** Verification was requested but the session is not connected; numbers stay pending. */
  verificationSkipped: boolean;
}

/** Gap between WhatsApp number lookups during verification: bulk lookups put the account at risk. */
export const VERIFY_DELAY_MS = 1500;
const INSERT_CHUNK = 200;

@Injectable()
export class ContactsService {
  private readonly logger = createLogger('MarviceContacts');
  /** listIds with a verification loop running in this process. */
  private readonly verifying = new Set<string>();

  constructor(
    @InjectRepository(ContactList, 'data') private readonly lists: Repository<ContactList>,
    @InjectRepository(Contact, 'data') private readonly contacts: Repository<Contact>,
    @InjectRepository(Session, 'data') private readonly sessions: Repository<Session>,
    private readonly waContacts: ContactService,
  ) {}

  // ── Lists ────────────────────────────────────────────────────────────────

  async listLists(sessionId: string): Promise<ContactListSummary[]> {
    const lists = await this.lists.find({ where: { sessionId }, order: { createdAt: 'DESC' } });
    if (!lists.length) return [];
    const rows: Array<{ listId: string; waStatus: string; optedIn: boolean | number; n: string | number }> =
      await this.contacts
        .createQueryBuilder('c')
        .select('c.listId', 'listId')
        .addSelect('c.waStatus', 'waStatus')
        .addSelect('c.optedIn', 'optedIn')
        .addSelect('COUNT(*)', 'n')
        .where('c.listId IN (:...ids)', { ids: lists.map(l => l.id) })
        .groupBy('c.listId')
        .addGroupBy('c.waStatus')
        .addGroupBy('c.optedIn')
        .getRawMany();
    return lists.map(list => {
      const counts = { total: 0, onWhatsapp: 0, notOnWhatsapp: 0, pending: 0, checkFailed: 0, optedOut: 0 };
      for (const r of rows.filter(x => x.listId === list.id)) {
        const n = Number(r.n);
        counts.total += n;
        if (!r.optedIn || r.optedIn === 0) counts.optedOut += n;
        if (r.waStatus === 'on_whatsapp') counts.onWhatsapp += n;
        else if (r.waStatus === 'not_on_whatsapp') counts.notOnWhatsapp += n;
        else if (r.waStatus === 'check_failed') counts.checkFailed += n;
        else counts.pending += n;
      }
      return { ...list, counts, verifying: this.verifying.has(list.id) };
    });
  }

  async createList(sessionId: string, dto: CreateContactListDto): Promise<ContactList> {
    if (!(await this.sessions.exists({ where: { id: sessionId } }))) {
      throw new NotFoundException(`Session with id '${sessionId}' not found`);
    }
    try {
      return await this.lists.save(
        this.lists.create({ sessionId, name: dto.name.trim(), description: dto.description?.trim() || null }),
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`A list named '${dto.name}' already exists`);
      throw err;
    }
  }

  async deleteList(sessionId: string, listId: string): Promise<void> {
    const list = await this.requireList(sessionId, listId);
    this.verifying.delete(list.id);
    await this.lists.delete({ id: list.id });
  }

  private async requireList(sessionId: string, listId: string): Promise<ContactList> {
    const list = await this.lists.findOne({ where: { id: listId, sessionId } });
    if (!list) throw new NotFoundException(`Contact list '${listId}' not found`);
    return list;
  }

  // ── Import ───────────────────────────────────────────────────────────────

  async importCsv(sessionId: string, listId: string, dto: ImportContactsDto): Promise<ImportSummary> {
    const list = await this.requireList(sessionId, listId);
    let parsed;
    try {
      parsed = parseContactsCsv(dto.csv, dto.defaultCountryCode ?? '91');
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }
    if (!parsed.contacts.length) {
      throw new BadRequestException(
        `No valid phone numbers found (${parsed.invalid} invalid, ${parsed.duplicates} duplicates). ` +
          `Examples: ${parsed.invalidSamples.join(', ')}`,
      );
    }

    const phones = parsed.contacts.map(c => c.phone);
    const existing = new Map<string, Contact>();
    for (let i = 0; i < phones.length; i += INSERT_CHUNK) {
      const found = await this.contacts.find({
        where: { listId: list.id, phone: In(phones.slice(i, i + INSERT_CHUNK)) },
      });
      for (const c of found) existing.set(c.phone, c);
    }

    const toSave: Contact[] = parsed.contacts.map(p => {
      const prev = existing.get(p.phone);
      // Re-import refreshes the details but never re-opts-in someone who opted out.
      return this.contacts.create({
        ...(prev ?? {}),
        listId: list.id,
        sessionId,
        phone: p.phone,
        name: p.name ?? prev?.name ?? null,
        tags: p.tags ?? prev?.tags ?? null,
        variables: Object.keys(p.variables).length ? JSON.stringify(p.variables) : (prev?.variables ?? null),
        waStatus: prev?.waStatus ?? 'pending',
        optedIn: prev ? prev.optedIn : true,
      });
    });
    for (let i = 0; i < toSave.length; i += INSERT_CHUNK) {
      await this.contacts.save(toSave.slice(i, i + INSERT_CHUNK));
    }

    // Lookups need a connected session; otherwise every number would land in check_failed for nothing.
    const sessionReady = await this.isSessionReady(sessionId);
    const queued = dto.verify === false || !sessionReady ? 0 : await this.startVerification(sessionId, list.id);
    this.logger.log('Contacts imported', { sessionId, listId: list.id, rows: parsed.totalRows, saved: toSave.length });
    return {
      listId: list.id,
      totalRows: parsed.totalRows,
      added: toSave.length - existing.size,
      updated: existing.size,
      invalid: parsed.invalid,
      duplicates: parsed.duplicates,
      overLimit: parsed.overLimit,
      invalidSamples: parsed.invalidSamples,
      columns: parsed.columns,
      verificationQueued: queued,
      verificationSkipped: dto.verify !== false && !sessionReady,
    };
  }

  // ── Verification (paced WhatsApp number lookups) ─────────────────────────

  /** Starts (or joins) the background check of every pending / failed contact; returns how many await it. */
  async startVerification(sessionId: string, listId: string): Promise<number> {
    const list = await this.requireList(sessionId, listId);
    if (!(await this.isSessionReady(sessionId))) {
      throw new ConflictException('Session is not connected to WhatsApp; connect it, then verify');
    }
    const waiting = await this.contacts.count({
      where: { listId: list.id, waStatus: In(['pending', 'check_failed']) },
    });
    if (waiting && !this.verifying.has(list.id)) {
      this.verifying.add(list.id);
      void this.runVerification(sessionId, list.id).finally(() => this.verifying.delete(list.id));
    }
    return waiting;
  }

  private async isSessionReady(sessionId: string): Promise<boolean> {
    return this.sessions.exists({ where: { id: sessionId, status: SessionStatus.READY } });
  }

  isVerifying(listId: string): boolean {
    return this.verifying.has(listId);
  }

  /** Exposed for tests; production calls go through startVerification. */
  async runVerification(sessionId: string, listId: string, delayMs = VERIFY_DELAY_MS): Promise<void> {
    const tried = new Set<string>(); // each contact is looked up at most once per run
    let consecutiveFailures = 0;
    for (;;) {
      if (!this.verifying.has(listId)) return; // list deleted meanwhile
      const batch = await this.contacts.find({
        where: { listId, waStatus: In(['pending', 'check_failed']) },
        order: { createdAt: 'ASC' },
        take: 50 + tried.size,
      });
      const todo = batch.filter(c => !tried.has(c.id)).slice(0, 50);
      if (!todo.length) return;
      for (const c of todo) {
        if (!this.verifying.has(listId)) return;
        tried.add(c.id);
        try {
          const id = await this.waContacts.getNumberId(sessionId, c.phone);
          await this.contacts.update(c.id, {
            waStatus: id ? 'on_whatsapp' : 'not_on_whatsapp',
            whatsappId: id ?? null,
            verifiedAt: new Date(),
          });
          consecutiveFailures = 0;
        } catch (err) {
          consecutiveFailures++;
          if (c.waStatus !== 'check_failed') await this.contacts.update(c.id, { waStatus: 'check_failed' });
          // Session offline / not ready: stop instead of marking the whole list failed; "Verify" resumes.
          if (consecutiveFailures >= 5) {
            this.logger.warn('Contact verification paused after repeated lookup failures', {
              sessionId,
              listId,
              error: err instanceof Error ? err.message : String(err),
            });
            return;
          }
        }
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  // ── Contacts ─────────────────────────────────────────────────────────────

  async listContacts(sessionId: string, listId: string, q: ListContactsQueryDto) {
    const list = await this.requireList(sessionId, listId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const qb = this.contacts.createQueryBuilder('c').where('c.listId = :listId', { listId: list.id });
    if (q.status === 'opted_out') qb.andWhere('c.optedIn = :f', { f: false });
    else if (q.status) qb.andWhere('c.waStatus = :s', { s: q.status });
    const term = q.search?.trim().toLowerCase();
    if (term) {
      const like = `%${term.replace(/[%_]/g, '')}%`;
      qb.andWhere(
        new Brackets(w =>
          w
            .where('c.phone LIKE :like', { like })
            .orWhere('LOWER(c.name) LIKE :like', { like })
            .orWhere('c.tags LIKE :like', { like }),
        ),
      );
    }
    const [items, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async updateContact(sessionId: string, contactId: string, dto: UpdateContactDto): Promise<Contact> {
    const c = await this.contacts.findOne({ where: { id: contactId, sessionId } });
    if (!c) throw new NotFoundException(`Contact '${contactId}' not found`);
    if (dto.name !== undefined) c.name = dto.name.trim() || null;
    if (dto.tags !== undefined) {
      const tags = dto.tags
        .split(/[,;|]/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);
      c.tags = tags.length ? tags.join(',') : null;
    }
    if (dto.optedIn !== undefined && dto.optedIn !== c.optedIn) {
      c.optedIn = dto.optedIn;
      c.optOutSource = dto.optedIn ? null : 'manual';
      c.optedOutAt = dto.optedIn ? null : new Date();
    }
    return this.contacts.save(c);
  }

  async deleteContact(sessionId: string, contactId: string): Promise<void> {
    const res = await this.contacts.delete({ id: contactId, sessionId });
    if (!res.affected) throw new NotFoundException(`Contact '${contactId}' not found`);
  }

  // ── Keyword opt-out (called by the message:received hook) ────────────────

  /** STOP opts the sender out of every list on this session; START undoes only a keyword opt-out. */
  async applyKeyword(sessionId: string, chatId: string, keyword: 'stop' | 'start'): Promise<number> {
    const digits = /@(c\.us|s\.whatsapp\.net)$/.test(chatId) ? chatId.split('@')[0] : null;
    const qb = this.contacts
      .createQueryBuilder()
      .update(Contact)
      .where('sessionId = :sessionId', { sessionId })
      .andWhere(
        new Brackets(w => {
          w.where('whatsappId = :chatId', { chatId });
          if (digits) w.orWhere('phone = :digits', { digits });
        }),
      );
    if (keyword === 'stop') {
      qb.set({ optedIn: false, optOutSource: 'stop_keyword', optedOutAt: new Date() }).andWhere('optedIn = :t', {
        t: true,
      });
    } else {
      qb.set({ optedIn: true, optOutSource: null, optedOutAt: null }).andWhere('optOutSource = :src', {
        src: 'stop_keyword',
      });
    }
    const res = await qb.execute();
    return res.affected ?? 0;
  }
}
