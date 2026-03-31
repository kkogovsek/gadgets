import {
  Download,
  Eraser,
  PaintBucket,
  Paintbrush,
  Pencil,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

const GRID_SIZES = [8, 16, 32] as const;
type GridSize = (typeof GRID_SIZES)[number];
type Tool = 'draw' | 'erase' | 'fill';

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = [
  '#000000',
  '#434343',
  '#999999',
  '#ffffff',
  '#ff0000',
  '#ff8c00',
  '#ffd700',
  '#00cc00',
  '#00ccff',
  '#0066ff',
  '#8800ff',
  '#ff00ff',
  '#ff69b4',
  '#a52a2a',
  '#008080',
  '#006400',
];

// ── IndexedDB ─────────────────────────────────────────────────────────────────

interface ArtRecord {
  id?: number;
  thumbnail: string;
  pixels: string[];
  size: GridSize;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gadgets-pixel-editor', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('artworks', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbSave(art: Omit<ArtRecord, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('artworks', 'readwrite')
      .objectStore('artworks')
      .add(art);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

async function dbLoadAll(): Promise<ArtRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('artworks', 'readonly')
      .objectStore('artworks')
      .getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('artworks', 'readwrite')
      .objectStore('artworks')
      .delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Pixel helpers ─────────────────────────────────────────────────────────────

function makeGrid(size: GridSize): string[] {
  return new Array(size * size).fill('');
}

function toThumbnail(pixels: string[], size: GridSize): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c.toDataURL();
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue;
    ctx.fillStyle = pixels[i];
    ctx.fillRect(i % size, Math.floor(i / size), 1, 1);
  }
  return c.toDataURL();
}

function floodFill(
  pixels: string[],
  size: GridSize,
  idx: number,
  newColor: string,
): string[] {
  const target = pixels[idx];
  if (target === newColor) return pixels;
  const next = [...pixels];
  const stack = [idx];
  while (stack.length) {
    const i = stack.pop() as number;
    if (next[i] !== target) continue;
    next[i] = newColor;
    const x = i % size;
    const y = Math.floor(i / size);
    if (x > 0) stack.push(i - 1);
    if (x < size - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - size);
    if (y < size - 1) stack.push(i + size);
  }
  return next;
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

function drawCanvas(
  canvas: HTMLCanvasElement,
  pixels: string[],
  gridSize: GridSize,
  cellSize: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const sz = gridSize;
  const cs = cellSize;
  canvas.width = cs * sz;
  canvas.height = cs * sz;

  const isMac = document.body.classList.contains('theme-mac');
  const emptyEven = isMac ? '#ffffff' : '#3a3a3a';
  const emptyOdd = isMac ? '#eeeeee' : '#2d2d2d';
  const gridLineColor = isMac ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';

  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? emptyEven : emptyOdd;
      ctx.fillRect(x * cs, y * cs, cs, cs);
      const color = pixels[y * sz + x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * cs, y * cs, cs, cs);
      }
    }
  }

  ctx.strokeStyle = gridLineColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= sz; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cs + 0.5, 0);
    ctx.lineTo(i * cs + 0.5, sz * cs);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cs + 0.5);
    ctx.lineTo(sz * cs, i * cs + 0.5);
    ctx.stroke();
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export const PixelEditor = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  const [view, setView] = useState<'editor' | 'gallery'>('editor');
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [pixels, setPixels] = useState<string[]>(() => makeGrid(16));
  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#ff0000');
  const [gallery, setGallery] = useState<ArtRecord[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const cellSizeRef = useRef(16);
  const [cellSize, setCellSize] = useState(16);

  // Load gallery on mount; default to gallery if items exist
  useEffect(() => {
    dbLoadAll()
      .then((arts) => {
        const sorted = [...arts].reverse();
        setGallery(sorted);
        setGalleryLoaded(true);
        if (sorted.length > 0) setView('gallery');
      })
      .catch(() => setGalleryLoaded(true));
  }, []);

  // Responsive cell size via ResizeObserver on canvas wrapper
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const available = Math.min(el.clientWidth, el.clientHeight) - 8;
      const cs = Math.max(4, Math.floor(available / gridSize));
      cellSizeRef.current = cs;
      setCellSize(cs);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [gridSize]);

  // Re-draw canvas whenever pixels/cellSize/gridSize change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas(canvas, pixels, gridSize, cellSize);
  }, [pixels, cellSize, gridSize]);

  const getIdx = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(
        ((e.clientX - rect.left) * scaleX) / cellSizeRef.current,
      );
      const y = Math.floor(
        ((e.clientY - rect.top) * scaleY) / cellSizeRef.current,
      );
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return null;
      return y * gridSize + x;
    },
    [gridSize],
  );

  const applyTool = useCallback(
    (idx: number, currentTool: Tool, currentColor: string) => {
      if (currentTool === 'fill') {
        setPixels((p) => floodFill(p, gridSize, idx, currentColor));
      } else {
        setPixels((p) => {
          const next = [...p];
          next[idx] = currentTool === 'erase' ? '' : currentColor;
          return next;
        });
      }
    },
    [gridSize],
  );

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const idx = getIdx(e);
    if (idx !== null) applyTool(idx, tool, color);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool === 'fill') return;
    const idx = getIdx(e);
    if (idx !== null) applyTool(idx, tool, color);
  };

  const onMouseUp = () => {
    isDrawingRef.current = false;
  };

  const handleSave = async () => {
    const thumbnail = toThumbnail(pixels, gridSize);
    const art: Omit<ArtRecord, 'id'> = {
      thumbnail,
      pixels,
      size: gridSize,
      createdAt: Date.now(),
    };
    const id = await dbSave(art);
    setGallery((prev) => [{ ...art, id }, ...prev]);
    setView('gallery');
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbDelete(id);
    setGallery((prev) => prev.filter((a) => a.id !== id));
  };

  const handleLoad = (art: ArtRecord) => {
    setGridSize(art.size);
    setPixels(art.pixels);
    setView('editor');
  };

  const handleNewCanvas = (size: GridSize) => {
    setGridSize(size);
    setPixels(makeGrid(size));
    setView('editor');
  };

  const handleExportPng = () => {
    const exportSize = 1024;
    const pixelSize = exportSize / gridSize;
    const c = document.createElement('canvas');
    c.width = exportSize;
    c.height = exportSize;
    const ctx = c.getContext('2d');
    if (ctx) {
      for (let i = 0; i < pixels.length; i++) {
        if (!pixels[i]) continue;
        ctx.fillStyle = pixels[i];
        ctx.fillRect(
          (i % gridSize) * pixelSize,
          Math.floor(i / gridSize) * pixelSize,
          pixelSize,
          pixelSize,
        );
      }
    }
    const a = document.createElement('a');
    a.href = c.toDataURL();
    a.download = `pixel-art-${gridSize}x${gridSize}.png`;
    a.click();
  };

  return (
    <div className="pixel-editor-ui flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <h2
          className="text-white font-semibold tracking-widest uppercase"
          style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
        >
          {t('pixel.title')}
        </h2>
        <div className="flex gap-1 bg-white/10 p-1 ml-auto">
          {(['editor', 'gallery'] as const).map((v) => (
            <Button
              key={v}
              variant="tab"
              size="md"
              active={view === v}
              onClick={() => setView(v)}
              className="px-3 py-1"
            >
              {v === 'editor'
                ? t('pixel.view.editor')
                : `${t('pixel.view.gallery')}${gallery.length ? ` (${gallery.length})` : ''}`}
            </Button>
          ))}
        </div>
      </div>

      {view === 'editor' ? (
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Controls */}
          <div className="pixel-editor-controls flex flex-col gap-3 w-36 shrink-0">
            {/* Canvas size */}
            <div className="flex flex-col gap-1">
              <span className="pixel-label">{t('pixel.canvas')}</span>
              <div className="flex gap-1">
                {GRID_SIZES.map((s) => (
                  <Button
                    key={s}
                    variant="toggle"
                    size="xs"
                    active={gridSize === s}
                    onClick={() => handleNewCanvas(s)}
                    className="flex-1 py-1"
                    style={{
                      fontFamily: "'VT323', monospace",
                      fontSize: '15px',
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="flex flex-col gap-1">
              <span className="pixel-label">{t('pixel.tool')}</span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    {
                      id: 'draw' as Tool,
                      icon: Pencil,
                      labelKey: 'pixel.tool.draw',
                    },
                    {
                      id: 'erase' as Tool,
                      icon: Eraser,
                      labelKey: 'pixel.tool.erase',
                    },
                    {
                      id: 'fill' as Tool,
                      icon: PaintBucket,
                      labelKey: 'pixel.tool.fill',
                    },
                  ] as const
                ).map(({ id, icon: Icon, labelKey }) => (
                  <Button
                    key={id}
                    variant="toggle"
                    size="icon"
                    active={tool === id}
                    onClick={() => setTool(id)}
                    title={t(labelKey)}
                  >
                    <Icon size={14} />
                  </Button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-1">
              <span className="pixel-label">{t('pixel.color')}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 cursor-pointer bg-transparent border-0 p-0.5 shrink-0"
                />
                <span
                  className="text-white/60 truncate"
                  style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}
                >
                  {color}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ background: c }}
                    className={`palette-swatch h-7 border ${color === c ? 'active border-white/80' : 'border-white/10'}`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 mt-auto">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setPixels(makeGrid(gridSize))}
                title={t('pixel.clear')}
                className="flex-1"
              >
                <Paintbrush size={14} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleExportPng}
                title={t('pixel.export-png')}
                className="flex-1"
              >
                <Download size={14} />
              </Button>
              <Button
                variant="primary"
                size="icon"
                onClick={handleSave}
                title={t('pixel.save')}
                className="flex-1"
              >
                <Save size={14} />
              </Button>
            </div>
          </div>

          {/* Canvas area */}
          <div
            ref={canvasWrapRef}
            className="pixel-editor-canvas-wrap flex-1 flex items-start justify-start min-h-0 overflow-auto"
          >
            <canvas
              ref={canvasRef}
              style={{ cursor: 'crosshair' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
        </div>
      ) : galleryLoaded && gallery.length === 0 ? (
        // Empty gallery
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40">
          <Pencil size={40} className="opacity-30" />
          <p style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}>
            {t('pixel.no-artwork')}
          </p>
          <Button variant="link" size="sm" onClick={() => setView('editor')}>
            {t('pixel.start-drawing')}
          </Button>
        </div>
      ) : (
        // Gallery grid
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
            {gallery.map((art) => (
              <GalleryItem
                key={art.id}
                art={art}
                onLoad={handleLoad}
                onDelete={(e) => handleDelete(art.id as number, e)}
              />
            ))}
            <button
              type="button"
              onClick={() => setView('editor')}
              className="gallery-new aspect-square flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/50 transition-colors"
            >
              <Plus size={20} />
              <span
                style={{ fontFamily: "'VT323', monospace", fontSize: '14px' }}
              >
                {t('pixel.new')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Gallery item ──────────────────────────────────────────────────────────────

function GalleryItem({
  art,
  onLoad,
  onDelete,
}: {
  art: ArtRecord;
  onLoad: (art: ArtRecord) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  return (
    <button
      type="button"
      className="gallery-item relative group cursor-pointer aspect-square overflow-hidden bg-[#2a2a2a] transition-[translate,border-color,box-shadow] duration-100 p-0 border-0"
      onClick={() => onLoad(art)}
    >
      <img
        src={art.thumbnail}
        alt={t('pixel.art-alt', { size: art.size })}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
      <Button
        variant="danger"
        size="iconSm"
        onClick={onDelete}
        aria-label={t('pixel.delete')}
        title={t('pixel.delete')}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
      >
        <X size={11} />
      </Button>
      <span
        className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 text-white/80 bg-black/60 px-1 transition-opacity duration-100"
        style={{ fontFamily: "'VT323', monospace", fontSize: '13px' }}
      >
        {art.size}×{art.size}
      </span>
    </button>
  );
}
