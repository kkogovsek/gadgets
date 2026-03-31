export const sl: Record<string, string> = {
  // Sidebar
  'sidebar.github': 'GitHub',
  'sidebar.collapse': 'Skrči',
  'sidebar.expand-title': 'Razširi stranski meni',
  'sidebar.collapse-title': 'Skrči stranski meni',
  'sidebar.language': 'Jezik',

  // Gadget names
  'gadget.home.name': 'Domov',
  'gadget.nlb-sepa.name': 'NLB → ISO SEPA',
  'gadget.privacy-policy.name': 'Politika zasebnosti',

  // NLB SEPA UI
  'nlb.account': 'Račun',
  'nlb.iban-placeholder': 'IBAN (npr. SI56…)',
  'nlb.owner-placeholder': 'Ime lastnika (neobvezno)',
  'nlb.owner-hint': 'Uporabi VELIKE TISKANE ČRKE',
  'nlb.drop-title': 'Spusti CSV datoteke',
  'nlb.drop-subtitle': 'ali klikni za brskanje',
  'nlb.multicurrency-hint':
    'Če ima vaš račun več valut, uvozite vse CSV izvoze za natančne preveritve.',
  'nlb.months': 'Meseci',
  'nlb.all': 'Vse',
  'nlb.none': 'Nič',
  'nlb.checks': 'Preveritve',
  'nlb.transactions': 'Transakcije',
  'nlb.currency-filter': 'Valuta:',
  'nlb.currency-all': 'Vse',
  'nlb.about': 'O tem orodju',
  'nlb.preview': 'Predogled',
  'nlb.download': 'Prenesi XML',
  'nlb.credits': 'Prihodki',
  'nlb.debits': 'Odhodki',
  'nlb.net': 'Neto',
  'nlb.charges': 'Provizije',
  'nlb.txns-label': 'Transakcije',
  'nlb.pending': '{count} čaka',
  'nlb.data-checks': 'Preveritve podatkov',
  'nlb.xml-consistency': 'Skladnost XML',
  'nlb.double-accounting': 'Dvojno knjiženje',
  'nlb.by-month': 'Po mesecih',
  'nlb.fees': 'provizije',
  'nlb.txns-count': '{count} trans.',
  'nlb.pending-status': 'ČAKA',
  'nlb.upload-prompt': 'Naloži NLB CSV izvoz(e) za začetek',
  'nlb.months-prompt':
    'Izberi enega ali več mesecev za predogled ISO 20022 XML',

  // Data check labels
  'nlb.check.no-duplicate-ids': 'Brez podvojenih ID-jev transakcij',
  'nlb.check.all-have-ids': 'Vse transakcije imajo ID-je',
  'nlb.check.no-zero-amount': 'Brez transakcij z ničelnim zneskom',
  'nlb.check.no-excess-charges': 'Brez provizij, ki presegajo znesek',
  'nlb.check.fx-has-rate':
    'Brez transakcij v tuji valuti brez menjalnega tečaja',

  // XML check labels
  'nlb.check.xml-wellformed': 'XML je pravilno oblikovan',
  'nlb.check.entry-count': 'Število vnosov se ujema s CSV',
  'nlb.check.amount-totals': 'Skupni zneski se ujemajo po valutah',
  'nlb.check.cr-dr-split': 'Razdelitev kredit/debet se ujema',
  'nlb.check.ids-in-xml': 'Vsi ID-ji transakcij so prisotni v XML',

  // Double accounting check labels
  'nlb.check.rates-valid': 'Vsi menjalni tečaji so veljavni',
  'nlb.check.conversions-matched': 'Vse konverzije imajo ustrezne dvojnike',

  // Issue messages
  'nlb.issue.xml-parse-fail': 'Generiranemu XML-ju ni uspelo razčleniti',
  'nlb.issue.entry-count-mismatch':
    'Neskladnost števila vnosov: XML ima {xmlCount}, CSV ima {csvCount}',
  'nlb.issue.amount-mismatch':
    'Neskladnost skupnega zneska {ccy}: XML {xmlAmt} vs CSV {csvAmt}',
  'nlb.issue.cr-dr-mismatch':
    'Neskladnost kredit/debet: XML {xmlCrdt}↑ {xmlDbit}↓ vs CSV {csvCrdt}↑ {csvDbit}↓',
  'nlb.issue.missing-ids':
    '{count} ID(jev) transakcij iz CSV-ja ni najdenih v XML-ju',
  'nlb.issue.xml-validate-fail':
    'Preverjanje XML-ja je nepričakovano spodletelo',
  'nlb.issue.duplicate-id': 'Podvojen ID transakcije {id} se pojavi {count}×',
  'nlb.issue.no-id': '{count} transakcija(e) nima(jo) ID-ja',
  'nlb.issue.zero-amount': '{count} transakcija(e) ima(jo) ničelni znesek',
  'nlb.issue.excess-charges':
    '{count} transakcija(e) ima(jo) provizije višje od zneska',
  'nlb.issue.missing-rate':
    '{count} transakcija(e) v tuji valuti nima(jo) menjalnega tečaja',
  'nlb.issue.invalid-rate':
    '{count} transakcija(e) ima(jo) neveljaven menjalni tečaj',
  'nlb.issue.no-counterpart':
    '{count} konverzija(e) nima(jo) ustreznega dvojnika v drugi valutni datoteki',
};
