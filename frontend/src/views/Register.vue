<template>
  <div class="auth-container">
    <div class="auth-card">
      <div>
        <h2 class="auth-title">
          Tạo tài khoản mới
        </h2>
        <p class="text-center text-sm text-gray-600 mb-6">
          Hoặc
          <router-link to="/login" class="font-medium text-blue-600 hover:text-blue-500">
            đăng nhập tài khoản có sẵn
          </router-link>
        </p>
      </div>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="firstName" class="form-label">Họ</label>
          <input
            id="firstName"
            v-model="form.firstName"
            name="firstName"
            type="text"
            required
            class="form-input"
            placeholder="Nhập họ"
          />
        </div>
        
        <div class="form-group">
          <label for="lastName" class="form-label">Tên</label>
          <input
            id="lastName"
            v-model="form.lastName"
            name="lastName"
            type="text"
            required
            class="form-input"
            placeholder="Nhập tên"
          />
        </div>
        
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
            autocomplete="new-password"
            required
            class="form-input"
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
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
          <span v-if="authStore.isLoading">Đang tạo tài khoản...</span>
          <span v-else>Tạo tài khoản</span>
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
  name: 'Register',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const socketStore = useSocketStore()
    
    const form = ref({
      firstName: '',
      lastName: '',
      email: '',
      password: ''
    })

    const handleRegister = async () => {
      authStore.clearError()
      
      if (form.value.password.length < 6) {
        authStore.error = 'Mật khẩu phải có ít nhất 6 ký tự'
        return
      }
      
      const result = await authStore.register(form.value)
      if (result.success) {
        // Initialize socket connection after successful registration
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
      handleRegister
    }
  }
}
</script>