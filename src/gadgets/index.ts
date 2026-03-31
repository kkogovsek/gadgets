import type { LucideIcon } from 'lucide-react';
import { Banknote, Grid2x2, House, ImagePlay, ShieldCheck } from 'lucide-react';
import type { ComponentType } from 'react';
import { lazy } from 'react';

export interface Gadget {
  id: string;
  name: string;
  icon: LucideIcon;
  component: ComponentType;
  pinBottom?: boolean;
  /** Optional theme id applied to <body> while this gadget is active */
  theme?: string;
}

export const gadgets: Gadget[] = [
  {
    id: 'home',
    name: 'Home',
    icon: House,
    component: lazy(() => import('./Home').then((m) => ({ default: m.Home }))),
    theme: 'home',
  },
  {
    id: 'nlb-sepa',
    name: 'NLB → ISO SEPA',
    icon: Banknote,
    component: lazy(() =>
      import('./NlbSepa').then((m) => ({ default: m.NlbSepa })),
    ),
    theme: 'nlb',
  },
  {
    id: 'icon-creator',
    name: 'Icon Creator',
    icon: ImagePlay,
    component: lazy(() =>
      import('./IconCreator').then((m) => ({ default: m.IconCreator })),
    ),
    theme: 'opera',
  },
  {
    id: 'pixel-editor',
    name: 'Pixel Editor',
    icon: Grid2x2,
    component: lazy(() =>
      import('./PixelEditor').then((m) => ({ default: m.PixelEditor })),
    ),
    theme: 'mac',
  },
  {
    id: 'privacy-policy',
    name: 'Privacy Policy',
    icon: ShieldCheck,
    component: lazy(() =>
      import('./PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })),
    ),
    pinBottom: true,
    theme: 'legal',
  },
];
