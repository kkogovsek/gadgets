import { describe, expect, test } from '@rstest/core';
import {
  esc,
  generateXml,
  monthLabel,
  type ParsedFile,
  parseCsv,
  parseFile,
  parseSlDate,
} from '../src/gadgets/NlbSepa/logic';

// ─── esc ────────────────────────────────────────────────────────────────────

describe('esc', () => {
  test('leaves plain text unchanged', () => {
    expect(esc('hello world')).toBe('hello world');
  });

  test('escapes &', () => {
    expect(esc('A&B')).toBe('A&amp;B');
  });

  test('escapes <', () => {
    expect(esc('a<b')).toBe('a&lt;b');
  });

  test('escapes >', () => {
    expect(esc('a>b')).toBe('a&gt;b');
  });

  test('escapes "', () => {
    expect(esc('"quoted"')).toBe('&quot;quoted&quot;');
  });

  test('escapes multiple special chars', () => {
    expect(esc('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
  });
});

// ─── parseSlDate ─────────────────────────────────────────────────────────────

describe('parseSlDate', () => {
  test('parses d. m. yyyy format', () => {
    expect(parseSlDate('5. 3. 2026')).toBe('2026-03-05');
  });

  test('parses dd. mm. yyyy format', () => {
    expect(parseSlDate('30. 12. 2025')).toBe('2025-12-30');
  });

  test('pads single-digit day and month', () => {
    expect(parseSlDate('1. 1. 2024')).toBe('2024-01-01');
  });

  test('handles leading/trailing whitespace', () => {
    expect(parseSlDate('  7. 9. 2025  ')).toBe('2025-09-07');
  });

  test('returns empty string for invalid input', () => {
    expect(parseSlDate('')).toBe('');
    expect(parseSlDate('not a date')).toBe('');
  });
});

// ─── parseCsv ────────────────────────────────────────────────────────────────

describe('parseCsv', () => {
  test('parses simple comma-separated rows', () => {
    const result = parseCsv('a,b,c\n1,2,3');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  test('handles quoted fields', () => {
    const result = parseCsv('"hello, world",b');
    expect(result).toEqual([['hello, world', 'b']]);
  });

  test('handles escaped quotes inside quoted field', () => {
    const result = parseCsv('"say ""hi""",b');
    expect(result).toEqual([['say "hi"', 'b']]);
  });

  test('handles CRLF line endings', () => {
    const result = parseCsv('a,b\r\n1,2');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  test('skips fully empty lines', () => {
    const result = parseCsv('a,b\n\n1,2');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  test('handles quoted field with embedded newline', () => {
    // NLB namen field sometimes contains commas in quotes
    const result = parseCsv(
      '"NAKUP ABC, TEČAJ: SEK/EUR 10,00",Finance,-,13.63',
    );
    expect(result).toEqual([
      ['NAKUP ABC, TEČAJ: SEK/EUR 10,00', 'Finance', '-', '13.63'],
    ]);
  });
});

// ─── parseFile ───────────────────────────────────────────────────────────────

const HEADER =
  'Namen,Kategorija,+/-,Znesek,Valuta,Datum plačila,Naziv prejemnika/plačnika,Naslov prejemnika/plačnika,Račun prejemnika/plačnika,BIC koda,Status,Menjalni tečaj,Referenca prejemnika,Datum poravnave,Dodatni stroški,ID transakcije';

function makeCsv(...rows: string[]) {
  return [HEADER, ...rows].join('\n');
}

describe('parseFile', () => {
  test('parses a basic debit EUR transaction', () => {
    const csv = makeCsv(
      'RAČUN ŠT. 2026-00001,Nakupi,-,1200.00,EUR,15. 1. 2026,ACME D.O.O.,SLOVENSKA 1,SI56999900001111222,LJBASI2X,,,,15. 1. 2026,,9900001111',
    );
    const { transactions, currency } = parseFile('account.csv', csv);
    expect(transactions).toHaveLength(1);
    const t = transactions[0];
    expect(t.namen).toBe('RAČUN ŠT. 2026-00001');
    expect(t.direction).toBe('-');
    expect(t.znesek).toBe(1200.0);
    expect(t.valuta).toBe('EUR');
    expect(t.datumPlacila).toBe('2026-01-15');
    expect(t.naziv).toBe('ACME D.O.O.');
    expect(t.naslov).toBe('SLOVENSKA 1');
    expect(t.racun).toBe('SI56999900001111222');
    expect(t.bic).toBe('LJBASI2X');
    expect(t.datumPoravnave).toBe('2026-01-15');
    expect(t.idTransakcije).toBe('9900001111');
    expect(t.monthKey).toBe('2026-01');
    expect(currency).toBe('EUR');
  });

  test('parses a credit transaction', () => {
    const csv = makeCsv(
      'PLAČILO,Prihodki,+,5000.00,EUR,3. 2. 2026,PAYER COMPANY,SOME STREET 5,SI56111100002222333,BSLJSI2X,,,,3. 2. 2026,,8800002222',
    );
    const { transactions } = parseFile('account.csv', csv);
    expect(transactions[0].direction).toBe('+');
    expect(transactions[0].znesek).toBe(5000.0);
    expect(transactions[0].monthKey).toBe('2026-02');
  });

  test('parses referenca field', () => {
    const csv = makeCsv(
      'PLAČILO DAVKA,Davki,-,61.13,EUR,30. 3. 2026,PDP - ZZZS,MIKLOŠIČEVA 24,SI56011008883000073,BSLJSI2X,,,SI1953887697-45004,30. 3. 2026,,7752127589',
    );
    const { transactions } = parseFile('account.csv', csv);
    expect(transactions[0].referenca).toBe('SI1953887697-45004');
  });

  test('parses menjalni tečaj for foreign currency', () => {
    const csv = makeCsv(
      'KONVERZIJA,Prenosi,-,140000.00,SEK,26. 3. 2026,JOHN DOE,STREET 1,SI56020102818000000,,,10.9100,,26. 3. 2026,,8847807250',
    );
    const { transactions, currency } = parseFile('sek.csv', csv);
    expect(transactions[0].tecaj).toBe('10.9100');
    expect(transactions[0].valuta).toBe('SEK');
    expect(currency).toBe('SEK');
  });

  test('sets filename on ParsedFile', () => {
    const csv = makeCsv(
      'PROVIZIJA,Finance,-,0.40,EUR,1. 1. 2026,,,,,,,,1. 1. 2026,,1234567890',
    );
    const result = parseFile('my-account.csv', csv);
    expect(result.filename).toBe('my-account.csv');
  });

  test('skips rows with fewer than 2 columns', () => {
    const csv = makeCsv(
      'bad',
      'PROVIZIJA,Finance,-,0.40,EUR,1. 1. 2026,,,,,,,,1. 1. 2026,,1234567890',
    );
    const { transactions } = parseFile('account.csv', csv);
    expect(transactions).toHaveLength(1);
  });

  test('handles multiple months', () => {
    const csv = makeCsv(
      'A,X,-,10.00,EUR,5. 1. 2026,,,,,,,,5. 1. 2026,,1001',
      'B,X,-,20.00,EUR,15. 2. 2026,,,,,,,,15. 2. 2026,,1002',
      'C,X,+,30.00,EUR,28. 2. 2026,,,,,,,,28. 2. 2026,,1003',
    );
    const { transactions } = parseFile('account.csv', csv);
    expect(transactions.map((t) => t.monthKey)).toEqual([
      '2026-01',
      '2026-02',
      '2026-02',
    ]);
  });
});

// ─── monthLabel ──────────────────────────────────────────────────────────────

describe('monthLabel', () => {
  test('formats a month key into a human-readable label', () => {
    expect(monthLabel('2026-03')).toMatch(/March 2026/);
  });

  test('formats January', () => {
    expect(monthLabel('2025-01')).toMatch(/January 2025/);
  });
});

// ─── generateXml ─────────────────────────────────────────────────────────────

function makeFile(overrides: Partial<ParsedFile> = {}): ParsedFile {
  return {
    filename: 'account.csv',
    currency: 'EUR',
    transactions: [
      {
        namen: 'RENT PAYMENT',
        direction: '-',
        znesek: 850.0,
        valuta: 'EUR',
        datumPlacila: '2026-01-05',
        naziv: 'LANDLORD LLC',
        naslov: 'MAIN ST 1',
        racun: 'SI56111100002222333',
        bic: 'LJBASI2X',
        tecaj: '',
        referenca: 'SI00123456',
        datumPoravnave: '2026-01-05',
        idTransakcije: '1000000001',
        monthKey: '2026-01',
      },
    ],
    ...overrides,
  };
}

describe('generateXml', () => {
  test('returns a comment when no transactions match selected months', () => {
    const xml = generateXml([makeFile()], new Set(['2025-12']));
    expect(xml).toContain('No transactions match');
  });

  test('generates valid XML with correct root element', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"',
    );
    expect(xml).toContain('<BkToCstmrStmt>');
  });

  test('includes amount and currency', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<Amt Ccy="EUR">850.00</Amt>');
  });

  test('debit transaction uses DBIT indicator', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<CdtDbtInd>DBIT</CdtDbtInd>');
  });

  test('credit transaction uses CRDT indicator', () => {
    const file = makeFile({
      transactions: [
        { ...makeFile().transactions[0], direction: '+', monthKey: '2026-01' },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).toContain('<CdtDbtInd>CRDT</CdtDbtInd>');
  });

  test('IBAN account number uses IBAN tag', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<IBAN>SI56111100002222333</IBAN>');
  });

  test('non-IBAN account number uses IBAN tag', () => {
    const file = makeFile({
      transactions: [
        {
          ...makeFile().transactions[0],
          racun: '51171088337',
          monthKey: '2026-01',
        },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).toContain('<IBAN>51171088337</IBAN>');
  });

  test('referenca goes into EndToEndId', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<EndToEndId>SI00123456</EndToEndId>');
  });

  test('namen used as Ustrd when referenca is empty', () => {
    const file = makeFile({
      transactions: [
        {
          ...makeFile().transactions[0],
          referenca: '',
          namen: 'SOME DESCRIPTION',
          monthKey: '2026-01',
        },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).toContain('<Ustrd>SOME DESCRIPTION</Ustrd>');
  });

  test('booking and value dates are included', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<BookgDt><Dt>2026-01-05</Dt></BookgDt>');
    expect(xml).toContain('<ValDt><Dt>2026-01-05</Dt></ValDt>');
  });

  test('transaction ID appears in AcctSvcrRef', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).toContain('<AcctSvcrRef>1000000001</AcctSvcrRef>');
  });

  test('filters to selected months only', () => {
    const file: ParsedFile = {
      filename: 'account.csv',
      currency: 'EUR',
      transactions: [
        {
          ...makeFile().transactions[0],
          datumPlacila: '2026-01-05',
          monthKey: '2026-01',
          idTransakcije: 'TXN-JAN-001',
        },
        {
          ...makeFile().transactions[0],
          datumPlacila: '2026-02-10',
          monthKey: '2026-02',
          idTransakcije: 'TXN-FEB-002',
        },
      ],
    };
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).toContain('TXN-JAN-001');
    expect(xml).not.toContain('TXN-FEB-002');
  });

  test('escapes special characters in namen', () => {
    const file = makeFile({
      transactions: [
        {
          ...makeFile().transactions[0],
          referenca: '',
          namen: 'A&B <test>',
          monthKey: '2026-01',
        },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).toContain('A&amp;B &lt;test&gt;');
  });

  test('includes amount and currency for foreign currency transaction', () => {
    const file = makeFile({
      currency: 'SEK',
      transactions: [
        {
          ...makeFile().transactions[0],
          valuta: 'SEK',
          znesek: 140000.0,
          tecaj: '10.9100',
          monthKey: '2026-01',
        },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).toContain('<Amt Ccy="SEK">140000.00</Amt>');
    expect(xml).toContain('<Ccy>SEK</Ccy>');
  });

  test('no exchange rate block when tecaj is empty', () => {
    const xml = generateXml([makeFile()], new Set(['2026-01']));
    expect(xml).not.toContain('<AmtDtls>');
  });

  test('omits RltdPties block when naziv and racun are both empty', () => {
    const file = makeFile({
      transactions: [
        {
          ...makeFile().transactions[0],
          naziv: '',
          racun: '',
          bic: '',
          monthKey: '2026-01',
        },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).not.toContain('<RltdPties>');
  });

  test('uses filename (without .csv) as account id', () => {
    const xml = generateXml(
      [makeFile({ filename: 'SI56123400005678.csv' })],
      new Set(['2026-01']),
    );
    expect(xml).toContain('<Othr><Id>SI56123400005678</Id></Othr>');
  });

  test('merges transactions from multiple files', () => {
    const file1 = makeFile({ filename: 'eur.csv', currency: 'EUR' });
    const file2 = makeFile({
      filename: 'sek.csv',
      currency: 'SEK',
      transactions: [
        {
          ...makeFile().transactions[0],
          valuta: 'SEK',
          znesek: 5000,
          monthKey: '2026-01',
        },
      ],
    });
    const xml = generateXml([file1, file2], new Set(['2026-01']));
    expect(xml).toMatch(/eur/i);
    expect(xml).toMatch(/sek/i);
    // Two <Stmt> blocks
    expect([...xml.matchAll(/<Stmt>/g)]).toHaveLength(2);
  });

  test('omits EndToEndId when referenca is empty', () => {
    const file = makeFile({
      transactions: [
        { ...makeFile().transactions[0], referenca: '', monthKey: '2026-01' },
      ],
    });
    const xml = generateXml([file], new Set(['2026-01']));
    expect(xml).not.toContain('<EndToEndId>');
  });
});
