import '@/shared/assets/font/fonts.css';
import './style.css';
import App from './App';
import { mountReactApp } from '@/shared/react/mountApp';
import { getCoursewareAppPropsFromQuery } from '@/shared/core/query';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('#app not found');
}

mountReactApp(app, <App {...getCoursewareAppPropsFromQuery()} />);
