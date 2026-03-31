# Gadgets App

A collection of simple utility tools displayed in a sidebar-driven UI.

## Stack

- React 19, TypeScript
- Tailwind CSS v4 (via `@import 'tailwindcss'` in App.css)
- Lucide React for icons
- Rsbuild (bundler), Rstest (tests), Biome (lint/format)

## Adding a new gadget

1. Create `src/gadgets/YourGadget/index.tsx` and export a React component:

```tsx
export const YourGadget = () => {
  return <div className="flex flex-col h-full">...</div>;
};
```

2. Register it in `src/gadgets/index.ts`:

```ts
import { Wrench } from 'lucide-react'; // pick any lucide icon
import { YourGadget } from './YourGadget';

export const gadgets: Gadget[] = [
  // ...existing gadgets
  {
    id: 'your-gadget',       // unique kebab-case id
    name: 'Your Gadget',     // display name in sidebar
    icon: Wrench,            // LucideIcon
    component: YourGadget,   // the component
  },
];
```

That's it — the gadget appears in the sidebar automatically.

## Layout

- `src/App.tsx` — root layout: sidebar + main panel, both with border/padding/bg
- `src/components/Sidebar.tsx` — icon+name list, toggle to minimal (icons only) at bottom
- `src/gadgets/index.ts` — gadget registry (type + array)
- `src/gadgets/<Name>/index.tsx` — one file per gadget

## Gadget guidelines

- Fill the full panel: use `h-full` on the root element
- Use Tailwind classes for styling; keep dark-theme in mind (white text, `text-white/50` for muted)
- Keep gadgets self-contained — no shared state between gadgets
- Use `lucide-react` for all icons — no emoji or other icon libraries

## Internationalisation (i18n)

All user-visible strings **must** use translations — never hardcode English text in JSX.

The app uses `react-intl`. Pattern to follow in every gadget:

```tsx
import { useIntl } from 'react-intl';

export const MyGadget = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  return <h2>{t('mygadget.title')}</h2>;
};
```

- Add all keys to **both** `src/i18n/messages/en.ts` and `src/i18n/messages/sl.ts`.
- Use namespaced keys: `gadget.<id>.name` for the sidebar name (already read by Sidebar automatically), and `<prefix>.<key>` for UI strings (e.g. `pixel.save`, `icon.download`).
- Interpolated values: `t('key', { count: 3 })` with `{count}` in the message string.
