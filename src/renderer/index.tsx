import { createRoot } from 'react-dom/client';
import App from './App';

// 兼容浏览器环境：为 webpack-dev-server 提供 global 引用
// Electron 渲染进程中 global 已存在，此处赋值不会产生副作用
if (typeof window !== 'undefined' && (window as any).global === undefined) {
  (window as any).global = window as any;
}

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);