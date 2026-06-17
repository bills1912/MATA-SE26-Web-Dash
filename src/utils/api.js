import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : '') + '/api';

const api = axios.create({ baseURL: BASE });

export const dashApi = {
  // ── Summary & Rekap ──────────────────────────────────────
  getSummary:    (p) => api.get('/laporan/summary',   { params: p }),
  getRekap:      (p) => api.get('/laporan/rekap',     { params: p }),
  getList:       (p) => api.get('/laporan',           { params: p }),
  getTrend:      (p) => api.get('/trend',             { params: p }),
  getLeaderboard:(p) => api.get('/leaderboard',       { params: p }),
  getBelumLapor: (p) => api.get('/belum-lapor',       { params: p }),

  // ── Wilayah (kecamatan → desa → SLS) ─────────────────────
  getKecamatan:  ()  => api.get('/wilayah/kecamatan'),
  getDesa:       (kecamatan) => api.get('/wilayah/desa', { params: { kecamatan } }),
  getSls:        (p) => api.get('/wilayah/sls',          { params: p }),
  getSlsDetail:  (idsubsls)  => api.get(`/wilayah/${idsubsls}`),

  // ── CRUD Laporan ──────────────────────────────────────────
  postLaporan:   (data)      => api.post('/laporan',          data),
  updateLaporan: (id, data)  => api.put(`/laporan/${id}`,     data),
  deleteLaporan: (id)        => api.delete(`/laporan/${id}`),
  checkLaporan:  (p)         => api.get('/laporan/check',     { params: p }),

  // ── Export ────────────────────────────────────────────────
  exportCsv: (p) => {
    const q = new URLSearchParams(p).toString();
    window.open(`${BASE}/export/csv?${q}`, '_blank');
  },
};
