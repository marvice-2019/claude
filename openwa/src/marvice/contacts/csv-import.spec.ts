import { normalizePhone, parseContactsCsv, parseCsvRows, MAX_IMPORT_ROWS } from './csv-import';

describe('Marvice contacts CSV import', () => {
  it('parses quoted fields, escaped quotes, CRLF and ; delimiters', () => {
    expect(parseCsvRows('a;b\r\n"x;1";"say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x;1', 'say "hi"'],
    ]);
    expect(parseCsvRows('﻿phone,name\n1,A\n\n')).toEqual([
      ['phone', 'name'],
      ['1', 'A'],
    ]);
  });

  it.each([
    ['98765 43210', '919876543210'],
    ['09876543210', '919876543210'],
    ['+91-98765-43210', '919876543210'],
    ['0091 9876543210', '919876543210'],
    ['+1 415 555 0100', '14155550100'],
    ['12345', null],
    ['', null],
    ['abc', null],
  ])('normalizes %p -> %p', (raw, expected) => {
    expect(normalizePhone(raw, '91')).toBe(expected);
  });

  it('detects columns, dedupes, keeps extra columns as snake_case variables', () => {
    const r = parseContactsCsv(
      'Name;Mobile No;Tags;Last Order\n"Rahul, K";98765 43210;VIP, Regular;Cold Brew\nPriya;+91-98765-43210;;Latte\nBad;12345;;\n',
      '91',
    );
    expect(r.totalRows).toBe(3);
    expect(r.contacts).toEqual([
      { phone: '919876543210', name: 'Rahul, K', tags: 'vip,regular', variables: { last_order: 'Cold Brew' } },
    ]);
    expect(r.duplicates).toBe(1);
    expect(r.invalid).toBe(1);
    expect(r.invalidSamples).toEqual(['12345']);
    expect(r.columns).toEqual({ phone: 'mobile no', name: 'name', tags: 'tags', variables: ['last_order'] });
  });

  it('rejects a file without a phone column or without rows', () => {
    expect(() => parseContactsCsv('name,city\nA,B\n', '91')).toThrow(/No phone column/);
    expect(() => parseContactsCsv('phone\n', '91')).toThrow(/header row and at least one/);
  });

  it('caps an import at MAX_IMPORT_ROWS', () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 3 }, (_, i) => String(9000000000 + i));
    const r = parseContactsCsv(`phone\n${rows.join('\n')}`, '91');
    expect(r.contacts).toHaveLength(MAX_IMPORT_ROWS);
    expect(r.overLimit).toBe(3);
  });
});
