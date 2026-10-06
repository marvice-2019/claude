// Marvice Modules — Campaigns: message personalisation (pure, no I/O).
import { renderTemplate } from '../../common/utils/template-render';

/** Placeholders a campaign body uses, e.g. `Hi {{ name }}` -> ['name']. */
export function placeholdersOf(body: string): string[] {
  const keys = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) keys.add(m[1]);
  return [...keys];
}

/** Variables available to a recipient: name, phone and every imported column. */
export function recipientVars(r: {
  name: string | null;
  phone: string;
  variables: string | null;
}): Record<string, string> {
  let extra: Record<string, string> = {};
  if (r.variables) {
    try {
      const parsed: unknown = JSON.parse(r.variables);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) extra = parsed as Record<string, string>;
    } catch {
      // A malformed row renders with name/phone only.
    }
  }
  const firstName = (r.name ?? '').trim().split(/\s+/)[0] ?? '';
  return { ...extra, name: r.name ?? '', first_name: firstName, phone: `+${r.phone}` };
}

/**
 * Fill a campaign body for one recipient. Placeholders with no value are removed rather than sent
 * literally ("Hi {{name}}" must never reach a customer), then doubled spaces left behind are tidied.
 */
export function renderForRecipient(body: string, vars: Record<string, string>): string {
  const filled = renderTemplate(body, vars).replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');
  return filled
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .trim();
}
