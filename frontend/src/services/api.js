import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

API.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const studentService = {
  getAll: (params) => API.get('/students', { params }),
  getById: (id) => API.get(`/students/${id}`),
  create: (data) => API.post('/students', data),
  update: (id, data) => API.put(`/students/${id}`, data),
  delete: (id) => API.delete(`/students/${id}`),
  addEnrollment: (id, data) => API.post(`/students/${id}/enrollments`, data),
};

export const importService = {
  uploadFiles: (files, onProgress) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return API.post('/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  getJobStatus: (jobId) => API.get(`/import/status/${jobId}`),
  getAllJobs: () => API.get('/import/jobs'),
  downloadTemplate: () => window.open('http://localhost:5000/api/import/template', '_blank'),
};

export const courseService = {
  getAll: () => API.get('/courses'),
  create: (data) => API.post('/courses', data),
  update: (id, data) => API.put(`/courses/${id}`, data),
  delete: (id) => API.delete(`/courses/${id}`),
};

export const statsService = {
  get: () => API.get('/stats'),
};

export default API;
