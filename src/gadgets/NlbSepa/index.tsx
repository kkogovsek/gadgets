import Editor from '@monaco-editor/react';
import {
  Download,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { MarkdownView } from '../../components/MarkdownView';
import infoMd from './INFO.md?raw';
import {
  checkDoubleAccounting,
  generateXml,
  type Issue,
  monthLabel,
  type ParsedFile,
  parseFile,
  type Summary,
  summarize,
} from './logic';

const LS_IBAN = 'nlb-sepa-iban';
const LS_OWNER = 'nlb-sepa-owner';

function checkXmlConsistency(xml: string, summary: Summary): Issue[] {
  const issues: Issue[] = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parseerror'))
      return [{ level: 'error', message: 'Generated XML failed to parse' }];

    const entries = Array.from(doc.querySelectorAll('Ntry'));

    // Entry count
    if (entries.length !== summary.count)
      issues.push({
        level: 'error',
        message: `Entry count mismatch: XML has ${entries.length}, CSV has ${summary.count}`,
      });

    // Amount totals by currency
    const xmlByCcy = new Map<string, number>();
    for (const e of entries) {
      const el = e.querySelector('Amt');
      const ccy = el?.getAttribute('Ccy') ?? '';
      xmlByCcy.set(
        ccy,
        (xmlByCcy.get(ccy) ?? 0) + parseFloat(el?.textContent ?? '0'),
      );
    }
    const csvByCcy = new Map<string, number>();
    for (const t of summary.transactions)
      csvByCcy.set(t.valuta, (csvByCcy.get(t.valuta) ?? 0) + t.znesek);
    for (const [ccy, csvAmt] of csvByCcy) {
      const xmlAmt = xmlByCcy.get(ccy) ?? 0;
      if (Math.abs(xmlAmt - csvAmt) > 0.005)
        issues.push({
          level: 'error',
          message: `${ccy} total mismatch: XML ${xmlAmt.toFixed(2)} vs CSV ${csvAmt.toFixed(2)}`,
        });
    }

    // Credit/debit split
    let xmlCrdt = 0;
    let xmlDbit = 0;
    doc.querySelectorAll('CdtDbtInd').forEach((el) => {
      if (el.textContent === 'CRDT') xmlCrdt++;
      else if (el.textContent === 'DBIT') xmlDbit++;
    });
    const csvCrdt = summary.transactions.filter(
      (t) => t.direction === '+',
    ).length;
    const csvDbit = summary.transactions.filter(
      (t) => t.direction === '-',
    ).length;
    if (xmlCrdt !== csvCrdt || xmlDbit !== csvDbit)
      issues.push({
        level: 'error',
        message: `Credit/debit split mismatch: XML ${xmlCrdt}↑ ${xmlDbit}↓ vs CSV ${csvCrdt}↑ ${csvDbit}↓`,
      });

    // Transaction IDs present in XML
    const xmlIds = new Set<string>();
    doc.querySelectorAll('AcctSvcrRef').forEach((el) => {
      if (el.textContent) xmlIds.add(el.textContent);
    });
    const missing = summary.transactions.filter(
      (t) => t.idTransakcije && !xmlIds.has(t.idTransakcije),
    ).length;
    if (missing)
      issues.push({
        level: 'error',
        message: `${missing} transaction ID(s) from CSV not found in XML`,
      });
  } catch {
    issues.push({
      level: 'error',
      message: 'XML validation failed unexpectedly',
    });
  }
  return issues;
}

function fmtAmt(n: number) {
  return n.toLocaleString('sl-SI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-sm font-mono text-white">{value}</span>
      {sub && <span className="text-xs text-white/30">{sub}</span>}
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <div
      className={`flex items-start gap-2 rounded px-3 py-2 text-xs ${
        issue.level === 'error'
          ? 'bg-red-500/15 border border-red-500/30 text-red-300'
          : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200'
      }`}
    >
      <span>{issue.level === 'error' ? '❌' : '⚠️'}</span>
      <span>{issue.message}</span>
    </div>
  );
}

function PassedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded px-3 py-2 text-xs bg-green-500/10 border border-green-500/20 text-green-300">
      <span>✓</span>
      <span>{label}</span>
    </div>
  );
}

const DATA_CHECKS = [
  'No duplicate transaction IDs',
  'All transactions have IDs',
  'No zero-amount transactions',
  'No charges exceeding transaction amount',
  'No foreign-currency transactions missing exchange rate',
];

const XML_CHECKS = [
  'XML is well-formed',
  'Entry count matches CSV',
  'Amount totals match by currency',
  'Credit/debit split matches',
  'All transaction IDs present in XML',
];

const DBL_CHECKS = [
  'All exchange rates are valid',
  'All conversions have matching counterparts',
];

function PreviewPanel({
  summary,
  xmlIssues,
  dblIssues,
}: {
  summary: Summary;
  xmlIssues: Issue[];
  dblIssues: Issue[];
}) {
  const { currencies, issues, transactions } = summary;
  const [tab, setTab] = useState<'checks' | 'transactions'>('checks');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(
    currencies.length === 1 ? currencies[0] : null,
  );

  const totalIssues = issues.length + xmlIssues.length + dblIssues.length;

  const filtered = selectedCurrency
    ? transactions.filter((t) => t.valuta === selectedCurrency)
    : transactions;

  const credits = filtered
    .filter((t) => t.direction === '+')
    .reduce((s, t) => s + t.znesek, 0);
  const debits = filtered
    .filter((t) => t.direction === '-')
    .reduce((s, t) => s + t.znesek, 0);
  const charges = filtered.reduce((s, t) => s + t.stroski, 0);
  const net = credits - debits;
  const count = filtered.length;
  const pendingCount = filtered.filter(
    (t) => t.status === 'AVTORIZACIJA',
  ).length;
  const hasCharges = charges > 0;

  // Month breakdown for filtered set
  const byMonth = (() => {
    const map = new Map<
      string,
      { credits: number; debits: number; charges: number; count: number }
    >();
    for (const t of filtered) {
      let m = map.get(t.monthKey);
      if (!m) {
        m = { credits: 0, debits: 0, charges: 0, count: 0 };
        map.set(t.monthKey, m);
      }
      if (t.direction === '+') m.credits += t.znesek;
      else m.debits += t.znesek;
      m.charges += t.stroski;
      m.count++;
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, v]) => ({ key, ...v }));
  })();

  const ccy = selectedCurrency ? ` ${selectedCurrency}` : '';
  const sorted = filtered
    .slice()
    .sort((a, b) => b.datumPlacila.localeCompare(a.datumPlacila));

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => setTab('checks')}
          className={`text-xs px-3 py-1.5 border-b-2 -mb-px transition-colors ${
            tab === 'checks'
              ? 'border-blue-400 text-white'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Checks
          {totalIssues > 0 && (
            <span className="ml-1.5 text-[10px] bg-red-500/30 text-red-300 rounded-full px-1.5 py-0.5">
              {totalIssues}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('transactions')}
          className={`text-xs px-3 py-1.5 border-b-2 -mb-px transition-colors ${
            tab === 'transactions'
              ? 'border-blue-400 text-white'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Transactions
          <span className="ml-1.5 text-[10px] text-white/30">{count}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
        {/* Currency filter */}
        {currencies.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/40">Currency:</span>
            <button
              type="button"
              onClick={() => setSelectedCurrency(null)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                selectedCurrency === null
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              All
            </button>
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCurrency(c)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  selectedCurrency === c
                    ? 'bg-white/20 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Summary stats */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 border border-white/10 rounded-lg px-4 py-3">
          <StatCell label="Credits" value={`+${fmtAmt(credits)}${ccy}`} />
          <StatCell label="Debits" value={`-${fmtAmt(debits)}${ccy}`} />
          <StatCell
            label="Net"
            value={`${net >= 0 ? '+' : ''}${fmtAmt(net)}${ccy}`}
          />
          {hasCharges && (
            <StatCell label="Charges" value={`${fmtAmt(charges)}${ccy}`} />
          )}
          <StatCell
            label="Transactions"
            value={String(count)}
            sub={pendingCount > 0 ? `${pendingCount} pending` : undefined}
          />
        </div>

        {tab === 'checks' && (
          <>
            {/* CSV data issues */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                Data checks
              </span>
              {issues.length > 0
                ? issues.map((issue) => (
                    <IssueRow key={issue.message} issue={issue} />
                  ))
                : DATA_CHECKS.map((label) => (
                    <PassedRow key={label} label={label} />
                  ))}
            </div>

            {/* XML consistency issues */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                XML consistency
              </span>
              {xmlIssues.length > 0
                ? xmlIssues.map((issue) => (
                    <IssueRow key={issue.message} issue={issue} />
                  ))
                : XML_CHECKS.map((label) => (
                    <PassedRow key={label} label={label} />
                  ))}
            </div>

            {/* Double accounting issues */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                Double accounting
              </span>
              {dblIssues.length > 0
                ? dblIssues.map((issue) => (
                    <IssueRow key={issue.message} issue={issue} />
                  ))
                : DBL_CHECKS.map((label) => (
                    <PassedRow key={label} label={label} />
                  ))}
            </div>
          </>
        )}

        {tab === 'transactions' && (
          <>
            {/* Per-month breakdown */}
            {byMonth.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/50 font-medium">
                  By month
                </span>
                <div className="grid gap-1">
                  {byMonth.map((m) => (
                    <div
                      key={m.key}
                      className="flex items-center gap-3 text-xs px-3 py-1.5 rounded bg-white/5"
                    >
                      <span className="text-white/60 w-20 shrink-0">
                        {monthLabel(m.key)}
                      </span>
                      <span className="text-green-400 font-mono w-24 text-right">
                        +{fmtAmt(m.credits)}
                      </span>
                      <span className="text-red-400 font-mono w-24 text-right">
                        -{fmtAmt(m.debits)}
                      </span>
                      {hasCharges && (
                        <span className="text-white/40 font-mono w-20 text-right">
                          {fmtAmt(m.charges)} fees
                        </span>
                      )}
                      <span className="text-white/30 ml-auto">
                        {m.count} txns
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction list */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                Transactions
              </span>
              <div className="flex flex-col gap-0.5">
                {sorted.map((t, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable sorted list
                    key={i}
                    className={`flex items-center gap-3 text-xs px-3 py-1.5 rounded ${
                      t.status === 'AVTORIZACIJA'
                        ? 'bg-yellow-500/5'
                        : 'bg-white/5'
                    }`}
                  >
                    <span className="text-white/35 w-20 shrink-0 tabular-nums">
                      {t.datumPlacila}
                    </span>
                    <span className="text-white/60 flex-1 truncate min-w-0">
                      {t.naziv || t.namen || '—'}
                    </span>
                    {t.kategorija && (
                      <span className="text-white/25 hidden xl:block shrink-0">
                        {t.kategorija}
                      </span>
                    )}
                    {t.stroski > 0 && (
                      <span className="text-white/30 font-mono shrink-0 whitespace-nowrap">
                        +{fmtAmt(t.stroski)} fees
                      </span>
                    )}
                    <span
                      className={`font-mono shrink-0 whitespace-nowrap text-right ${
                        t.direction === '+' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {t.direction === '+' ? '+' : '-'}
                      {fmtAmt(t.znesek)}{' '}
                      <span className="text-white/30">{t.valuta}</span>
                    </span>
                    {t.status === 'AVTORIZACIJA' && (
                      <span className="text-yellow-400/70 shrink-0">PDNG</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const NlbSepa = () => {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [accountIban, setAccountIban] = useState(
    () => localStorage.getItem(LS_IBAN) ?? '',
  );
  const [accountOwner, setAccountOwner] = useState(
    () => localStorage.getItem(LS_OWNER) ?? '',
  );
  const [showPreview, setShowPreview] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const allMonths = useMemo(() => {
    const s = new Set<string>();
    for (const f of files)
      for (const t of f.transactions) if (t.monthKey) s.add(t.monthKey);
    return [...s].sort().reverse();
  }, [files]);

  const xml = useMemo(
    () =>
      files.length && selectedMonths.size
        ? generateXml(files, selectedMonths, accountIban, accountOwner)
        : '',
    [files, selectedMonths, accountIban, accountOwner],
  );

  const summary = useMemo(
    () =>
      files.length && selectedMonths.size
        ? summarize(files, selectedMonths)
        : null,
    [files, selectedMonths],
  );

  const xmlIssues = useMemo(
    () => (xml && summary ? checkXmlConsistency(xml, summary) : []),
    [xml, summary],
  );

  const dblIssues = useMemo(
    () =>
      files.length && selectedMonths.size
        ? checkDoubleAccounting(files, selectedMonths)
        : [],
    [files, selectedMonths],
  );

  const hasIssues =
    (summary?.issues.length ?? 0) + xmlIssues.length + dblIssues.length > 0;

  const loadFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const readers = Array.from(fileList).map(
      (file) =>
        new Promise<ParsedFile>((res) => {
          const reader = new FileReader();
          reader.onload = (e) =>
            res(parseFile(file.name, e.target?.result as string));
          reader.readAsText(file, 'UTF-8');
        }),
    );
    Promise.all(readers).then((parsed) => {
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.filename));
        return [...prev, ...parsed.filter((p) => !existing.has(p.filename))];
      });
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      loadFiles(e.dataTransfer.files);
    },
    [loadFiles],
  );

  const removeFile = (filename: string) => {
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.filename !== filename);
      const validMonths = new Set(
        remaining.flatMap((f) => f.transactions.map((t) => t.monthKey)),
      );
      setSelectedMonths(
        (sel) => new Set([...sel].filter((m) => validMonths.has(m))),
      );
      return remaining;
    });
  };

  const toggleMonth = (key: string) =>
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectAll = () => setSelectedMonths(new Set(allMonths));
  const selectNone = () => setSelectedMonths(new Set());

  const download = () => {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const months = [...selectedMonths].sort();
    const currencies = [
      ...new Set(files.map((f) => f.currency).filter(Boolean)),
    ];
    let datePart = 'export';
    if (months.length === 1) {
      datePart = months[0].replace('-', '_');
    } else if (months.length > 1) {
      const [y0, m0] = months[0].split('-');
      const [y1, m1] = months[months.length - 1].split('-');
      datePart = y0 === y1 ? `${y0}_${m0}-${m1}` : `${y0}_${m0}-${y1}_${m1}`;
    }
    a.download = `${[datePart, ...currencies].join('_')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full gap-3 p-1">
      {/* Left column: account info + upload + files + months */}
      <div className="flex flex-col gap-3 w-64 shrink-0">
        {/* Account info */}
        <div className="flex flex-col gap-2 border border-white/10 rounded-lg px-3 py-2.5">
          <span className="text-xs text-white/50 font-medium">Account</span>
          <input
            type="text"
            placeholder="IBAN (e.g. SI56…)"
            value={accountIban}
            onChange={(e) => {
              setAccountIban(e.target.value);
              localStorage.setItem(LS_IBAN, e.target.value);
            }}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/30 w-full"
          />
          <div className="flex flex-col gap-0.5">
            <input
              type="text"
              placeholder="Owner name (optional)"
              value={accountOwner}
              onChange={(e) => {
                setAccountOwner(e.target.value);
                localStorage.setItem(LS_OWNER, e.target.value);
              }}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/30 w-full"
            />
            <span className="text-xs text-white/30">Use ALL CAPS</span>
          </div>
        </div>

        {/* Drop zone */}
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg px-4 py-5 cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-400/10' : 'border-white/20 hover:border-white/40'}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.csv';
            inp.multiple = true;
            inp.style.display = 'none';
            document.body.appendChild(inp);
            inp.onchange = () => {
              loadFiles(inp.files);
              document.body.removeChild(inp);
            };
            inp.click();
          }}
        >
          <Upload size={20} className="text-white/50" />
          <span className="text-xs text-white/50 text-center">
            Drop CSV files
            <br />
            or click to browse
          </span>
        </button>

        {/* Loaded files */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1">
            {files.map((f) => (
              <div
                key={f.filename}
                className="flex items-center gap-2 bg-white/5 rounded px-3 py-1.5"
              >
                <FileSpreadsheet
                  size={14}
                  className="text-green-400 shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-white/80 truncate">
                    {f.filename}
                  </span>
                  <span className="text-xs text-white/30">
                    {f.currency} · {f.transactions.length} txns
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(f.filename)}
                  className="text-white/30 hover:text-white/70 shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Month selection */}
        {allMonths.length > 0 && (
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">Months</span>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                All
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="text-xs text-white/40 hover:text-white/60"
              >
                None
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {allMonths.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMonth(key)}
                  className={`text-xs px-3 py-1.5 rounded border text-left transition-colors ${selectedMonths.has(key) ? 'bg-blue-500/30 border-blue-400 text-blue-200' : 'border-white/15 text-white/50 hover:border-white/30'}`}
                >
                  {monthLabel(key)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: content + toolbar */}
      <div className="relative flex-1 min-w-0 min-h-0 rounded-lg overflow-hidden border border-white/10">
        {/* Content area */}
        {showInfo ? (
          <MarkdownView content={infoMd} />
        ) : !xml && !summary ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            {files.length === 0 ? (
              <span className="text-sm">
                Upload NLB CSV export(s) to get started
              </span>
            ) : (
              <span className="text-sm">
                Select one or more months to preview the ISO 20022 XML
              </span>
            )}
          </div>
        ) : showPreview && summary ? (
          <PreviewPanel
            summary={summary}
            xmlIssues={xmlIssues}
            dblIssues={dblIssues}
          />
        ) : xml ? (
          <Editor
            height="100%"
            language="xml"
            value={xml}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              wordWrap: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        ) : null}

        {/* Toolbar */}
        <div className="absolute top-2 right-2 flex items-center gap-1 p-1 bg-black/40 backdrop-blur rounded-full shadow-lg">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            title="About this gadget"
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${showInfo ? 'bg-white/20 text-white' : 'hover:bg-white/15 text-white/60 hover:text-white'}`}
          >
            <HelpCircle size={15} />
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            disabled={!summary || showInfo}
            title="Preview"
            className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Eye size={15} className="text-white" />
            {summary && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] leading-none select-none">
                {hasIssues ? '⚠️' : '✅'}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!xml}
            title="Download XML"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={15} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
