# Gadgets

A collection of small, focused utility tools in a clean sidebar-driven UI. No accounts, no tracking — just tools that do one thing well.

**Live at:** http://gadgets.autonomiam.studio/

## Available gadgets

- **NLB → ISO SEPA** — Converts NLB bank export files to ISO 20022 SEPA XML format

## Usage

Just open the app, pick a gadget from the sidebar, and use it. Everything runs locally in your browser.

**Privacy:** Your data never leaves your device — no servers, no tracking. Some gadgets may use `localStorage` to persist your input between sessions, but nothing is ever sent anywhere.

---

## Development

### Prerequisites

- Node.js 18+
- npm

### Getting started

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Other commands

```bash
npm run build    # production build
npm run preview  # preview the production build locally
npm run test     # run tests
npm run lint     # lint & format check
```

### Adding a new gadget

1. Create `src/gadgets/YourGadget/index.tsx` and export a React component:

```tsx
export const YourGadget = () => {
  return <div className="flex flex-col h-full">...</div>;
};
```

2. Register it in `src/gadgets/index.ts`:

```ts
import { Wrench } from 'lucide-react';
import { YourGadget } from './YourGadget';

export const gadgets: Gadget[] = [
  // ...existing gadgets
  {
    id: 'your-gadget',
    name: 'Your Gadget',
    icon: Wrench,
    component: YourGadget,
  },
];
```

The gadget appears in the sidebar automatically.

### Stack

- React 19, TypeScript
- Tailwind CSS v4
- Lucide React (icons)
- Rsbuild (bundler), Rstest (tests), Biome (lint/format)
