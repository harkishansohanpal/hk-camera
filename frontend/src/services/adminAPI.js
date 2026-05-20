import api from './api';

export const adminAPI = {
  getLogs:      (params) => api.get('/admin/logs', { params }),
  getLogMeta:   ()        => api.get('/admin/logs/meta'),
  analyzeLogs:  (body)    => api.post('/admin/logs/analyze', body),
};

export default adminAPI;
