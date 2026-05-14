// H5 端 uView Pro 兼容层
// 部分组件在 H5 端可能需要特殊处理
// 此文件作为降级方案，优先使用原生 u- 组件

import { defineComponent, h } from 'vue'

// 如果原生 u-* 组件已注册（easycom 自动导入），此文件不会生效
// 仅在 H5 端某些组件不可用时作为 fallback

export const UpNavbar = defineComponent({
  name: 'UpNavbar',
  props: {
    title: String,
    titleStyle: [Object, String],
    bgColor: { type: String, default: '#FFFFFF' },
    borderBottom: Boolean,
    placeholder: Boolean,
    isBack: { type: Boolean, default: true },
    autoBack: Boolean,
    border: Boolean,
    borderColor: String,
    leftText: String,
    rightText: String,
    leftIcon: String,
    rightIcon: String,
    color: String,
    height: [String, Number],
    safeAreaInsetTop: Boolean,
  },
  setup(props, { slots }) {
    return () => h('div', {
      style: {
        height: '44px',
        background: props.bgColor || '#FFFFFF',
        borderBottom: (props.borderBottom || props.border) ? `1px solid ${props.borderColor || '#E8E8E8'}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        position: 'relative',
        zIndex: 999,
      }
    }, [
      // 左侧返回
      props.isBack && h('div', {
        style: { position: 'absolute', left: '16px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }
      }, [
        h('span', { style: { fontSize: '18px' } }, '←'),
        props.leftText && h('span', { style: { fontSize: '14px', color: props.color || '#333' } }, props.leftText)
      ]),
      // 标题
      h('div', {
        style: {
          fontSize: typeof props.titleStyle === 'object' ? (props.titleStyle as any)?.fontSize : '16px',
          fontWeight: typeof props.titleStyle === 'object' ? (props.titleStyle as any)?.fontWeight : '600',
          color: typeof props.titleStyle === 'object' ? (props.titleStyle as any)?.color : (props.color || '#333'),
          textAlign: 'center'
        }
      }, props.title || slots.default?.() || ''),
      // 右侧插槽
      h('div', { style: { position: 'absolute', right: '16px' } }, slots.right?.())
    ])
  }
})

export const UpPopup = defineComponent({
  name: 'UpPopup',
  props: {
    show: Boolean,
    mode: { type: String, default: 'center' },
    round: [String, Number],
    bgColor: { type: String, default: '#FFFFFF' },
    maskCloseAble: { type: Boolean, default: true },
    overlayOpacity: [String, Number],
  },
  setup(props, { slots, emit }) {
    return () => props.show ? h('div', {
      style: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: `rgba(0,0,0,${props.overlayOpacity || 0.5})`,
        zIndex: 10000,
        display: 'flex',
        flexDirection: props.mode === 'bottom' ? 'column' : 'row',
        alignItems: props.mode === 'bottom' ? 'flex-end' : 'center',
        justifyContent: 'center',
      },
      onClick: (e: Event) => {
        if (e.target === e.currentTarget && props.maskCloseAble) emit('close')
      }
    }, h('div', {
      style: {
        background: props.bgColor,
        borderRadius: props.round ? `${props.round}px` : (props.mode === 'bottom' ? '20px 20px 0 0' : '12px'),
        padding: '24px',
        maxWidth: props.mode === 'center' ? '90%' : '100%',
        maxHeight: '80vh',
        width: props.mode === 'bottom' ? '100%' : 'auto',
        overflow: 'auto',
      }
    }, slots.default?.())) : null
  }
})

export const UpLoadingIcon = defineComponent({
  name: 'UpLoadingIcon',
  props: {
    text: String,
    color: { type: String, default: '#333' },
    size: { type: [String, Number], default: 24 },
    vertical: Boolean,
  },
  setup(props) {
    return () => h('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: props.color,
        flexDirection: props.vertical ? 'column' : 'row',
        fontSize: `${props.size}px`,
      }
    }, [
      h('span', { style: { animation: 'spin 1s linear infinite', display: 'inline-block' } }, '⟳'),
      props.text && h('span', null, props.text)
    ])
  }
})

// 图标组件 - 使用 Unicode 符号映射
const iconMap: Record<string, string> = {
  // 导航
  'arrow-left': '←', 'arrow-right': '→', 'arrow-up': '↑', 'arrow-down': '↓',
  'arrow-leftward': '←', 'arrow-rightward': '→', 'arrow-upward': '↑', 'arrow-downward': '↓',
  'arrow-left-double': '⇐', 'arrow-right-double': '⇒',
  'backspace': '⌫', 'close': '✕', 'checkmark': '✓',
  'more-dot-fill': '⋯', 'more-circle-fill': '⊕',
  
  // 文件/内容
  'file-text': '📄', 'file-text-fill': '📄', 'photo': '🖼️', 'photo-fill': '🖼️',
  'image': '🖼️', 'folder': '', 'download': '⬇', 'upload': '⬆',
  'copy': '📋', 'edit-pen': '✏', 'edit-pen-fill': '✏',
  'trash': '🗑', 'trash-fill': '🗑', 'bookmark': '🔖', 'bookmark-fill': '🔖',
  'tag': '🏷', 'tags': '🏷', 'tags-fill': '🏷',
  
  // 操作
  'reload': '↻', 'refresh': '↻', 'search': '🔍', 'scan': '⬛',
  'setting': '⚙', 'setting-fill': '⚙', 'share': '↗', 'share-fill': '↗',
  'attach': '📎', 'link': '🔗',
  
  // 媒体
  'play-right': '▶', 'play-left': '◀', 'pause': '⏸',
  'play-circle': '▶', 'play-circle-fill': '▶',
  'pause-circle': '⏸', 'pause-circle-fill': '⏸',
  'volume': '🔊', 'volume-fill': '🔊',
  'volume-off': '🔇', 'volume-off-fill': '🔇',
  'volume-up': '🔊', 'volume-up-fill': '🔊',
  
  // 状态
  'star': '☆', 'star-fill': '★',
  'heart': '♡', 'heart-fill': '♥',
  'info': 'ℹ', 'info-circle': 'ℹ', 'info-circle-fill': 'ℹ',
  'warning': '⚠', 'warning-fill': '⚠',
  'error': '✕', 'error-circle': '✕', 'error-circle-fill': '✕',
  'success': '✓', 'checkmark-circle': '✓', 'checkmark-circle-fill': '✓',
  'question': '?', 'question-circle': '?', 'question-circle-fill': '?',
  
  // 用户
  'user': '👤', 'account': '👤', 'account-fill': '👤',
  'phone': '📞', 'phone-fill': '📞',
  'email': '✉', 'email-fill': '✉',
  'lock': '🔒', 'lock-fill': '🔒',
  'lock-open': '🔓', 'lock-opened-fill': '🔓',
  
  // 时间
  'clock': '🕐', 'clock-fill': '🕐',
  'calendar': '📅', 'calendar-fill': '📅',
  'hourglass': '⏳', 'hourglass-half-fill': '⏳',
  'history': '⟲',
  
  // 界面
  'home': '🏠', 'home-fill': '🏠',
  'grid': '⊞', 'grid-fill': '⊞',
  'list': '☰', 'list-dot': '☰',
  'bell': '🔔', 'bell-fill': '🔔',
  'map': '🗺', 'map-fill': '🗺',
  'location': '📍', 'wifi': '📶', 'wifi-off': '📵',
  
  // 购物
  'shopping-cart': '🛒', 'shopping-cart-fill': '🛒',
  'bag': '🛍', 'bag-fill': '🛍',
  'wallet': '👛', 'gift': '🎁', 'gift-fill': '🎁',
  'coupon': '🎟', 'coupon-fill': '🎟',
  'rmb': '¥', 'integral': '💎', 'integral-fill': '💎',
  
  // 其他
  'minus': '−', 'plus': '+',
  'minus-circle': '⊖', 'plus-circle': '⊕',
  'eye': '👁', 'eye-fill': '👁', 'eye-off': '🚫',
  'level': '≡', 'fold': '▸', 'unfold': '▾',
  'camera': '📷', 'camera-fill': '📷',
  'pushpin': '📌', 'pushpin-fill': '📌',
  'thumb-up': '👍', 'thumb-up-fill': '👍',
  'thumb-down': '👎', 'thumb-down-fill': '👎',
  'car': '🚗', 'car-fill': '🚗',
  'fingerprint': '🔮', 'cut': '✂',
  'chat': '💬', 'chat-fill': '💬',
  'red-packet': '🧧', 'red-packet-fill': '🧧',
  'order': '📋', 'checkbox-mark': '☑',
  'woman': '👩', 'man': '👨',
  'man-add': '➕', 'man-add-fill': '➕',
  'man-delete': '➖', 'person-delete-fill': '➖',
  'mic': '🎤', 'mic-off': '🔇',
  'rewind-right': '⏩', 'rewind-left': '⏪',
  'skip-back-left': '⏮', 'skip-forward-right': '⏭',
  'server-man': '🖥', 'server-fill': '🖥',
  'kefu-ermai': '🎧',
  'zhuanfa': '↪', 'google': 'G', 'chrome': '🌐',
  'ie': '🌐', 'github': '⚙',
  'android-fill': '🤖', 'apple-fill': '🍎',
  'weixin-fill': '💬', 'weixin-circle-fill': '💬',
  'qq-fill': 'QQ', 'qq-circle-fill': 'QQ',
  'weibo': '📢', 'weibo-circle-fill': '📢',
  'taobao': '🛒', 'taobao-circle-fill': '🛒',
  'zhifubao': '💰', 'zhifubao-circle-fill': '💰',
  'twitter': '🐦', 'twitter-circle-fill': '🐦',
  'facebook': 'f', 'facebook-circle-fill': 'f',
  'baidu': '🔍', 'baidu-circle-fill': '🔍',
  'zhihu': '知', 'zhihu-circle-fill': '知',
  'moments': '⭕', 'moments-circel-fill': '⭕',
  'qzone': '⭐', 'qzone-circle-fill': '⭐',
  'google-circle-fill': 'G', 'chrome-circle-fill': '🌐',
  'IE-circle-fill': '🌐', 'github-circle-fill': '⚙',
  'android-circle-fill': '🤖', 'apple-circle-fill': '🍎',
  'minus-square-fill': '⊟', 'plus-square-fill': '⊞',
  'more-dot': '⋯', 'more-circle': '○',
  'close-circle': '✕', 'close-circle-fill': '✕',
  'minus-circle': '⊖', 'minus-circle-fill': '⊖',
  'plus-circle': '⊕', 'plus-circle-fill': '⊕',
}

export const UpIcon = defineComponent({
  name: 'UpIcon',
  props: {
    name: String,
    color: { type: String, default: 'inherit' },
    size: { type: [String, Number], default: 'inherit' },
    label: String,
    labelPos: { type: String, default: 'right' },
    labelSize: { type: [String, Number], default: 28 },
    labelColor: { type: String, default: '#606266' },
    bold: Boolean,
    index: String,
    hoverClass: String,
    customPrefix: String,
    space: [String, Number],
    marginLeft: [String, Number],
    marginTop: [String, Number],
    marginRight: [String, Number],
    marginBottom: [String, Number],
    press: Boolean,
    width: [String, Number],
    height: [String, Number],
    top: [String, Number],
    showDecimalIcon: Boolean,
    inactiveColor: String,
    percent: [String, Number],
  },
  setup(props, { emit }) {
    const iconChar = computed(() => {
      if (!props.name) return '●'
      return iconMap[props.name] || '●'
    })

    return () => h('span', {
      class: 'up-icon-fallback',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typeof props.size === 'number' ? `${props.size / 2}px` : (props.size || '16px'),
        color: props.color,
        fontWeight: props.bold ? 'bold' : 'normal',
        cursor: props.press ? 'pointer' : 'default',
        lineHeight: 1,
      },
      onClick: () => emit('click', props.index),
    }, [
      iconChar.value,
      props.label ? h('span', {
        style: {
          marginLeft: props.labelPos !== 'left' ? (typeof props.marginLeft === 'number' ? `${props.marginLeft}px` : (props.marginLeft || '6px')) : undefined,
          marginTop: props.labelPos === 'bottom' ? (typeof props.marginTop === 'number' ? `${props.marginTop}px` : (props.marginTop || '6px')) : undefined,
          fontSize: typeof props.labelSize === 'number' ? `${props.labelSize / 2}px` : `${parseInt(String(props.labelSize)) || 14}px`,
          color: props.labelColor || props.color,
        }
      }, props.label) : null,
    ])
  }
})

// 默认导出
export default {
  UpNavbar,
  UpPopup,
  UpLoadingIcon,
  UpIcon,
}