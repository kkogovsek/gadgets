# NLB SEPA XML Generator

Converts NLB online banking CSV exports into ISO 20022 **camt.053.001.02** bank statement XML files, suitable for accounting software and SEPA-compliant financial tools.

## How to use

1. **Export CSVs from NLB** — in NLB Klik go to Accounts → Transactions, set the date range, and download as CSV.
2. **Enter your IBAN** — paste your full SI56… IBAN so it appears in the XML `<Acct>` element. Owner name is optional but use ALL CAPS if provided.
3. **Drop the CSV files** — drag one or more files onto the upload zone, or click to browse. Multiple files (e.g. EUR + USD accounts) can be loaded together.
4. **Select months** — tick the months you want included. Use *All* / *None* to bulk-select.
5. **Review checks** — the Preview panel runs three groups of validations automatically.
6. **Download** — click the blue download button to save the `.xml` file. The filename encodes the date range and currencies.

## Checks performed

### Data checks
Runs against the raw CSV data before XML generation.

| Check | What it catches |
|---|---|
| No duplicate transaction IDs | Overlapping CSV date ranges loaded twice |
| All transactions have IDs | Rows the bank exported without an `ID transakcije` |
| No zero-amount transactions | Corrupted or fee-only rows |
| No charges exceeding transaction amount | Data anomalies |
| No foreign-currency transactions missing exchange rate | FX rows where the `Menjalni tečaj` field is blank |

### XML consistency
Cross-checks the generated XML against the source CSV to verify the conversion is lossless.

| Check | What it catches |
|---|---|
| XML is well-formed | Generator bugs producing invalid XML |
| Entry count matches CSV | Transactions silently dropped or duplicated |
| Amount totals match by currency | Rounding or sign errors |
| Credit/debit split matches | Direction mis-mapping |
| All transaction IDs present in XML | IDs lost during XML serialisation |

### Double accounting
Validates multi-currency setups where you load CSVs from two accounts (e.g. an EUR account and a USD account) and the bank records both legs of a currency conversion.

| Check | What it catches |
|---|---|
| All exchange rates are valid | Non-numeric or negative `Menjalni tečaj` values |
| All conversions have matching counterparts | FX transactions with no corresponding entry in the other currency file within ±3 days and ±2% of the converted amount |

## CSV format

The tool auto-detects `;` vs `,` delimiters and UTF-8 BOM. The following columns are read (Slovenian headers as exported by NLB Klik):

`Namen` · `Kategorija` · `+/-` · `Znesek` · `Valuta` · `Datum plačila` · `Naziv prejemnika/plačnika` · `Naslov prejemnika/plačnika` · `Račun prejemnika/plačnika` · `BIC koda` · `Status` · `Menjalni tečaj` · `Referenca prejemnika` · `Datum poravnave` · `Dodatni stroški` · `ID transakcije`

## Output format

The XML follows **ISO 20022 camt.053.001.02** (Bank-to-Customer Statement). Each loaded file produces one `<Stmt>` block. Pending transactions (`AVTORIZACIJA` status) are marked `<Sts>PDNG</Sts>`.
