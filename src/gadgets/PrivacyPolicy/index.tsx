import { useEffect } from 'react';
import { useRemark } from 'react-remark';
import markdownContent from './privacy-policy.md?raw';

export const PrivacyPolicy = () => {
  const [content, setMarkdown] = useRemark();

  useEffect(() => {
    setMarkdown(markdownContent);
  }, [setMarkdown]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="prose prose-invert max-w-2xl mx-auto py-2 text-white/80 [&_h1]:text-white [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mb-1 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-3 [&_a]:text-blue-400 [&_a]:underline [&_em]:text-white/40 [&_em]:text-xs [&_em]:not-italic">
        {content}
      </div>
    </div>
  );
};
