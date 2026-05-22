import api from './api';

export const adminAPI = {
  getLogs:           (params) => api.get('/admin/logs', { params }),
  getLogMeta:        ()        => api.get('/admin/logs/meta'),
  analyzeLogs:       (body)    => api.post('/admin/logs/analyze', body),
  lookupUser:        (email)   => api.get('/admin/users', { params: { email } }),
  suspendUser:       (userId, reason) => api.patch(`/admin/users/${userId}/suspend`, { reason }),
  unsuspendUser:     (userId)  => api.patch(`/admin/users/${userId}/unsuspend`),
  toggleLegalHold:   (userId, enabled) => api.put(`/admin/users/${userId}/legal-hold`, { enabled }),
  exportUser:        (userId)  => api.put(`/admin/users/${userId}/export`),
  deleteRecording:   (id)      => api.delete(`/admin/recordings/${id}`),
};

export default adminAPI;
