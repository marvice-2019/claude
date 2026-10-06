import { DataSource } from 'typeorm';
import * as path from 'path';
import { CampaignsService, CHUNK_SIZE, PACING_RETRY_MS } from './campaigns.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign-recipient.entity';
import { ContactList } from '../contacts/entities/contact-list.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Session } from '../../modules/session/entities/session.entity';
import { BatchMessageStatus, BatchStatus } from '../../modules/message/entities/message-batch.entity';
import type { SendBulkMessageDto } from '../../modules/message/dto/bulk-message.dto';
import { SEND_PACING_LIMITED } from '../../modules/message/send-pacing.service';

const PACING_MESSAGE = 'Daily allowance of 10 new conversations reached';

// Real SQLite with every migration; the upstream bulk sender is faked so nothing leaves the process.
const src = path.join(__dirname, '..', '..');
const glob = (...p: string[]) => path.join(src, ...p).replace(/\\/g, '/');

describe('Marvice CampaignsService (SQLite, fake bulk sender)', () => {
  let ds: DataSource;
  let service: CampaignsService;
  let listId: string;
  const batches = new Map<
    string,
    { dto: SendBulkMessageDto; status: BatchStatus; failChat?: string; limitFrom?: number }
  >();
  const bulk = {
    createBatch: jest.fn((_s: string, dto: SendBulkMessageDto) => {
      batches.set(dto.batchId as string, { dto, status: BatchStatus.PROCESSING });
      return Promise.resolve({});
    }),
    getBatchStatus: jest.fn((_s: string, id: string) => {
      const b = batches.get(id)!;
      const results =
        b.status === BatchStatus.PROCESSING
          ? []
          : b.dto.messages.map((m, i) => {
              const limited = b.limitFrom !== undefined && i >= b.limitFrom;
              const failed = limited || m.chatId === b.failChat;
              return {
                chatId: m.chatId,
                status:
                  b.status === BatchStatus.CANCELLED
                    ? BatchMessageStatus.CANCELLED
                    : failed
                      ? BatchMessageStatus.FAILED
                      : BatchMessageStatus.SENT,
                messageId: `wamid-${m.chatId}`,
                error: limited
                  ? { code: SEND_PACING_LIMITED, message: PACING_MESSAGE }
                  : failed
                    ? { code: 'SEND_FAILED', message: 'not on WhatsApp' }
                    : undefined,
              };
            });
      return Promise.resolve({ status: b.status, results });
    }),
    cancelBatch: jest.fn((_s: string, id: string) => {
      batches.get(id)!.status = BatchStatus.CANCELLED;
      return Promise.resolve({});
    }),
  };
  const finish = (id: string, failChat?: string) =>
    Object.assign(batches.get(id)!, { status: BatchStatus.COMPLETED, failChat });
  const setReady = (ready: boolean) =>
    ds.query(`UPDATE "sessions" SET "status" = '${ready ? 'ready' : 'created'}' WHERE "id" = 's1'`);

  beforeAll(async () => {
    ds = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [
        glob('modules', 'session', '**', '*.entity.ts'),
        glob('modules', 'webhook', '**', '*.entity.ts'),
        glob('modules', 'message', '**', '*.entity.ts'),
        glob('modules', 'template', '**', '*.entity.ts'),
        glob('engine', '**', '*.entity.ts'),
        glob('modules', 'integration', '**', '*.entity.ts'),
        glob('modules', 'status-store', '**', '*.entity.ts'),
        glob('modules', 'automation', '**', '*.entity.ts'),
        glob('marvice', '**', '*.entity.ts'),
      ],
      migrations: [glob('database', 'migrations', '*.ts'), glob('marvice', 'migrations', '*.ts')],
      migrationsRun: true,
      synchronize: false,
    });
    await ds.initialize();
    await ds.query(`INSERT INTO "sessions" ("id", "name") VALUES ('s1', 'main')`).catch(async () => {
      await ds.getRepository(Session).save(ds.getRepository(Session).create({ id: 's1', name: 'main' } as never));
    });
    service = new CampaignsService(
      ds.getRepository(Campaign),
      ds.getRepository(CampaignRecipient),
      ds.getRepository(ContactList),
      ds.getRepository(Contact),
      ds.getRepository(Session),
      bulk as never,
    );
    const list = await ds.getRepository(ContactList).save({ sessionId: 's1', name: 'Leads' });
    listId = list.id;
    const contacts = ds.getRepository(Contact);
    const rows = Array.from({ length: CHUNK_SIZE + 5 }, (_, i) =>
      contacts.create({
        listId,
        sessionId: 's1',
        phone: `91900000${String(i).padStart(4, '0')}`,
        name: `Guest ${i}`,
        tags: i % 2 ? 'vip' : null,
        variables: JSON.stringify({ requirement: `Table ${i}` }),
        waStatus: i === 0 ? 'not_on_whatsapp' : 'on_whatsapp',
        optedIn: i !== 1,
      }),
    );
    await contacts.save(rows);
  });

  afterAll(() => ds.destroy());

  it('previews the audience with rendered messages', async () => {
    const p = await service.preview('s1', { listId, message: 'Hi {{first_name}}, {{requirement}} {{nope}}' });
    expect(p.recipients).toBe(CHUNK_SIZE + 3); // minus off-WhatsApp and opted-out
    expect(p.sample[0].text).toMatch(/^Hi Guest, Table \d+$/); // first_name of "Guest 2" is "Guest"
    expect(p.variables).toContain('requirement');
    expect(p.unknownVariables).toEqual(['nope']);
  });

  it('sends in chunks of 100, records results, re-checks opt-outs and completes', async () => {
    const c = await service.create('s1', { name: 'Diwali', listId, message: 'Hi {{name}}', delayMs: 4000 });
    expect(c).toMatchObject({ status: 'draft', total: CHUNK_SIZE + 3 });

    await service.start('s1', c.id);
    await setReady(false);
    await service.tick();
    expect(bulk.createBatch).not.toHaveBeenCalled(); // waits for the session instead of failing
    expect((await service.get('s1', c.id)).lastError).toMatch(/session/i);

    await setReady(true);
    await service.tick();
    expect(bulk.createBatch).toHaveBeenCalledTimes(1);
    const first = bulk.createBatch.mock.calls[0][1];
    expect(first.messages).toHaveLength(CHUNK_SIZE);
    expect(first.options).toMatchObject({ delayBetweenMessages: 4000, randomizeDelay: true });
    expect(first.messages[0].content.text).toMatch(/^Hi Guest \d+$/);

    await service.tick(); // still sending: nothing new
    expect(bulk.createBatch).toHaveBeenCalledTimes(1);

    // A contact opts out mid-campaign: they must be skipped in the next chunk.
    const late = await ds.getRepository(CampaignRecipient).findOneOrFail({
      where: { campaignId: c.id, status: 'pending' },
    });
    await ds.getRepository(Contact).update(late.contactId, { optedIn: false });

    finish(first.batchId as string, first.messages[3].chatId);
    await service.tick(); // settles batch 1, queues batch 2
    const second = bulk.createBatch.mock.calls[1][1];
    expect(second.messages).toHaveLength(2);

    finish(second.batchId as string);
    await service.tick(); // settles batch 2
    await service.tick(); // nothing pending: completes
    const done = await service.get('s1', c.id);
    expect(done.status).toBe('completed');
    expect(done.counts).toEqual({ pending: 0, queued: 0, sent: CHUNK_SIZE + 1, failed: 1, skipped: 1 });
    expect(done).toMatchObject({ sent: CHUNK_SIZE + 1, failed: 1, skipped: 1 });
  });

  it('pause returns unsent messages to the queue; cancel skips them', async () => {
    bulk.createBatch.mockClear();
    const c = await service.create('s1', { name: 'Brunch', listId, message: 'Hi', tag: 'vip', startNow: true });
    await service.tick();
    const batchId = bulk.createBatch.mock.calls[0][1].batchId as string;

    await service.pause('s1', c.id);
    await service.tick(); // settles the cancelled batch
    let state = await service.get('s1', c.id);
    expect(state.status).toBe('paused');
    expect(state.counts.pending).toBe(state.total);
    expect(batches.get(batchId)?.status).toBe(BatchStatus.CANCELLED);

    await service.cancel('s1', c.id);
    state = await service.get('s1', c.id);
    expect(state.status).toBe('cancelled');
    expect(state.counts.skipped).toBe(state.total);
    await expect(service.start('s1', c.id)).rejects.toThrow(/cancelled/);
    await service.remove('s1', c.id);
    await expect(service.get('s1', c.id)).rejects.toThrow(/not found/);
  });

  it('re-queues pacing refusals, waits, probes with one message, and retries failures on demand', async () => {
    bulk.createBatch.mockClear();
    const c = await service.create('s1', { name: 'Capped', listId, message: 'Hi', tag: 'vip', startNow: true });
    await service.tick();
    const first = bulk.createBatch.mock.calls[0][1];
    // 10 go out, the rest are refused by OpenWA's daily cap; one real failure among the sent ones.
    Object.assign(batches.get(first.batchId as string)!, {
      status: BatchStatus.COMPLETED,
      limitFrom: 10,
      failChat: first.messages[2].chatId,
    });
    await service.tick();

    let state = await service.get('s1', c.id);
    expect(state.status).toBe('running');
    expect(state.counts).toMatchObject({ sent: 9, failed: 1, pending: state.total - 10 });
    expect(state.lastError).toMatch(/sending limit.*resumes automatically/i);

    await service.tick(); // held: nothing new is sent
    expect(bulk.createBatch).toHaveBeenCalledTimes(1);

    const realNow = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(realNow + PACING_RETRY_MS + 1000);
    try {
      await service.tick(); // hold expired: probe with a single message
      expect(bulk.createBatch).toHaveBeenCalledTimes(2);
      const probe = bulk.createBatch.mock.calls[1][1];
      expect(probe.messages).toHaveLength(1);
      finish(probe.batchId as string);
      await service.tick(); // probe delivered: hold lifted, full chunk again
      expect(bulk.createBatch.mock.calls[2][1].messages.length).toBeGreaterThan(1);
    } finally {
      clock.mockRestore();
    }

    await service.pause('s1', c.id);
    await service.tick();
    state = await service.retryFailed('s1', c.id).then(() => service.get('s1', c.id));
    expect(state).toMatchObject({ status: 'running', lastError: null });
    expect(state.counts.failed).toBe(0);
    await expect(service.retryFailed('s1', c.id)).rejects.toThrow(/no failed/i);
    await service.cancel('s1', c.id);
  });

  it('builds voice notes without text and media with a personalised caption', () => {
    const row = { phone: '919800000001', name: 'Asha', variables: null } as CampaignRecipient;
    const base = { message: 'Hi {{name}}', mediaUrl: 'https://cdn.example/x' } as Campaign;
    const voice = service.buildBatch({ ...base, message: '', mediaType: 'audio' }, [row], 'b1');
    expect(voice.messages[0]).toEqual({
      chatId: '919800000001@c.us',
      type: 'audio',
      content: { audio: { url: 'https://cdn.example/x', ptt: true } },
    });
    const image = service.buildBatch({ ...base, mediaType: 'image' }, [row], 'b2');
    expect(image.messages[0].content).toEqual({ image: { url: 'https://cdn.example/x' }, caption: 'Hi Asha' });
  });

  it('starts scheduled campaigns when due and rejects empty audiences', async () => {
    const c = await service.create('s1', {
      name: 'Later',
      listId,
      message: 'Hi',
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(c.status).toBe('scheduled');
    await service.tick();
    expect((await service.get('s1', c.id)).status).toBe('running');
    await expect(service.create('s1', { name: 'None', listId, message: 'Hi', tag: 'nobody' })).rejects.toThrow(
      /No eligible contacts/,
    );
  });
});
