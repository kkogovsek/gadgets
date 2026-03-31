# NLB SEPA Fix Checklist

## CSV Parsing
- [x] Fix delimiter: `,` → `;`
- [x] Parse `Kategorija` (col 1)
- [x] Parse `Status` (col 10)

## XML Structure / Schema
- [x] Fix namespace: `camt.053.001.08` → `camt.053.001.02`
- [x] Fix `<Sts>` format: `<Sts><Cd>BOOK</Cd></Sts>` → `<Sts>BOOK</Sts>`
- [x] Status value: emit `PDNG` when Status == "AVTORIZACIJA", else `BOOK`
- [x] Add `<BkTxCd>` block (PMNT / ICDT or IDDT / OTHR)
- [x] Add `<AddtlNtryInf>` for Kategorija
- [x] Remove `<AcctSvcrRef>` from `<Ntry>` level (keep only in TxDtls/Refs)
- [x] Add `<MsgPgntn>` to `<GrpHdr>` (PgNb=1, LastPgInd=true)
- [x] Fix `<Stmt><Id>` format: `STMT-{from}-{to}`
- [x] Add `<ElctrncSeqNb>1</ElctrncSeqNb>` to `<Stmt>`
- [x] Fix account `<Id>`: use user-supplied IBAN via `<IBAN>`, not filename
- [x] Add `<Acct><Ownr><Nm>` using user-supplied owner name
- [x] Fix `<RmtInf>`: always `<Ustrd>` with namen (drop `<Strd>` path)
- [x] Fix `<EndToEndId>`: omit when referenca is empty (no "NOTPROVIDED")
- [x] Fix BIC tag: `<BICFI>` → `<BIC>`
- [x] Fix `<ValDt>`: fall back to datumPlacila when datumPoravnave is empty
- [x] Amount: use `Math.abs()`

## UI
- [x] Add account IBAN + owner name form (persisted to localStorage)
