import { createContext, type ReactNode, useContext, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { en } from './messages/en';
import { sl } from './messages/sl';

export type Locale = 'en' | 'sl';

const messages = { en, sl };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
});

export const useLocale = () => useContext(LocaleContext);

const LS_LOCALE = 'app-locale';

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LS_LOCALE);
    return stored === 'sl' ? 'sl' : 'en';
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LS_LOCALE, l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider locale={locale} messages={messages[locale]}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
};
