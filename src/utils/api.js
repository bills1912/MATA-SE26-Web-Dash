import axios from 'axios';

// Saat dev: Vite proxy /api → backend:5000/api (tidak ada rewrite)
// Saat production (frontend di-serve terpisah): set VITE_API_URL ke URL backend lengkap
// Contoh: VITE_API_URL=https://mata-se26-backend.up.railway.app
// BASE akan menjadi https://mata-se26-backend.up.railway.app/api
const BASE = (import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')   // strip /api jika user keliru tambahkan
  : '') + '/api';

const api = axios.create({ baseURL: BASE });

export const dashApi = {
  getSummary:    (p) => api.get('/laporan/summary', { params: p }),
  getRekap:      (p) => api.get('/laporan/rekap',   { params: p }),
  getList:       (p) => api.get('/laporan',          { params: p }),
  getTrend:      (p) => api.get('/trend',            { params: p }),
  getLeaderboard:(p) => api.get('/leaderboard',      { params: p }),
  getBelumLapor: (p) => api.get('/belum-lapor',      { params: p }),
  getKecamatan:  ()  => api.get('/wilayah/kecamatan'),
  exportCsv: (p) => {
    const q = new URLSearchParams(p).toString();
    // Gunakan BASE agar URL export juga ikut konfigurasi
    window.open(`${BASE}/export/csv?${q}`, '_blank');
  },
};
