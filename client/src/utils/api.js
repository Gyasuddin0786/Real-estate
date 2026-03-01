import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:5000';

axios.defaults.baseURL = API_BASE_URL;

// Add auth token to requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const propertyAPI = {
  getAll: (params) => axios.get('/api/properties', { params }),
  getFeatured: () => axios.get('/api/properties/featured'),
  getById: (id) => axios.get(`/api/properties/${id}`),
  getOwnerProperties: () => {
    console.log('Making request to /api/properties/owner');
    return axios.get('/api/properties/owner');
  },
  create: (data) => {
    console.log('Creating property with data:', data);
    return axios.post('/api/properties', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  update: (id, data) => axios.put(`/api/properties/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  delete: (id) => axios.delete(`/api/properties/${id}`),
  addReview: (id, review) => axios.post(`/api/properties/${id}/reviews`, review)
};

export const bookingAPI = {
  create: (data) => axios.post('/api/bookings', data),
  getMyBookings: () => axios.get('/api/bookings/my-bookings'),
  getOwnerBookings: () => axios.get('/api/bookings/owner-bookings'),
  updateStatus: (id, status) => axios.put(`/api/bookings/${id}/status`, { status })
};

export const userAPI = {
  getProfile: () => axios.get('/api/users/profile'),
  updateProfile: (data) => axios.put('/api/users/profile', data),
  changePassword: (data) => axios.put('/api/users/change-password', data),
  getAllUsers: () => axios.get('/api/users/all'),
  updateUserStatus: (id, data) => axios.put(`/api/users/${id}/status`, data),
  updateUserRole: (id, data) => axios.put(`/api/users/${id}/role`, data)
};

export const statsAPI = {
  getStats: () => axios.get('/api/stats')
};

export const adminAPI = {
  getDashboardStats: () => axios.get('/api/admin/dashboard-stats'),
  getRecentActivities: () => axios.get('/api/admin/recent-activities'),
  getOwnerPerformance: () => axios.get('/api/admin/owner-performance')
};

export default axios;