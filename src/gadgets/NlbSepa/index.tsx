import { useState, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Upload, Download, X, FileSpreadsheet } from 'lucide-react';
import { type ParsedFile, parseFile, generateXml, monthLabel } from './logic';

export const NlbSepa = () => {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);

  const allMonths = useMemo(() => {
    const s = new Set<string>();
    for (const f of files) for (const t of f.transactions) if (t.monthKey) s.add(t.monthKey);
    return [...s].sort().reverse();
  }, [files]);

  const xml = useMemo(
    () => (files.length && selectedMonths.size ? generateXml(files, selectedMonths) : ''),
    [files, selectedMonths],
  );

  const loadFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const readers = Array.from(fileList).map(
      file =>
        new Promise<ParsedFile>(res => {
          const reader = new FileReader();
          reader.onload = e => res(parseFile(file.name, e.target?.result as string));
          reader.readAsText(file, 'UTF-8');
        }),
    );
    Promise.all(readers).then(parsed => {
      setFiles(prev => {
        const existing = new Set(prev.map(f => f.filename));
        return [...prev, ...parsed.filter(p => !existing.has(p.filename))];
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
    setFiles(prev => {
      const remaining = prev.filter(f => f.filename !== filename);
      const validMonths = new Set(remaining.flatMap(f => f.transactions.map(t => t.monthKey)));
      setSelectedMonths(sel => new Set([...sel].filter(m => validMonths.has(m))));
      return remaining;
    });
  };

  const toggleMonth = (key: string) =>
    setSelectedMonths(prev => {
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
    a.download = `nlb-sepa-${months[0] ?? 'export'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full gap-3 p-1">
      {/* Left column: upload + files + months */}
      <div className="flex flex-col gap-3 w-64 shrink-0">
        {/* Drop zone */}
        <div
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg px-4 py-5 cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-400/10' : 'border-white/20 hover:border-white/40'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.csv';
            inp.multiple = true;
            inp.onchange = () => loadFiles(inp.files);
            inp.click();
          }}
        >
          <Upload size={20} className="text-white/50" />
          <span className="text-xs text-white/50 text-center">Drop CSV files<br />or click to browse</span>
        </div>

        {/* Loaded files */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1">
            {files.map(f => (
              <div key={f.filename} className="flex items-center gap-2 bg-white/5 rounded px-3 py-1.5">
                <FileSpreadsheet size={14} className="text-green-400 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-white/80 truncate">{f.filename}</span>
                  <span className="text-xs text-white/30">{f.currency} · {f.transactions.length} txns</span>
                </div>
                <button onClick={() => removeFile(f.filename)} className="text-white/30 hover:text-white/70 shrink-0">
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
              <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300">All</button>
              <button onClick={selectNone} className="text-xs text-white/40 hover:text-white/60">None</button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {allMonths.map(key => (
                <button
                  key={key}
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

      {/* Right column: preview + download */}
      <div className="relative flex-1 min-w-0 min-h-0 rounded-lg overflow-hidden border border-white/10">
        {xml ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            {files.length === 0
              ? <span className="text-sm">Upload NLB CSV export(s) to get started</span>
              : <span className="text-sm">Select one or more months to preview the ISO 20022 XML</span>}
          </div>
        )}
        <button
          onClick={download}
          disabled={!xml}
          className="absolute top-2 right-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm px-4 py-1.5 rounded-lg transition-colors shadow-lg"
        >
          <Download size={15} />
          Download XML
        </button>
      </div>
    </div>
  );
};
