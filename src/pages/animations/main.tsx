import '@/shared/assets/font/fonts.css';
import { mountReactApp } from '@/shared/react/mountApp';
import App from './App';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('#app not found');
}

mountReactApp(app, <App />);
