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

## Theming

Each gadget can declare an optional `theme` string in the registry (`src/gadgets/index.ts`). When a gadget is active, `App.tsx` sets `document.body.className = 'theme-<id>'` and clears it on unmount.

All theme styles live in `src/App.css`. The structure for each theme:

1. **`body.theme-<id>`** — sets `background`, `color`, `font-family`, and overrides the CSS custom properties:

   | Token | Purpose |
   |---|---|
   | `--nav-active-bg` | Active sidebar item background |
   | `--nav-active-color` | Active sidebar item text |
   | `--nav-inactive-color` | Inactive sidebar item text |
   | `--nav-hover-bg` | Sidebar item hover background |
   | `--nav-hover-color` | Sidebar item hover text |
   | `--color-primary` | Links, focus accents, tab underlines |
   | `--color-success` | Confirmations, passing checks |
   | `--color-warning` | Cautions, pending states |
   | `--color-danger` | Errors, destructive actions |

2. **`body.theme-<id> .sidebar-root`** and **`.main-panel`** — panel background, border, shadow, border-radius.

3. **Utility overrides** — Tailwind classes that need to adapt to light/non-dark themes:
   - `.text-white` → readable on the theme's background
   - `[class*="text-white/"]` → muted text equivalent
   - `[class*="bg-white/"]` → surface/container backgrounds
   - `[class*="border-white/"]` → border colors
   - `.text-green-*`, `.text-red-*`, `[class*="text-yellow-"]` → semantic status colors
   - `[class*="bg-red-"]`, `[class*="bg-yellow-"]`, `[class*="bg-green-"]` → status backgrounds
   - `[class*="border-red-"]` etc. → status border colors

4. **Inputs and buttons** — `input[type="text"]`, `textarea`, `.bg-indigo-500`, `.bg-blue-600` overrides for form elements and primary action buttons.

5. **Scrollbars** — `::-webkit-scrollbar*` rules for theme-consistent scrollbar styling.

### Existing themes

| Theme id | Gadget | Character |
|---|---|---|
| `home` | Home | Black terminal, `#FDE311` yellow accents |
| `nlb` | NLB → ISO SEPA | Windows 95/2000 corporate, navy `#000080` |
| `opera` | Icon Creator | Modern dark, Opera red `#ff1b2d` |
| `mac` | Pixel Editor | Classic Macintosh System 6/7, B&W |
| `math` | Math Sheet | LaTeX/academic paper, cream `#E8E4D9` |
| `legal` | Privacy Policy | Aged parchment, dark brown `#44372a` |

### Adding a new theme

1. Add `theme: 'your-theme'` to the gadget entry in `src/gadgets/index.ts`.
2. Add a `body.theme-your-theme { … }` block in `src/App.css` following the structure above.

### Component-scoped styles

Some gadgets also use **scoped CSS classes** (not body-level themes) for internal styling that should not bleed into other gadgets — e.g. `.pixel-editor-ui`, `.pixel-editor-controls`, `.math-sheet-ui`. Define these in `App.css` alongside the themes, and apply the root class on the gadget's top-level element.
