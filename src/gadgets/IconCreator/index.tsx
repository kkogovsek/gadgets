import { Download, RefreshCw, Type, Upload, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const SIZES = [16, 32, 48, 64, 128, 256];
const PREVIEW_SIZE = 256; // canvas pixel size for the main preview

// ─── Render helpers ──────────────────────────────────────────────────────────

function clipRounded(
  ctx: CanvasRenderingContext2D,
  size: number,
  radius: number,
) {
  const r = Math.round(size * (radius / 100));
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
}

function renderText(
  canvas: HTMLCanvasElement,
  size: number,
  text: string,
  bgColor: string,
  fgColor: string,
  radius: number,
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = bgColor;
  clipRounded(ctx, size, radius);
  ctx.fill();

  const label = [...text].slice(0, 2).join('');
  if (!label) return;

  ctx.fillStyle = fgColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.round(size * 0.58);
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(label, size / 2, size / 2 + size * 0.02);
}

function renderImage(
  canvas: HTMLCanvasElement,
  size: number,
  img: HTMLImageElement,
  bgColor: string,
  radius: number,
  zoom: number,
  offset: { x: number; y: number },
) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);

  const scale = size / PREVIEW_SIZE;

  ctx.fillStyle = bgColor;
  clipRounded(ctx, size, radius);
  ctx.fill();

  ctx.save();
  clipRounded(ctx, size, radius);
  ctx.clip();

  // Cover: image fills the canvas at zoom=1
  const coverScale = Math.max(
    size / img.naturalWidth,
    size / img.naturalHeight,
  );
  const finalScale = coverScale * zoom;
  const imgW = img.naturalWidth * finalScale;
  const imgH = img.naturalHeight * finalScale;
  const dx = (size - imgW) / 2 + offset.x * scale;
  const dy = (size - imgH) / 2 + offset.y * scale;

  ctx.drawImage(img, dx, dy, imgW, imgH);
  ctx.restore();
}

// ─── ICO builder ─────────────────────────────────────────────────────────────

async function canvasToPngBuffer(
  canvas: HTMLCanvasElement,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('toBlob failed'));
      blob.arrayBuffer().then(resolve).catch(reject);
    }, 'image/png');
  });
}

async function buildIco(
  sizes: number[],
  renderFn: (c: HTMLCanvasElement, size: number) => void,
): Promise<Blob> {
  const images: ArrayBuffer[] = [];
  for (const size of sizes) {
    const c = document.createElement('canvas');
    renderFn(c, size);
    images.push(await canvasToPngBuffer(c));
  }

  const headerSize = 6;
  const dirEntrySize = 16;
  const totalSize =
    headerSize +
    dirEntrySize * images.length +
    images.reduce((s, d) => s + d.byteLength, 0);

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);

  let dirOffset = headerSize;
  let dataOffset = headerSize + dirEntrySize * images.length;

  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    view.setUint8(dirOffset + 0, s >= 256 ? 0 : s);
    view.setUint8(dirOffset + 1, s >= 256 ? 0 : s);
    view.setUint8(dirOffset + 2, 0);
    view.setUint8(dirOffset + 3, 0);
    view.setUint16(dirOffset + 4, 1, true);
    view.setUint16(dirOffset + 6, 32, true);
    view.setUint32(dirOffset + 8, images[i].byteLength, true);
    view.setUint32(dirOffset + 12, dataOffset, true);
    bytes.set(new Uint8Array(images[i]), dataOffset);
    dirOffset += dirEntrySize;
    dataOffset += images[i].byteLength;
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}

// ─── Main component ───────────────────────────────────────────────────────────

type Mode = 'text' | 'image';

export const IconCreator = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  const [mode, setMode] = useState<Mode>('text');

  // Text mode
  const [text, setText] = useState('⚡');
  const [fgColor, setFgColor] = useState('#ffffff');

  // Shared
  const [bgColor, setBgColor] = useState('#6366f1');
  const [radius, setRadius] = useState(20);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([
    16, 32, 48, 256,
  ]);
  const [downloading, setDownloading] = useState(false);

  // Image mode
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [imgName, setImgName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  // ── Render preview ──────────────────────────────────────────────────────────

  const renderPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    if (mode === 'text') {
      renderText(canvas, PREVIEW_SIZE, text, bgColor, fgColor, radius);
    } else if (imgEl) {
      renderImage(canvas, PREVIEW_SIZE, imgEl, bgColor, radius, zoom, offset);
    }
  }, [mode, text, bgColor, fgColor, radius, imgEl, zoom, offset]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // ── Image upload ────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgName(file.name);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ── Drag to pan ─────────────────────────────────────────────────────────────

  const onMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'image' || !imgEl) return;
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    // canvas is displayed at PREVIEW_SIZE px, canvas pixels = CSS pixels
    const canvas = previewRef.current;
    if (!canvas) return;
    const cssScale = PREVIEW_SIZE / canvas.offsetWidth;
    setOffset((prev) => ({
      x: prev.x + (e.clientX - d.lastX) * cssScale,
      y: prev.y + (e.clientY - d.lastY) * cssScale,
    }));
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  }, []);

  const onMouseUp = () => {
    dragRef.current.active = false;
  };

  // ── Download ────────────────────────────────────────────────────────────────

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size].sort((a, b) => a - b),
    );
  };

  const handleDownload = async () => {
    if (selectedSizes.length === 0) return;
    setDownloading(true);
    try {
      let renderFn: (c: HTMLCanvasElement, size: number) => void;
      if (mode === 'text') {
        renderFn = (c, s) => renderText(c, s, text, bgColor, fgColor, radius);
      } else if (imgEl) {
        renderFn = (c, s) =>
          renderImage(c, s, imgEl, bgColor, radius, zoom, offset);
      } else {
        return;
      }
      const blob = await buildIco(selectedSizes, renderFn);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'favicon.ico';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const canDownload =
    selectedSizes.length > 0 &&
    (mode === 'text' ? text.trim().length > 0 : imgEl !== null);

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-6 p-2">
      <div className="flex flex-col sm:flex-row gap-6 flex-1 min-h-0">
        {/* Controls */}
        <div className="flex flex-col gap-5 w-full sm:w-72 shrink-0">
          <h2 className="text-white font-semibold text-lg">
            {t('icon.title')}
          </h2>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            {(['text', 'image'] as const).map((m) => (
              <Button
                key={m}
                variant="tab"
                size="md"
                active={mode === m}
                onClick={() => setMode(m)}
                className="flex-1 gap-1.5 py-1.5"
              >
                {m === 'text' ? <Type size={14} /> : <Upload size={14} />}
                {m === 'text' ? t('icon.mode.text') : t('icon.mode.image')}
              </Button>
            ))}
          </div>

          {/* Text mode controls */}
          {mode === 'text' && (
            <>
              <label
                htmlFor="icon-text-input"
                className="flex flex-col gap-1.5"
              >
                <span className="text-white/50 text-sm">
                  {t('icon.text-label')}
                </span>
                <Input
                  id="icon-text-input"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={4}
                  size="lg"
                  placeholder="⚡"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-white/50 text-sm">
                  {t('icon.foreground')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0.5"
                  />
                  <span className="text-white/70 text-sm font-mono">
                    {fgColor}
                  </span>
                </div>
              </label>
            </>
          )}

          {/* Image mode controls */}
          {mode === 'image' && (
            <>
              <label className="flex flex-col gap-1.5 cursor-pointer">
                <span className="text-white/50 text-sm">
                  {t('icon.upload-label')}
                </span>
                <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 transition-colors rounded-md px-3 py-2">
                  <Upload size={16} className="text-white/50 shrink-0" />
                  <span className="text-white/70 text-sm truncate">
                    {imgName || t('icon.choose-file')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </div>
              </label>

              {imgEl && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/50 text-sm flex items-center gap-1.5">
                    <ZoomIn size={13} />
                    {t('icon.zoom', { zoom: zoom.toFixed(2) })}
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={4}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="accent-indigo-400 w-full"
                  />
                </label>
              )}
            </>
          )}

          {/* Background (shared) */}
          <label className="flex flex-col gap-1.5">
            <span className="text-white/50 text-sm">
              {t('icon.background')}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0.5"
              />
              <span className="text-white/70 text-sm font-mono">{bgColor}</span>
            </div>
          </label>

          {/* Corner radius (shared) */}
          <label className="flex flex-col gap-1.5">
            <span className="text-white/50 text-sm">
              {t('icon.corner-radius', { radius })}
            </span>
            <input
              type="range"
              min={0}
              max={50}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="accent-indigo-400 w-full"
            />
          </label>

          {/* Sizes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/50 text-sm">{t('icon.sizes')}</span>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => (
                <Button
                  key={size}
                  variant="toggle"
                  size="sm"
                  active={selectedSizes.includes(size)}
                  onClick={() => toggleSize(size)}
                  className="font-mono"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Download */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleDownload}
            disabled={downloading || !canDownload}
            className="mt-auto"
          >
            {downloading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {t('icon.download')}
          </Button>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <span className="text-white/50 text-sm">
            {t('icon.preview')}
            {mode === 'image' && imgEl && (
              <span className="text-white/30 ml-2 text-xs">
                {t('icon.drag-hint')}
              </span>
            )}
          </span>

          <canvas
            ref={previewRef}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            className="rounded-xl"
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              cursor: mode === 'image' && imgEl ? 'grab' : 'default',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />

          {/* Size previews */}
          <div className="flex flex-col gap-3 mt-2">
            <span className="text-white/40 text-xs">
              {t('icon.size-comparison')}
            </span>
            <div className="flex items-end gap-4 flex-wrap">
              {[16, 32, 48, 64].map((size) => (
                <SizePreview
                  key={size}
                  size={size}
                  mode={mode}
                  text={text}
                  bgColor={bgColor}
                  fgColor={fgColor}
                  radius={radius}
                  imgEl={imgEl}
                  zoom={zoom}
                  offset={offset}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Size preview thumbnail ───────────────────────────────────────────────────

function SizePreview({
  size,
  mode,
  text,
  bgColor,
  fgColor,
  radius,
  imgEl,
  zoom,
  offset,
}: {
  size: number;
  mode: Mode;
  text: string;
  bgColor: string;
  fgColor: string;
  radius: number;
  imgEl: HTMLImageElement | null;
  zoom: number;
  offset: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (mode === 'text') {
      renderText(canvas, size, text, bgColor, fgColor, radius);
    } else if (imgEl) {
      renderImage(canvas, size, imgEl, bgColor, radius, zoom, offset);
    }
  }, [size, mode, text, bgColor, fgColor, radius, imgEl, zoom, offset]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated', width: size, height: size }}
      />
      <span className="text-white/30 text-xs">{size}px</span>
    </div>
  );
}
