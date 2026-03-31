import { useIntl } from 'react-intl';
import { MarkdownView } from '../../components/MarkdownView';
import markdownEn from './privacy-policy.md?raw';
import markdownSl from './privacy-policy.sl.md?raw';

export const PrivacyPolicy = () => {
  const { locale } = useIntl();
  const content = locale === 'sl' ? markdownSl : markdownEn;
  return <MarkdownView content={content} />;
};
