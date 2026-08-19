import { mountReactApp } from '@/shared/react/mountApp';
import App from './App';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('#app not found');

mountReactApp(app, <App />);
