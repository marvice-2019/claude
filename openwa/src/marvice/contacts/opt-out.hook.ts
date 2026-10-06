import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HookManager } from '../../core/hooks';
import { HookContext } from '../../core/hooks/hook.interfaces';
import { createLogger } from '../../common/services/logger.service';
import { ContactsService } from './contacts.service';

const STOP = /^(stop|stop all|unsubscribe|opt out|optout|cancel)[.!]?$/i;
const START = /^(start|subscribe|opt in|optin|unstop)[.!]?$/i;

/** Pure keyword check, exported for tests. */
export function optOutKeyword(text: unknown): 'stop' | 'start' | null {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t || t.length > 20) return null;
  if (STOP.test(t)) return 'stop';
  if (START.test(t)) return 'start';
  return null;
}

/**
 * Inbound "STOP" / "START" from a customer flips their opt-in on every contact list of the session.
 * Never blocks or rewrites the message: other plugins, webhooks and the AI bot still see it.
 */
@Injectable()
export class ContactsOptOutHook implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('MarviceContactsOptOut');
  private hookId: string | null = null;

  constructor(
    private readonly hooks: HookManager,
    private readonly contacts: ContactsService,
  ) {}

  onModuleInit(): void {
    this.hookId = this.hooks.register('marvice-contacts', 'message:received', ctx => this.handle(ctx), 50);
  }

  onModuleDestroy(): void {
    if (this.hookId) this.hooks.unregister(this.hookId);
  }

  async handle(ctx: HookContext): Promise<{ continue: true; data: unknown }> {
    const msg = (ctx.data ?? {}) as {
      body?: unknown;
      fromMe?: boolean;
      isGroup?: boolean;
      chatId?: string;
      from?: string;
    };
    const keyword = !msg.fromMe && !msg.isGroup ? optOutKeyword(msg.body) : null;
    const chatId = msg.chatId || msg.from;
    if (keyword && chatId && ctx.sessionId) {
      try {
        const n = await this.contacts.applyKeyword(ctx.sessionId, chatId, keyword);
        if (n) this.logger.log(`Keyword ${keyword.toUpperCase()} applied`, { sessionId: ctx.sessionId, contacts: n });
      } catch (err) {
        this.logger.warn('Opt-out keyword update failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }
    return { continue: true, data: ctx.data };
  }
}
