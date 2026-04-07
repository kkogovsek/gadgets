import { useRemarkSync } from 'react-remark';
import remarkGfm from 'remark-gfm';

export const MarkdownView = ({ content }: { content: string }) => {
  const rendered = useRemarkSync(content, {
    remarkPlugins: [remarkGfm],
    rehypeReactOptions: {
      components: {
        h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
          <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
        ),
        h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
          <h2 className="text-lg font-semibold text-white mt-6 mb-2">
            {children}
          </h2>
        ),
        h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
          <h3 className="text-base font-semibold text-white/80 mt-4 mb-1">
            {children}
          </h3>
        ),
        p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
          <p className="text-white/70 text-sm mb-3 leading-relaxed">
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
            className="text-(--color-primary) hover:opacity-80 underline"
          >
            {children}
          </a>
        ),
        code: ({ children, className }: React.HTMLAttributes<HTMLElement>) =>
          className ? (
            <code className="block bg-white/5 border border-white/10 rounded p-3 text-xs text-white/80 font-mono overflow-x-auto my-2">
              {children}
            </code>
          ) : (
            <code className="bg-white/10 rounded px-1 py-0.5 text-xs text-white/80 font-mono">
              {children}
            </code>
          ),
        pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
          <pre className="my-2">{children}</pre>
        ),
        ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
          <ul className="list-disc list-inside text-sm text-white/70 mb-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
          <ol className="list-decimal list-inside text-sm text-white/70 mb-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
          <li className="leading-relaxed">{children}</li>
        ),
        table: ({ children }: React.HTMLAttributes<HTMLTableElement>) => (
          <table className="w-full text-sm mb-4 border-collapse">
            {children}
          </table>
        ),
        thead: ({
          children,
        }: React.HTMLAttributes<HTMLTableSectionElement>) => (
          <thead className="border-b border-white/10">{children}</thead>
        ),
        th: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
          <th className="text-left text-white/50 text-xs font-medium pb-1.5 pr-4">
            {children}
          </th>
        ),
        td: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
          <td className="text-white/70 text-xs py-1.5 pr-4 border-b border-white/5">
            {children}
          </td>
        ),
        strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
          <strong className="text-white/90 font-semibold">{children}</strong>
        ),
        em: ({ children }: React.HTMLAttributes<HTMLElement>) => (
          <em className="text-white/50 not-italic text-xs">{children}</em>
        ),
      },
    },
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl px-2 py-4">{rendered}</div>
    </div>
  );
};
