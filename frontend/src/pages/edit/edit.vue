<template>
  <view class="page">
    <u-navbar
      title="智能编辑"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#2C2E3A', fontWeight: '700' }"
      :borderBottom="false"
      :placeholder="true"
      :autoBack="true"
    />

    <view v-if="!editData" class="empty-state">
      <view class="empty-icon-wrap">
        <u-icon name="photo" size="54" color="#8B9DC8" />
      </view>
      <text class="empty-title">还没有可编辑内容</text>
      <text class="empty-desc">先上传一张图片，AI 会帮你拆解风格、元素和配色。</text>
      <button class="empty-btn" @click="goHome">去首页开始</button>
    </view>

    <scroll-view v-else scroll-y class="edit-scroll">
      <view class="hero-card">
        <view class="hero-copy">
          <text class="hero-badge">{{ editData.style || '分析完成' }}</text>
          <text class="hero-title">AI 已分析完成，提示词可复制</text>
          <text class="hero-desc">
            MiMo 智能反推了画面风格与提示词，直接复制到 Midjourney / SD 使用，或继续编辑生成新图。
          </text>
        </view>
        <image
          v-if="sourceImageUrl"
          class="hero-image"
          :src="sourceImageUrl"
          mode="aspectFill"
        />
        <view v-else class="hero-placeholder">
          <u-icon name="image" size="48" color="#9A9BAC" />
        </view>
      </view>

      <!-- ═══ 提示词快速复制卡片（始终可见） ═══ -->
      <view class="prompt-card">
        <view class="prompt-card-head">
          <view class="prompt-card-title-row">
            <text class="prompt-card-title">AI 反推提示词</text>
            <text class="prompt-card-badge">MiMo 分析</text>
          </view>
          <text class="prompt-card-sub">分析完成后即可复制，直接用于 Midjourney / Stable Diffusion 等工具</text>
        </view>

        <view class="prompt-section">
          <view class="prompt-section-head">
            <text class="prompt-lang">EN</text>
            <button class="copy-chip" @click="copyPrompt('english')">
              <u-icon name="file-text" size="28" color="#8B9DC8" />
              <text>复制英文</text>
            </button>
          </view>
          <view class="prompt-text-wrap">
            <text class="prompt-text" selectable>{{ editData.prompt.english || '分析中...' }}</text>
          </view>
        </view>

        <view class="prompt-section">
          <view class="prompt-section-head">
            <text class="prompt-lang">中文</text>
            <button class="copy-chip" @click="copyPrompt('chinese')">
              <u-icon name="file-text" size="28" color="#C4B5E0" />
              <text>复制中文</text>
            </button>
          </view>
          <view class="prompt-text-wrap">
            <text class="prompt-text" selectable>{{ editData.prompt.chinese || '分析中...' }}</text>
          </view>
        </view>
      </view>

      <view class="stepper">
        <view
          v-for="item in stepItems"
          :key="item.step"
          class="step-chip"
          :class="{ active: currentStep === item.step, done: currentStep > item.step }"
          @click="openStep(item.step)"
        >
          <view class="step-num">{{ item.step }}</view>
          <view class="step-meta">
            <text class="step-label">{{ item.title }}</text>
            <text class="step-sub">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ editData.elements?.length || 0 }}</text>
          <text class="stat-label">元素</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ editData.colorScheme?.length || 0 }}</text>
          <text class="stat-label">配色</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ editData.prompt.keywords?.length || 0 }}</text>
          <text class="stat-label">关键词</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ Math.round(editData.styleConfidence * 100) }}%</text>
          <text class="stat-label">风格匹配</text>
        </view>
      </view>

      <view v-if="currentStep === 1" class="panel">
        <view class="panel-head">
          <text class="panel-title">选择生成引擎</text>
          <text class="panel-sub">分析和生成分离后，编辑阶段可以明确控制出图风格与稳定性。</text>
        </view>

        <view class="provider-list">
          <view
            v-for="item in providerOptions"
            :key="item.value"
            class="provider-card"
            :class="{ active: selectedProvider === item.value }"
            @click="selectedProvider = item.value"
          >
            <view class="provider-top">
              <view class="provider-icon" :style="{ background: item.softColor }">
                <u-icon :name="item.icon" size="36" :color="item.color" />
              </view>
              <view class="provider-copy">
                <text class="provider-name">{{ item.label }}</text>
                <text class="provider-desc">{{ item.desc }}</text>
              </view>
            </view>
            <view class="provider-tags">
              <text class="provider-tag">{{ item.tag }}</text>
              <text class="provider-model">{{ item.modelHint }}</text>
            </view>
          </view>
        </view>

        <view class="hint-card">
          <u-icon name="info-circle" size="34" color="#8B9DC8" />
          <text>图片分析已默认使用小米 MiMo 模型；下方选择的是「生图引擎」，用于编辑后的新图生成。</text>
        </view>
      </view>

      <view v-if="currentStep === 2" class="panel">
        <view class="panel-head">
          <text class="panel-title">调整你最在意的部分</text>
          <text class="panel-sub">把大表单拆成四个重点区域，只改需要改的地方。</text>
        </view>

        <view class="editor-tabs">
          <view
            v-for="item in editorTabs"
            :key="item.key"
            class="editor-tab"
            :class="{ active: currentEditor === item.key }"
            @click="currentEditor = item.key"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>

        <view v-if="currentEditor === 'prompt'" class="editor-panel">
          <view class="field">
            <view class="field-head">
              <text class="field-title">English Prompt</text>
              <view class="field-head-right">
                <text class="field-count">{{ editData.prompt.english.length }}/2000</text>
                <button class="inline-copy-btn" @click="copyPrompt('english')">复制</button>
              </view>
            </view>
            <textarea
              v-model="editData.prompt.english"
              class="field-textarea"
              placeholder="输入更完整的英文提示词，用于最终出图..."
              :maxlength="2000"
              auto-height
            />
          </view>

          <view class="field">
            <view class="field-head">
              <text class="field-title">中文描述</text>
              <view class="field-head-right">
                <text class="field-count">{{ editData.prompt.chinese.length }}/1000</text>
                <button class="inline-copy-btn" @click="copyPrompt('chinese')">复制</button>
              </view>
            </view>
            <textarea
              v-model="editData.prompt.chinese"
              class="field-textarea"
              placeholder="补充你想要加强或替换的画面描述..."
              :maxlength="1000"
              auto-height
            />
          </view>

          <view class="field">
            <view class="field-inline">
              <text class="field-title">关键词权重</text>
              <button class="mini-btn" @click="addKeyword">添加关键词</button>
            </view>
            <view v-if="!editData.prompt.keywords?.length" class="empty-block">
              <text>还没有关键词，点击上方按钮补充。</text>
            </view>
            <view v-else class="keyword-list">
              <view v-for="(kw, idx) in editData.prompt.keywords" :key="idx" class="keyword-item">
                <input v-model="kw.keyword" class="text-input flex-1" placeholder="关键词" />
                <input v-model.number="kw.weight" class="text-input weight-input" type="digit" placeholder="1.2" />
                <u-icon name="close-circle-fill" size="34" color="#E8947A" @click="removeKeyword(idx)" />
              </view>
            </view>
          </view>
        </view>

        <view v-if="currentEditor === 'color'" class="editor-panel">
          <view class="field">
            <view class="field-head">
              <text class="field-title">主色调</text>
              <text class="field-tip">点一下快速切换整体氛围</text>
            </view>
            <view class="color-row">
              <view
                v-for="color in presetColors"
                :key="color"
                class="color-dot"
                :class="{ active: editData.primaryColor === color }"
                :style="{ backgroundColor: color }"
                @click="editData.primaryColor = color"
              >
                <u-icon v-if="editData.primaryColor === color" name="checkmark" size="34" color="#fff" />
              </view>
            </view>
          </view>

          <view class="field">
            <view class="field-head">
              <text class="field-title">配色方案</text>
              <text class="field-tip">调整颜色占比来影响生成倾向</text>
            </view>
            <view class="scheme-list">
              <view v-for="(item, idx) in editData.colorScheme" :key="idx" class="scheme-item">
                <view class="scheme-swatch" :style="{ backgroundColor: item.hex }"></view>
                <input v-model="item.name" class="text-input flex-1" placeholder="颜色名" />
                <input v-model.number="item.ratio" class="text-input weight-input" type="digit" placeholder="0.3" />
              </view>
            </view>
          </view>
        </view>

        <view v-if="currentEditor === 'elements'" class="editor-panel">
          <view class="field-inline">
            <text class="field-title">画面元素</text>
            <button class="mini-btn" @click="addElement">添加元素</button>
          </view>
          <view v-if="!editData.elements?.length" class="empty-block">
            <text>暂无元素，先添加你想保留或强化的主体。</text>
          </view>
          <view v-else class="element-list">
            <view v-for="(item, idx) in editData.elements" :key="idx" class="element-card">
              <view class="element-head">
                <input v-model="item.label" class="text-input flex-1" placeholder="元素名称" />
                <u-tag :text="Math.round(item.confidence * 100) + '%'" type="success" size="mini" plain />
              </view>
              <input v-model="item.description" class="text-input" placeholder="补充这个元素在画面中的样子和作用" />
              <button class="ghost-btn" @click="removeElement(idx)">删除元素</button>
            </view>
          </view>
        </view>

        <view v-if="currentEditor === 'style'" class="editor-panel">
          <view class="field">
            <view class="field-head">
              <text class="field-title">布局模式</text>
              <text class="field-tip">结构会影响画面构图感</text>
            </view>
            <view class="chip-row">
              <view
                v-for="item in layoutOptions"
                :key="item"
                class="choice-chip"
                :class="{ active: editData.layout === item }"
                @click="editData.layout = item"
              >
                <text>{{ layoutLabels[item] || item }}</text>
              </view>
            </view>
          </view>

          <view class="field">
            <view class="field-head">
              <text class="field-title">风格类型</text>
              <text class="field-tip">例如：潮玩、奶油 3D、梦幻插画</text>
            </view>
            <input v-model="editData.style" class="text-input" placeholder="输入你想强化的风格标签" />
          </view>

          <view class="field">
            <view class="field-head">
              <text class="field-title">风格置信度</text>
              <text class="field-tip">{{ Math.round(editData.styleConfidence * 100) }}%</text>
            </view>
            <slider
              :value="editData.styleConfidence * 100"
              :min="0"
              :max="100"
              activeColor="#8B9DC8"
              backgroundColor="rgba(201,168,124,0.10)"
              :block-size="18"
              @change="(e: any) => editData && (editData.styleConfidence = e.detail.value / 100)"
            />
          </view>

          <view class="field">
            <view class="field-head">
              <text class="field-title">风格描述</text>
              <text class="field-tip">让模型更懂你想保留的感觉</text>
            </view>
            <textarea
              v-model="editData.styleDescription"
              class="field-textarea"
              placeholder="比如：圆润、玩具质感、糖果色、柔和阴影..."
              :maxlength="500"
              auto-height
            />
          </view>
        </view>
      </view>

      <view v-if="currentStep === 3" class="panel">
        <view class="panel-head">
          <text class="panel-title">预览并生成</text>
          <text class="panel-sub">确认修改摘要后再生成，避免重复等待。</text>
        </view>

        <view class="summary-card">
          <view class="summary-item">
            <text class="summary-label">生成引擎</text>
            <text class="summary-value">{{ currentProviderLabel }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">主风格</text>
            <text class="summary-value">{{ editData.style || '保持原风格' }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">布局</text>
            <text class="summary-value">{{ layoutLabels[editData.layout] || editData.layout }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">核心描述</text>
            <text class="summary-value line-2">{{ editData.prompt.chinese || editData.prompt.english }}</text>
          </view>
        </view>

        <view class="preview-card">
          <image
            v-if="previewImageUrl"
            class="preview-image"
            :src="previewImageUrl"
            mode="aspectFill"
            @click="previewGeneratedImage"
          />
          <view v-else class="preview-empty">
            <u-icon name="photo" size="56" color="#9A9BAC" />
            <text>还没有预览图，点击下方按钮生成看看。</text>
          </view>
          <!-- 下载按钮 -->
          <view v-if="previewImageUrl" class="preview-actions">
            <button class="download-btn" @click="downloadGeneratedImage">
              <u-icon name="download" size="34" color="#fff" />
              <text>保存图片</text>
            </button>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <view v-if="editData" class="bottom-bar">
      <button class="bottom-btn secondary" @click="handleSecondaryAction">
        {{ currentStep === 1 ? '重置' : '上一步' }}
      </button>
      <button class="bottom-btn primary" :disabled="running" @click="handlePrimaryAction">
        {{ primaryButtonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { GenerationProvider, ImageAnalysisResult } from '@/types'
import { analyzeImage, editImage } from '@/api/image'

const editData = ref<ImageAnalysisResult | null>(null)
const originalDataStr = ref('')
const sourceImageUrl = ref('')
const previewImageUrl = ref('')
const running = ref(false)
const currentStep = ref(1)
const currentEditor = ref<string>('prompt')
const selectedProvider = ref<GenerationProvider>('zhipu')
const rewardedAd = ref<any>(null)          // 激励视频广告实例
const pendingGenerateParams = ref<any>(null) // 广告看完后继续生成用的参数

// ── 场景化工作台（从首页传入）──
type SceneType = 'ecommerce' | 'avatar' | 'ppt' | 'style-transfer' | ''
const currentScene = ref<SceneType>('')

const stepItems = [
  { step: 1, title: '选引擎', desc: '决定生成路线' },
  { step: 2, title: '改内容', desc: '只调重点区域' },
  { step: 3, title: '预览图', desc: '确认后生成' },
]

const editorTabs = [
  { key: 'prompt', label: '提示词' },
  { key: 'color', label: '配色' },
  { key: 'elements', label: '元素' },
  { key: 'style', label: '风格' },
]

const providerOptions: Array<{
  value: GenerationProvider
  label: string
  desc: string
  tag: string
  modelHint: string
  color: string
  softColor: string
  icon: string
}> = [
  {
    value: 'zhipu',
    label: '智谱',
    desc: '本地接入最顺，适合当前项目默认链路',
    tag: '稳定',
    modelHint: 'CogView',
    color: '#C4B5E0',
    softColor: 'rgba(139,126,200,0.12)',
    icon: 'star-fill',
  },
  {
    value: 'siliconflow',
    label: 'SiliconFlow',
    desc: '适合补充更多开源图像模型选择',
    tag: '高性价比',
    modelHint: 'Kolors / Flux',
    color: '#4ADE80',
    softColor: 'rgba(74,222,128,0.10)',
    icon: 'grid',
  },
  {
    value: 'gemini',
    label: 'Gemini',
    desc: '原生多模态，适合灵感图和细节控制',
    tag: '多模态',
    modelHint: 'Flash Image',
    color: '#8B9DC8',
    softColor: 'rgba(201,168,124,0.10)',
    icon: 'photo',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    desc: '兼容现有图片生成接口，适合通用文本出图',
    tag: '通用',
    modelHint: 'DALL-E',
    color: '#22D3EE',
    softColor: 'rgba(34,211,238,0.10)',
    icon: 'edit-pen',
  },
  {
    value: 'pollinations',
    label: '轻量兜底',
    desc: '当上游不稳定时也能先看效果图',
    tag: '备用',
    modelHint: 'Instant',
    color: '#E8947A',
    softColor: 'rgba(248,113,113,0.10)',
    icon: 'eye',
  },
]

const presetColors = ['#8B9DC8', '#C4B5E0', '#4ADE80', '#E8947A', '#8B9DC8', '#22D3EE', '#FACC15']
const layoutOptions = ['absolute', 'flex-column', 'flex-row', 'grid', 'masonry']
const layoutLabels: Record<string, string> = {
  absolute: '自由布局',
  'flex-column': '纵向排布',
  'flex-row': '横向排布',
  grid: '网格布局',
  masonry: '瀑布流',
}

const currentProviderLabel = computed(() => {
  return providerOptions.find(item => item.value === selectedProvider.value)?.label || selectedProvider.value
})

const primaryButtonText = computed(() => {
  if (running.value) return '生成中...'
  if (currentStep.value === 1) return '下一步'
  if (currentStep.value === 2) return '去预览'
  return '生成新图'
})

onLoad((options) => {
  if (options?.data) {
    try {
      const parsed = JSON.parse(decodeURIComponent(options.data))
      editData.value = parsed
      originalDataStr.value = options.data
      sourceImageUrl.value = parsed?.imageUrl || ''
    } catch (e) {
      console.error('[Edit] 解析失败:', e)
    }
  }

  // 🆕 从词库模板「生成同款」跳转过来 —— 直接预填 Prompt
  if (options?.promptText) {
    const tmplPrompt = decodeURIComponent(options.promptText)
    console.log(`[Edit] 从词库模板加载 prompt, tmplId=${options.tmplId || '无'}`)

    // 构造一个基于模板的 editData，让编辑器直接可用
    editData.value = {
      style: '词库模板',
      styleConfidence: 0.95,
      styleDescription: '来自「图灵绘境」精选词库模板，可直接使用或微调后生成图片',
      elements: [],
      layout: '自由构图',
      layoutDescription: '',
      colorScheme: [],
      primaryColor: '#8B9DC8',
      prompt: {
        english: tmplPrompt,
        chinese: options?.tmplId ? `（模板 #${options.tmplId}）点击上方英文提示词可编辑` : '来自词库模板的提示词，可自由编辑',
        keywords: extractKeywords(tmplPrompt),
      },
    }
    sourceImageUrl.value = ''
    return // 模板模式下不需要再分析图片
  }

  if (options?.imageUrl) {
    const imageUrl = decodeURIComponent(options.imageUrl)
    sourceImageUrl.value = imageUrl
    // 接收首页传来的场景参数
    if (options?.scene) {
      currentScene.value = options.scene as SceneType
      console.log(`[Edit] 场景模式: ${currentScene.value}`)
    }
    analyzeAndEdit(imageUrl)
  }

  // 初始化激励视频广告（微信小程序环境）
  initRewardedAd()
})

onUnmounted(() => {
  // 销毁广告实例，防止内存泄漏
  // uni 激励视频广告无需手动 destroy，直接置空即可
  rewardedAd.value = null
})

// ── 激励视频广告 ──
// 微信小程序激励视频广告
// 文档：https://uniapp.dcloud.net.cn/api/pages/adbideo.html

/** 从英文 prompt 中提取关键词（用于模板模式预填） */
function extractKeywords(text: string): { keyword: string; weight: number; category: string }[] {
  if (!text) return []
  // 按逗号分割，取前8个有意义的词
  const words = text.split(/[,;]/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && w.length < 50 && !/^(a|an|the|of|in|on|at|to|for|with|and|or|by|from|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|should|may|might|must)$/i.test(w))
    .slice(0, 8)

  return words.map((w, i) => ({
    keyword: w,
    weight: Math.max(0.5, 1 - i * 0.08),
    category: i < 3 ? 'style' : i < 5 ? 'subject' : 'detail',
  }))
}

function initRewardedAd() {
  // 仅微信小程序环境需要初始化
  // #ifdef MP-WEIXIN
  console.log('[广告] 微信小程序环境，激励视频广告已预留')
  // #endif
}

async function markAdWatchedThenGenerate() {
  try {
    await uni.request({
      url: '/api/ad/reward',
      method: 'POST',
      header: getAuthHeader(),
    })
  } catch {
    // 标记失败不阻塞生成，后端会自己判断
  }
  if (pendingGenerateParams.value) {
    doGenerate(pendingGenerateParams.value)
    pendingGenerateParams.value = null
  }
}

function getAuthHeader(): Record<string, string> {
  const token = uni.getStorageSync('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function analyzeAndEdit(imageUrl: string) {
  uni.showLoading({ title: currentScene.value ? 'AI 场景分析中...' : 'AI 正在分析图片...', mask: true })
  try {
    const result = await analyzeImage(imageUrl, selectedProvider.value, currentScene.value || undefined)
    editData.value = result
    originalDataStr.value = encodeURIComponent(JSON.stringify(result))
  } catch (err: any) {
    uni.showToast({ title: err.message || '分析失败，请重试', icon: 'none', duration: 3000 })
  } finally {
    uni.hideLoading()
  }
}

function openStep(step: number) {
  if (!editData.value) return
  currentStep.value = step
}

function addKeyword() {
  if (!editData.value) return
  if (!editData.value.prompt.keywords) editData.value.prompt.keywords = []
  editData.value.prompt.keywords.push({ keyword: '', weight: 1.0, category: 'custom' })
}

function removeKeyword(idx: number) {
  editData.value?.prompt.keywords?.splice(idx, 1)
}

function addElement() {
  if (!editData.value) return
  if (!editData.value.elements) editData.value.elements = []
  editData.value.elements.push({
    type: 'custom',
    label: '新元素',
    description: '',
    confidence: 0.8,
  })
}

function removeElement(idx: number) {
  editData.value?.elements?.splice(idx, 1)
}

function resetEdit() {
  if (!originalDataStr.value) return
  try {
    editData.value = JSON.parse(decodeURIComponent(originalDataStr.value))
    previewImageUrl.value = ''
    currentStep.value = 1
    currentEditor.value = 'prompt'
    uni.showToast({ title: '已恢复初始分析结果', icon: 'none' })
  } catch (e) {
    console.error('[Edit] 重置失败:', e)
  }
}

function handleSecondaryAction() {
  if (currentStep.value === 1) {
    resetEdit()
    return
  }
  currentStep.value -= 1
}

async function handlePrimaryAction() {
  if (!editData.value || running.value) return
  if (currentStep.value < 3) {
    currentStep.value += 1
    return
  }
  await runGeneration()
}

async function runGeneration() {
  if (!editData.value) return
  running.value = true
  uni.showLoading({ title: 'AI 正在生成新图...', mask: true })

  const params = {
    originalPrompt: editData.value.prompt.english,
    originalImage: sourceImageUrl.value,
    colorScheme: editData.value.colorScheme,
    elementStyle: editData.value.elements,
    layout: editData.value.layout,
    text: editData.value.prompt.chinese,
    style: editData.value.style,
    provider: selectedProvider.value,
  }

  try {
    const res = await editImage(params)
    // editImage 返回 { imageUrl, prompt }
    previewImageUrl.value = res.imageUrl
    uni.showToast({ title: '生成完成', icon: 'success' })
  } catch (err: any) {
    // HTTP 业务逻辑：后端可能通过 HTTP 200 + 特殊 code 返回 needAd
    // 或者 HTTP 403 配合 needAd 字段
    const data = err?.data || err
    if (data?.needAd) {
      pendingGenerateParams.value = params
      uni.hideLoading()
      showRewardedAd(data.adUnitId)
      return
    }
    uni.showToast({ title: err.message || '生成失败', icon: 'none' })
  } finally {
    running.value = false
    uni.hideLoading()
  }
}

// 弹出激励视频广告
function showRewardedAd(adUnitId?: string) {
  // #ifdef MP-WEIXIN
  if (!adUnitId) {
    uni.showToast({ title: '广告配置缺失，将直接生成', icon: 'none' })
    if (pendingGenerateParams.value) {
      doGenerate(pendingGenerateParams.value)
      pendingGenerateParams.value = null
    }
    return
  }

  try {
    const ad = uni.createRewardedVideoAd({ adUnitId })
    ad.onClose((res: any) => {
      if (res && res.isEnded) {
        markAdWatchedThenGenerate()
      } else {
        uni.showToast({ title: '需要看完广告才能继续哦', icon: 'none' })
      }
    })
    ad.onError((err: any) => {
      console.error('[广告] 加载失败:', err)
      // 广告加载失败 → 开发模式下直接继续生成
      if (pendingGenerateParams.value) {
        uni.showToast({ title: '广告暂时不可用，将直接生成', icon: 'none' })
        doGenerate(pendingGenerateParams.value)
        pendingGenerateParams.value = null
      }
    })
    ad.load().then(() => {
      ad.show()
    }).catch(() => {
      if (pendingGenerateParams.value) {
        uni.showToast({ title: '广告加载失败，将直接生成', icon: 'none' })
        doGenerate(pendingGenerateParams.value)
        pendingGenerateParams.value = null
      }
    })
    rewardedAd.value = ad
  } catch (e) {
    console.error('[广告] showRewardedAd 失败:', e)
    if (pendingGenerateParams.value) {
      doGenerate(pendingGenerateParams.value)
      pendingGenerateParams.value = null
    }
  }
  // #endif

  // 非微信小程序环境（H5/App 调试时）→ 直接跳过广告
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '非小程序环境，已跳过广告', icon: 'none' })
  if (pendingGenerateParams.value) {
    doGenerate(pendingGenerateParams.value)
    pendingGenerateParams.value = null
  }
  // #endif
}

// 真正调后端生图（跳过广告检查）
async function doGenerate(params: any) {
  running.value = true
  uni.showLoading({ title: 'AI 正在生成新图...', mask: true })
  try {
    const res: any = await editImage(params)
    previewImageUrl.value = res.data?.imageUrl || res.imageUrl
    uni.showToast({ title: '生成完成', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '生成失败', icon: 'none' })
  } finally {
    running.value = false
    uni.hideLoading()
  }
}

function previewGeneratedImage() {
  if (!previewImageUrl.value) return
  uni.previewImage({
    urls: [previewImageUrl.value],
    current: previewImageUrl.value,
  })
}

function downloadGeneratedImage() {
  downloadImage(previewImageUrl.value, 'turing-drawing')
}

function downloadImage(url: string, filename = 'image') {
  if (!url) return
  // #ifdef H5
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${Date.now()}.png`
  // 跨域图片需要先 fetch 转成 blob
  fetch(url)
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.click()
      URL.revokeObjectURL(blobUrl)
      uni.showToast({ title: '图片已保存', icon: 'success' })
    })
    .catch(() => {
      // fallback: 直接跳链接
      a.click()
      uni.showToast({ title: '图片已保存', icon: 'success' })
    })
  // #endif

  // #ifndef H5
  uni.showLoading({ title: '保存中...' })
  uni.downloadFile({
    url,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => {
          uni.hideLoading()
          uni.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: (err) => {
          uni.hideLoading()
          if (err.errMsg?.includes('auth')) {
            uni.showModal({
              title: '需要授权',
              content: '请授权访问相册权限后再试',
              showCancel: false,
            })
          } else {
            uni.showToast({ title: '保存失败，请重试', icon: 'none' })
          }
        },
      })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败，请重试', icon: 'none' })
    },
  })
  // #endif
}

function copyPrompt(lang: 'english' | 'chinese') {
  if (!editData.value) return
  const text = lang === 'english' ? editData.value.prompt.english : editData.value.prompt.chinese
  if (!text) {
    uni.showToast({ title: '暂无提示词内容', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: `${lang === 'english' ? '英文' : '中文'}提示词已复制`, icon: 'success', duration: 1500 })
    },
    fail: () => {
      uni.showToast({ title: '复制失败，请手动复制', icon: 'none' })
    }
  })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
/* ══════════════════════════════
   Mist Canvas Design System
   薄雾白 · 通透清新
   ══════════════════════════════ */

// ── Palette ──
$bg-page:    #F6F7FB;
$bg-card:    #FFFFFF;
$bg-raised:  #F0F1F5;
$border:     rgba(0,0,0,0.05);
$text-1:     #2C2E3A;
$text-2:     #6B6E7D;
$text-3:     #9A9BAC;
$primary:     #8B9DC8;
$primary-light: #A3B0CC;
$primary-grad: linear-gradient(135deg, #8B9DC8, #A3B0CC);
$secondary:   #C4B5E0;
$accent:     #A3B8A5;
$warning:     #E8C97A;
$danger:     #E8947A;

.page { min-height: 100vh; background: $bg-page; }
.edit-scroll { height: calc(100vh - 44px); }
.bottom-spacer { height: calc(env(safe-area-inset-bottom) + 120rpx); }

// ── Empty state ──
.empty-state {
  min-height: calc(100vh - 44px); display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 72rpx 48rpx; text-align: center;
  background: $bg-page;
}
.empty-icon-wrap {
  width: 150rpx; height: 150rpx; border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
  background: $bg-card; border: 1rpx solid $border;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.empty-title { margin-top: 28rpx; font-size: 38rpx; font-weight: 700; color: $text-1; }
.empty-desc { margin-top: 14rpx; font-size: 26rpx; color: $text-2; line-height: 1.7; }
.empty-btn {
  margin-top: 40rpx; min-width: 280rpx; height: 88rpx; border: none;
  border-radius: 999rpx; color: #FFFFFF; font-size: 28rpx; font-weight: 700;
  background: $primary-grad;
  box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.2);
}

// ── Cards ──
.hero-card, .stats-card, .panel, .prompt-card {
  margin: 24rpx; border-radius: 24rpx;
  background: $bg-card; border: 1rpx solid $border;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.prompt-card {
  padding: 28rpx;
  border-color: rgba(139,157,200,0.25);
  box-shadow: 0 4rpx 24rpx rgba(139,157,200,0.08);
}
.prompt-card-head { margin-bottom: 24rpx; }
.prompt-card-title-row {
  display: flex; align-items: center; gap: 14rpx; margin-bottom: 8rpx;
}
.prompt-card-title { font-size: 32rpx; font-weight: 800; color: $text-1; }
.prompt-card-badge {
  padding: 4rpx 16rpx; border-radius: 999rpx;
  background: rgba(139,157,200,0.12); color: $primary;
  font-size: 20rpx; font-weight: 700;
}
.prompt-card-sub { font-size: 23rpx; line-height: 1.6; color: $text-2; }

.prompt-section {
  padding: 20rpx 0;
  border-bottom: 1rpx solid $border;
  &:last-child { border-bottom: none; padding-bottom: 0; }
}
.prompt-section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14rpx;
}
.prompt-lang {
  padding: 6rpx 18rpx; border-radius: 999rpx;
  background: rgba(139,157,200,0.1); color: $primary;
  font-size: 22rpx; font-weight: 700;
}
.copy-chip {
  display: flex; align-items: center; gap: 8rpx;
  padding: 8rpx 22rpx; border: 1rpx solid rgba(139,157,200,0.25);
  border-radius: 999rpx; background: $bg-card;
  font-size: 22rpx; font-weight: 600; color: $primary;
  transition: all 0.15s;
  &:active { background: rgba(139,157,200,0.08); }
}
.prompt-text-wrap {
  padding: 20rpx 22rpx; border-radius: 18rpx;
  background: $bg-raised; border: 1rpx solid $border;
}
.prompt-text {
  font-size: 25rpx; line-height: 1.8; color: $text-1;
  word-break: break-word;
  user-select: text;
  -webkit-user-select: text;
}
.hero-card { padding: 28rpx; display: flex; gap: 20rpx; align-items: center; }
.hero-copy { flex: 1; display: flex; flex-direction: column; }
.hero-badge {
  align-self: flex-start; padding: 8rpx 18rpx; border-radius: 999rpx;
  background: rgba(139,157,200,0.1); color: $primary; font-size: 22rpx; font-weight: 700;
}
.hero-title { margin-top: 18rpx; font-size: 36rpx; line-height: 1.35; font-weight: 700; color: $text-1; }
.hero-desc { margin-top: 12rpx; font-size: 24rpx; line-height: 1.7; color: $text-2; }
.hero-image, .hero-placeholder { width: 180rpx; height: 180rpx; border-radius: 24rpx; flex-shrink: 0; }
.hero-placeholder { display: flex; align-items: center; justify-content: center; background: $bg-raised; }

// ── Stepper ──
.stepper { padding: 0 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.step-chip {
  display: flex; align-items: center; gap: 18rpx; padding: 20rpx 22rpx;
  border-radius: 24rpx; background: $bg-card; border: 1rpx solid $border;
  transition: all 0.15s;
}
.step-chip.active { border-color: rgba(139,157,200,0.3); background: $bg-raised; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.step-chip.done .step-num { background: linear-gradient(135deg, #A3B8A5, #22D3EE); }
.step-num {
  width: 56rpx; height: 56rpx; border-radius: 18rpx; background: $primary-grad;
  display: flex; align-items: center; justify-content: center;
  color: #FFFFFF; font-size: 26rpx; font-weight: 700;
}
.step-meta { display: flex; flex-direction: column; }
.step-label { font-size: 28rpx; font-weight: 700; color: $text-1; }
.step-sub { margin-top: 4rpx; font-size: 22rpx; color: $text-2; }

// ── Stats ──
.stats-card { padding: 18rpx 10rpx; display: flex; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.stat-value { font-size: 34rpx; font-weight: 800; color: $primary; }
.stat-label { font-size: 22rpx; color: $text-3; }

// ── Panel ──
.panel { padding: 28rpx; }
.panel-head { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 24rpx; }
.panel-title { font-size: 32rpx; font-weight: 800; color: $text-1; }
.panel-sub { font-size: 24rpx; line-height: 1.7; color: $text-2; }

// ── Provider Cards ──
.provider-list, .keyword-list, .scheme-list, .element-list {
  display: flex; flex-direction: column; gap: 16rpx;
}
.provider-card {
  padding: 22rpx; border-radius: 24rpx; background: $bg-card; border: 1rpx solid $border;
  transition: all 0.15s;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.provider-card.active { border-color: rgba(139,157,200,0.3); background: $bg-raised; }
.provider-top { display: flex; gap: 16rpx; align-items: center; }
.provider-icon { width: 76rpx; height: 76rpx; border-radius: 22rpx;
  display: flex; align-items: center; justify-content: center; }
.provider-copy { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.provider-name { font-size: 28rpx; font-weight: 700; color: $text-1; }
.provider-desc { font-size: 22rpx; line-height: 1.6; color: $text-2; }
.provider-tags { margin-top: 16rpx; display: flex; justify-content: space-between; gap: 16rpx; }
.provider-tag { font-size: 22rpx; color: $primary; }
.provider-model { font-size: 22rpx; color: $text-3; }

.hint-card, .summary-card { padding: 20rpx 22rpx; border-radius: 22rpx;
  background: rgba(139,157,200,0.05); display: flex; gap: 12rpx;
}
.hint-card text { flex: 1; font-size: 23rpx; line-height: 1.6; color: $text-2; }

// ── Editor Tabs / Chips ──
.editor-tabs, .chip-row, .color-row { display: flex; flex-wrap: wrap; gap: 14rpx; }
.editor-tab, .choice-chip {
  padding: 14rpx 24rpx; border-radius: 999rpx;
  background: $bg-raised; border: 1rpx solid $border;
  transition: all 0.15s;
}
.editor-tab text, .choice-chip text { font-size: 24rpx; font-weight: 600; color: $text-2; }
.editor-tab.active, .choice-chip.active { border-color: rgba(139,157,200,0.3); background: $bg-card; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.editor-tab.active text, .choice-chip.active text { color: $primary; }
.editor-panel { margin-top: 24rpx; }

// ── Fields ──
.field { margin-bottom: 24rpx; }
.field-head, .field-inline { display: flex; align-items: center; justify-content: space-between;
  gap: 16rpx; margin-bottom: 12rpx; }
.field-head-right {
  display: flex; align-items: center; gap: 14rpx;
}
.inline-copy-btn {
  padding: 4rpx 18rpx; border: 1rpx solid rgba(139,157,200,0.25);
  border-radius: 999rpx; background: transparent;
  color: $primary; font-size: 21rpx; font-weight: 600;
  &:active { background: rgba(139,157,200,0.08); }
}
.field-title { font-size: 27rpx; font-weight: 700; color: $text-1; }
.field-tip, .field-count { font-size: 22rpx; color: $text-3; }
.field-textarea, .text-input {
  width: 100%; box-sizing: border-box;
  border: 1rpx solid $border; border-radius: 22rpx;
  background: $bg-raised; color: $text-1; font-size: 26rpx;
  transition: border-color 0.15s;
}
.field-textarea { min-height: 180rpx; padding: 22rpx 24rpx; line-height: 1.7; }
.text-input { height: 84rpx; padding: 0 22rpx; }
.flex-1 { flex: 1; }
.weight-input { width: 132rpx; flex: none; text-align: center; }

.mini-btn, .ghost-btn { border: none; border-radius: 999rpx; font-size: 22rpx; font-weight: 700; }
.mini-btn { padding: 0 24rpx; height: 60rpx; color: #FFFFFF; background: $primary-grad; }
.ghost-btn { margin-top: 12rpx; height: 60rpx; background: $bg-raised; color: $primary; border: 1rpx solid $border; }

// ── Items ──
.keyword-item, .scheme-item, .element-card {
  padding: 18rpx; border-radius: 22rpx;
  background: $bg-card; border: 1rpx solid $border;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
}
.keyword-item, .scheme-item { display: flex; align-items: center; gap: 12rpx; }
.element-head { display: flex; align-items: center; gap: 14rpx; margin-bottom: 12rpx; }
.empty-block, .preview-empty { padding: 36rpx 28rpx; border-radius: 24rpx;
  background: $bg-raised; text-align: center; }
.empty-block text, .preview-empty text { font-size: 24rpx; line-height: 1.7; color: $text-3; }
.scheme-swatch { width: 44rpx; height: 44rpx; border-radius: 14rpx; flex-shrink: 0; }

.color-dot {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid $border;
  transition: all 0.15s;
}
.color-dot.active { transform: scale(1.08); border-color: $primary; box-shadow: 0 2rpx 12rpx rgba(139,157,200,0.2); }

// ── Summary ──
.summary-card { flex-direction: column; }
.summary-item { display: flex; justify-content: space-between; gap: 20rpx; padding: 12rpx 0;
  border-bottom: 1rpx solid $border; }
.summary-label { width: 130rpx; flex-shrink: 0; font-size: 24rpx; color: $text-2; }
.summary-value { flex: 1; font-size: 24rpx; text-align: right; color: $text-1; line-height: 1.7; }
.line-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

// ── Preview ──
.preview-card { margin-top: 20rpx; border-radius: 24rpx; overflow: hidden; background: $bg-card; border: 1rpx solid $border; }
.preview-image { width: 100%; height: 760rpx; display: block; }
.preview-empty { display: flex; flex-direction: column; align-items: center; gap: 14rpx; padding: 60rpx 0;
  background: $bg-raised; }
.preview-actions {
  padding: 16rpx 24rpx;
  background: $bg-card;
  border-top: 1rpx solid $border;
}
.download-btn {
  display: flex; align-items: center; justify-content: center; gap: 10rpx;
  width: 100%; height: 80rpx; border: none; border-radius: 999rpx;
  background: $primary-grad; color: #fff;
  font-size: 28rpx; font-weight: 700;
  box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.25);
  transition: opacity 0.15s;
  &:active { opacity: 0.85; }
}

// ── Bottom Bar ──
.bottom-bar {
  position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 16rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(246,247,251,0.96);
  backdrop-filter: blur(12px);
  border-top: 1rpx solid $border;
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.03);
}
.bottom-btn { flex: 1; height: 88rpx; border: none; border-radius: 999rpx; font-size: 28rpx; font-weight: 700; }
.bottom-btn.secondary { background: $bg-raised; color: $text-2; border: 1rpx solid $border; }
.bottom-btn.primary { color: #FFFFFF; background: $primary-grad;
  box-shadow: 0 4rpx 16rpx rgba(139,157,200,0.2); }
.bottom-btn.primary[disabled] { opacity: 0.5; }
</style>
