<template>
  <!-- Default content khi chưa chọn chat -->
  <div class="flex-1 flex items-center justify-center bg-gray-100">
    <div class="text-center text-gray-500">
      <div class="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.946-1.524A11.05 11.05 0 014 13.372 8 8 0 1721 12z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Chào mừng đến với ZaloClone! 👋</h3>
      <p class="text-sm text-gray-500">Chọn một cuộc trò chuyện từ sidebar để bắt đầu nhắn tin.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home'
}
</script>