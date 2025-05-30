import { get, post, put, del } from './api.js'

class BaseApi {
  baseUrl = "";
  controller = "";

  constructor(controller = '') {
    this.baseUrl = '';
    this.controller = controller;
  }

  getApiUrl() {
    return this.baseUrl + this.controller;
  }

  // Basic HTTP methods
  async get(endpoint = '', config = {}) {
    const url = this.getApiUrl() + endpoint;
    return await get(url, config);
  }

  async post(endpoint = '', data = {}, config = {}) {
    const url = this.getApiUrl() + endpoint;
    return await post(url, data, config);
  }

  async put(endpoint = '', data = {}, config = {}) {
    const url = this.getApiUrl() + endpoint;
    return await put(url, data, config);
  }

  async delete(endpoint = '', config = {}) {
    const url = this.getApiUrl() + endpoint;
    return await del(url, config);
  }

  // CRUD Operations - Single Item
  
  // Create a new item
  async create(data) {
    return await this.post('', data);
  }

  // Read/Get all items
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `?${queryString}` : '';
    return await this.get(endpoint);
  }

  // Read/Get item by ID
  async getById(id) {
    return await this.get(`/${id}`);
  }

  // Update item by ID
  async update(id, data) {
    return await this.put(`/${id}`, data);
  }

  // Delete item by ID
  async deleteById(id) {
    return await this.delete(`/${id}`);
  }

  // CRUD Operations - Batch/Multiple Items

  // Create multiple items
  async createBatch(dataArray) {
    return await this.post('/batch', { items: dataArray });
  }

  // Get multiple items by IDs
  async getByIds(ids) {
    const queryString = new URLSearchParams({ ids: ids.join(',') }).toString();
    return await this.get(`/batch?${queryString}`);
  }

  // Update multiple items
  async updateBatch(updates) {
    return await this.put('/batch', { updates });
  }

  // Delete multiple items by IDs
  async deleteBatch(ids) {
    return await this.delete('/batch', { data: { ids } });
  }

  // Advanced CRUD Operations

  // Search items with filters
  async search(filters = {}, pagination = {}) {
    const params = { ...filters, ...pagination };
    return await this.getAll(params);
  }

  // Paginated results
  async paginate(page = 1, limit = 10, filters = {}) {
    const params = { page, limit, ...filters };
    return await this.getAll(params);
  }

  // Count total items
  async count(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const endpoint = queryString ? `/count?${queryString}` : '/count';
    return await this.get(endpoint);
  }

  // Check if item exists
  async exists(id) {
    try {
      await this.getById(id);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  // Partial update (PATCH-like behavior)
  async patch(id, partialData) {
    return await this.put(`/${id}`, partialData);
  }

  // Bulk operations
  async bulkCreate(dataArray) {
    return await this.post('/bulk', { operation: 'create', data: dataArray });
  }

  async bulkUpdate(updates) {
    return await this.put('/bulk', { operation: 'update', data: updates });
  }

  async bulkDelete(ids) {
    return await this.delete('/bulk', { data: { operation: 'delete', ids } });
  }
}

export default BaseApi;