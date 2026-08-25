import '@/shared/assets/font/fonts.css';
import './style.css';
import App from './App';
import { mountReactApp } from '@/shared/react/mountApp';
import { getCoursewareAppPropsFromQuery } from '@/shared/core/query';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('#app not found');
}

const appProps = getCoursewareAppPropsFromQuery();

if (new URLSearchParams(window.location.search).has('mock')) {
  appProps.channel = 'ng-preview';
  appProps.businessContentUuid = 'mock';
  appProps.fetchDataUrl = new URL(
    '../../shared/core/mock/KJG_QAP_BD_v2.json',
    import.meta.url,
  ).href;
}

mountReactApp(app, <App {...appProps} />);
