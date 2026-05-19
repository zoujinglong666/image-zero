import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

import Uni from '@uni-helper/plugin-uni'
import Components from '@uni-helper/vite-plugin-uni-components'
import { uViewProResolver, ZPagingResolver } from '@uni-helper/vite-plugin-uni-components/resolvers'
import UniRoot from '@uni-ku/root'
import UnoCSS from 'unocss/vite'
import { defineConfig, type ConfigEnv } from 'vite'

export default defineConfig(({ mode }: ConfigEnv) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const isH5Dev = mode === 'development' && process.env.UNI_PLATFORM === 'h5'
  // H5 开发模式用相对路径 /api，走 Vite proxy 避免跨域
  // 生产环境用完整 URL（由 .env 配置）
  const apiBaseUrl = isH5Dev ? '/api' : (env.VITE_API_BASE_URL || '')

  return {
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    // https://github.com/uni-ku/root
    UniRoot(),
    // https://uni-helper.js.org/vite-plugin-uni-components
    Components({
      dts: true,
      resolvers: [ZPagingResolver(), uViewProResolver()],
    }),
    // https://uni-helper.js.org/plugin-uni
    Uni(),
    UnoCSS(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "uview-pro/theme.scss";',
      },
    },
  },
  optimizeDeps: {
    exclude: process.env.UNI_PLATFORM === 'h5' && process.env.NODE_ENV === 'development' ? ['uview-pro'] : [],
  },
    
  // H5 开发环境代理，解决跨域
  // 前端请求 /api/xxx → proxy 转发到后端
  // 开发时请设置 .env.development 中的 VITE_DEV_PROXY_TARGET
  server: mode === 'development' ? {
    proxy: {
      '/api': {
        target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  } : {},

  // 定义全局环境变量（供前端代码读取）
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || '图灵绘境'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
  },

  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
}
})
