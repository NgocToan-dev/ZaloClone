<template>
  <div class="auth-container">
    <div class="auth-card">
      <div>
        <h2 class="auth-title">
          Login
        </h2>
        <p class="text-center text-sm text-gray-600 mb-6">
          Hoặc
          <router-link to="/register" class="font-medium text-blue-600 hover:text-blue-500">
            tạo tài khoản mới
          </router-link>
        </p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="form-input"
            placeholder="Nhập địa chỉ email"
          />
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">Mật khẩu</label>
          <input
            id="password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="form-input"
            placeholder="Nhập mật khẩu"
          />
        </div>

        <div v-if="authStore.error" class="text-red-600 text-sm text-center mb-4">
          {{ authStore.error }}
        </div>

        <button
          type="submit"
          :disabled="authStore.isLoading"
          class="btn btn-primary w-full btn-lg"
        >
          <span v-if="authStore.isLoading">Đang đăng nhập...</span>
          <span v-else>Đăng nhập</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useSocketStore } from '../store'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const socketStore = useSocketStore()
    
    const form = ref({
      email: '',
      password: ''
    })

    const handleLogin = async () => {
      authStore.clearError()
      
      const result = await authStore.login(form.value)
      if (result.success) {
        // Initialize socket connection after successful login
        await socketStore.initialize()
        router.push('/')
      }
    }

    onMounted(() => {
      // Redirect if already authenticated
      if (authStore.isAuthenticated) {
        router.push('/')
      }
    })

    return {
      form,
      authStore,
      handleLogin
    }
  }
}
</script>