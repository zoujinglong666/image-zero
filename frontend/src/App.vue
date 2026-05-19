<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch(async () => {
  // 自动登录：检查本地 Token 是否有效
  const userStore = useUserStore()
  await userStore.autoLogin()
})
</script>

<style lang="scss">
@import "uview-pro/index.scss";
@import "common/style.scss";
</style>
