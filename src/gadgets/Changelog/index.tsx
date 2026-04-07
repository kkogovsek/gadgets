import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import changelog from './changelog.json';

interface Commit {
  hash: string;
  date: string;
  subject: string;
  author: string;
  body: string | null;
}

const CHARS =
  'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF';
const FONT_SIZE = 42;
const CELL_SIZE = 70;
const ROW_SIZE = 110;

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let drops: number[] = [];
    let w = 0;
    let h = 0;

    const init = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.offsetWidth;
      h = parent.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      const cols = Math.floor(w / CELL_SIZE);
      drops = Array.from(
        { length: cols },
        () => Math.random() * -(h / ROW_SIZE),
      );
    };

    const tick = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FONT_SIZE}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * ROW_SIZE;
        if (y < 0) {
          drops[i] += 0.0625;
          continue;
        }
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillStyle = drops[i] % 1 < 0.55 ? '#9fffb4' : '#00ff41';
        ctx.fillText(char, i * CELL_SIZE, y);

        if (y > h && Math.random() > 0.975) {
          drops[i] = Math.random() * -(h / ROW_SIZE / 2);
        }
        drops[i] += 0.0625;
      }

      animId = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(init);
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);
    init();
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.13,
        pointerEvents: 'none',
      }}
    />
  );
};

export const Changelog = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  const commits = changelog as Commit[];
  const [expandedHash, setExpandedHash] = useState<string | null>(null);

  const toggle = (hash: string, hasBody: boolean) => {
    if (!hasBody) return;
    setExpandedHash((prev) => (prev === hash ? null : hash));
  };

  return (
    <div className="changelog-ui relative flex flex-col h-full overflow-hidden">
      <MatrixRain />

      <div className="relative z-10 flex flex-col h-full">
        {/* Terminal header */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <pre
            className="text-xs leading-tight mb-3 select-none"
            style={{ color: '#00ff41' }}
          >{`  ██████╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗ ███████╗██╗      ██████╗  ██████╗
 ██╔════╝██║  ██║██╔══██╗████╗  ██║██╔════╝ ██╔════╝██║     ██╔═══██╗██╔════╝
 ██║     ███████║███████║██╔██╗ ██║██║  ███╗█████╗  ██║     ██║   ██║██║  ███╗
 ██║     ██╔══██║██╔══██║██║╚██╗██║██║   ██║██╔══╝  ██║     ██║   ██║██║   ██║
 ╚██████╗██║  ██║██║  ██║██║ ╚████║╚██████╔╝███████╗███████╗╚██████╔╝╚██████╔╝
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝ ╚═════╝  ╚═════╝`}</pre>
          <div className="flex items-center gap-2 text-sm font-mono">
            <span style={{ color: '#00ff41' }}>$</span>
            <span style={{ color: '#9fffb4' }}>git log --no-merges</span>
            <span
              className="inline-block w-2 h-4 align-middle animate-pulse"
              style={{ background: '#00ff41' }}
            />
          </div>
          <div className="mt-1 text-xs font-mono" style={{ color: '#008f11' }}>
            {t('changelog.commit-count', { count: commits.length })}
          </div>
        </div>

        {/* Commit list */}
        <div className="flex-1 overflow-auto px-5 py-3 font-mono text-sm">
          {commits.map((commit) => {
            const isExpanded = expandedHash === commit.hash;
            const hasBody = Boolean(commit.body);

            return (
              <div key={commit.hash}>
                <button
                  type="button"
                  disabled={!hasBody}
                  className={[
                    'w-full flex items-center gap-3 py-0.5 px-1 rounded transition-colors text-left',
                    hasBody
                      ? 'cursor-pointer hover:bg-white/5'
                      : 'cursor-default',
                    isExpanded ? 'bg-white/5' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => toggle(commit.hash, hasBody)}
                >
                  <span
                    className="shrink-0 w-3 text-xs select-none"
                    style={{ color: hasBody ? '#008f11' : 'transparent' }}
                  >
                    {isExpanded ? '−' : '+'}
                  </span>
                  <span className="shrink-0 w-16" style={{ color: '#ffe600' }}>
                    {commit.hash}
                  </span>
                  <span className="shrink-0 w-24" style={{ color: '#00b3cc' }}>
                    {commit.date}
                  </span>
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{ color: '#00ff41' }}
                  >
                    {commit.subject}
                  </span>
                  <span
                    className="shrink-0 hidden md:block text-right w-36 truncate"
                    style={{ color: '#008f11' }}
                  >
                    {commit.author}
                  </span>
                </button>

                {isExpanded && commit.body && (
                  <div
                    className="my-1 px-4 py-3 text-xs"
                    style={{
                      marginLeft: '1.25rem',
                      borderLeft: '2px solid #008f11',
                      background: 'rgba(0,255,65,0.04)',
                      color: '#9fffb4',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {commit.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status bar */}
        <div
          className="px-5 py-2 border-t border-white/10 text-xs font-mono flex gap-4"
          style={{ color: '#008f11' }}
        >
          <span style={{ color: '#ffe600' }}>▓</span>
          <span>{t('changelog.status-hash')}</span>
          <span style={{ color: '#00b3cc' }}>▓</span>
          <span>{t('changelog.status-date')}</span>
          <span style={{ color: '#00ff41' }}>▓</span>
          <span>{t('changelog.status-subject')}</span>
          <span className="hidden md:inline" style={{ color: '#008f11' }}>
            ▓
          </span>
          <span className="hidden md:inline">
            {t('changelog.status-author')}
          </span>
        </div>
      </div>
    </div>
  );
};
