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
import { useIntl } from 'react-intl';
import { MarkdownView } from '../../components/MarkdownView';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import infoMdEn from './INFO.md?raw';
import infoMdSl from './INFO.sl.md?raw';
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
      return [{ level: 'error', messageId: 'nlb.issue.xml-parse-fail' }];

    const entries = Array.from(doc.querySelectorAll('Ntry'));

    if (entries.length !== summary.count)
      issues.push({
        level: 'error',
        messageId: 'nlb.issue.entry-count-mismatch',
        values: { xmlCount: entries.length, csvCount: summary.count },
      });

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
          messageId: 'nlb.issue.amount-mismatch',
          values: {
            ccy,
            xmlAmt: xmlAmt.toFixed(2),
            csvAmt: csvAmt.toFixed(2),
          },
        });
    }

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
        messageId: 'nlb.issue.cr-dr-mismatch',
        values: { xmlCrdt, xmlDbit, csvCrdt, csvDbit },
      });

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
        messageId: 'nlb.issue.missing-ids',
        values: { count: missing },
      });
  } catch {
    issues.push({
      level: 'error',
      messageId: 'nlb.issue.xml-validate-fail',
    });
  }
  return issues;
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
  const intl = useIntl();
  const message = intl.formatMessage({ id: issue.messageId }, issue.values);
  return (
    <div
      className={`flex items-start gap-2 rounded px-3 py-2 text-xs ${
        issue.level === 'error'
          ? 'bg-red-500/15 border border-red-500/30 text-red-300'
          : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200'
      }`}
    >
      <span>{issue.level === 'error' ? '❌' : '⚠️'}</span>
      <span>{message}</span>
    </div>
  );
}

function PassedRow({ messageId }: { messageId: string }) {
  const intl = useIntl();
  return (
    <div className="flex items-center gap-2 rounded px-3 py-2 text-xs bg-green-500/10 border border-green-500/20 text-green-300">
      <span>✓</span>
      <span>{intl.formatMessage({ id: messageId })}</span>
    </div>
  );
}

const DATA_CHECKS = [
  'nlb.check.no-duplicate-ids',
  'nlb.check.all-have-ids',
  'nlb.check.no-zero-amount',
  'nlb.check.no-excess-charges',
  'nlb.check.fx-has-rate',
];

const XML_CHECKS = [
  'nlb.check.xml-wellformed',
  'nlb.check.entry-count',
  'nlb.check.amount-totals',
  'nlb.check.cr-dr-split',
  'nlb.check.ids-in-xml',
];

const DBL_CHECKS = ['nlb.check.rates-valid', 'nlb.check.conversions-matched'];

function PreviewPanel({
  summary,
  xmlIssues,
  dblIssues,
}: {
  summary: Summary;
  xmlIssues: Issue[];
  dblIssues: Issue[];
}) {
  const intl = useIntl();
  const fmtAmt = (n: number) =>
    intl.formatNumber(n, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const { currencies, issues, transactions } = summary;
  const [tab, setTab] = useState<'checks' | 'transactions'>('checks');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(
    currencies.length === 1 ? currencies[0] : null,
  );

  const totalIssues = issues.length + xmlIssues.length + dblIssues.length;

  const filtered = selectedCurrency
    ? transactions.filter((t) => t.valuta === selectedCurrency)
    : transactions;

  const count = filtered.length;
  const pendingCount = filtered.filter(
    (t) => t.status === 'AVTORIZACIJA',
  ).length;

  const statsByCcy = (() => {
    const map = new Map<
      string,
      { credits: number; debits: number; charges: number }
    >();
    for (const t of filtered) {
      let s = map.get(t.valuta);
      if (!s) {
        s = { credits: 0, debits: 0, charges: 0 };
        map.set(t.valuta, s);
      }
      if (t.direction === '+') s.credits += t.znesek;
      else s.debits += t.znesek;
      s.charges += t.stroski;
    }
    return [...map.entries()].map(([ccy, v]) => ({
      ccy,
      ...v,
      net: v.credits - v.debits,
    }));
  })();

  const hasCharges = statsByCcy.some((s) => s.charges > 0);

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

  const filteredCurrencies = [...new Set(filtered.map((t) => t.valuta))];
  const ccy =
    filteredCurrencies.length === 1 ? ` ${filteredCurrencies[0]}` : '';
  const sorted = filtered
    .slice()
    .sort((a, b) => b.datumPlacila.localeCompare(a.datumPlacila));

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/10 shrink-0">
        <Button
          variant="tabUnderline"
          size="md"
          active={tab === 'checks'}
          onClick={() => setTab('checks')}
          className="text-xs px-3 py-1.5"
        >
          {intl.formatMessage({ id: 'nlb.checks' })}
          {totalIssues > 0 && (
            <Badge variant="error" size="xs" className="ml-1.5">
              {totalIssues}
            </Badge>
          )}
        </Button>
        <Button
          variant="tabUnderline"
          size="md"
          active={tab === 'transactions'}
          onClick={() => setTab('transactions')}
          className="text-xs px-3 py-1.5"
        >
          {intl.formatMessage({ id: 'nlb.transactions' })}
          <Badge variant="count" size="xs" className="ml-1.5">
            {count}
          </Badge>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
        {/* Currency filter */}
        {currencies.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/40">
              {intl.formatMessage({ id: 'nlb.currency-filter' })}
            </span>
            <Button
              variant="chip"
              size="xs"
              active={selectedCurrency === null}
              onClick={() => setSelectedCurrency(null)}
            >
              {intl.formatMessage({ id: 'nlb.currency-all' })}
            </Button>
            {currencies.map((c) => (
              <Button
                key={c}
                variant="chip"
                size="xs"
                active={selectedCurrency === c}
                onClick={() => setSelectedCurrency(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        )}

        {/* Summary stats */}
        <Card padding="md" className="flex flex-col gap-2">
          {statsByCcy.map(({ ccy, credits, debits, net, charges }) => (
            <div key={ccy} className="flex flex-wrap gap-x-6 gap-y-2">
              <StatCell
                label={intl.formatMessage({ id: 'nlb.credits' })}
                value={`+${fmtAmt(credits)} ${ccy}`}
              />
              <StatCell
                label={intl.formatMessage({ id: 'nlb.debits' })}
                value={`-${fmtAmt(debits)} ${ccy}`}
              />
              <StatCell
                label={intl.formatMessage({ id: 'nlb.net' })}
                value={`${net >= 0 ? '+' : ''}${fmtAmt(net)} ${ccy}`}
              />
              {charges > 0 && (
                <StatCell
                  label={intl.formatMessage({ id: 'nlb.charges' })}
                  value={`${fmtAmt(charges)} ${ccy}`}
                />
              )}
            </div>
          ))}
          <StatCell
            label={intl.formatMessage({ id: 'nlb.txns-label' })}
            value={String(count)}
            sub={
              pendingCount > 0
                ? intl.formatMessage(
                    { id: 'nlb.pending' },
                    { count: pendingCount },
                  )
                : undefined
            }
          />
        </Card>

        {tab === 'checks' && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                {intl.formatMessage({ id: 'nlb.data-checks' })}
              </span>
              {issues.length > 0
                ? issues.map((issue) => (
                    <IssueRow key={issue.messageId} issue={issue} />
                  ))
                : DATA_CHECKS.map((id) => (
                    <PassedRow key={id} messageId={id} />
                  ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                {intl.formatMessage({ id: 'nlb.xml-consistency' })}
              </span>
              {xmlIssues.length > 0
                ? xmlIssues.map((issue) => (
                    <IssueRow key={issue.messageId} issue={issue} />
                  ))
                : XML_CHECKS.map((id) => <PassedRow key={id} messageId={id} />)}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                {intl.formatMessage({ id: 'nlb.double-accounting' })}
              </span>
              {dblIssues.length > 0
                ? dblIssues.map((issue) => (
                    <IssueRow key={issue.messageId} issue={issue} />
                  ))
                : DBL_CHECKS.map((id) => <PassedRow key={id} messageId={id} />)}
            </div>
          </>
        )}

        {tab === 'transactions' && (
          <>
            {byMonth.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-white/50 font-medium">
                  {intl.formatMessage({ id: 'nlb.by-month' })}
                </span>
                <div className="grid gap-1">
                  {byMonth.map((m) => (
                    <div
                      key={m.key}
                      className="flex items-center gap-3 text-xs px-3 py-1.5 rounded bg-white/5"
                    >
                      <span className="text-white/60 w-20 shrink-0">
                        {monthLabel(m.key, intl.locale)}
                      </span>
                      <span className="text-green-400 font-mono w-24 text-right">
                        +{fmtAmt(m.credits)}
                        {ccy}
                      </span>
                      <span className="text-red-400 font-mono w-24 text-right">
                        -{fmtAmt(m.debits)}
                        {ccy}
                      </span>
                      {hasCharges && (
                        <span className="text-white/40 font-mono w-20 text-right">
                          {fmtAmt(m.charges)}{' '}
                          {intl.formatMessage({ id: 'nlb.fees' })}
                        </span>
                      )}
                      <span className="text-white/30 ml-auto">
                        {intl.formatMessage(
                          { id: 'nlb.txns-count' },
                          { count: m.count },
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/50 font-medium">
                {intl.formatMessage({ id: 'nlb.transactions' })}
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
                        +{fmtAmt(t.stroski)}{' '}
                        {intl.formatMessage({ id: 'nlb.fees' })}
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
                      <span className="text-yellow-400/70 shrink-0">
                        {intl.formatMessage({ id: 'nlb.pending-status' })}
                      </span>
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
  const intl = useIntl();
  const infoMd = intl.locale === 'sl' ? infoMdSl : infoMdEn;

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
  const [showInfo, setShowInfo] = useState(true);

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
      setShowInfo(false);
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
        <Card padding="sm" className="flex flex-col gap-2">
          <span className="text-xs text-white/50 font-medium">
            {intl.formatMessage({ id: 'nlb.account' })}
          </span>
          <Input
            type="text"
            variant="subtle"
            size="sm"
            placeholder={intl.formatMessage({ id: 'nlb.iban-placeholder' })}
            value={accountIban}
            onChange={(e) => {
              setAccountIban(e.target.value);
              localStorage.setItem(LS_IBAN, e.target.value);
            }}
          />
          <div className="flex flex-col gap-0.5">
            <Input
              type="text"
              variant="subtle"
              size="sm"
              placeholder={intl.formatMessage({ id: 'nlb.owner-placeholder' })}
              value={accountOwner}
              onChange={(e) => {
                setAccountOwner(e.target.value);
                localStorage.setItem(LS_OWNER, e.target.value);
              }}
            />
            <span className="text-xs text-white/30">
              {intl.formatMessage({ id: 'nlb.owner-hint' })}
            </span>
          </div>
        </Card>

        {/* Drop zone */}
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg px-4 py-5 cursor-pointer transition-colors ${dragging ? 'border-(--color-primary) bg-(--color-primary)/10' : 'border-white/20 hover:border-white/40'}`}
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
            {intl.formatMessage({ id: 'nlb.drop-title' })}
            <br />
            {intl.formatMessage({ id: 'nlb.drop-subtitle' })}
          </span>
        </button>

        {/* Multi-currency hint */}
        <p className="text-xs text-white/30 leading-relaxed">
          {intl.formatMessage({ id: 'nlb.multicurrency-hint' })}
        </p>

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
                    {f.currency} ·{' '}
                    {intl.formatMessage(
                      { id: 'nlb.txns-count' },
                      { count: f.transactions.length },
                    )}
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
              <span className="text-xs text-white/50 font-medium">
                {intl.formatMessage({ id: 'nlb.months' })}
              </span>
              <Button variant="link" size="xs" onClick={selectAll}>
                {intl.formatMessage({ id: 'nlb.all' })}
              </Button>
              <Button variant="linkMuted" size="xs" onClick={selectNone}>
                {intl.formatMessage({ id: 'nlb.none' })}
              </Button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {allMonths.map((key) => (
                <Button
                  key={key}
                  variant="toggleOutline"
                  size="md"
                  active={selectedMonths.has(key)}
                  onClick={() => toggleMonth(key)}
                  className="text-left justify-start"
                >
                  {monthLabel(key, intl.locale)}
                </Button>
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
                {intl.formatMessage({ id: 'nlb.upload-prompt' })}
              </span>
            ) : (
              <span className="text-sm">
                {intl.formatMessage({ id: 'nlb.months-prompt' })}
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
          <Button
            variant="icon"
            size="icon"
            onClick={() => setShowInfo((v) => !v)}
            title={intl.formatMessage({ id: 'nlb.about' })}
            className={showInfo ? 'bg-white/20 text-white' : ''}
          >
            <HelpCircle size={15} />
          </Button>
          <Button
            variant="icon"
            size="icon"
            onClick={() => setShowPreview((v) => !v)}
            disabled={!summary || showInfo}
            title={intl.formatMessage({ id: 'nlb.preview' })}
            className="relative"
          >
            <Eye size={15} className="text-white" />
            {summary && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] leading-none select-none">
                {hasIssues ? '⚠️' : '✅'}
              </span>
            )}
          </Button>
          <Button
            variant="iconPrimary"
            size="icon"
            onClick={download}
            disabled={!xml}
            title={intl.formatMessage({ id: 'nlb.download' })}
          >
            <Download size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
};
