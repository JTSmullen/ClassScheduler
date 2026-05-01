import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
