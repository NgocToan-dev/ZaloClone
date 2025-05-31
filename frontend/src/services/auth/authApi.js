import BaseApi from "@services/baseApi.js";

class AuthApi extends BaseApi {
  constructor() {
    super("/api/auth");
  }

  async login(email, password) {
    return await this.post("/login", { email, password });
  }

  async register(userData) {
    const { firstName, lastName, email, password } = userData;
    return await this.post("/register", {
      firstName,
      lastName,
      email,
      password,
    });
  }

  async logout() {
    return await this.post("/logout");
  }

  async getCurrentUser() {
    return await this.get("/me");
  }

  async refreshToken() {
    return await this.post("/refresh");
  }

    async changePassword(currentPassword, newPassword) {
    return await this.put('/change-password', { currentPassword, newPassword })
  }
}

export default new AuthApi();