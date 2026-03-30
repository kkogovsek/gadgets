export interface Transaction {
  namen: string;
  direction: '+' | '-';
  znesek: number;
  valuta: string;
  datumPlacila: string;
  naziv: string;
  naslov: string;
  racun: string;
  bic: string;
  tecaj: string;
  referenca: string;
  datumPoravnave: string;
  idTransakcije: string;
  monthKey: string;
}

export interface ParsedFile {
  filename: string;
  transactions: Transaction[];
  currency: string;
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function parseSlDate(s: string): string {
  const parts = s.trim().split('.');
  if (parts.length < 3) return '';
  return `${parts[2].trim()}-${parts[1].trim().padStart(2, '0')}-${parts[0].trim().padStart(2, '0')}`;
}

export function parseCsv(text: string): string[][] {
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
          if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else field += text[i++];
        }
      } else {
        while (i < n && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') field += text[i++];
      }
      row.push(field);
      if (text[i] === ',') i++;
    }
    if (text[i] === '\r') i++;
    if (text[i] === '\n') i++;
    if (row.some(c => c.trim())) rows.push(row);
  }
  return rows;
}

export function parseFile(filename: string, content: string): ParsedFile {
  const rows = parseCsv(content);
  const transactions: Transaction[] = [];
  let currency = '';

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 4) continue;
    const datumPlacila = parseSlDate(r[5] ?? '');
    const datumPoravnave = parseSlDate(r[13] ?? '');
    const valuta = (r[4] ?? '').trim();
    if (!currency && valuta) currency = valuta;
    transactions.push({
      namen: (r[0] ?? '').trim(),
      direction: (r[2] ?? '').trim() === '+' ? '+' : '-',
      znesek: parseFloat((r[3] ?? '0').replace(',', '.')),
      valuta,
      datumPlacila,
      naziv: (r[6] ?? '').trim(),
      naslov: (r[7] ?? '').trim(),
      racun: (r[8] ?? '').trim(),
      bic: (r[9] ?? '').trim(),
      tecaj: (r[11] ?? '').trim(),
      referenca: (r[12] ?? '').trim(),
      datumPoravnave,
      idTransakcije: (r[15] ?? '').trim(),
      monthKey: datumPlacila.substring(0, 7),
    });
  }
  return { filename, transactions, currency };
}

export function isIban(s: string): boolean {
  return /^[A-Z]{2}\d{2}/.test(s);
}

export function generateXml(files: ParsedFile[], months: Set<string>): string {
  const now = new Date().toISOString().slice(0, 19) + '+00:00';
  const msgId = `NLB-${Date.now()}`;

  const stmts = files
    .map(f => ({ ...f, transactions: f.transactions.filter(t => months.has(t.monthKey)) }))
    .filter(f => f.transactions.length > 0);

  if (!stmts.length) return '<!-- No transactions match the selected months -->';

  const stmtBlocks = stmts.map((f, idx) => {
    const dates = f.transactions.map(t => t.datumPlacila).filter(Boolean).sort();
    const fr = dates[0] ? `${dates[0]}T00:00:00+00:00` : now;
    const to = dates.at(-1) ? `${dates.at(-1)}T23:59:59+00:00` : now;

    const entries = f.transactions.map(t => {
      const cdtDbt = t.direction === '+' ? 'CRDT' : 'DBIT';
      const amt = t.znesek.toFixed(2);
      const cpRole = t.direction === '-' ? 'Cdtr' : 'Dbtr';
      const cpAcctRole = t.direction === '-' ? 'CdtrAcct' : 'DbtrAcct';
      const cpAgtRole = t.direction === '-' ? 'CdtrAgt' : 'DbtrAgt';

      const parties =
        t.naziv || t.racun
          ? `
            <RltdPties>
              ${t.naziv ? `<${cpRole}><Pty><Nm>${esc(t.naziv)}</Nm>${t.naslov ? `<PstlAdr><AdrLine>${esc(t.naslov)}</AdrLine></PstlAdr>` : ''}</Pty></${cpRole}>` : ''}
              ${t.racun ? `<${cpAcctRole}><Id>${isIban(t.racun) ? `<IBAN>${esc(t.racun)}</IBAN>` : `<Othr><Id>${esc(t.racun)}</Id></Othr>`}</Id></${cpAcctRole}>` : ''}
              ${t.bic ? `<${cpAgtRole}><FinInstnId><BICFI>${esc(t.bic)}</BICFI></FinInstnId></${cpAgtRole}>` : ''}
            </RltdPties>`
          : '';

      const rmtInf = t.referenca
        ? `<RmtInf><Strd><CdtrRefInf><Ref>${esc(t.referenca)}</Ref></CdtrRefInf></Strd></RmtInf>`
        : t.namen
          ? `<RmtInf><Ustrd>${esc(t.namen)}</Ustrd></RmtInf>`
          : '';

      const xchg =
        t.tecaj
          ? `
            <AmtDtls>
              <TxAmt><Amt Ccy="${esc(t.valuta)}">${amt}</Amt></TxAmt>
              <CntrValAmt>
                <Amt Ccy="EUR">${(t.znesek / parseFloat(t.tecaj)).toFixed(2)}</Amt>
                <CcyXchg><SrcCcy>${esc(t.valuta)}</SrcCcy><TrgtCcy>EUR</TrgtCcy><XchgRate>${t.tecaj}</XchgRate></CcyXchg>
              </CntrValAmt>
            </AmtDtls>`
          : '';

      return `
        <Ntry>
          <Amt Ccy="${esc(t.valuta)}">${amt}</Amt>
          <CdtDbtInd>${cdtDbt}</CdtDbtInd>
          <Sts><Cd>BOOK</Cd></Sts>
          ${t.datumPlacila ? `<BookgDt><Dt>${t.datumPlacila}</Dt></BookgDt>` : ''}
          ${t.datumPoravnave ? `<ValDt><Dt>${t.datumPoravnave}</Dt></ValDt>` : ''}
          ${t.idTransakcije ? `<AcctSvcrRef>${esc(t.idTransakcije)}</AcctSvcrRef>` : ''}
          <NtryDtls><TxDtls>
            <Refs>
              ${t.idTransakcije ? `<AcctSvcrRef>${esc(t.idTransakcije)}</AcctSvcrRef>` : ''}
              <EndToEndId>${esc(t.referenca || 'NOTPROVIDED')}</EndToEndId>
            </Refs>${xchg}${parties}
            ${rmtInf}
          </TxDtls></NtryDtls>
        </Ntry>`;
    }).join('');

    return `
    <Stmt>
      <Id>${msgId}-${idx + 1}</Id>
      <CreDtTm>${now}</CreDtTm>
      <FrToDt><FrDtTm>${fr}</FrDtTm><ToDtTm>${to}</ToDtTm></FrToDt>
      <Acct>
        <Id><Othr><Id>${esc(f.filename.replace(/\.csv$/i, ''))}</Id></Othr></Id>
        <Ccy>${esc(f.currency)}</Ccy>
      </Acct>${entries}
    </Stmt>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${now}</CreDtTm>
    </GrpHdr>${stmtBlocks}
  </BkToCstmrStmt>
</Document>`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}
