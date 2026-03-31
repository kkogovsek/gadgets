export const en: Record<string, string> = {
  // Sidebar
  'sidebar.github': 'GitHub',
  'sidebar.collapse': 'Collapse',
  'sidebar.expand-title': 'Expand sidebar',
  'sidebar.collapse-title': 'Collapse sidebar',
  'sidebar.language': 'Language',

  // Gadget names
  'gadget.home.name': 'Home',
  'gadget.nlb-sepa.name': 'NLB → ISO SEPA',
  'gadget.privacy-policy.name': 'Privacy Policy',

  // NLB SEPA UI
  'nlb.account': 'Account',
  'nlb.iban-placeholder': 'IBAN (e.g. SI56…)',
  'nlb.owner-placeholder': 'Owner name (optional)',
  'nlb.owner-hint': 'Use ALL CAPS',
  'nlb.drop-title': 'Drop CSV files',
  'nlb.drop-subtitle': 'or click to browse',
  'nlb.multicurrency-hint':
    'If your account has multiple currencies, import all CSV exports for accurate checks.',
  'nlb.months': 'Months',
  'nlb.all': 'All',
  'nlb.none': 'None',
  'nlb.checks': 'Checks',
  'nlb.transactions': 'Transactions',
  'nlb.currency-filter': 'Currency:',
  'nlb.currency-all': 'All',
  'nlb.about': 'About this gadget',
  'nlb.preview': 'Preview',
  'nlb.download': 'Download XML',
  'nlb.credits': 'Credits',
  'nlb.debits': 'Debits',
  'nlb.net': 'Net',
  'nlb.charges': 'Charges',
  'nlb.txns-label': 'Transactions',
  'nlb.pending': '{count} pending',
  'nlb.data-checks': 'Data checks',
  'nlb.xml-consistency': 'XML consistency',
  'nlb.double-accounting': 'Double accounting',
  'nlb.by-month': 'By month',
  'nlb.fees': 'fees',
  'nlb.txns-count': '{count} txns',
  'nlb.pending-status': 'PDNG',
  'nlb.upload-prompt': 'Upload NLB CSV export(s) to get started',
  'nlb.months-prompt': 'Select one or more months to preview the ISO 20022 XML',

  // Data check labels
  'nlb.check.no-duplicate-ids': 'No duplicate transaction IDs',
  'nlb.check.all-have-ids': 'All transactions have IDs',
  'nlb.check.no-zero-amount': 'No zero-amount transactions',
  'nlb.check.no-excess-charges': 'No charges exceeding transaction amount',
  'nlb.check.fx-has-rate':
    'No foreign-currency transactions missing exchange rate',

  // XML check labels
  'nlb.check.xml-wellformed': 'XML is well-formed',
  'nlb.check.entry-count': 'Entry count matches CSV',
  'nlb.check.amount-totals': 'Amount totals match by currency',
  'nlb.check.cr-dr-split': 'Credit/debit split matches',
  'nlb.check.ids-in-xml': 'All transaction IDs present in XML',

  // Double accounting check labels
  'nlb.check.rates-valid': 'All exchange rates are valid',
  'nlb.check.conversions-matched': 'All conversions have matching counterparts',

  // Issue messages
  'nlb.issue.xml-parse-fail': 'Generated XML failed to parse',
  'nlb.issue.entry-count-mismatch':
    'Entry count mismatch: XML has {xmlCount}, CSV has {csvCount}',
  'nlb.issue.amount-mismatch':
    '{ccy} total mismatch: XML {xmlAmt} vs CSV {csvAmt}',
  'nlb.issue.cr-dr-mismatch':
    'Credit/debit split mismatch: XML {xmlCrdt}↑ {xmlDbit}↓ vs CSV {csvCrdt}↑ {csvDbit}↓',
  'nlb.issue.missing-ids':
    '{count} transaction ID(s) from CSV not found in XML',
  'nlb.issue.xml-validate-fail': 'XML validation failed unexpectedly',
  'nlb.issue.duplicate-id': 'Duplicate transaction ID {id} appears {count}×',
  'nlb.issue.no-id': '{count} transaction(s) have no ID',
  'nlb.issue.zero-amount': '{count} transaction(s) with zero amount',
  'nlb.issue.excess-charges':
    '{count} transaction(s) where charges exceed the amount',
  'nlb.issue.missing-rate':
    '{count} foreign-currency transaction(s) missing exchange rate',
  'nlb.issue.invalid-rate':
    '{count} transaction(s) have an invalid exchange rate',
  'nlb.issue.no-counterpart':
    '{count} conversion(s) have no matching counterpart in another currency file',
};
