import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Prism 콘솔: 메인 앱과 분리된 독립 웹 콘솔. 같은 도메인의 /console/ 에서 제공되어
// 메인 앱과 같은 로그인 토큰(localStorage auth_token)을 쓴다.
export default defineConfig({
  root: path.resolve(__dirname),
  base: '/console/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: process.env.CONSOLE_API || 'http://localhost:8001', changeOrigin: true },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist-console'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
