<script setup lang="ts">
import type { PropType } from 'vue'
import { $u } from 'uview-pro'
import { reactive } from 'vue'

defineProps({
  navTitle: {
    type: String,
    default: 'uView Pro',
  },
  showNavBack: {
    type: Boolean,
    default: true,
  },
  hideNav: {
    type: Boolean,
    default: false,
  },
  showTabbar: {
    type: Boolean,
    default: false,
  },
  customStyle: {
    type: [String, Object] as PropType<string | Record<string, any>>,
    default: '',
  },
  customClass: {
    type: [String, Object] as PropType<string | Record<string, any>>,
    default: '',
  },
})

const background = reactive({
  backgroundColor: '#FFFFFF',
  // 纯白背景，与所有页面 Mist Canvas 导航栏一致
  backgroundImage: 'none',
})
</script>

<template>
  <view class="app-page" :class="{ 'has-tabbar': showTabbar }" :style="$u.toStyle(customStyle)">
    <!-- #ifndef MP-ALIPAY -->
    <u-navbar
      v-if="!hideNav" :is-back="showNavBack && !showTabbar" :title="navTitle" :background="background" :is-fixed="true"
      :immersive="false" back-icon-name="arrow-leftward" title-width="350" title-color="#2C2E3A"
      back-icon-color="#2C2E3A"
    />
    <!-- #endif -->
    <u-transition name="slide-left" :appear="true">
      <slot />
    </u-transition>
    <app-tabbar v-if="showTabbar" />
  </view>
</template>

<style lang="scss" scoped>
.app-page {
    width: 100%;
    min-height: 100vh;
    overflow-y: auto;
    background-color: #F6F7FB;
    -webkit-font-smoothing: antialiased;
    color: #2C2E3A;
    transition: background 0.3s ease;

    &.has-tabbar {
        background-image: none;
    }
}
</style>
