import { BookOpen, FilePlus, HelpCircle, Save, Trash2 } from 'lucide-react';
import * as ohm from 'ohm-js';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../components/ui/button';

// ── Constants ─────────────────────────────────────────────────────────────────

const LINE_HEIGHT = 22;
const SHEET_PADDING = 16;

const BUILTIN_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
  sqrt2: Math.SQRT2,
  ln2: Math.LN2,
  ln10: Math.LN10,
  log2e: Math.LOG2E,
  log10e: Math.LOG10E,
  inf: Infinity,
};

const BUILTIN_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  // single-arg
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  trunc: (x) => Math.trunc(x),
  sign: (x) => Math.sign(x),
  exp: (x) => Math.exp(x),
  log: (x) => Math.log(x),
  ln: (x) => Math.log(x),
  log2: (x) => Math.log2(x),
  log10: (x) => Math.log10(x),
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  // multi-arg
  root: (n, x) => x ** (1 / n),
  pow: (base, exp) => base ** exp,
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
  hypot: (a, b) => Math.hypot(a, b),
  atan2: (y, x) => Math.atan2(y, x),
  clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
  gcd: (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      [a, b] = [b, a % b];
    }
    return a;
  },
};

const DEFAULT_CONTENT = `// Simple arithmetic
a = 1
b = 4
c = a + b

// Circle area
r = 8
pi = 3.14
d = pi * r^2`;

// ── Grammar ───────────────────────────────────────────────────────────────────

const grammar = ohm.grammar(`
  Math {
    Expr = AddExpr

    AddExpr
      = AddExpr "+" MulExpr  -- plus
      | AddExpr "-" MulExpr  -- minus
      | MulExpr

    MulExpr
      = MulExpr "*" PowExpr  -- times
      | MulExpr "/" PowExpr  -- divide
      | MulExpr "%" PowExpr  -- mod
      | PowExpr

    PowExpr
      = UnaryExpr "^" PowExpr  -- power
      | UnaryExpr

    UnaryExpr
      = "-" PriExpr  -- neg
      | PriExpr

    PriExpr
      = "(" Expr ")"                      -- paren
      | ident "(" Expr ("," Expr)* ")"    -- callN
      | ident "(" ")"                     -- call0
      | number
      | ident

    number
      = digit* "." digit+  -- float
      | digit+             -- int

    ident = letter (alnum | "_")*
  }
`);

// Mutable env — safe since JS is single-threaded
let _evalEnv: Record<string, number> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sem = grammar.createSemantics() as any;
sem.addOperation('eval', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Expr(e: any) {
    return e.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AddExpr_plus(a: any, _op: any, b: any) {
    return a.eval() + b.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AddExpr_minus(a: any, _op: any, b: any) {
    return a.eval() - b.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MulExpr_times(a: any, _op: any, b: any) {
    return a.eval() * b.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MulExpr_divide(a: any, _op: any, b: any) {
    return a.eval() / b.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MulExpr_mod(a: any, _op: any, b: any) {
    return a.eval() % b.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PowExpr_power(a: any, _op: any, b: any) {
    return a.eval() ** b.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  UnaryExpr_neg(_op: any, e: any) {
    return -e.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PriExpr_paren(_l: any, e: any, _r: any) {
    return e.eval();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PriExpr_call0(name: any, _lp: any, _rp: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnName = (name as any).sourceString as string;
    const fn = BUILTIN_FUNCTIONS[fnName];
    if (!fn) throw new Error(`Unknown function: ${fnName}`);
    return fn();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PriExpr_callN(
    name: any,
    _lp: any,
    first: any,
    _commas: any,
    rest: any,
    _rp: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnName = (name as any).sourceString as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = [first.eval(), ...rest.children.map((c: any) => c.eval())];
    const fn = BUILTIN_FUNCTIONS[fnName];
    if (!fn) throw new Error(`Unknown function: ${fnName}`);
    return fn(...args);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  number_float(_i: any, _d: any, _f: any) {
    return parseFloat(this.sourceString);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  number_int(_d: any) {
    return parseInt(this.sourceString, 10);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ident(_f: any, _r: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (this as any).sourceString as string;
    if (name in _evalEnv) return _evalEnv[name];
    if (name in BUILTIN_CONSTANTS) return BUILTIN_CONSTANTS[name];
    throw new Error(`Undefined: ${name}`);
  },
});

function evaluate(expr: string, env: Record<string, number>): number {
  _evalEnv = env;
  const m = grammar.match(expr.trim());
  if (m.failed()) throw new Error('Parse error');
  return sem(m).eval() as number;
}

// ── Number formatting ─────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  // Up to 10 significant figures, strip trailing zeros
  return parseFloat(n.toPrecision(10)).toString();
}

// ── Sheet evaluator ───────────────────────────────────────────────────────────

type LineResult =
  | { kind: 'value'; text: string }
  | { kind: 'error' }
  | { kind: 'empty' };

const ASSIGN_RE = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/;
const ALIAS_RE = /^@alias\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+"([^"]+)"\s*$/;

function parseAliases(content: string): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const m = line.trim().match(ALIAS_RE);
    if (m) aliases[m[1]] = m[2];
  }
  return aliases;
}

// ── Syntax highlighting ───────────────────────────────────────────────────────

const HIGHLIGHT_BUILTINS = new Set([
  ...Object.keys(BUILTIN_CONSTANTS),
  ...Object.keys(BUILTIN_FUNCTIONS),
]);

type TokenKind =
  | 'comment'
  | 'number'
  | 'builtin'
  | 'vardef'
  | 'ident'
  | 'op'
  | 'space'
  | 'directive';

interface Token {
  kind: TokenKind;
  text: string;
}

const TOKEN_STYLES: Record<TokenKind, CSSProperties> = {
  comment: { color: 'rgba(0,0,0,0.32)', fontStyle: 'italic' },
  number: { color: '#b85800' },
  builtin: { color: '#7c3aed' },
  vardef: { color: '#1d4ed8' },
  ident: { color: '#0f766e' },
  op: { color: 'rgba(0,0,0,0.4)' },
  space: {},
  directive: { color: '#0369a1', fontStyle: 'italic' },
};

function tokenizeLine(line: string): Token[] {
  if (line.trim().startsWith('@')) return [{ kind: 'directive', text: line }];

  const tokens: Token[] = [];
  const commentIdx = line.indexOf('//');
  const code = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const comment = commentIdx >= 0 ? line.slice(commentIdx) : null;

  const assignMatch = code.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
  const lhsName = assignMatch ? assignMatch[1] : null;
  let lhsConsumed = false;

  let pos = 0;
  while (pos < code.length) {
    const ch = code[pos];

    if (/\s/.test(ch)) {
      let end = pos + 1;
      while (end < code.length && /\s/.test(code[end])) end++;
      tokens.push({ kind: 'space', text: code.slice(pos, end) });
      pos = end;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let end = pos + 1;
      while (end < code.length && /[a-zA-Z0-9_]/.test(code[end])) end++;
      const name = code.slice(pos, end);
      if (!lhsConsumed && name === lhsName && /^\s*=/.test(code.slice(end))) {
        tokens.push({ kind: 'vardef', text: name });
        lhsConsumed = true;
      } else if (HIGHLIGHT_BUILTINS.has(name)) {
        tokens.push({ kind: 'builtin', text: name });
      } else {
        tokens.push({ kind: 'ident', text: name });
      }
      pos = end;
      continue;
    }

    if (/\d/.test(ch)) {
      let end = pos + 1;
      while (end < code.length && /\d/.test(code[end])) end++;
      if (end < code.length && code[end] === '.') {
        end++;
        while (end < code.length && /\d/.test(code[end])) end++;
      }
      tokens.push({ kind: 'number', text: code.slice(pos, end) });
      pos = end;
      continue;
    }

    tokens.push({ kind: 'op', text: ch });
    pos++;
  }

  if (comment !== null) tokens.push({ kind: 'comment', text: comment });
  return tokens;
}

function findFreeVariables(content: string): string[] {
  const defined = new Set<string>(Object.keys(BUILTIN_CONSTANTS));
  const referenced = new Set<string>();

  for (const line of content.split('\n')) {
    const raw = line.replace(/\/\/.*$/, '').trim();
    if (!raw || raw.startsWith('@')) continue;

    const m = raw.match(ASSIGN_RE);
    if (m) {
      const [, name, exprStr] = m;
      defined.add(name);
      for (const ident of exprStr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []) {
        referenced.add(ident);
      }
    } else {
      for (const ident of raw.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []) {
        referenced.add(ident);
      }
    }
  }

  return [...referenced].filter((v) => !defined.has(v));
}

function evaluateSheet(
  content: string,
  freeVarValues: Record<string, string>,
): LineResult[] {
  const env: Record<string, number> = {};
  for (const [name, val] of Object.entries(freeVarValues)) {
    const n = parseFloat(val);
    if (!Number.isNaN(n)) env[name] = n;
  }
  return content.split('\n').map((line) => {
    const raw = line.replace(/\/\/.*$/, '').trim();
    if (!raw || raw.startsWith('@')) return { kind: 'empty' };

    const m = raw.match(ASSIGN_RE);
    if (m) {
      const [, name, exprStr] = m;
      try {
        const val = evaluate(exprStr, env);
        env[name] = val;
        return { kind: 'value', text: formatNum(val) };
      } catch {
        return { kind: 'error' };
      }
    }

    try {
      const val = evaluate(raw, env);
      return { kind: 'value', text: formatNum(val) };
    } catch {
      return { kind: 'empty' };
    }
  });
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────

interface SheetRecord {
  id?: number;
  name: string;
  content: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gadgets-math-sheet', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('sheets', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbSave(sheet: Omit<SheetRecord, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('sheets', 'readwrite')
      .objectStore('sheets')
      .add(sheet);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

async function dbLoadAll(): Promise<SheetRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('sheets', 'readonly')
      .objectStore('sheets')
      .getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('sheets', 'readwrite')
      .objectStore('sheets')
      .delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export const MathSheet = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  const [view, setView] = useState<'editor' | 'sheets' | 'help'>('editor');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [sheetName, setSheetName] = useState('');
  const [sheets, setSheets] = useState<SheetRecord[]>([]);
  const [sheetsLoaded, setSheetsLoaded] = useState(false);
  const [freeVarValues, setFreeVarValues] = useState<Record<string, string>>(
    {},
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const overlayInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dbLoadAll()
      .then((all) => {
        const sorted = [...all].reverse();
        setSheets(sorted);
        setSheetsLoaded(true);
        if (sorted.length > 0) setView('sheets');
      })
      .catch(() => setSheetsLoaded(true));
  }, []);

  const lines = content.split('\n');
  const freeVars = findFreeVariables(content);
  const aliases = parseAliases(content);
  const results = evaluateSheet(content, freeVarValues);
  const lineCount = Math.max(lines.length, 20);

  const handleSave = async () => {
    const name = sheetName.trim() || t('math.untitled');
    const record: Omit<SheetRecord, 'id'> = {
      name,
      content,
      createdAt: Date.now(),
    };
    const id = await dbSave(record);
    setSheets((prev) => [{ ...record, id }, ...prev]);
    setView('sheets');
  };

  const handleLoad = (sheet: SheetRecord) => {
    setContent(sheet.content);
    setSheetName(sheet.name);
    setFreeVarValues({});
    setView('editor');
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbDelete(id);
    setSheets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleNew = () => {
    setContent(DEFAULT_CONTENT);
    setSheetName('');
    setView('editor');
  };

  // Sync overlay + results scroll to textarea scroll
  const onTextareaScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (overlayInnerRef.current) {
      overlayInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px) translateX(${-ta.scrollLeft}px)`;
    }
    if (resultsRef.current) resultsRef.current.scrollTop = ta.scrollTop;
  };

  return (
    <div className="math-sheet-ui flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <h2 className="math-title">{t('math.title')}</h2>
        <div className="flex gap-1 ml-auto">
          <Button
            variant="tab"
            size="md"
            active={view === 'editor'}
            onClick={() => setView('editor')}
          >
            {t('math.view.editor')}
          </Button>
          <Button
            variant="tab"
            size="md"
            active={view === 'sheets'}
            onClick={() => setView('sheets')}
          >
            {`${t('math.view.sheets')}${sheets.length ? ` (${sheets.length})` : ''}`}
          </Button>
          <Button
            variant="tab"
            size="md"
            active={view === 'help'}
            onClick={() => setView('help')}
          >
            <HelpCircle size={13} className="mr-1" />
            {t('math.view.help')}
          </Button>
        </div>
      </div>

      {view === 'editor' ? (
        <>
          {/* Sheet name + save */}
          <div className="flex gap-2 items-center shrink-0">
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder={t('math.sheet-name-placeholder')}
              className="math-name-input flex-1"
            />
            <Button variant="primary" size="sm" onClick={handleSave}>
              <Save size={13} className="mr-1" />
              {t('math.save')}
            </Button>
          </div>

          {/* Sheet paper */}
          <div className="math-sheet-paper flex-1 min-h-0 flex overflow-hidden">
            {/* Line numbers */}
            <div
              className="math-line-numbers"
              style={{
                paddingTop: SHEET_PADDING,
                lineHeight: `${LINE_HEIGHT}px`,
              }}
              aria-hidden="true"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{ height: LINE_HEIGHT }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editor: highlight overlay + textarea */}
            <div className="relative flex-1 overflow-hidden">
              {/* Syntax highlight overlay */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                aria-hidden
              >
                <div
                  ref={overlayInnerRef}
                  style={{
                    paddingTop: SHEET_PADDING,
                    paddingBottom: SHEET_PADDING,
                    paddingLeft: 16,
                    paddingRight: 8,
                    lineHeight: `${LINE_HEIGHT}px`,
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: 14,
                    whiteSpace: 'pre',
                    minWidth: 'max-content',
                  }}
                >
                  {lines.map((line, i) => (
                    <div key={i} style={{ height: LINE_HEIGHT }}>
                      {tokenizeLine(line).map((tok, j) => (
                        <span key={j} style={TOKEN_STYLES[tok.kind]}>
                          {tok.text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {/* Textarea — transparent text so highlight shows through */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={onTextareaScroll}
                spellCheck={false}
                className="math-textarea absolute inset-0"
                style={{
                  lineHeight: `${LINE_HEIGHT}px`,
                  paddingTop: SHEET_PADDING,
                  paddingBottom: SHEET_PADDING,
                  color: 'transparent',
                  caretColor: '#1a1a1a',
                }}
              />
            </div>

            {/* Results column */}
            <div className="math-results-col">
              <div
                ref={resultsRef}
                className="math-results"
                style={{
                  paddingTop: SHEET_PADDING,
                  lineHeight: `${LINE_HEIGHT}px`,
                }}
              >
                {results.map((r, i) => (
                  <div
                    key={i}
                    style={{ height: LINE_HEIGHT }}
                    className="math-result-line"
                  >
                    {r.kind === 'value' && (
                      <span className="math-result-value">= {r.text}</span>
                    )}
                    {r.kind === 'error' && (
                      <span className="math-result-error">?</span>
                    )}
                  </div>
                ))}
                {Array.from(
                  { length: Math.max(0, lineCount - results.length) },
                  (_, i) => (
                    <div key={`pad-${i}`} style={{ height: LINE_HEIGHT }} />
                  ),
                )}
              </div>
              {freeVars.length > 0 && (
                <div className="math-free-vars">
                  <span className="math-free-vars-heading">
                    {t('math.free-vars')}
                  </span>
                  {freeVars.map((name) => (
                    <div key={name} className="math-free-var-row">
                      <span className="math-free-var-name" title={name}>
                        {aliases[name] ?? name}
                      </span>
                      <input
                        className="math-free-var-input"
                        type="text"
                        value={freeVarValues[name] ?? ''}
                        onChange={(e) =>
                          setFreeVarValues((prev) => ({
                            ...prev,
                            [name]: e.target.value,
                          }))
                        }
                        placeholder="?"
                        aria-label={name}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : view === 'help' ? (
        <MathHelp t={t} />
      ) : sheetsLoaded && sheets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <BookOpen
            size={40}
            className="opacity-20"
            style={{ color: 'currentColor' }}
          />
          <p className="math-empty-text">{t('math.no-sheets')}</p>
          <Button variant="link" size="sm" onClick={handleNew}>
            {t('math.new-sheet')} →
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-2">
            {sheets.map((sheet) => (
              <SheetItem
                key={sheet.id}
                sheet={sheet}
                onLoad={handleLoad}
                onDelete={(e) => handleDelete(sheet.id as number, e)}
              />
            ))}
            <button
              type="button"
              onClick={handleNew}
              className="math-new-sheet-btn flex items-center gap-2 p-3"
            >
              <FilePlus size={15} />
              {t('math.new-sheet')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Help panel ────────────────────────────────────────────────────────────────

const HELP_SECTIONS = [
  {
    key: 'arithmetic',
    example: `2 + 3\n10 - 4\n6 * 7\n10 / 3\n2 ^ 8\n17 % 5    // remainder = 2\n-5`,
  },
  {
    key: 'variables',
    example: `width = 12\nheight = 8\narea = width * height`,
  },
  {
    key: 'comments',
    example: `// this whole line is ignored\nspeed = 100  // km/h`,
  },
  {
    key: 'parens',
    example: `(2 + 3) * 4\n1 / (1 + r) ^ n`,
  },
  {
    key: 'functions',
    example: `sqrt(25)        // 5\ncbrt(27)        // 3\nabs(-9)         // 9\nround(3.6)      // 4\nfloor(3.9)      // 3\nceil(3.1)       // 4\ntrunc(-3.7)     // -3\nsign(-5)        // -1\nexp(1)          // e\nlog(e)          // 1  (natural log)\nln(e)           // 1  (alias for log)\nlog2(8)         // 3\nlog10(100)      // 2`,
  },
  {
    key: 'trig',
    example: `sin(pi / 2)     // 1\ncos(0)          // 1\ntan(pi / 4)     // 1\nasin(1)         // pi/2\nacos(1)         // 0\natan(1)         // pi/4\nsinh(1)\ncosh(1)\ntanh(1)`,
  },
  {
    key: 'funcN',
    example: `root(3, 27)     // cube root → 3\npow(2, 10)      // 1024\nmin(3, 7)       // 3\nmax(3, 7)       // 7\nhypot(3, 4)     // 5\natan2(1, 0)     // pi/2\nclamp(15, 0, 10)// 10\ngcd(12, 8)      // 4`,
  },
  {
    key: 'constants',
    example: `pi      // 3.14159265…\ne       // 2.71828182…\ntau     // 6.28318530…\nphi     // 1.61803398…\nsqrt2   // 1.41421356…\nln2     // 0.69314718…\nln10    // 2.30258509…\nlog2e   // 1.44269504…\nlog10e  // 0.43429448…\ninf     // Infinity`,
  },
  {
    key: 'aliases',
    example: `@alias r "Radius (m)"\n@alias v0 "Initial velocity"\nr = 5\nv0 = 12`,
  },
  {
    key: 'saving',
    example: null,
  },
] as const;

function MathHelp({ t }: { t: (id: string) => string }) {
  return (
    <div className="math-sheet-paper flex-1 min-h-0 overflow-auto">
      <div
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          fontFamily: 'Georgia, serif',
          color: '#1a1a1a',
        }}
      >
        {HELP_SECTIONS.map(({ key, example }) => (
          <div key={key}>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 3,
              }}
            >
              {t(`math.help.${key}`)}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(0,0,0,0.55)',
                marginBottom: example ? 6 : 0,
                lineHeight: '1.5',
              }}
            >
              {t(`math.help.${key}.desc`)}
            </div>
            {example && (
              <pre
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: 12,
                  background: 'rgba(0,0,0,0.04)',
                  padding: '7px 12px',
                  color: '#1a1a1a',
                  margin: 0,
                  borderLeft: '2px solid rgba(0,0,0,0.1)',
                  lineHeight: '18px',
                  whiteSpace: 'pre',
                }}
              >
                {example}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sheet list item ───────────────────────────────────────────────────────────

function SheetItem({
  sheet,
  onLoad,
  onDelete,
}: {
  sheet: SheetRecord;
  onLoad: (s: SheetRecord) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  const preview = sheet.content
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('//'))
    .slice(0, 3)
    .join('  ·  ');

  const date = new Date(sheet.createdAt).toLocaleDateString();

  return (
    <button
      type="button"
      className="math-sheet-item group flex flex-col gap-1 p-3 w-full text-left"
      onClick={() => onLoad(sheet)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="math-sheet-item-name">{sheet.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="math-sheet-item-date opacity-0 group-hover:opacity-100 transition-opacity">
            {date}
          </span>
          <Button
            variant="danger"
            size="iconSm"
            onClick={onDelete}
            aria-label={t('math.delete')}
            title={t('math.delete')}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>
      {preview && <span className="math-sheet-item-preview">{preview}</span>}
    </button>
  );
}
