// @ts-expect-error
import readme from '../../../README.md?raw';
import { MarkdownView } from '../../components/MarkdownView';

export const Home = () => <MarkdownView content={readme} />;
