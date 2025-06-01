import baseApi from '@services/baseApi';

// Sticker API service
export const stickerApi = {
  // Get all public sticker packs
  async getStickerPacks(params = {}) {
    const { page = 1, limit = 20, category, search, isDefault } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(search && { search }),
      ...(isDefault !== undefined && { isDefault: isDefault.toString() })
    });

    const response = await baseApi.get(`/stickers/packs?${queryParams}`);
    return response.data;
  },

  // Get stickers in a specific pack
  async getPackStickers(packId) {
    const response = await baseApi.get(`/stickers/pack/${packId}`);
    return response.data;
  },

  // Get user's owned sticker packs
  async getUserStickerPacks(params = {}) {
    const { page = 1, limit = 20 } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    const response = await baseApi.get(`/stickers/user/packs?${queryParams}`);
    return response.data;
  },

  // Add sticker pack to user (download/purchase)
  async addPackToUser(packId) {
    const response = await baseApi.post(`/stickers/user/pack/${packId}`);
    return response.data;
  },

  // Send sticker message
  async sendStickerMessage(data) {
    const { stickerId, packId, chatId } = data;
    const response = await baseApi.post('/stickers/message', {
      stickerId,
      packId,
      chatId
    });
    return response.data;
  },

  // Get sticker categories
  async getStickerCategories() {
    const response = await baseApi.get('/stickers/categories');
    return response.data;
  },

  // Admin: Create sticker pack
  async createStickerPack(packData) {
    const response = await baseApi.post('/stickers/pack', packData);
    return response.data;
  },

  // Admin: Add sticker to pack
  async addStickerToPack(packId, stickerData) {
    const response = await baseApi.post(`/stickers/pack/${packId}/sticker`, stickerData);
    return response.data;
  }
};

export default stickerApi;