<template>
  <view class="page">
    <!-- 导航栏 -->
    <u-navbar
      title="提示词编辑"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600' }"
      :borderBottom="true"
      :placeholder="true"
      :autoBack="true"
    >
      <template #right>
        <button class="nav-preview-btn" @click="previewEdit">
          <u-icon name="eye" size="15" color="#7C4DFF" />
          <text>预览</text>
        </button>
      </template>
    </u-navbar>

    <!-- 无数据空状态 -->
    <view v-if="!editData" class="empty-state">
      <view class="empty-icon-wrap">
        <u-icon name="file-text" size="64" color="#DDD" />
      </view>
      <text class="empty-title">暂无编辑数据</text>
      <text class="empty-desc">请先在首页上传并解析图片</text>
      <button class="empty-btn" @click="goHome">
        <u-icon name="arrow-leftward" size="16" color="#FFF" />
        <text>去首页解析</text>
      </button>
    </view>

    <!-- 编辑内容 -->
    <scroll-view v-else scroll-y class="edit-scroll">

      <!-- 面板 01: 提示词编辑 -->
      <view class="panel">
        <view class="panel-head">
          <view class="panel-num">01</view>
          <view class="panel-info">
            <text class="panel-title">提示词编辑</text>
            <text class="panel-sub">修改 AI 生成的中英文提示词</text>
          </view>
        </view>

        <!-- 英文 -->
        <view class="field">
          <view class="field-label">
            <view class="label-dot en"></view>
            <text>English Prompt</text>
          </view>
          <textarea
            class="field-textarea"
            v-model="editData.prompt.english"
            placeholder="输入英文提示词，用于 AI 绘画..."
            :maxlength="2000"
            auto-height
          />
          <view class="field-count">{{ editData.prompt.english.length }}/2000</view>
        </view>

        <!-- 中文 -->
        <view class="field">
          <view class="field-label">
            <view class="label-dot cn"></view>
            <text>中文描述</text>
          </view>
          <textarea
            class="field-textarea"
            v-model="editData.prompt.chinese"
            placeholder="输入中文描述..."
            :maxlength="1000"
            auto-height
          />
          <view class="field-count">{{ editData.prompt.chinese.length }}/1000</view>
        </view>

        <!-- 关键词 -->
        <view class="field">
          <view class="field-label">
            <view class="label-dot kw"></view>
            <text>关键词权重</text>
            <button class="add-kw-btn" @click="addKeyword">+ 添加</button>
          </view>
          <view v-if="!editData.prompt.keywords?.length" class="kw-empty">
            <text>暂无关键词</text>
          </view>
          <view v-else class="kw-list">
            <view v-for="(kw, idx) in editData.prompt.keywords" :key="idx" class="kw-item">
              <input class="kw-input" v-model="kw.keyword" placeholder="关键词" />
              <input class="kw-weight" v-model.number="kw.weight" type="digit" placeholder="权重" />
              <u-icon name="close-circle-fill" size="20" color="#fa3534" @click="removeKeyword(idx)" />
            </view>
          </view>
        </view>
      </view>

      <!-- 面板 02: 色彩调整 -->
      <view class="panel">
        <view class="panel-head">
          <view class="panel-num">02</view>
          <view class="panel-info">
            <text class="panel-title">色彩调整</text>
            <text class="panel-sub">主色调与配色方案</text>
          </view>
        </view>

        <view class="field">
          <view class="field-label">
            <view class="label-dot color"></view>
            <text>主色调</text>
          </view>
          <view class="color-row">
            <view
              v-for="(c, ci) in presetColors"
              :key="ci"
              class="color-dot"
              :class="{ active: editData.primaryColor === c }"
              :style="{ backgroundColor: c }"
              @tap="editData.primaryColor = c"
            >
              <u-icon v-if="editData.primaryColor === c" name="checkmark" size="12" color="#fff" />
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-label">
            <view class="label-dot scheme"></view>
            <text>配色方案</text>
          </view>
          <view class="scheme-list">
            <view v-for="(c, ci) in editData.colorScheme" :key="ci" class="scheme-item">
              <view class="scheme-swatch" :style="{ backgroundColor: c.hex }"></view>
              <text class="scheme-name">{{ c.name }}</text>
              <input class="scheme-ratio" v-model.number="c.ratio" type="digit" placeholder="%" />
            </view>
          </view>
        </view>
      </view>

      <!-- 面板 03: 元素管理 -->
      <view class="panel">
        <view class="panel-head">
          <view class="panel-num">03</view>
          <view class="panel-info">
            <text class="panel-title">元素管理</text>
            <text class="panel-sub">增删改 UI 元素</text>
          </view>
        </view>

        <view v-if="!editData.elements?.length" class="kw-empty">
          <text>暂无元素数据</text>
        </view>
        <view v-else class="elem-list">
          <view v-for="(el, ei) in editData.elements" :key="ei" class="elem-card">
            <view class="elem-top">
              <view class="elem-badge">
                <text>{{ el.label.charAt(0) }}</text>
              </view>
              <text class="elem-name">{{ el.label }}</text>
              <u-tag :text="(el.confidence * 100).toFixed(0) + '%'" type="success" size="mini" />
            </view>
            <input class="elem-desc-input" v-model="el.description" placeholder="元素描述..." />
            <button class="elem-del-btn" @click="removeElement(ei)">删除此元素</button>
          </view>
        </view>
        <button class="add-elem-btn" @click="addElement">+ 添加新元素</button>
      </view>

      <!-- 面板 04: 布局 & 风格 -->
      <view class="panel">
        <view class="panel-head">
          <view class="panel-num">04</view>
          <view class="panel-info">
            <text class="panel-title">布局 & 风格</text>
            <text class="panel-sub">布局模式与设计风格微调</text>
          </view>
        </view>

        <view class="field">
          <view class="field-label">
            <view class="label-dot layout"></view>
            <text>布局模式</text>
          </view>
          <view class="layout-options">
            <view
              v-for="(opt, oi) in layoutOptions"
              :key="oi"
              class="layout-chip"
              :class="{ active: editData.layout === opt }"
              @tap="editData.layout = opt"
            >
              <text>{{ layoutLabels[opt] || opt }}</text>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-label">
            <view class="label-dot style"></view>
            <text>风格类型</text>
          </view>
          <input class="field-input" v-model="editData.style" placeholder="如：现代极简、赛博朋克..." />
        </view>

        <view class="field">
          <view class="field-label">
            <view class="label-dot conf"></view>
            <text>风格置信度：{{ (editData.styleConfidence * 100).toFixed(0) }}%</text>
          </view>
          <slider
            :value="editData.styleConfidence * 100"
            min="0"
            max="100"
            activeColor="#7C4DFF"
            backgroundColor="#EEE"
            block-size="20"
            @change="(e: any) => editData.styleConfidence = e.detail.value / 100"
          />
        </view>

        <view class="field">
          <view class="field-label">
            <view class="label-dot desc"></view>
            <text>风格描述</text>
          </view>
          <textarea
            class="field-textarea small"
            v-model="editData.styleDescription"
            placeholder="详细描述风格特点..."
            :maxlength="500"
            auto-height
          />
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <button class="bottom-btn reset" @click="resetEdit">
          <u-icon name="reload" size="16" color="#999" />
          <text>重置</text>
        </button>
        <button class="bottom-btn save" @click="saveEdit">
          <u-icon name="checkmark" size="16" color="#FFF" />
          <text>保存并生成</text>
        </button>
      </view>

      <view class="bottom-spacer" />

    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { ImageAnalysisResult } from '@/types'
import { editImage } from '@/api/image'

// 接收首页传来的数据
const editData = ref<ImageAnalysisResult | null>(null)

// 备份原始数据（用于重置）
const originalDataStr = ref('')

onLoad((options) => {
  console.log('[Edit] 收到参数:', options ? Object.keys(options) : '无')
  if (options?.data) {
    try {
      const parsed = JSON.parse(decodeURIComponent(options.data))
      editData.value = parsed
      originalDataStr.value = options.data // 保存原始编码数据用于重置
      console.log('[Edit] ✓ 数据解析成功 | 风格:', parsed?.style)
    } catch (e) {
      console.error('[Edit] ✗ 解析失败:', e)
    }
  } else {
    console.warn('[Edit] ⚠ 未收到 data 参数')
  }
})

// ====== 常量 ======
const presetColors = ['#7C4DFF', '#6200EA', '#B388FF', '#00C853', '#FF5252', '#FF9100', '#FF6B35']

const layoutOptions = ['flex-column', 'grid-3', 'grid-2', 'free-form']
const layoutLabels: Record<string, string> = {
  'flex-column': '垂直排列',
  'grid-3': '三列网格',
  'grid-2': '两列网格',
  'free-form': '自由布局'
}

// ====== 操作方法 ======
const addKeyword = () => {
  if (!editData.value) return
  if (!editData.value.prompt.keywords) editData.value.prompt.keywords = []
  editData.value.prompt.keywords.push({ keyword: '', weight: 1.0, category: 'custom' })
}

const removeKeyword = (idx: number) => {
  editData.value?.prompt.keywords?.splice(idx, 1)
}

const addElement = () => {
  if (!editData.value) return
  if (!editData.value.elements) editData.value.elements = []
  editData.value.elements.push({
    type: 'custom',
    label: '新元素',
    description: '',
    confidence: 0.8
  })
}

const removeElement = (idx: number) => {
  editData.value?.elements?.splice(idx, 1)
}

const resetEdit = () => {
  uni.showModal({
    title: '确认重置',
    content: '确定要恢复所有修改吗？',
    success: (res) => {
      if (res.confirm && originalDataStr.value) {
        try {
          editData.value = JSON.parse(decodeURIComponent(originalDataStr.value))
          uni.showToast({ title: '已重置 ✓', icon: 'none' })
        } catch (e) {
          console.error('重置失败:', e)
        }
      }
    }
  })
}

// ====== 保存修改（真实后端 API）======
const saveEdit = async () => {
  if (!editData.value) return

  uni.showLoading({ title: 'AI 正在重新生成...', mask: true })

  try {
    const result = await editImage({
      originalPrompt: editData.value.prompt.english,
      originalImage: '',
      colorScheme: editData.value.colorScheme,
      elementStyle: editData.value.elements,
      layout: editData.value.layout,
      text: editData.value.prompt.chinese,
      style: editData.value.style,
    })

    console.log('✅ [Edit] 保存完成:', result.imageUrl)
    uni.showToast({ title: '保存成功 ✓', icon: 'success' })

    setTimeout(() => { uni.navigateBack() }, 800)
  } catch (err: any) {
    console.error('❌ [Edit] 保存失败:', err)
    uni.showToast({ title: err.message || '保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ====== 预览（真实后端 API）======
const previewEdit = async () => {
  if (!editData.value) return

  uni.showLoading({ title: 'AI 正在预览生成...', mask: true })

  try {
    const result = await editImage({
      originalPrompt: editData.value.prompt.english,
      originalImage: '',
      colorScheme: editData.value.colorScheme,
      elementStyle: editData.value.elements,
      layout: editData.value.layout,
      text: editData.value.prompt.chinese,
      style: editData.value.style,
    })

    console.log('✅ [Edit] 预览完成:', result.imageUrl)
    uni.previewImage({ urls: [result.imageUrl], current: result.imageUrl })
  } catch (err: any) {
    console.error('❌ [Edit] 预览失败:', err)
    uni.showToast({ title: err.message || '预览失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F6F7;
}

.edit-scroll {
  height: calc(100vh - 44px);
}

.bottom-spacer {
  height: calc(env(safe-area-inset-bottom) + 40rpx);
}

/* ====== 空状态 ====== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}

.empty-icon-wrap {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #F7F8FA;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1C1C1C;
  margin-bottom: 10rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, #6200EA, #7C4DFF);
  color: #FFF;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

/* ====== 导航栏预览按钮 ====== */
.nav-preview-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  background: #EDE7F6;
  border: 1rpx solid #7C4DFF;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #7C4DFF;
  font-weight: 500;
  border: none;
  line-height: 1;
}

/* ====== 面板 ====== */
.panel {
  margin: 20rpx 24rpx;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.panel-num {
  width: 52rpx;
  height: 52rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #6200EA, #7C4DFF);
  color: #FFF;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.panel-info {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1C;
}

.panel-sub {
  font-size: 22rpx;
  color: #AAA;
  margin-top: 4rpx;
}

/* ====== 字段 ====== */
.field {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-label {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;

  text {
    font-size: 26rpx;
    font-weight: 500;
    color: #1C1C1C;
  }
}

.label-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &.en { background: #7C4DFF; }
  &.cn { background: #666; }
  &.kw { background: #6200EA; }
  &.color { background: #E91E63; }
  &.scheme { background: #9c27b0; }
  &.layout { background: #FF6B35; }
  &.style { background: #009688; }
  &.conf { background: #7C4DFF; }
  &.desc { background: #795548; }
}

.field-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  font-size: 27rpx;
  line-height: 1.65;
  color: #1C1C1C;
  background: #FAFAFA;
  border: 2rpx solid #EEE;
  border-radius: 14rpx;
  box-sizing: border-box;

  &.small {
    min-height: 100rpx;
  }

  &:focus {
    border-color: #7C4DFF;
  }
}

.field-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  font-size: 27rpx;
  color: #1C1C1C;
  background: #FAFAFA;
  border: 2rpx solid #EEE;
  border-radius: 14rpx;
  box-sizing: border-box;

  &:focus {
    border-color: #7C4DFF;
  }
}

.field-count {
  text-align: right;
  font-size: 22rpx;
  color: #CCC;
  margin-top: 8rpx;
}

.add-kw-btn {
  margin-left: auto;
  padding: 6rpx 20rpx;
  background: linear-gradient(135deg, #6200EA, #7C4DFF);
  color: #FFF;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
  border: none;
  line-height: 1.5;
}

/* ====== 关键词 ====== */
.kw-empty {
  padding: 32rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  text-align: center;

  text {
    font-size: 26rpx;
    color: #BBB;
  }
}

.kw-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.kw-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
}

.kw-input {
  flex: 1;
  height: 64rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  background: #FFF;
  border: 1rpx solid #EEE;
  border-radius: 8rpx;
}

.kw-weight {
  width: 120rpx;
  height: 64rpx;
  padding: 0 12rpx;
  font-size: 26rpx;
  text-align: center;
  background: #FFF;
  border: 1rpx solid #EEE;
  border-radius: 8rpx;
}

/* ====== 色彩 ====== */
.color-row {
  display: flex;
  gap: 18rpx;
  flex-wrap: wrap;
}

.color-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid transparent;
  transition: all 0.2s;

  &.active {
    border-color: #1C1C1C;
    transform: scale(1.12);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }
}

.scheme-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.scheme-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 20rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
}

.scheme-swatch {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.scheme-name {
  flex: 1;
  font-size: 26rpx;
  color: #1C1C1C;
}

.scheme-ratio {
  width: 100rpx;
  height: 56rpx;
  padding: 0 10rpx;
  font-size: 24rpx;
  text-align: center;
  background: #FFF;
  border: 1rpx solid #EEE;
  border-radius: 8rpx;
}

/* ====== 元素 ====== */
.elem-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.elem-card {
  padding: 20rpx 24rpx;
  background: #FAFAFA;
  border-radius: 14rpx;
}

.elem-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.elem-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  background: #7C4DFF;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 24rpx;
    font-weight: 700;
    color: #FFF;
  }
}

.elem-name {
  flex: 1;
  font-size: 27rpx;
  font-weight: 600;
  color: #1C1C1C;
}

.elem-desc-input {
  width: 100%;
  height: 68rpx;
  padding: 0 16rpx;
  font-size: 25rpx;
  background: #FFF;
  border: 1rpx solid #EEE;
  border-radius: 10rpx;
  box-sizing: border-box;
  margin-bottom: 12rpx;
}

.elem-del-btn {
  width: 100%;
  height: 60rpx;
  background: transparent;
  color: #fa3534;
  border: 1rpx dashed #fa3534;
  border-radius: 10rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.add-elem-btn {
  width: 100%;
  height: 76rpx;
  margin-top: 16rpx;
  background: #FAFAFA;
  color: #1C1C1C;
  border: 2rpx dashed #DDD;
  border-radius: 14rpx;
  font-size: 27rpx;
  font-weight: 500;
  border: none;
}

/* ====== 布局选项 ====== */
.layout-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.layout-chip {
  padding: 12rpx 24rpx;
  background: #F5F5F5;
  border-radius: 10rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  text {
    font-size: 25rpx;
    color: #666;
    font-weight: 500;
  }

  &.active {
    background: #EDE7F6;
    border-color: #7C4DFF;

    text {
      color: #7C4DFF;
      font-weight: 600;
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

/* ====== 底部操作栏 ====== */
.bottom-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.bottom-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;

  &.reset {
    background: #F5F5F5;
    color: #777;
  }

  &.save {
    background: linear-gradient(135deg, #6200EA, #7C4DFF);
    color: #FFF;
    box-shadow: 0 4rpx 12rpx rgba(124, 77, 255, 0.3);

    &:active {
      transform: scale(0.97);
    }
  }
}
</style>
