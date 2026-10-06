import { DataSource } from 'typeorm';
import * as path from 'path';
import { ContactsService } from './contacts.service';
import { ContactList } from './entities/contact-list.entity';
import { Contact } from './entities/contact.entity';
import { Session } from '../../modules/session/entities/session.entity';

// Real SQLite, every upstream data migration plus the Marvice ones, exactly as the app loads them.
const src = path.join(__dirname, '..', '..');
const glob = (...p: string[]) => path.join(src, ...p).replace(/\\/g, '/');

describe('Marvice ContactsService (SQLite, real migrations)', () => {
  let ds: DataSource;
  let service: ContactsService;
  const getNumberId = jest.fn();

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
      // Column set differs across releases: fall back to the repository with only the required fields.
      await ds.getRepository(Session).save(ds.getRepository(Session).create({ id: 's1', name: 'main' } as never));
    });
    service = new ContactsService(ds.getRepository(ContactList), ds.getRepository(Contact), ds.getRepository(Session), {
      getNumberId,
    } as never);
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('creates lists, rejects duplicates and unknown sessions', async () => {
    await service.createList('s1', { name: 'Cafe regulars' });
    await expect(service.createList('s1', { name: 'Cafe regulars' })).rejects.toThrow(/already exists/);
    await expect(service.createList('nope', { name: 'x' })).rejects.toThrow(/not found/);
  });

  it('imports, re-imports in place, verifies, counts, searches and handles STOP/START', async () => {
    const [list] = await service.listLists('s1');
    const csv = 'phone,name,tags,city\n9876543210,Rahul Kumar,vip,Pune\n9000000001,Priya,,Mumbai\n123,Bad,,\n';
    const first = await service.importCsv('s1', list.id, { csv, consent: true, verify: false });
    expect(first).toMatchObject({ totalRows: 3, added: 2, updated: 0, invalid: 1, verificationQueued: 0 });

    getNumberId.mockImplementation((_s: string, phone: string) =>
      Promise.resolve(phone === '919876543210' ? '919876543210@c.us' : null),
    );
    (service as unknown as { verifying: Set<string> }).verifying.add(list.id);
    await service.runVerification('s1', list.id, 0);
    expect(getNumberId).toHaveBeenCalledTimes(2);

    let [summary] = await service.listLists('s1');
    expect(summary.counts).toEqual({
      total: 2,
      onWhatsapp: 1,
      notOnWhatsapp: 1,
      pending: 0,
      checkFailed: 0,
      optedOut: 0,
    });

    // STOP opts out across the session; re-import keeps the opt-out; START restores it.
    expect(await service.applyKeyword('s1', '919876543210@c.us', 'stop')).toBe(1);
    const again = await service.importCsv('s1', list.id, { csv, consent: true, verify: false });
    expect(again).toMatchObject({ added: 0, updated: 2 });
    [summary] = await service.listLists('s1');
    expect(summary.counts.optedOut).toBe(1);
    expect(summary.counts.onWhatsapp).toBe(1); // re-import kept the verification result

    // Extra CSV columns are searchable too (city lives in variables).
    expect((await service.listContacts('s1', list.id, { search: 'mumbai' })).total).toBe(1);
    const found = await service.listContacts('s1', list.id, { search: 'rahul' });
    expect(found.total).toBe(1);
    expect(found.items[0]).toMatchObject({
      phone: '919876543210',
      optedIn: false,
      optOutSource: 'stop_keyword',
      tags: 'vip',
    });
    expect(JSON.parse(found.items[0].variables!)).toEqual({ city: 'Pune' });
    expect((await service.listContacts('s1', list.id, { status: 'opted_out' })).total).toBe(1);

    expect(await service.applyKeyword('s1', '919876543210@c.us', 'start')).toBe(1);
    const manual = await service.updateContact('s1', found.items[0].id, { optedIn: false });
    expect(manual.optOutSource).toBe('manual');
    expect(await service.applyKeyword('s1', '919876543210@c.us', 'start')).toBe(0); // START never undoes a manual opt-out
  });

  it('stops verifying after repeated lookup failures (session offline)', async () => {
    const list = await service.createList('s1', { name: 'Offline' });
    const csv = 'phone\n' + Array.from({ length: 8 }, (_, i) => String(9100000000 + i)).join('\n');
    await service.importCsv('s1', list.id, { csv, consent: true, verify: false });
    getNumberId.mockReset().mockRejectedValue(new Error('session not started'));
    (service as unknown as { verifying: Set<string> }).verifying.add(list.id);
    await service.runVerification('s1', list.id, 0);
    expect(getNumberId).toHaveBeenCalledTimes(5);
    const summary = (await service.listLists('s1')).find(l => l.id === list.id)!;
    expect(summary.counts).toMatchObject({ checkFailed: 5, pending: 3 });
  });

  it('only verifies on a connected session', async () => {
    const list = await service.createList('s1', { name: 'Gate' });
    const imported = await service.importCsv('s1', list.id, { csv: 'phone\n9100000100', consent: true });
    expect(imported).toMatchObject({ verificationQueued: 0, verificationSkipped: true });
    await expect(service.startVerification('s1', list.id)).rejects.toThrow(/not connected/);

    await ds.query(`UPDATE "sessions" SET "status" = 'ready' WHERE "id" = 's1'`);
    getNumberId.mockReset().mockResolvedValue(null);
    expect(await service.startVerification('s1', list.id)).toBe(1);
    await ds.query(`UPDATE "sessions" SET "status" = 'created' WHERE "id" = 's1'`);
  });

  it('cascades contacts away with their list', async () => {
    const lists = await service.listLists('s1');
    for (const l of lists) await service.deleteList('s1', l.id);
    expect(await ds.getRepository(Contact).count()).toBe(0);
  });
});
