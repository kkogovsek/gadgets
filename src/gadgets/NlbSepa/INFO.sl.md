# Generator NLB SEPA XML

Pretvori CSV izvozne datoteke NLB spletnega bančništva v XML datoteke formata ISO 20022 **camt.053.001.02**, primerne za računovodsko programsko opremo in SEPA-skladna finančna orodja.

## Navodila za uporabo

1. **Izvozi CSV-je iz NLB** — v NLB Kliku pojdi na Računi → Transakcije, nastavi časovni razpon in prenesi kot CSV.
2. **Vnesi svojo IBAN** — prilepi svojo SI56… IBAN, da se pojavi v XML elementu `<Acct>`. Ime lastnika je neobvezno, a uporabi VELIKE TISKANE ČRKE, če ga vneseš.
3. **Spusti CSV datoteke** — povleci eno ali več datotek na območje za nalaganje ali klikni za brskanje. Hkrati je mogoče naložiti več datotek (npr. EUR + USD računi).
4. **Izberi mesece** — označi mesece, ki jih želiš vključiti. Uporabi *Vse* / *Nič* za skupinsko izbiro.
5. **Preglej preveritve** — ploščica predogleda samodejno zažene tri skupine validacij.
6. **Prenesi** — klikni modri gumb za prenos in shrani `.xml` datoteko. Ime datoteke vsebuje časovni razpon in valute.

## Izvedene preveritve

### Preveritve podatkov
Izvedene na surovih podatkih CSV pred generiranjem XML.

| Preveritev | Kaj zazna |
|---|---|
| Brez podvojenih ID-jev transakcij | Prekrivajoči se datumski razponi CSV, naloženi dvakrat |
| Vse transakcije imajo ID-je | Vrstice, ki jih je banka izvozila brez `ID transakcije` |
| Brez transakcij z ničelnim zneskom | Poškodovane ali samo-provizijske vrstice |
| Brez provizij, ki presegajo znesek transakcije | Podatkovne anomalije |
| Brez transakcij v tuji valuti brez menjalnega tečaja | FX vrstice, kjer je polje `Menjalni tečaj` prazno |

### Skladnost XML
Navzkrižno preverja generirani XML z izvornim CSV, da zagotovi brezizgubno pretvorbo.

| Preveritev | Kaj zazna |
|---|---|
| XML je pravilno oblikovan | Hrošči generatorja, ki ustvarijo neveljaven XML |
| Število vnosov se ujema s CSV | Transakcije, ki so bile tiho izpuščene ali podvojene |
| Skupni zneski se ujemajo po valutah | Napake pri zaokroževanju ali predznaku |
| Razdelitev kredit/debet se ujema | Napačno mapiranje smeri |
| Vsi ID-ji transakcij so prisotni v XML | ID-ji, izgubljeni med serializacijo XML |

### Dvojno knjiženje
Preverja večvalutne nastavitve, kjer nalagate CSV-je z dveh računov (npr. EUR in USD račun) in banka beleži obe strani valutne konverzije.

| Preveritev | Kaj zazna |
|---|---|
| Vsi menjalni tečaji so veljavni | Neštevilske ali negativne vrednosti `Menjalni tečaj` |
| Vse konverzije imajo ustrezne dvojnike | FX transakcije brez ustreznega vpisa v drugi valutni datoteki v ±3 dneh in ±2% pretvorjenega zneska |

## Format CSV

Orodje samodejno zazna `;` ali `,` ločilnike in UTF-8 BOM. Berejo se naslednji stolpci (slovensko glavljeni, kot jih izvozi NLB Klik):

`Namen` · `Kategorija` · `+/-` · `Znesek` · `Valuta` · `Datum plačila` · `Naziv prejemnika/plačnika` · `Naslov prejemnika/plačnika` · `Račun prejemnika/plačnika` · `BIC koda` · `Status` · `Menjalni tečaj` · `Referenca prejemnika` · `Datum poravnave` · `Dodatni stroški` · `ID transakcije`

## Format izhoda

XML sledi standardu **ISO 20022 camt.053.001.02** (bančni izpisek). Vsaka naložena datoteka ustvari en blok `<Stmt>`. Čakajoče transakcije (status `AVTORIZACIJA`) so označene z `<Sts>PDNG</Sts>`.
