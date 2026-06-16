# MATA SE26 — Dashboard Pemantauan

Dashboard pemantauan Sensus Ekonomi 2026 — BPS Kabupaten Padang Lawas Utara.

---

## 🚀 Deploy ke Railway

### Prasyarat
- Akun [Railway](https://railway.app)
- Backend API sudah berjalan (MongoDB + Express/Fastify/dll)
- Git repository (GitHub/GitLab)

### Langkah Deploy

**1. Push ke GitHub**
```bash
git init
git add .
git commit -m "init: mata-se26 dashboard"
git remote add origin https://github.com/username/mata-se26-dashboard.git
git push -u origin main
```

**2. Buat project baru di Railway**
- Buka [railway.app](https://railway.app) → New Project
- Pilih **Deploy from GitHub repo**
- Pilih repository ini

**3. Set Environment Variables di Railway**

Masuk ke tab **Variables** pada service Railway, tambahkan:

| Variable | Nilai |
|---|---|
| `VITE_API_URL` | `https://your-backend.up.railway.app/api` |

> ⚠️ Ganti URL dengan alamat backend API kamu yang sudah di-deploy.

**4. Deploy**
Railway akan otomatis:
- Menjalankan `npm install && npm run build`
- Menyajikan folder `dist/` via `serve` di port yang diberikan Railway

---

## 🛠️ Development Lokal

```bash
# Install dependencies
npm install

# Buat file .env.local
cp .env.example .env.local
# Edit VITE_API_URL sesuai backend lokal kamu

# Jalankan dev server
npm run dev
```

---

## 📁 Struktur Project

```
├── src/
│   ├── pages/
│   │   ├── Overview.jsx      # Ringkasan & grafik utama
│   │   ├── Leaderboard.jsx   # Ranking PCL
│   │   └── Monitor.jsx       # Monitor cakupan SLS
│   ├── components/
│   │   └── ThemeToggle.jsx
│   ├── utils/
│   │   ├── api.js            # Konfigurasi Axios
│   │   └── date.js
│   ├── App.jsx
│   └── index.css
├── railway.json              # Konfigurasi Railway
├── vite.config.js
└── package.json
```

---

## 🔑 Environment Variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `VITE_API_URL` | ✅ | URL base API backend. Contoh: `https://api.example.com/api` |

> **Catatan:** Variable dengan prefix `VITE_` di-embed saat build. Pastikan variabel ini sudah di-set di Railway **sebelum** deploy dilakukan.

---

## ⚙️ Scripts

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server lokal dengan hot-reload |
| `npm run build` | Build production ke folder `dist/` |
| `npm run start` | Serve folder `dist/` (dipakai Railway) |
| `npm run preview` | Preview build lokal |

---

© BPS Kabupaten Padang Lawas Utara — Sensus Ekonomi 2026
