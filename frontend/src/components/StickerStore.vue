<template>
  <div class="sticker-store-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeStore">
    <div class="sticker-store bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" @click.stop>
      <!-- Header -->
      <div class="store-header p-6 border-b border-gray-200 dark:border-gray-600">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Sticker Store</h2>
          <button
            @click="closeStore"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Search and Filter Bar -->
        <div class="flex items-center space-x-4 mt-4">
          <!-- Search Input -->
          <div class="flex-1 relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search sticker packs..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="debouncedSearch"
            />
            <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            @change="loadStickerPacks"
          >
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category.value" :value="category.value">
              {{ category.label }}
            </option>
          </select>

          <!-- Show Default Toggle -->
          <label class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              v-model="showDefaultOnly"
              type="checkbox"
              class="rounded"
              @change="loadStickerPacks"
            />
            <span>Default packs only</span>
          </label>
        </div>
      </div>

      <!-- Content -->
      <div class="store-content p-6 overflow-y-auto max-h-96">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-500 mb-4">{{ error }}</p>
          <button
            @click="loadStickerPacks"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="stickerPacks.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7"></path>
          </svg>
          <p class="text-gray-500">No sticker packs found</p>
        </div>

        <!-- Sticker Packs Grid -->
        <div v-else class="sticker-packs-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="pack in stickerPacks"
            :key="pack._id"
            class="sticker-pack-card bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow"
          >
            <!-- Pack Thumbnail -->
            <div class="pack-thumbnail relative h-32 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <img
                :src="pack.thumbnailUrl"
                :alt="pack.name"
                class="w-16 h-16 object-contain"
                @error="handleThumbnailError"
              />
              <!-- Free/Premium Badge -->
              <div
                class="absolute top-2 right-2 px-2 py-1 text-xs rounded-full"
                :class="pack.isFree ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
              >
                {{ pack.isFree ? 'Free' : `$${pack.price}` }}
              </div>
            </div>

            <!-- Pack Info -->
            <div class="pack-info p-4">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">{{ pack.name }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{{ pack.description }}</p>
              
              <!-- Pack Stats -->
              <div class="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{{ pack.stickerCount || 0 }} stickers</span>
                <span>{{ pack.downloadCount || 0 }} downloads</span>
              </div>

              <!-- Author -->
              <p class="text-xs text-gray-400 mt-1">
                by {{ pack.author?.firstName }} {{ pack.author?.lastName }}
              </p>

              <!-- Actions -->
              <div class="flex items-center space-x-2 mt-4">
                <button
                  @click="previewPack(pack)"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Preview
                </button>
                <button
                  v-if="!pack.isOwned"
                  @click="downloadPack(pack)"
                  :disabled="downloadingPacks.has(pack._id)"
                  class="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span v-if="downloadingPacks.has(pack._id)">Downloading...</span>
                  <span v-else>{{ pack.isFree ? 'Download' : 'Buy' }}</span>
                </button>
                <div v-else class="flex-1 px-3 py-2 text-sm text-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 rounded-lg">
                  ✓ Owned
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div v-if="hasMorePacks" class="text-center mt-8">
          <button
            @click="loadMorePacks"
            :disabled="loadingMore"
            class="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <span v-if="loadingMore">Loading...</span>
            <span v-else>Load More</span>
          </button>
        </div>
      </div>

      <!-- Pack Preview Modal -->
      <div
        v-if="previewingPack"
        class="pack-preview-overlay fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60"
        @click="closePreview"
      >
        <div class="pack-preview bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden" @click.stop>
          <!-- Preview Header -->
          <div class="preview-header p-4 border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ previewingPack.name }}</h3>
              <button @click="closePreview" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Preview Content -->
          <div class="preview-content p-4 max-h-96 overflow-y-auto">
            <div v-if="previewLoading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            
            <div v-else-if="previewStickers.length === 0" class="text-center py-12 text-gray-500">
              No stickers in this pack
            </div>
            
            <div v-else class="preview-stickers grid grid-cols-6 gap-3">
              <div
                v-for="sticker in previewStickers"
                :key="sticker._id"
                class="sticker-preview-item p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                :title="sticker.name"
              >
                <img
                  :src="sticker.url"
                  :alt="sticker.name"
                  class="w-full h-auto max-w-16 max-h-16 mx-auto"
                  @error="handleStickerError"
                />
              </div>
            </div>
          </div>

          <!-- Preview Actions -->
          <div class="preview-actions p-4 border-t border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600 dark:text-gray-300">
                {{ previewStickers.length }} stickers
              </div>
              <div class="space-x-2">
                <button
                  @click="closePreview"
                  class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
                <button
                  v-if="!previewingPack.isOwned"
                  @click="downloadPack(previewingPack)"
                  :disabled="downloadingPacks.has(previewingPack._id)"
                  class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <span v-if="downloadingPacks.has(previewingPack._id)">Downloading...</span>
                  <span v-else>{{ previewingPack.isFree ? 'Download' : `Buy $${previewingPack.price}` }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import stickerApi from '../services/business/stickerApi';

export default {
  name: 'StickerStore',
  emits: ['close', 'pack-downloaded'],
  setup(props, { emit }) {
    // Component state
    const loading = ref(false);
    const loadingMore = ref(false);
    const error = ref(null);
    const searchQuery = ref('');
    const selectedCategory = ref('');
    const showDefaultOnly = ref(false);

    // Data
    const stickerPacks = ref([]);
    const categories = ref([]);
    const downloadingPacks = ref(new Set());
    const currentPage = ref(1);
    const hasMorePacks = ref(false);

    // Preview
    const previewingPack = ref(null);
    const previewStickers = ref([]);
    const previewLoading = ref(false);

    // Search debouncing
    let searchTimeout = null;

    // Methods
    const closeStore = () => {
      emit('close');
    };

    const loadCategories = async () => {
      try {
        const response = await stickerApi.getStickerCategories();
        categories.value = response.categories || [];
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    const loadStickerPacks = async (reset = true) => {
      try {
        if (reset) {
          loading.value = true;
          currentPage.value = 1;
          stickerPacks.value = [];
        } else {
          loadingMore.value = true;
        }

        error.value = null;

        const params = {
          page: currentPage.value,
          limit: 12,
          ...(selectedCategory.value && { category: selectedCategory.value }),
          ...(searchQuery.value && { search: searchQuery.value }),
          ...(showDefaultOnly.value && { isDefault: true })
        };

        const response = await stickerApi.getStickerPacks(params);
        
        if (reset) {
          stickerPacks.value = response.packs || [];
        } else {
          stickerPacks.value.push(...(response.packs || []));
        }

        hasMorePacks.value = response.hasNext || false;
      } catch (err) {
        console.error('Error loading sticker packs:', err);
        error.value = 'Failed to load sticker packs';
      } finally {
        loading.value = false;
        loadingMore.value = false;
      }
    };

    const loadMorePacks = async () => {
      currentPage.value++;
      await loadStickerPacks(false);
    };

    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadStickerPacks();
      }, 500);
    };

    const previewPack = async (pack) => {
      try {
        previewingPack.value = pack;
        previewLoading.value = true;
        previewStickers.value = [];

        const response = await stickerApi.getPackStickers(pack._id);
        previewStickers.value = response.stickers || [];
      } catch (err) {
        console.error('Error loading pack preview:', err);
        previewStickers.value = [];
      } finally {
        previewLoading.value = false;
      }
    };

    const closePreview = () => {
      previewingPack.value = null;
      previewStickers.value = [];
    };

    const downloadPack = async (pack) => {
      try {
        downloadingPacks.value.add(pack._id);

        await stickerApi.addPackToUser(pack._id);
        
        // Mark pack as owned
        pack.isOwned = true;
        
        // Update pack in preview if it's the same
        if (previewingPack.value && previewingPack.value._id === pack._id) {
          previewingPack.value.isOwned = true;
        }

        emit('pack-downloaded', pack);
        
        // Show success message
        console.log(`✅ Downloaded sticker pack: ${pack.name}`);
      } catch (err) {
        console.error('Error downloading pack:', err);
        error.value = 'Failed to download sticker pack';
      } finally {
        downloadingPacks.value.delete(pack._id);
      }
    };

    const handleThumbnailError = (event) => {
      event.target.style.display = 'none';
    };

    const handleStickerError = (event) => {
      event.target.style.display = 'none';
    };

    // Lifecycle hooks
    onMounted(async () => {
      await Promise.all([
        loadCategories(),
        loadStickerPacks()
      ]);
    });

    return {
      // State
      loading,
      loadingMore,
      error,
      searchQuery,
      selectedCategory,
      showDefaultOnly,
      stickerPacks,
      categories,
      downloadingPacks,
      hasMorePacks,
      previewingPack,
      previewStickers,
      previewLoading,

      // Methods
      closeStore,
      loadStickerPacks,
      loadMorePacks,
      debouncedSearch,
      previewPack,
      closePreview,
      downloadPack,
      handleThumbnailError,
      handleStickerError
    };
  }
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.z-60 {
  z-index: 60;
}
</style>