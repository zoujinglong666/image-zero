<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="图灵绘境"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600', fontSize: '17px' }"
      :bgColor="'#FFFFFF'"
      :borderBottom="true"
      :placeholder="true"
    >
      <template #right>
        <u-icon name="setting" size="20" color="#1C1C1C" @click="goToSettings" />
      </template>
    </u-navbar>

    <!-- 主内容滚动区 -->
    <scroll-view scroll-y class="main-scroll">

      <!-- ====== Step 1: 上传图片 ====== -->
      <view class="card">
        <view class="card-header">
          <u-icon name="photo" size="18" color="#D4A017" />
          <text class="card-title">上传图片</text>
          <text class="card-sub">选择需要分析的截图或设计稿</text>
        </view>

        <!-- 上传卡片 -->
        <view class="upload-zone" @tap="triggerUpload">
          <block v-if="uploadedImage">
            <image class="upload-preview" :src="uploadedImage" mode="aspectFill" />
            <view class="upload-overlay">
              <u-icon name="reload" size="16" color="#fff" />
              <text>点击更换</text>
            </view>
          </block>
          <view v-else class="upload-placeholder">
            <view class="upload-icon-ring">
              <u-icon name="plus" size="28" color="#D4A017" />
            </view>
            <text class="upload-text">点击上传图片</text>
            <text class="upload-hint">支持 JPG / PNG / WebP</text>
          </view>
        </view>

        <!-- 图片状态栏 -->
        <view v-if="uploadedImage" class="img-status-bar">
          <u-tag text="已就绪" type="success" size="mini" />
          <text class="status-text">准备 AI 分析</text>
          <view class="status-clear" @tap.stop="clearImage">
            <u-icon name="close-circle-fill" size="16" color="#bbb" />
          </view>
        </view>
      </view>

      <!-- ====== Step 2: 分析操作 ====== -->
      <view class="card">
        <view class="card-header">
          <u-icon name="file-text" size="18" color="#D4A017" />
          <text class="card-title">AI 提取提示词</text>
          <text class="card-sub">自动识别风格 / 元素 / 配色</text>
        </view>

        <!-- 主按钮 -->
        <button
          class="analyze-btn"
          :class="{ ready: uploadedImage && !analyzing, disabled: !uploadedImage || analyzing }"
          :disabled="!uploadedImage || analyzing"
          @click="analyzeImage"
        >
          <block v-if="analyzing">
            <view class="loading-spinner" />
            <text>AI 正在分析中...</text>
          </block>
          <block v-else>
            <u-icon name="search" size="18" :color="uploadedImage ? '#FFF' : '#999'" />
            <text>{{ uploadedImage ? '开始解析图片' : '请先上传图片' }}</text>
          </block>
        </button>

        <!-- 提示条 -->
        <view v-if="!uploadedImage" class="tip-bar">
          <u-icon name="info-circle" size="14" color="#999" />
          <text>上传任意设计稿，AI 将反推完整的 Midjourney / SD 提示词</text>
        </view>
      </view>

      <!-- ====== 分析结果 ====== -->
      <view v-if="analysisResult" class="result-card">
        <!-- 结果头部 -->
        <view class="result-head">
          <view class="result-badge">
            <u-icon name="checkmark-circle-fill" size="16" color="#D4A017" />
            <text>分析完成</text>
          </view>
          <view class="result-actions">
            <u-button type="primary" size="mini" plain text="复制提示词" icon="copy" @click="copyPrompt" />
          </view>
        </view>

        <!-- 风格标签 -->
        <view class="style-tag-row">
          <u-tag :text="analysisResult.style" type="warning" size="medium" />
          <view class="conf-pill">
            <text>置信度 {{ (analysisResult.styleConfidence * 100).toFixed(0) }}%</text>
          </view>
        </view>

        <!-- 英文提示词 -->
        <view class="prompt-block">
          <view class="prompt-label-row">
            <u-icon name="language" size="14" color="#D4A017" />
            <text>English Prompt</text>
          </view>
          <view class="prompt-body en">{{ analysisResult.prompt.english }}</view>
        </view>

        <!-- 中文描述 -->
        <view class="prompt-block">
          <view class="prompt-label-row">
            <u-icon name="chat" size="14" color="#666" />
            <text>中文描述</text>
          </view>
          <view class="prompt-body cn">{{ analysisResult.prompt.chinese }}</view>
        </view>

        <!-- 关键词 -->
        <view v-if="analysisResult.prompt.keywords?.length" class="kw-section">
          <view class="prompt-label-row">
            <u-icon name="tags" size="14" color="#2979ff" />
            <text>关键词权重</text>
          </view>
          <view class="kw-flex">
            <u-tag
              v-for="(kw, idx) in analysisResult.prompt.keywords"
              :key="idx"
              :text="`${kw.keyword} (${kw.weight})`"
              :type="kw.weight > 1.2 ? 'warning' : 'info'"
              size="mini"
              plain
            />
          </view>
        </view>

        <!-- 配色方案 -->
        <view v-if="analysisResult.colorScheme?.length" class="color-section">
          <view class="prompt-label-row">
            <u-icon name="color-fill" size="14" color="#E91E63" />
            <text>配色方案</text>
          </view>
          <scroll-view scroll-x class="color-scroll-x">
            <view class="color-row">
              <view
                v-for="(c, ci) in analysisResult.colorScheme"
                :key="ci"
                class="color-item"
              >
                <view class="color-swatch" :style="{ backgroundColor: c.hex }">
                  <text class="color-hex">{{ c.hex.toUpperCase() }}</text>
                </view>
                <text class="color-name">{{ c.name }}</text>
                <text class="color-ratio">{{ c.ratio }}%</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 元素识别 -->
        <view v-if="analysisResult.elements?.length" class="elem-section">
          <view class="prompt-label-row">
            <u-icon name="grid" size="14" color="#19be6b" />
            <text>元素识别</text>
          </view>
          <view class="elem-list">
            <view v-for="(el, ei) in analysisResult.elements" :key="ei" class="elem-item">
              <view class="elem-dot" :style="{ background: '#D4A017' }">{{ el.label.charAt(0) }}</view>
              <view class="elem-info">
                <text class="elem-name">{{ el.label }}</text>
                <text class="elem-desc">{{ el.description }}</text>
              </view>
              <u-tag :text="(el.confidence * 100).toFixed(0) + '%'" type="success" size="mini" />
            </view>
          </view>
        </view>

        <!-- 操作按钮组 -->
        <view class="action-grid">
          <button class="action-btn primary" @click="goToEdit">
            <u-icon name="edit-pen" size="18" color="#FFF" />
            <text>编辑优化</text>
          </button>
          <button class="action-btn warning" @click="generateImage">
            <u-icon name="photo-fill" size="18" color="#D4A017" />
            <text>生成图片</text>
          </button>
        </view>
      </view>

      <!-- ====== AI 生成结果（在 scroll-view 内部！）====== -->
      <view v-if="showResult && generatedImage" class="gen-card">
        <view class="gen-head">
          <u-icon name="checkmark-circle-fill" size="18" color="#19be6b" />
          <text class="gen-title">AI 生成结果</text>
          <u-tag text="NEW" type="success" size="mini" />
        </view>
        <image class="gen-image" :src="generatedImage" mode="widthFix" @click="previewGenImage" />
        <view class="gen-actions">
          <button class="gen-btn primary" @click="downloadImage">
            <u-icon name="download" size="16" color="#FFF" />
            <text>保存到相册</text>
          </button>
          <button class="gen-btn outline" @click="generateImage">
            <u-icon name="reload" size="16" color="#D4A017" />
            <text>重新生成</text>
          </button>
        </view>
      </view>

      <!-- 历史记录入口 -->
      <view v-if="!analysisResult" class="history-link" @tap="goToHistory">
        <view class="history-link-inner">
          <u-icon name="clock" size="18" color="#999" />
          <text>最近解析记录</text>
          <text class="history-count">{{ historyCount }} 条</text>
          <u-icon name="arrow-right" size="14" color="#ccc" />
        </view>
      </view>

      <view class="bottom-spacer" />

    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history'
import type { ImageAnalysisResult } from '@/types'

const historyStore = useHistoryStore()
const historyCount = computed(() => historyStore?.history?.length ?? 0)

// 状态
const uploadedImage = ref('')
const analyzing = ref(false)
const analysisResult = ref<ImageAnalysisResult | null>(null)
const showResult = ref(false)
const generatedImage = ref('')

// ====== 图片上传 ======
const triggerUpload = () => {
  // #ifdef H5
  const existingInput = document.getElementById('__turing_file_input__') as HTMLInputElement
  if (existingInput) existingInput.remove()

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.id = '__turing_file_input__'
  input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;'

  input.onchange = (e: any) => {
    const files = e.target.files
    if (!files || !files[0]) return
    const reader = new FileReader()
    reader.onload = (ev: any) => {
      uploadedImage.value = ev.target.result as string
      analysisResult.value = null
      showResult.value = false
      generatedImage.value = ''
    }
    reader.readAsDataURL(files[0])
    setTimeout(() => input.remove(), 100)
  }

  document.body.appendChild(input)
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      uploadedImage.value = res.tempFilePaths[0]
      analysisResult.value = null
      showResult.value = false
      generatedImage.value = ''
    }
  })
  // #endif
}

const clearImage = () => {
  uploadedImage.value = ''
  analysisResult.value = null
  showResult.value = false
  generatedImage.value = ''
}

// ====== 分析图片（真实后端 API）======
const analyzeImage = async () => {
  if (!uploadedImage.value || analyzing.value) return
  analyzing.value = true

  try {
    uni.showLoading({ title: 'AI 正在深度分析...', mask: true })

    const res = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: uploadedImage.value })
    })

    const json = await res.json()

    if (!res.ok || !json.success) {
      throw new Error(json?.error || json?.message || `分析失败 (HTTP ${res.status})`)
    }

    // 后端返回 { success, source, elapsed, data: ImageAnalysisResult }
    const result = json.data as ImageAnalysisResult
    analysisResult.value = result

    // 存历史
    historyStore.addHistory({
      id: Date.now().toString(),
      imageUrl: uploadedImage.value,
      prompt: result.prompt.chinese,
      timestamp: Date.now(),
      favorite: false
    })

    uni.hideLoading()
    uni.showToast({ title: `✅ ${result.style} 风格`, icon: 'none', duration: 2000 })
    console.log(`✅ 分析完成 | 风格: ${result.style} | 来源: ${json.source}`)
  } catch (err: any) {
    console.error('❌ 分析失败:', err)
    uni.showToast({ title: err.message || '分析失败，请重试', icon: 'none' })
  } finally {
    analyzing.value = false
    uni.hideLoading()
  }
}

// ====== 操作方法 ======
const copyPrompt = () => {
  if (!analysisResult.value) return
  uni.setClipboardData({
    data: analysisResult.value.prompt.english,
    success: () => uni.showToast({ title: '已复制 ✓', icon: 'success' })
  })
}

const goToEdit = () => {
  if (!analysisResult.value) {
    uni.showToast({ title: '请先分析图片', icon: 'none' })
    return
  }
  try {
    const dataStr = JSON.stringify(analysisResult.value)
    if (dataStr.length > 8000) console.warn('[跳转] 数据较大，可能截断')
    uni.navigateTo({
      url: '/pages/edit/edit?data=' + encodeURIComponent(dataStr)
    })
  } catch (e) {
    console.error('跳转失败:', e)
    uni.showToast({ title: '跳转失败', icon: 'none' })
  }
}

// ====== 生成图片（真实后端 API）======
const generateImage = async () => {
  if (!analysisResult.value) {
    uni.showToast({ title: '请先分析图片', icon: 'none' })
    return
  }

  const prompt = analysisResult.value?.prompt?.english
  uni.showLoading({ title: 'AI 绘画中...', mask: true })

  try {
    const res = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 1024, height: 1024, model: 'flux' })
    })

    const json = await res.json()

    if (!res.ok || !json.success) {
      throw new Error(json?.error || json?.message || '生成失败')
    }

    const imageUrl = json.data.images[0].url
    generatedImage.value = imageUrl
    showResult.value = true

    uni.hideLoading()
    uni.showToast({ title: '图片生成成功 ✓', icon: 'success' })

    // 滚动到生成结果位置
    setTimeout(() => {
      // 让用户看到新生成的区域
      console.log('✅ 生成完成，图片URL:', imageUrl)
    }, 100)
  } catch (err: any) {
    console.error('❌ 生成失败:', err)
    uni.showToast({ title: err.message || '生成失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 预览生成的图片（全屏）
const previewGenImage = () => {
  if (!generatedImage.value) return
  uni.previewImage({
    urls: [generatedImage.value],
    current: generatedImage.value
  })
}

const downloadImage = () => {
  if (!generatedImage.value) return
  uni.downloadFile({
    url: generatedImage.value,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '保存成功 ✓', icon: 'success' }),
        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
      })
    }
  })
}

const goToHistory = () => {
  uni.switchTab({ url: '/pages/history/history' })
}

const goToSettings = () => {
  uni.switchTab({ url: '/pages/mine/mine' })
}
</script>

<style lang="scss" scoped>
/* ====== 全局 ====== */
.page {
  min-height: 100vh;
  background: #F5F6F7;
}

.main-scroll {
  height: calc(100vh - 44px);
}

.bottom-spacer {
  height: calc(env(safe-area-inset-bottom) + 40rpx);
}

/* ====== 卡片通用 ====== */
.card {
  margin: 20rpx 24rpx;
  padding: 28rpx 28rpx 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1C;
}

.card-sub {
  font-size: 22rpx;
  color: #AAAAAA;
  margin-left: auto;
}

/* ====== 上传区域 ====== */
.upload-zone {
  position: relative;
  border: 2rpx dashed #DDD;
  border-radius: 16rpx;
  overflow: hidden;
  min-height: 280rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    border-color: #D4A017;
  }
}

.upload-preview {
  width: 100%;
  height: 280rpx;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(28, 28, 28, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  opacity: 0;
  transition: opacity 0.25s;

  text {
    font-size: 24rpx;
    color: #FFF;
  }
}

.upload-zone:active .upload-overlay,
.upload-zone:hover .upload-overlay {
  opacity: 1;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.upload-icon-ring {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF9E6, #FFE8B0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.upload-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1C1C1C;
  margin-bottom: 8rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: #BBBBBB;
}

.img-status-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F0F0F0;
}

.status-text {
  font-size: 24rpx;
  color: #777;
}

.status-clear {
  margin-left: auto;
  padding: 8rpx;
}

/* ====== 分析按钮 ====== */
.analyze-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  transition: all 0.2s;

  &.ready {
    background: linear-gradient(135deg, #1C1C1C, #333);
    color: #FFF;
    box-shadow: 0 4rpx 16rpx rgba(28, 28, 28, 0.3);

    &:active {
      transform: scale(0.98);
      box-shadow: 0 2rpx 8rpx rgba(28, 28, 28, 0.2);
    }
  }

  &.disabled {
    background: #EEE;
    color: #AAA;
  }
}

.tip-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: #FAFAFA;
  border-radius: 12rpx;

  text {
    font-size: 23rpx;
    color: #999;
    line-height: 1.5;
  }
}

/* ====== 结果卡片 ====== */
.result-card {
  margin: 20rpx 24rpx;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.result-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;

  text {
    font-size: 28rpx;
    font-weight: 700;
    color: #1C1C1C;
  }
}

.result-actions {
  display: flex;
  gap: 12rpx;
}

.style-tag-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.conf-pill {
  padding: 4rpx 16rpx;
  background: #FFF9E6;
  border-radius: 20rpx;

  text {
    font-size: 22rpx;
    color: #D4A017;
    font-weight: 500;
  }
}

/* ====== 提示词块 ====== */
.prompt-block {
  margin-bottom: 24rpx;
}

.prompt-label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;

  text {
    font-size: 22rpx;
    color: #BBB;
    letter-spacing: 1rpx;
    font-family: -apple-system, BlinkMacSystemFont, monospace;
  }
}

.prompt-body {
  font-size: 27rpx;
  line-height: 1.75;
  padding: 24rpx;
  border-radius: 12rpx;

  &.en {
    color: #1C1C1C;
    background: #FAFAFA;
    border-left: 6rpx solid #D4A017;
    word-break: break-word;
  }

  &.cn {
    color: #555;
    background: #FDFDFD;
    border-left: 6rpx solid #DDD;
  }
}

/* ====== 关键词 ====== */
.kw-section {
  margin-bottom: 24rpx;
}

.kw-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

/* ====== 配色 ====== */
.color-section {
  margin-bottom: 24rpx;
}

.color-scroll-x {
  white-space: nowrap;
  margin-top: 12rpx;
}

.color-row {
  display: inline-flex;
  gap: 24rpx;
  padding: 8rpx 0;
}

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.color-swatch {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.color-hex {
  font-size: 17rpx;
  color: #FFF;
  text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.3);
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
}

.color-name {
  font-size: 22rpx;
  color: #1C1C1C;
  font-weight: 500;
}

.color-ratio {
  font-size: 18rpx;
  color: #999;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
}

/* ====== 元素 ====== */
.elem-section {
  margin-bottom: 24rpx;
}

.elem-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.elem-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
}

.elem-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #FFF;
  flex-shrink: 0;
}

.elem-info {
  flex: 1;
  min-width: 0;
}

.elem-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1C1C1C;
  display: block;
}

.elem-desc {
  font-size: 22rpx;
  color: #999;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ====== 操作按钮组 ====== */
.action-grid {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F0F0F0;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 29rpx;
  font-weight: 600;
  border: none;

  &.primary {
    background: #1C1C1C;
    color: #FFF;
    box-shadow: 0 4rpx 12rpx rgba(28, 28, 28, 0.2);

    &:active {
      transform: scale(0.97);
    }
  }

  &.warning {
    background: #FFF;
    color: #D4A017;
    border: 2rpx solid #D4A017;

    &:active {
      background: #FFFEF8;
    }
  }
}

/* ====== AI 生成结果区 ====== */
.gen-card {
  margin: 20rpx 24rpx;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(25, 190, 107, 0.08);
  animation: slideUp 0.35s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gen-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.gen-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1C;
  flex: 1;
}

.gen-image {
  width: 100%;
  border-radius: 14rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.gen-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.gen-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: none;

  &.primary {
    background: #1C1C1C;
    color: #FFF;
  }

  &.outline {
    background: #FFF;
    color: #D4A017;
    border: 2rpx solid #EEE;
  }
}

/* ====== 加载动画 ====== */
.loading-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba(255,255,255,0.3);
  border-top-color: #FFF;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ====== 历史入口 ====== */
.history-link {
  margin: 20rpx 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.history-link-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 28rpx;

  text {
    font-size: 28rpx;
    color: #1C1C1C;
    flex: 1;
  }
}

.history-count {
  font-size: 24rpx;
  color: #999;
}
</style>
