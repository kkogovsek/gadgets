import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import { Banknote } from 'lucide-react';
import { NlbSepa } from './NlbSepa';

export interface Gadget {
  id: string;
  name: string;
  icon: LucideIcon;
  component: ComponentType;
}

export const gadgets: Gadget[] = [
  {
    id: 'nlb-sepa',
    name: 'NLB → ISO SEPA',
    icon: Banknote,
    component: NlbSepa,
  },
];
