import { ChevronsLeft, ChevronsRight, ShieldCheck } from 'lucide-react';

const GitHubIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

import type { Gadget } from '../gadgets';

interface Props {
  gadgets: Gadget[];
  activeId: string;
  onSelect: (id: string) => void;
  minimal: boolean;
  onToggleMinimal: () => void;
}

export const Sidebar = ({
  gadgets,
  activeId,
  onSelect,
  minimal,
  onToggleMinimal,
}: Props) => {
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
                <span className="text-sm font-medium truncate">
                  {gadget.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect('privacy-policy')}
        title={minimal ? 'Privacy Policy' : undefined}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${minimal ? 'justify-center' : ''} ${activeId === 'privacy-policy' ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/8 hover:text-white/90'}`}
      >
        <ShieldCheck
          size={18}
          strokeWidth={activeId === 'privacy-policy' ? 2.5 : 2}
        />
        {!minimal && (
          <span className="text-sm font-medium">Privacy Policy</span>
        )}
      </button>

      <a
        href="https://github.com/kkogovsek/gadgets"
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-white/50 hover:bg-white/8 hover:text-white/90 ${minimal ? 'justify-center' : ''}`}
        title="GitHub"
      >
        <GitHubIcon size={18} />
        {!minimal && <span className="text-sm font-medium">GitHub</span>}
      </a>

      <button
        type="button"
        onClick={onToggleMinimal}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors cursor-pointer text-white/50 hover:bg-white/8 hover:text-white/90 ${minimal ? 'justify-center' : ''}`}
        title={minimal ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {minimal ? (
          <ChevronsRight size={18} strokeWidth={2} />
        ) : (
          <ChevronsLeft size={18} strokeWidth={2} />
        )}
        {!minimal && <span className="text-sm font-medium">Collapse</span>}
      </button>
    </div>
  );
};
