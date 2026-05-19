<template>
  <view class="page">
    <u-navbar
      title="分享到社区"
      :bgColor="'#FFFFFF'"
      :titleStyle="{ color: '#1C1C1C', fontWeight: '600' }"
      :borderBottom="true"
      :placeholder="true"
    />

    <scroll-view scroll-y class="publish-scroll">
      <!-- 图片上传区域 -->
      <view class="upload-area" @click="chooseImage">
        <view v-if="!publishForm.image_url" class="upload-placeholder">
          <u-icon name="photo" size="48" color="#999" />
          <text class="upload-hint">点击上传示例图片</text>
          <text class="upload-sub">支持 JPG/PNG/WebP，最大 5MB</text>
        </view>
        <view v-else class="upload-preview">
          <!-- #ifdef H5 -->
          <img class="preview-img" :src="publishForm.image_url" mode="aspectFill" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <image class="preview-img" :src="publishForm.image_url" mode="aspectFill" />
          <!-- #endif -->
          <view class="preview-remove" @click.stop="removePublishImage">
            <u-icon name="close" size="40" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 标题输入 -->
      <view class="form-item">
        <text class="form-label">标题 *</text>
        <input
          class="form-input"
          v-model="publishForm.title"
          placeholder="给作品起个名字吧"
          maxlength="50"
          :cursor-spacing="20"
        />
      </view>

      <!-- 提示词内容 -->
      <view class="form-item">
        <text class="form-label">提示词 *</text>
        <textarea
          class="form-textarea"
          v-model="publishForm.prompt_text"
          placeholder="粘贴或输入你的 AI 绘画提示词..."
          maxlength="5000"
          :auto-height="true"
          :cursor-spacing="20"
        />
        <text class="char-count">{{ publishForm.prompt_text.length }}/5000</text>
      </view>

      <!-- 分类选择 -->
      <view class="form-item">
        <text class="form-label">分类</text>
        <scroll-view scroll-x class="category-picker">
          <view
            class="pick-tag"
            :class="{ active: publishForm.category_id === 0 }"
            @click="publishForm.category_id = 0"
          >
            <text>不选</text>
          </view>
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="pick-tag"
            :class="{ active: publishForm.category_id === cat.id }"
            @click="publishForm.category_id = cat.id"
          >
            <text>{{ cat.name }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 占位：防止底部按钮遮挡 -->
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 底部发布按钮 -->
    <view class="publish-footer">
      <view
        class="submit-btn"
        :class="{ disabled: !canSubmit || publishing }"
        @click="submitPublish"
      >
        <text v-if="publishing">发布中...</text>
        <text v-else>发布到社区</text>
      </view>
      <text class="publish-tip">发布后所有人可见 · 请遵守社区规范</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getCategories,
  uploadCommunityImage,
  createCommunityPost,
  type PromptCategory,
} from '../../api/prompt'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

// ── 状态 ──
const categories = ref<PromptCategory[]>([])
const publishing = ref(false)
const publishForm = ref({
  title: '',
  prompt_text: '',
  category_id: 0,
  image_url: '',
  image_hash: '',
  tempFilePath: '',
})

// ── 计算属性 ──
const canSubmit = computed(() => {
  const f = publishForm.value
  return f.title.trim().length > 0 && f.prompt_text.trim().length > 0
})

// ── 初始化 ──
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录后再分享', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  await loadCategories()
})

// ── 加载分类 ──
async function loadCategories() {
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

// ── 图片选择 ──
function chooseImage() {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp,image/gif'
  input.onchange = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      uni.showToast({ title: '图片不能超过 5MB', icon: 'none' })
      return
    }
    publishForm.value.tempFilePath = URL.createObjectURL(file)
    publishForm.value.image_url = URL.createObjectURL(file)
  }
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      const tempPath = res.tempFilePaths[0]
      publishForm.value.tempFilePath = tempPath
      publishForm.value.image_url = tempPath
    },
  })
  // #endif
}

function removePublishImage() {
  publishForm.value.image_url = ''
  publishForm.value.image_hash = ''
  publishForm.value.tempFilePath = ''
}

// ── 提交发布 ──
async function submitPublish() {
  if (!canSubmit.value || publishing.value) return

  publishing.value = true
  try {
    let imageUrl = publishForm.value.image_url
    let imageHash = ''

    // 如果有临时文件，先上传
    if (publishForm.value.tempFilePath && !publishForm.value.image_url.startsWith('http')) {
      uni.showLoading({ title: '正在上传图片...' })
      const uploadResult = await uploadCommunityImage(publishForm.value.tempFilePath)
      imageUrl = uploadResult.url
      imageHash = uploadResult.hash
      uni.hideLoading()
    }

    // 创建社区帖子
    uni.showLoading({ title: '发布中...' })
    await createCommunityPost({
      title: publishForm.value.title,
      prompt_text: publishForm.value.prompt_text,
      category_id: publishForm.value.category_id || undefined,
      image_url: imageUrl,
      image_hash: imageHash || undefined,
    })

    uni.hideLoading()
    uni.showToast({ title: '发布成功！🎉', icon: 'success' })

    // 返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '发布失败', icon: 'none' })
  } finally {
    publishing.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow: hidden;
  background: #F5F6F7;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.publish-scroll {
  flex: 1;
  width: 100%;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* ── 图片上传 ── */
.upload-area {
  width: 100%;
  height: 360rpx;
  border: 2rpx dashed #ddd;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
  overflow: hidden;
  background: #fafafa;

  &:active {
    border-color: #7C4DFF;
    background: #EDE7F6;
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.upload-hint {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.upload-sub {
  font-size: 22rpx;
  color: #bbb;
}

.upload-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-remove {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 56rpx;
  height: 56rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
}

/* ── 表单 ── */
.form-item {
  margin-bottom: 28rpx;
}

.form-label {
  font-size: 28rpx;
  color: #1C1C1C;
  font-weight: 600;
  margin-bottom: 16rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1C1C1C;
  background: #fff;
  box-sizing: border-box;

  &:focus {
    border-color: #7C4DFF;
  }
}

.form-textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 24rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1C1C1C;
  line-height: 1.6;
  background: #fff;
  box-sizing: border-box;

  &:focus {
    border-color: #7C4DFF;
  }
}

.char-count {
  font-size: 22rpx;
  color: #bbb;
  text-align: right;
  display: block;
  margin-top: 8rpx;
}

.category-picker {
  white-space: nowrap;
  margin-top: 8rpx;
}

.pick-tag {
  display: inline-block;
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #F5F5F5;
  font-size: 26rpx;
  color: #666;
  margin-right: 16rpx;

  &.active {
    background: #7C4DFF;
    color: #fff;
  }
}

.bottom-placeholder {
  height: 180rpx;
}

/* ── 底部按钮 ── */
.publish-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #F0F0F0;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7C4DFF, #7C4DFF);
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;

  &.disabled {
    opacity: 0.4;
  }

  &:active:not(.disabled) {
    opacity: 0.85;
  }
}

.publish-tip {
  font-size: 22rpx;
  color: #bbb;
  text-align: center;
  display: block;
  margin-top: 12rpx;
}
</style>
