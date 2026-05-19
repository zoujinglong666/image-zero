import { defineConfig } from 'uview-plus'

export default defineConfig({
  // 主题配置 - 灵动紫
  theme: {
    // 主色调 - 灵动紫
    primary: '#7C4DFF',
    // 辅助色 - 深紫
    warning: '#FF9100',
    // 成功色
    success: '#00C853',
    // 错误色
    error: '#FF5252',
    // 信息色
    info: '#78909C',
  },
  
  // 组件默认配置
  components: {
    // 导航栏
    navbar: {
      bgColor: '#FFFFFF',
      titleColor: '#1C1C1C',
      border: true,
      borderColor: '#E8E8E8'
    },
    // 按钮
    button: {
      type: 'primary',
      shape: 'square',
      size: 'normal'
    },
    // 卡片
    card: {
      bgColor: '#FFFFFF',
      border: true,
      borderColor: '#E8E8E8',
      radius: 12
    },
    // 弹窗
    popup: {
      bgColor: '#FFFFFF',
      borderRadius: 12
    },
    // 输入框
    input: {
      color: '#1C1C1C',
      placeholderColor: '#CCCCCC',
      borderColor: '#E8E8E8'
    },
    // 标签
    tag: {
      type: 'default',
      size: 'mini'
    }
  },
  
  // 颜色变量 - 灵动紫风格
  colors: {
    // 主色
    primary: '#7C4DFF',
    primaryDark: '#6200EA',
    primaryLight: '#B388FF',
    primaryBg: '#EDE7F6',
    // 文字
    ink: '#1C1C1C',
    // 背景
    bg: '#FFFFFF',
    // 卡片背景
    card: '#FAFAFA',
    // 边框
    border: '#E8E8E8',
    // 次要文字
    textSecondary: '#666666',
    // 辅助文字
    textTertiary: '#999999',
    // 占位符
    placeholder: '#CCCCCC'
  }
})