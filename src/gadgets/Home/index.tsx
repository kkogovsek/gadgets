// @ts-expect-error

import { useIntl } from 'react-intl';
import readmeEn from '../../../README.md?raw';
import { MarkdownView } from '../../components/MarkdownView';
import readmeSl from './README.sl.md?raw';

export const Home = () => {
  const { locale } = useIntl();
  const content = locale === 'sl' ? readmeSl : readmeEn;
  return <MarkdownView content={content} />;
};
