/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    css: {
      modules: { localsConvention: 'camelCaseOnly' },
    },
    server: {
      port: 5173,
      host: true,
      // 本地联调：把 /api 与 /agent-api 代理到后端，避免浏览器跨域
      proxy: {
        '/api': { target: env.DEV_API_PROXY || 'http://localhost:8080', changeOrigin: true },
        '/agent-api': {
          target: env.DEV_AGENT_PROXY || 'http://localhost:8090',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/agent-api/, ''),
        },
      },
    },
    build: {
      target: 'es2020',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            markdown: ['react-markdown', 'remark-gfm', 'yaml'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
