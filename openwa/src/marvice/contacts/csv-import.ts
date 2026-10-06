// Marvice Modules — Contacts: CSV parsing and phone normalization (pure, no I/O).

export const MAX_IMPORT_ROWS = 5000;

export interface ParsedContact {
  phone: string;
  name: string | null;
  tags: string | null;
  variables: Record<string, string>;
}

export interface ParseResult {
  contacts: ParsedContact[];
  totalRows: number;
  invalid: number;
  duplicates: number;
  overLimit: number;
  invalidSamples: string[];
  columns: { phone: string; name: string | null; tags: string | null; variables: string[] };
}

/** RFC 4180-style rows: quoted fields, escaped quotes, CRLF, `,` or `;` delimiter (Excel exports). */
export function parseCsvRows(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delim = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

/**
 * International digits without '+' (E.164 body), or null when it can't be a phone number.
 * `98765 43210` / `09876543210` get the default country code; `+91…` and `0091…` are kept as given.
 */
export function normalizePhone(raw: unknown, countryCode: string): string | null {
  const s = (typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '').trim();
  const explicit = s.startsWith('+');
  let d = s.replace(/\D/g, '');
  if (!d) return null;
  const cc = countryCode.replace(/\D/g, '');
  if (!explicit && d.startsWith('00')) d = d.slice(2);
  else if (!explicit && cc && d.length === 11 && d.startsWith('0')) d = cc + d.slice(1);
  else if (!explicit && cc && d.length === 10) d = cc + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

const variableKey = (header: string): string => header.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function findColumn(header: string[], names: string[]): number {
  const exact = header.findIndex(h => names.includes(h));
  return exact >= 0 ? exact : header.findIndex(h => names.some(n => h.includes(n)));
}

export function parseContactsCsv(csv: string, countryCode: string): ParseResult {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one contact.');
  const header = rows[0].map(h => h.trim().toLowerCase());
  const iPhone = findColumn(header, ['phone', 'mobile', 'whatsapp', 'number', 'contact no', 'cell']);
  if (iPhone < 0) {
    throw new Error(`No phone column found (headers: ${header.join(', ')}). Name one column "phone".`);
  }
  const iName = findColumn(header, ['name', 'full name', 'first name', 'customer']);
  const iTags = findColumn(header, ['tags', 'tag', 'label', 'group', 'segment']);
  const fixed = new Set([iPhone, iName, iTags]);

  const seen = new Set<string>();
  const contacts: ParsedContact[] = [];
  let invalid = 0;
  let duplicates = 0;
  let overLimit = 0;
  const invalidSamples: string[] = [];

  for (const r of rows.slice(1)) {
    if (contacts.length >= MAX_IMPORT_ROWS) {
      overLimit++;
      continue;
    }
    const phone = normalizePhone(r[iPhone], countryCode);
    if (!phone) {
      invalid++;
      if (invalidSamples.length < 10) invalidSamples.push((r[iPhone] ?? '').trim() || '(blank)');
      continue;
    }
    if (seen.has(phone)) {
      duplicates++;
      continue;
    }
    seen.add(phone);
    const variables: Record<string, string> = {};
    header.forEach((h, idx) => {
      const key = variableKey(h);
      if (!fixed.has(idx) && key) variables[key] = (r[idx] ?? '').trim();
    });
    const tags =
      iTags >= 0
        ? (r[iTags] ?? '')
            .split(/[,;|]/)
            .map(t => t.trim().toLowerCase())
            .filter(Boolean)
        : [];
    contacts.push({
      phone,
      name: iName >= 0 ? (r[iName] ?? '').trim().slice(0, 200) || null : null,
      tags: tags.length ? tags.join(',') : null,
      variables,
    });
  }

  return {
    contacts,
    totalRows: rows.length - 1,
    invalid,
    duplicates,
    overLimit,
    invalidSamples,
    columns: {
      phone: header[iPhone],
      name: iName >= 0 ? header[iName] : null,
      tags: iTags >= 0 ? header[iTags] : null,
      variables: header.filter((h, idx) => !fixed.has(idx) && variableKey(h)).map(variableKey),
    },
  };
}
