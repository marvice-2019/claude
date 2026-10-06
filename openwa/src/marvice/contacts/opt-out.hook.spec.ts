import { ContactsOptOutHook, optOutKeyword } from './opt-out.hook';

describe('Marvice contacts opt-out keywords', () => {
  it.each([
    ['STOP', 'stop'],
    ['stop.', 'stop'],
    ['Unsubscribe', 'stop'],
    ['start', 'start'],
    ['what is the stopover time', null],
    ['please stop sending', null],
    ['', null],
  ])('%p -> %p', (text, expected) => {
    expect(optOutKeyword(text)).toBe(expected);
  });

  it('applies the keyword for a 1:1 inbound message and never blocks the chain', async () => {
    const contacts = { applyKeyword: jest.fn().mockResolvedValue(2) };
    const hook = new ContactsOptOutHook({ register: jest.fn(), unregister: jest.fn() } as never, contacts as never);
    const data = { body: 'STOP', chatId: '919876543210@c.us', fromMe: false, isGroup: false };
    const res = await hook.handle({
      event: 'message:received',
      data,
      sessionId: 's1',
      timestamp: new Date(),
      source: 'Engine',
    });
    expect(contacts.applyKeyword).toHaveBeenCalledWith('s1', '919876543210@c.us', 'stop');
    expect(res).toEqual({ continue: true, data });
  });

  it('ignores own messages, groups and DB errors', async () => {
    const contacts = { applyKeyword: jest.fn().mockRejectedValue(new Error('db down')) };
    const hook = new ContactsOptOutHook({ register: jest.fn(), unregister: jest.fn() } as never, contacts as never);
    const ctx = (data: object) => ({
      event: 'message:received' as const,
      data,
      sessionId: 's1',
      timestamp: new Date(),
      source: 'x',
    });
    await hook.handle(ctx({ body: 'STOP', chatId: 'a@c.us', fromMe: true }));
    await hook.handle(ctx({ body: 'STOP', chatId: 'g@g.us', isGroup: true }));
    expect(contacts.applyKeyword).not.toHaveBeenCalled();
    await expect(hook.handle(ctx({ body: 'STOP', chatId: 'a@c.us' }))).resolves.toMatchObject({ continue: true });
  });
});
