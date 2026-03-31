import type { LucideIcon } from 'lucide-react';
import { Banknote, House, ShieldCheck } from 'lucide-react';
import type { ComponentType } from 'react';
import { lazy } from 'react';

export interface Gadget {
  id: string;
  name: string;
  icon: LucideIcon;
  component: ComponentType;
  pinBottom?: boolean;
}

export const gadgets: Gadget[] = [
  {
    id: 'home',
    name: 'Home',
    icon: House,
    component: lazy(() => import('./Home').then((m) => ({ default: m.Home }))),
  },
  {
    id: 'nlb-sepa',
    name: 'NLB → ISO SEPA',
    icon: Banknote,
    component: lazy(() =>
      import('./NlbSepa').then((m) => ({ default: m.NlbSepa })),
    ),
  },
  {
    id: 'privacy-policy',
    name: 'Privacy Policy',
    icon: ShieldCheck,
    component: lazy(() =>
      import('./PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })),
    ),
    pinBottom: true,
  },
];
