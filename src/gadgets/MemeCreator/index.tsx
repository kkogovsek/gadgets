import {
  Download,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

// ── Types ─────────────────────────────────────────────────────────────────────

type Layout = '1x1' | '2x2';

interface TextBox {
  id: string;
  text: string;
  x: number; // 0–100 percent within cell
  y: number; // 0–100 percent within cell
  fontSize: number;
}

interface MemeCell {
  id: string;
  type: 'empty' | 'image' | 'text';
  imageUrl?: string;
  textBoxes: TextBox[];
  plainText: string;
  fontSize: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLS: Record<Layout, number> = { '1x1': 1, '2x2': 2 };
const COUNT: Record<Layout, number> = { '1x1': 1, '2x2': 4 };
const LAYOUTS: Layout[] = ['1x1', '2x2'];

const uid = () => Math.random().toString(36).slice(2, 9);

const makeCell = (): MemeCell => ({
  id: uid(),
  type: 'empty',
  textBoxes: [],
  plainText: 'YOUR TEXT HERE',
  fontSize: 72,
});

// ── Canvas export helpers ──────────────────────────────────────────────────────

function drawMemeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
) {
  const upper = text.toUpperCase();
  ctx.save();
  ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(size / 5, 3);
  ctx.strokeStyle = '#000000';
  ctx.strokeText(upper, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(upper, x, y);
  ctx.restore();
}

// ── Cell component ─────────────────────────────────────────────────────────────

interface CellProps {
  cell: MemeCell;
  dragOver: boolean;
  cellRef: (el: HTMLDivElement | null) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileDrop: (f: File) => void;
  onSetText: () => void;
  onUpdate: (patch: Partial<MemeCell>) => void;
  onAddTextBox: () => void;
  onRemoveTextBox: (id: string) => void;
  onUpdateTextBox: (id: string, patch: Partial<TextBox>) => void;
  onStartTextBoxDrag: (id: string, e: React.MouseEvent) => void;
  t: (id: string) => string;
}

function CellView({
  cell,
  dragOver,
  cellRef,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileDrop,
  onSetText,
  onUpdate,
  onAddTextBox,
  onRemoveTextBox,
  onUpdateTextBox,
  onStartTextBoxDrag,
  t,
}: CellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) onFileDrop(file);
    } else {
      onDrop(e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);
  };

  const sharedDragProps = {
    onDragOver: handleDragOver,
    onDragLeave,
    onDrop: handleDrop,
  };

  const ringClass = dragOver ? 'ring-2 ring-pink-400' : '';

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (cell.type === 'empty') {
    return (
      <div
        ref={cellRef}
        draggable
        onDragStart={onDragStart}
        {...sharedDragProps}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20 transition-all cursor-grab ${dragOver ? 'border-pink-400 bg-pink-500/10' : 'hover:border-white/40'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileDrop(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        >
          <ImageIcon size={26} />
          <span className="text-xs font-bold">{t('meme.add-image')}</span>
        </button>
        <button
          type="button"
          onClick={onSetText}
          className="flex flex-col items-center gap-2 px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        >
          <Type size={26} />
          <span className="text-xs font-bold">{t('meme.add-text')}</span>
        </button>
        <p className="text-white/25 text-xs">{t('meme.drop-image')}</p>
      </div>
    );
  }

  // ── Text ───────────────────────────────────────────────────────────────────
  if (cell.type === 'text') {
    return (
      <div
        ref={cellRef}
        draggable
        onDragStart={onDragStart}
        {...sharedDragProps}
        className={`relative flex items-center justify-center rounded-xl bg-white overflow-hidden group cursor-grab ${ringClass}`}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-70 transition-opacity cursor-grab text-black/40">
          <GripVertical size={16} />
        </div>
        {/* Clear */}
        <button
          type="button"
          onClick={() => onUpdate({ type: 'empty' })}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-black hover:text-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <X size={12} />
        </button>
        <div
          role="textbox"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) =>
            onUpdate({ plainText: e.currentTarget.textContent ?? '' })
          }
          onKeyDown={(e) => {
            if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
              e.preventDefault();
              onUpdate({ fontSize: Math.min(200, cell.fontSize + 4) });
            } else if (e.ctrlKey && e.key === '-') {
              e.preventDefault();
              onUpdate({ fontSize: Math.max(16, cell.fontSize - 4) });
            }
          }}
          className="w-full h-full flex items-center justify-center outline-none p-4 text-center"
          style={{
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontWeight: 900,
            fontSize: `${cell.fontSize}px`,
            color: '#ffffff',
            textShadow:
              '-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000,' +
              '-4px 0 0 #000, 4px 0 0 #000, 0 -4px 0 #000, 0 4px 0 #000',
            textTransform: 'uppercase',
            lineHeight: 1.1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            cursor: 'text',
          }}
          spellCheck={false}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          {cell.plainText}
        </div>
      </div>
    );
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={cellRef}
      draggable
      onDragStart={onDragStart}
      {...sharedDragProps}
      className={`relative rounded-xl bg-black overflow-hidden group cursor-grab ${ringClass}`}
    >
      {/* Base image */}
      <img
        src={cell.imageUrl}
        alt=""
        draggable={false}
        className="w-full h-full object-cover select-none"
      />

      {/* Drag handle */}
      <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-80 transition-opacity text-white drop-shadow-md cursor-grab">
        <GripVertical size={16} />
      </div>

      {/* Clear */}
      <button
        type="button"
        onClick={() =>
          onUpdate({ type: 'empty', imageUrl: undefined, textBoxes: [] })
        }
        className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={14} />
      </button>

      {/* Add text box */}
      <button
        type="button"
        onClick={onAddTextBox}
        title={t('meme.add-text-box')}
        className="absolute bottom-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-pink-500 text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        <Plus size={14} />
      </button>

      {/* Text overlays */}
      {cell.textBoxes.map((tb) => (
        <div
          key={tb.id}
          className="absolute z-10 group/tb"
          style={{
            left: `${tb.x}%`,
            top: `${tb.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: 'move',
          }}
          onDragStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'BUTTON') return;
            onStartTextBoxDrag(tb.id, e);
          }}
        >
          {editingBoxId === tb.id ? (
            <div
              role="presentation"
              className="flex flex-col items-center gap-1.5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={tb.text}
                onChange={(e) =>
                  onUpdateTextBox(tb.id, { text: e.target.value })
                }
                onBlur={() => setEditingBoxId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingBoxId(null);
                  if (e.key === 'Escape') setEditingBoxId(null);
                }}
                className="text-center bg-black/80 text-white rounded px-2 py-0.5 border border-white/40 outline-none"
                style={{
                  fontFamily: 'Impact, "Arial Black", sans-serif',
                  fontWeight: 900,
                  fontSize: `${tb.fontSize}px`,
                  minWidth: '80px',
                  maxWidth: '260px',
                  textTransform: 'uppercase',
                }}
                spellCheck={false}
              />
              <div className="flex items-center gap-2 bg-black/70 rounded px-2 py-1">
                <span className="text-white/50 text-xs">size</span>
                <input
                  type="range"
                  min={14}
                  max={80}
                  value={tb.fontSize}
                  onChange={(e) =>
                    onUpdateTextBox(tb.id, { fontSize: Number(e.target.value) })
                  }
                  className="w-20 accent-pink-500"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="relative"
              onDoubleClick={() => setEditingBoxId(tb.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingBoxId(tb.id);
              }}
            >
              <span
                className="select-none whitespace-nowrap block"
                style={{
                  fontFamily: 'Impact, "Arial Black", sans-serif',
                  fontWeight: 900,
                  fontSize: `${tb.fontSize}px`,
                  color: '#ffffff',
                  textShadow: [
                    `-${Math.ceil(tb.fontSize / 7)}px -${Math.ceil(tb.fontSize / 7)}px 0 #000`,
                    `${Math.ceil(tb.fontSize / 7)}px -${Math.ceil(tb.fontSize / 7)}px 0 #000`,
                    `-${Math.ceil(tb.fontSize / 7)}px ${Math.ceil(tb.fontSize / 7)}px 0 #000`,
                    `${Math.ceil(tb.fontSize / 7)}px ${Math.ceil(tb.fontSize / 7)}px 0 #000`,
                    `0 ${Math.ceil(tb.fontSize / 7)}px 0 #000`,
                    `0 -${Math.ceil(tb.fontSize / 7)}px 0 #000`,
                    `${Math.ceil(tb.fontSize / 7)}px 0 0 #000`,
                    `-${Math.ceil(tb.fontSize / 7)}px 0 0 #000`,
                  ].join(', '),
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                {tb.text || '＋'}
              </span>
              {/* Delete text box */}
              <button
                type="button"
                onClick={() => onRemoveTextBox(tb.id)}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white opacity-0 group-hover/tb:opacity-100 transition-opacity"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Trash2 size={10} />
              </button>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main gadget ───────────────────────────────────────────────────────────────

export const MemeCreator = () => {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });

  const [layout, setLayout] = useState<Layout>('1x1');
  const [cells, setCells] = useState<MemeCell[]>([makeCell()]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Layout switching ──────────────────────────────────────────────────────

  const changeLayout = (l: Layout) => {
    const n = COUNT[l];
    setCells((prev) => {
      if (prev.length === n) return prev;
      if (prev.length > n) return prev.slice(0, n);
      return [...prev, ...Array.from({ length: n - prev.length }, makeCell)];
    });
    setLayout(l);
  };

  // ── Cell helpers ──────────────────────────────────────────────────────────

  const updateCell = (id: string, patch: Partial<MemeCell>) =>
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const handleFileDrop = (cellId: string, file: File) => {
    const url = URL.createObjectURL(file);
    updateCell(cellId, {
      type: 'image',
      imageUrl: url,
      textBoxes: [
        { id: uid(), text: 'TOP TEXT', x: 50, y: 9, fontSize: 38 },
        { id: uid(), text: 'BOTTOM TEXT', x: 50, y: 91, fontSize: 38 },
      ],
    });
  };

  const addTextBox = (cellId: string) =>
    setCells((prev) =>
      prev.map((c) =>
        c.id !== cellId
          ? c
          : {
              ...c,
              textBoxes: [
                ...c.textBoxes,
                { id: uid(), text: 'MORE TEXT', x: 50, y: 50, fontSize: 32 },
              ],
            },
      ),
    );

  const removeTextBox = (cellId: string, boxId: string) =>
    setCells((prev) =>
      prev.map((c) =>
        c.id !== cellId
          ? c
          : { ...c, textBoxes: c.textBoxes.filter((tb) => tb.id !== boxId) },
      ),
    );

  const updateTextBox = (
    cellId: string,
    boxId: string,
    patch: Partial<TextBox>,
  ) =>
    setCells((prev) =>
      prev.map((c) =>
        c.id !== cellId
          ? c
          : {
              ...c,
              textBoxes: c.textBoxes.map((tb) =>
                tb.id === boxId ? { ...tb, ...patch } : tb,
              ),
            },
      ),
    );

  // ── Text box drag (mouse-based, within the image cell) ────────────────────

  const startTextBoxDrag = (
    cellId: string,
    boxId: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const cellEl = cellRefs.current[cellId];
    if (!cellEl) return;

    const onMove = (ev: MouseEvent) => {
      const rect = cellEl.getBoundingClientRect();
      const x = Math.max(
        2,
        Math.min(98, ((ev.clientX - rect.left) / rect.width) * 100),
      );
      const y = Math.max(
        2,
        Math.min(98, ((ev.clientY - rect.top) / rect.height) * 100),
      );
      updateTextBox(cellId, boxId, { x, y });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Cell reorder (HTML5 DnD) ──────────────────────────────────────────────

  const onCellDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragSrcId(id);
  };

  const onCellDrop = (e: React.DragEvent, targetId: string) => {
    if (e.dataTransfer.files.length > 0) return; // handled by CellView
    if (!dragSrcId || dragSrcId === targetId) return;
    setCells((prev) => {
      const arr = [...prev];
      const si = arr.findIndex((c) => c.id === dragSrcId);
      const di = arr.findIndex((c) => c.id === targetId);
      if (si < 0 || di < 0) return prev;
      [arr[si], arr[di]] = [arr[di], arr[si]];
      return arr;
    });
    setDragSrcId(null);
    setDragOverId(null);
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const download = async () => {
    const cols = COLS[layout];
    const rows = Math.ceil(cells.length / cols);
    const CW = 600;
    const CH = 600;
    const canvas = document.createElement('canvas');
    canvas.width = CW * cols;
    canvas.height = CH * rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = col * CW;
      const oy = row * CH;

      if (cell.type === 'image' && cell.imageUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Cover-fit into the square cell (clip to cell bounds)
            const ar = img.width / img.height;
            let dw: number;
            let dh: number;
            let dx: number;
            let dy: number;
            if (ar > 1) {
              // Wide image: fill height, crop sides
              dh = CH;
              dw = CH * ar;
              dx = ox - (dw - CW) / 2;
              dy = oy;
            } else {
              // Tall image: fill width, crop top/bottom
              dw = CW;
              dh = CW / ar;
              dx = ox;
              dy = oy - (dh - CH) / 2;
            }
            ctx.save();
            ctx.rect(ox, oy, CW, CH);
            ctx.clip();
            ctx.fillStyle = '#000';
            ctx.fillRect(ox, oy, CW, CH);
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
            for (const tb of cell.textBoxes) {
              drawMemeText(
                ctx,
                tb.text,
                ox + (tb.x / 100) * CW,
                oy + (tb.y / 100) * CH,
                tb.fontSize,
              );
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = cell.imageUrl ?? '';
        });
      } else if (cell.type === 'text') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox, oy, CW, CH);
        drawMemeText(
          ctx,
          cell.plainText || 'DANK',
          ox + CW / 2,
          oy + CH / 2,
          cell.fontSize,
        );
      }
    }

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'meme.png';
    a.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const cols = COLS[layout];

  return (
    <div className="flex flex-col h-full meme-creator-ui">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0 flex-wrap gap-y-2">
        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
          {t('meme.layout')}
        </span>
        <div className="flex gap-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => changeLayout(l)}
              className={`px-3 py-1 rounded text-sm font-black transition-all ${
                layout === l
                  ? 'meme-active-btn'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={download}
          className="meme-download-btn flex items-center gap-2 px-4 py-1.5 rounded text-sm font-black transition-all"
        >
          <Download size={15} />
          {t('meme.download')}
        </button>
      </div>

      {/* Meme grid */}
      <div className="flex-1 p-4 overflow-hidden min-h-0 flex items-center justify-center">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(cells.length / cols)}, 1fr)`,
            gap: '10px',
            aspectRatio: '1',
            maxHeight: '100%',
            maxWidth: '100%',
            height: '100%',
          }}
        >
          {cells.map((cell) => (
            <CellView
              key={cell.id}
              cell={cell}
              dragOver={dragOverId === cell.id}
              cellRef={(el) => {
                cellRefs.current[cell.id] = el;
              }}
              onDragStart={(e) => onCellDragStart(e, cell.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverId(cell.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => onCellDrop(e, cell.id)}
              onFileDrop={(f) => handleFileDrop(cell.id, f)}
              onSetText={() => updateCell(cell.id, { type: 'text' })}
              onUpdate={(patch) => updateCell(cell.id, patch)}
              onAddTextBox={() => addTextBox(cell.id)}
              onRemoveTextBox={(boxId) => removeTextBox(cell.id, boxId)}
              onUpdateTextBox={(boxId, patch) =>
                updateTextBox(cell.id, boxId, patch)
              }
              onStartTextBoxDrag={(boxId, e) =>
                startTextBoxDrag(cell.id, boxId, e)
              }
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Hint bar */}
      <div className="px-4 py-2 border-t border-white/10 flex-shrink-0 text-white/25 text-xs flex gap-4 flex-wrap">
        <span>{t('meme.hint-image')}</span>
        <span>{t('meme.hint-text')}</span>
        <span>{t('meme.hint-drag')}</span>
      </div>
    </div>
  );
};
