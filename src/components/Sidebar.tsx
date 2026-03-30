import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Gadget } from '../gadgets';

interface Props {
  gadgets: Gadget[];
  activeId: string;
  onSelect: (id: string) => void;
  minimal: boolean;
  onToggleMinimal: () => void;
}

export const Sidebar = ({ gadgets, activeId, onSelect, minimal, onToggleMinimal }: Props) => {
  return (
    <div
      className={`flex flex-col border border-white/10 rounded-xl p-3 gap-1 transition-all duration-200 ${minimal ? 'w-14' : 'w-52'}`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {gadgets.map((gadget) => {
          const Icon = gadget.icon;
          const isActive = gadget.id === activeId;
          return (
            <button
              key={gadget.id}
              type="button"
              onClick={() => onSelect(gadget.id)}
              title={minimal ? gadget.name : undefined}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                minimal ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {!minimal && (
                <span className="text-sm font-medium truncate">{gadget.name}</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleMinimal}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors cursor-pointer text-white/50 hover:bg-white/8 hover:text-white/90 ${minimal ? 'justify-center' : ''}`}
        title={minimal ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {minimal ? <ChevronsRight size={18} strokeWidth={2} /> : <ChevronsLeft size={18} strokeWidth={2} />}
        {!minimal && <span className="text-sm font-medium">Collapse</span>}
      </button>
    </div>
  );
};
