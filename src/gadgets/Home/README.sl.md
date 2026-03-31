# Orodja

Zbirka majhnih, osredotočenih priročnih orodij v čistem vmesniku s stranskim menijem. Brez računov, brez sledenja — le orodja, ki dobro opravljajo eno stvar.

**Na voljo na:** [gadgets.autonomiam.studio](https://gadgets.autonomiam.studio/)

## Razpoložljiva orodja

- **NLB → ISO SEPA** — Pretvori izvozne datoteke NLB banke v format ISO 20022 SEPA XML

## Uporaba

Odpri aplikacijo, izberi orodje v stranskem meniju in ga uporabi. Vse se izvaja lokalno v tvojem brskalniku.

**Zasebnost:** Tvoji podatki nikoli ne zapustijo naprave — brez strežnikov, brez sledenja. Nekatera orodja morda uporabljajo `localStorage` za shranjevanje vnosov med sejami, a podatki se nikamor ne pošiljajo.

---

## Razvoj

### Predpogoji

- Node.js 18+
- npm

### Začetek

```bash
npm install
npm run dev
```

Aplikacija bo dostopna na [http://localhost:3000](http://localhost:3000).

### Ostali ukazi

```bash
npm run build    # produkcijski build
npm run preview  # predogled produkcijskega builda
npm run test     # zaženi teste
npm run lint     # preverjanje in formatiranje
```

### Dodajanje novega orodja

1. Ustvari `src/gadgets/TvojeOrodje/index.tsx` in izvozi React komponento:

```tsx
export const TvojeOrodje = () => {
  return <div className="flex flex-col h-full">...</div>;
};
```

2. Registriraj ga v `src/gadgets/index.ts`:

```ts
import { Wrench } from "lucide-react";
import { TvojeOrodje } from "./TvojeOrodje";

export const gadgets: Gadget[] = [
  // ...obstoječa orodja
  {
    id: "tvoje-orodje",
    name: "Tvoje orodje",
    icon: Wrench,
    component: TvojeOrodje,
  },
];
```

Orodje se samodejno pojavi v stranskem meniju.

### Tehnologije

- React 19, TypeScript
- Tailwind CSS v4
- Lucide React (ikone)
- Rsbuild (paketnik), Rstest (testi), Biome (linter/formatter)
