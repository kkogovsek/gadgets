import { useIntl } from 'react-intl';
import { useRemarkSync } from 'react-remark';
import remarkGfm from 'remark-gfm';
import markdownEn from './privacy-policy.md?raw';
import markdownSl from './privacy-policy.sl.md?raw';

const LegalMarkdown = ({ content }: { content: string }) => {
  const rendered = useRemarkSync(content, {
    remarkPlugins: [remarkGfm],
    rehypeReactOptions: {
      components: {
        h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
          <h1 className="text-xl font-serif font-bold text-center uppercase tracking-widest mb-1 text-stone-900">
            {children}
          </h1>
        ),
        h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider mt-6 mb-2 text-stone-800 border-b border-stone-400 pb-1">
            {children}
          </h2>
        ),
        h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
          <h3 className="text-sm font-serif font-bold uppercase tracking-wide mt-4 mb-1 text-stone-700">
            {children}
          </h3>
        ),
        p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
          <p className="text-stone-800 text-sm mb-3 leading-relaxed font-serif text-justify">
            {children}
          </p>
        ),
        a: ({
          children,
          href,
        }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-stone-700 underline underline-offset-2 hover:text-stone-900"
          >
            {children}
          </a>
        ),
        code: ({ children, className }: React.HTMLAttributes<HTMLElement>) =>
          className ? (
            <code className="block bg-stone-200 border border-stone-400 rounded p-3 text-xs text-stone-800 font-mono overflow-x-auto my-2">
              {children}
            </code>
          ) : (
            <code className="bg-stone-200 border border-stone-300 rounded px-1 py-0.5 text-xs text-stone-800 font-mono">
              {children}
            </code>
          ),
        pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
          <pre className="my-2">{children}</pre>
        ),
        ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
          <ul className="list-disc list-inside text-sm text-stone-800 mb-3 space-y-1 font-serif">
            {children}
          </ul>
        ),
        ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
          <ol className="list-decimal list-inside text-sm text-stone-800 mb-3 space-y-1 font-serif">
            {children}
          </ol>
        ),
        li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
          <li className="leading-relaxed">{children}</li>
        ),
        strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
          <strong className="text-stone-900 font-bold">{children}</strong>
        ),
        em: ({ children }: React.HTMLAttributes<HTMLElement>) => (
          <em className="text-stone-600 font-serif">{children}</em>
        ),
      },
    },
  });

  return <>{rendered}</>;
};

export const PrivacyPolicy = () => {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const content = intl.locale === 'sl' ? markdownSl : markdownEn;

  return (
    <div className="h-full overflow-y-auto bg-amber-50/30 p-4">
      {/* Outer double border */}
      <div className="max-w-2xl mx-auto border-4 border-double border-stone-400 p-1">
        <div className="border border-stone-400 p-6 bg-amber-50">
          {/* Header seal area */}
          <div className="text-center mb-6 pb-4 border-b-2 border-double border-stone-400">
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-stone-500 mb-1">
              {t('privacy.official-document')}
            </div>
            <div className="text-2xl font-serif font-black uppercase tracking-[0.2em] text-stone-900">
              {t('privacy.app-name')}
            </div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-stone-500 mt-1">
              {t('privacy.app-subtitle')}
            </div>
            <div className="mt-3 text-xs font-mono text-stone-500 tracking-widest">
              {t('privacy.case-number')}
            </div>
          </div>

          {/* Subpoena-style title bar */}
          <div className="border border-stone-400 bg-stone-100 px-4 py-2 mb-6 text-center">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-600">
              {t('privacy.in-the-matter-of')}
            </div>
            <div className="text-base font-serif font-bold uppercase tracking-wider text-stone-900">
              {t('privacy.matter-title')}
            </div>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-600 mt-1">
              {t('privacy.matter-subtitle')}
            </div>
          </div>

          {/* Whereas preamble */}
          <p className="text-xs font-serif text-stone-600 italic mb-6 text-justify leading-relaxed border-l-2 border-stone-300 pl-3">
            {t('privacy.whereas')}
          </p>

          {/* Markdown content */}
          <LegalMarkdown content={content} />

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-double border-stone-400">
            <div className="flex justify-between items-end text-xs font-mono text-stone-500">
              <div>
                <div className="uppercase tracking-widest mb-1">
                  {t('privacy.issued-by')}
                </div>
                <div className="font-bold text-stone-700">
                  {t('privacy.issuer-name')}
                </div>
                <div>{t('privacy.issuer-url')}</div>
              </div>
              <div className="text-right">
                <div className="uppercase tracking-widest mb-1">
                  {t('privacy.date-of-issue')}
                </div>
                <div className="font-bold text-stone-700">
                  {t('privacy.issue-date')}
                </div>
                <div className="mt-2 border border-stone-400 px-3 py-1 text-center">
                  {t('privacy.seal')}
                </div>
              </div>
            </div>
            <div className="text-center mt-4 text-xs font-mono uppercase tracking-[0.3em] text-stone-400">
              {t('privacy.end-of-document')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
