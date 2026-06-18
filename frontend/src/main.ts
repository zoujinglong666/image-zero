import * as Pinia from 'pinia'
import uViewPro, { httpPlugin } from 'uview-pro'
import { createSSRApp } from 'vue'
import themes from '@/common/uview-pro.theme'
import { enUS, zhCN } from '@/locale'
import store from '@/stores'
import App from './App.vue'
import { httpInterceptor, httpRequestConfig } from './common/http.interceptor'
import 'uno.css'

export function createApp() {
  const app = createSSRApp(App)
  
  // 注册 uView Pro（easycom 自动导入所有 u-* 组件）
  app.use(uViewPro, {
    theme: {
      themes,
      defaultTheme: 'indigo',
      defaultDarkMode: 'light',
    },
    locale: {
      locales: [zhCN, enUS],
      defaultLocale: 'zh-CN',
    },
  })
  
  app.use(httpPlugin, {
    requestConfig: httpRequestConfig,
    interceptor: httpInterceptor,
  })
  app.use(store)
  return {
    app,
    Pinia,
  }
}
