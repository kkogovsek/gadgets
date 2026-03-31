import { MarkdownView } from '../../components/MarkdownView';
import markdownContent from './privacy-policy.md?raw';

export const PrivacyPolicy = () => <MarkdownView content={markdownContent} />;
