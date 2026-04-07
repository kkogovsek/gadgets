export interface Transaction {
  namen: string;
  kategorija: string;
  direction: '+' | '-';
  znesek: number;
  valuta: string;
  datumPlacila: string;
  naziv: string;
  naslov: string;
  racun: string;
  bic: string;
  status: string;
  tecaj: string;
  referenca: string;
  datumPoravnave: string;
  stroski: number;
  idTransakcije: string;
  monthKey: string;
}

export interface ParsedFile {
  filename: string;
  transactions: Transaction[];
  currency: string;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseSlDate(s: string): string {
  const parts = s.trim().split('.');
  if (parts.length < 3) return '';
  return `${parts[2].trim()}-${parts[1].trim().padStart(2, '0')}-${parts[0].trim().padStart(2, '0')}`;
}

export function parseCsv(text: string): string[][] {
  // Auto-detect delimiter from the first line
  const firstLine = text.slice(
    0,
    text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'),
  );
  const delim =
    firstLine.split(';').length >= firstLine.split(',').length ? ';' : ',';

  const rows: string[][] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const row: string[] = [];
    while (i < n && text[i] !== '\n' && text[i] !== '\r') {
      let field = '';
      if (text[i] === '"') {
        i++;
        while (i < n) {
          if (text[i] === '"' && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else if (text[i] === '"') {
            i++;
            break;
          } else field += text[i++];
        }
      } else {
        while (
          i < n &&
          text[i] !== delim &&
          text[i] !== '\n' &&
          text[i] !== '\r'
        )
          field += text[i++];
      }
      row.push(field);
      if (text[i] === delim) i++;
    }
    if (text[i] === '\r') i++;
    if (text[i] === '\n') i++;
    if (row.some((c) => c.trim())) rows.push(row);
  }
  return rows;
}

export function parseFile(filename: string, content: string): ParsedFile {
  const rows = parseCsv(content);
  if (rows.length < 2) return { filename, transactions: [], currency: '' };

  // Build header map (strip BOM from first header if present)
  const headers = rows[0].map((h, i) =>
    (i === 0 ? h.replace(/^\uFEFF/, '') : h).trim(),
  );
  const col = (name: string) => headers.indexOf(name);

  const iNamen = col('Namen');
  const iKat = col('Kategorija');
  const iDir = col('+/-');
  const iZnesek = col('Znesek');
  const iValuta = col('Valuta');
  const iDatPlac = col('Datum plačila');
  const iNaziv = col('Naziv prejemnika/plačnika');
  const iNaslov = col('Naslov prejemnika/plačnika');
  const iRacun = col('Račun prejemnika/plačnika');
  const iBic = col('BIC koda');
  const iStatus = col('Status');
  const iTecaj = col('Menjalni tečaj');
  const iRef = col('Referenca prejemnika');
  const iDatPor = col('Datum poravnave');
  const iStroski = col('Dodatni stroški');
  const iId = col('ID transakcije');

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '') : '').trim();

  const transactions: Transaction[] = [];
  let currency = '';

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 2) continue;
    const datumPlacila = parseSlDate(get(r, iDatPlac));
    const datumPoravnave = parseSlDate(get(r, iDatPor));
    const valuta = get(r, iValuta);
    if (!currency && valuta) currency = valuta;
    transactions.push({
      namen: get(r, iNamen),
      kategorija: get(r, iKat),
      direction: get(r, iDir) === '+' ? '+' : '-',
      znesek: Math.abs(parseFloat(get(r, iZnesek).replace(',', '.')) || 0),
      valuta,
      datumPlacila,
      naziv: get(r, iNaziv),
      naslov: get(r, iNaslov),
      racun: get(r, iRacun),
      bic: get(r, iBic),
      status: get(r, iStatus),
      tecaj: get(r, iTecaj),
      referenca: get(r, iRef),
      datumPoravnave,
      stroski: Math.abs(parseFloat(get(r, iStroski).replace(',', '.')) || 0),
      idTransakcije: get(r, iId),
      monthKey: (datumPoravnave || datumPlacila).substring(0, 7),
    });
  }
  return { filename, transactions, currency };
}

export function generateXml(
  files: ParsedFile[],
  months: Set<string>,
  accountIban: string,
  accountOwner: string,
): string {
  const now = new Date().toISOString().slice(0, 19);
  const msgId = `STMT-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14)}`;

  const stmts = files
    .map((f) => ({
      ...f,
      transactions: f.transactions.filter((t) => months.has(t.monthKey)),
    }))
    .filter((f) => f.transactions.length > 0);

  if (!stmts.length)
    return '<!-- No transactions match the selected months -->';

  const stmtBlocks = stmts
    .map((f) => {
      const dates = f.transactions
        .map((t) => t.datumPlacila)
        .filter(Boolean)
        .sort();
      const fromDate = dates[0] ?? now.slice(0, 10);
      const toDate = dates.at(-1) ?? now.slice(0, 10);
      const stmtId = `STMT-${fromDate}-${toDate}`;

      const entries = f.transactions
        .map((t) => {
          const cdtDbt = t.direction === '+' ? 'CRDT' : 'DBIT';
          const amt = t.znesek.toFixed(2);
          const bookStatus = t.status === 'AVTORIZACIJA' ? 'PDNG' : 'BOOK';
          const valDt = t.datumPoravnave || t.datumPlacila;

          const cpRole = t.direction === '-' ? 'Cdtr' : 'Dbtr';
          const cpAcctRole = t.direction === '-' ? 'CdtrAcct' : 'DbtrAcct';
          const cpAgtRole = t.direction === '-' ? 'CdtrAgt' : 'DbtrAgt';
          const fmlyCode = cdtDbt === 'CRDT' ? 'ICDT' : 'IDDT';

          const parties =
            t.naziv || t.racun
              ? `
          <RltdPties>
            ${t.naziv ? `<${cpRole}><Nm>${esc(t.naziv)}</Nm>${t.naslov ? `<PstlAdr><AdrLine>${esc(t.naslov)}</AdrLine></PstlAdr>` : ''}</${cpRole}>` : ''}
            ${t.racun ? `<${cpAcctRole}><Id><IBAN>${esc(t.racun)}</IBAN></Id></${cpAcctRole}>` : ''}
          </RltdPties>`
              : '';

          const agents = t.bic
            ? `
          <RltdAgts>
            <${cpAgtRole}><FinInstnId><BIC>${esc(t.bic)}</BIC></FinInstnId></${cpAgtRole}>
          </RltdAgts>`
            : '';

          const rmtInf = t.namen
            ? `<RmtInf><Ustrd>${esc(t.namen)}</Ustrd></RmtInf>`
            : '';

          const refs = [
            t.idTransakcije
              ? `<AcctSvcrRef>${esc(t.idTransakcije)}</AcctSvcrRef>`
              : '',
            t.referenca ? `<EndToEndId>${esc(t.referenca)}</EndToEndId>` : '',
          ]
            .filter(Boolean)
            .join('\n              ');

          return `
      <Ntry>
        <Amt Ccy="${esc(t.valuta)}">${amt}</Amt>
        <CdtDbtInd>${cdtDbt}</CdtDbtInd>
        <Sts>${bookStatus}</Sts>
        ${t.datumPlacila ? `<BookgDt><Dt>${t.datumPlacila}</Dt></BookgDt>` : ''}
        ${valDt ? `<ValDt><Dt>${valDt}</Dt></ValDt>` : ''}
        ${t.stroski > 0 ? `<TtlChrgsAndTaxAmt Ccy="${esc(t.valuta)}">${t.stroski.toFixed(2)}</TtlChrgsAndTaxAmt>` : ''}
        <BkTxCd>
          <Domn>
            <Cd>PMNT</Cd>
            <Fmly>
              <Cd>${fmlyCode}</Cd>
              <SubFmlyCd>OTHR</SubFmlyCd>
            </Fmly>
          </Domn>
        </BkTxCd>
        ${t.kategorija ? `<AddtlNtryInf>${esc(t.kategorija)}</AddtlNtryInf>` : ''}
        <NtryDtls><TxDtls>
          <Refs>
            ${refs}
          </Refs>${parties}${agents}
          ${rmtInf}
        </TxDtls></NtryDtls>
      </Ntry>`;
        })
        .join('');

      const acctId = accountIban
        ? `<IBAN>${esc(accountIban)}</IBAN>`
        : `<Othr><Id>${esc(f.filename.replace(/\.csv$/i, ''))}</Id></Othr>`;
      const ownr = accountOwner
        ? `\n        <Ownr><Nm>${esc(accountOwner)}</Nm></Ownr>`
        : '';

      return `
    <Stmt>
      <Id>${stmtId}</Id>
      <ElctrncSeqNb>1</ElctrncSeqNb>
      <CreDtTm>${now}</CreDtTm>
      <FrToDt><FrDtTm>${fromDate}T00:00:00</FrDtTm><ToDtTm>${toDate}T23:59:59</ToDtTm></FrToDt>
      <Acct>
        <Id>${acctId}</Id>
        <Ccy>${esc(f.currency)}</Ccy>${ownr}
      </Acct>${entries}
    </Stmt>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <MsgPgntn>
        <PgNb>1</PgNb>
        <LastPgInd>true</LastPgInd>
      </MsgPgntn>
    </GrpHdr>${stmtBlocks}
  </BkToCstmrStmt>
</Document>`;
}

export interface Issue {
  level: 'error' | 'warn';
  messageId: string;
  values?: Record<string, string | number>;
}

export interface MonthSummary {
  key: string;
  credits: number;
  debits: number;
  charges: number;
  count: number;
}

export interface Summary {
  credits: number;
  debits: number;
  charges: number;
  count: number;
  pendingCount: number;
  currencies: string[];
  byMonth: MonthSummary[];
  issues: Issue[];
  transactions: Transaction[];
}

export function summarize(files: ParsedFile[], months: Set<string>): Summary {
  const transactions = files.flatMap((f) =>
    f.transactions.filter((t) => months.has(t.monthKey)),
  );

  const issues: Issue[] = [];

  // Duplicate transaction IDs
  const idCount = new Map<string, number>();
  for (const t of transactions) {
    if (t.idTransakcije)
      idCount.set(t.idTransakcije, (idCount.get(t.idTransakcije) ?? 0) + 1);
  }
  for (const [id, count] of idCount)
    if (count > 1)
      issues.push({
        level: 'error',
        messageId: 'nlb.issue.duplicate-id',
        values: { id, count },
      });

  // Missing transaction IDs
  const missingIds = transactions.filter((t) => !t.idTransakcije).length;
  if (missingIds)
    issues.push({
      level: 'warn',
      messageId: 'nlb.issue.no-id',
      values: { count: missingIds },
    });

  // Zero-amount transactions
  const zeros = transactions.filter((t) => t.znesek === 0).length;
  if (zeros)
    issues.push({
      level: 'warn',
      messageId: 'nlb.issue.zero-amount',
      values: { count: zeros },
    });

  // Charges exceed transaction amount
  const overcharged = transactions.filter(
    (t) => t.stroski > 0 && t.stroski > t.znesek,
  ).length;
  if (overcharged)
    issues.push({
      level: 'error',
      messageId: 'nlb.issue.excess-charges',
      values: { count: overcharged },
    });

  // Foreign-currency transactions missing exchange rate
  const currencyFreq = new Map<string, number>();
  for (const t of transactions)
    currencyFreq.set(t.valuta, (currencyFreq.get(t.valuta) ?? 0) + 1);
  const currencies = [...currencyFreq.keys()];
  if (currencies.length > 1) {
    const base = ([...currencyFreq.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0] ?? ['EUR'])[0];
    const noRate = transactions.filter(
      (t) => t.valuta !== base && !t.tecaj && t.direction === '-',
    ).length;
    if (noRate)
      issues.push({
        level: 'warn',
        messageId: 'nlb.issue.missing-rate',
        values: { count: noRate },
      });
  }

  // Totals
  let credits = 0;
  let debits = 0;
  let charges = 0;
  let pendingCount = 0;
  const monthMap = new Map<string, MonthSummary>();

  for (const t of transactions) {
    if (t.direction === '+') credits += t.znesek;
    else debits += t.znesek;
    charges += t.stroski;
    if (t.status === 'AVTORIZACIJA') pendingCount++;

    let m = monthMap.get(t.monthKey);
    if (!m) {
      m = { key: t.monthKey, credits: 0, debits: 0, charges: 0, count: 0 };
      monthMap.set(t.monthKey, m);
    }
    if (t.direction === '+') m.credits += t.znesek;
    else m.debits += t.znesek;
    m.charges += t.stroski;
    m.count++;
  }

  const byMonth = [...monthMap.values()].sort((a, b) =>
    b.key.localeCompare(a.key),
  );

  return {
    credits,
    debits,
    charges,
    count: transactions.length,
    pendingCount,
    currencies,
    byMonth,
    issues,
    transactions,
  };
}

export function checkDoubleAccounting(
  files: ParsedFile[],
  months: Set<string>,
): Issue[] {
  const issues: Issue[] = [];
  const allTxns = files.flatMap((f) =>
    f.transactions.filter((t) => months.has(t.monthKey)),
  );

  // Validate exchange rates
  const badRate = allTxns.filter((t) => {
    if (!t.tecaj) return false;
    const r = parseFloat(t.tecaj);
    return Number.isNaN(r) || r <= 0;
  });
  if (badRate.length)
    issues.push({
      level: 'error',
      messageId: 'nlb.issue.invalid-rate',
      values: { count: badRate.length },
    });

  // Conversion counterpart pairing: for each transaction with a valid exchange
  // rate, there should be a matching transaction in another currency on the same
  // date (±3 days) with the opposite direction and approximately matching
  // converted amount (within 2%).
  const conversions = allTxns.filter((t) => {
    if (!t.tecaj) return false;
    const r = parseFloat(t.tecaj);
    return !Number.isNaN(r) && r > 0;
  });

  let unmatched = 0;
  for (const t of conversions) {
    const rate = parseFloat(t.tecaj);
    const convertedAmt = t.znesek / rate;
    const oppositeDir = t.direction === '-' ? '+' : '-';

    const found = allTxns.some((c) => {
      if (c === t || c.valuta === t.valuta) return false;
      if (c.direction !== oppositeDir) return false;
      const dt = Math.abs(
        new Date(c.datumPlacila).getTime() - new Date(t.datumPlacila).getTime(),
      );
      if (dt > 3 * 24 * 3600 * 1000) return false;
      return Math.abs(c.znesek - convertedAmt) / convertedAmt < 0.02;
    });

    if (!found) unmatched++;
  }

  if (unmatched > 0)
    issues.push({
      level: 'warn',
      messageId: 'nlb.issue.no-counterpart',
      values: { count: unmatched },
    });

  return issues;
}

export function monthLabel(key: string, locale = 'en'): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}
