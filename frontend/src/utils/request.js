import { api } from "./api";

/**
 * Standard reusable request helper
 */
export const request = {
  get: async (url, params = {}) => {
    const response = await api.get(url, { params });
    return response.data;
  },

  post: async (url, data = {}, config = {}) => {
    const response = await api.post(url, data, config);
    return response.data;
  },

  put: async (url, data = {}, config = {}) => {
    const response = await api.put(url, data, config);
    return response.data;
  },

  patch: async (url, data = {}, config = {}) => {
    const response = await api.patch(url, data, config);
    return response.data;
  },

  delete: async (url, params = {}) => {
    const response = await api.delete(url, { params });
    return response.data;
  },

  upload: async (url, formData) => {
    const response = await api.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  uploadPut: async (url, formData) => {
    const response = await api.put(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
