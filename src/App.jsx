import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useEffect } from 'react';
import Overview      from './pages/Overview';
import Leaderboard   from './pages/Leaderboard';
import Monitor       from './pages/Monitor';
import InputLaporan  from './pages/InputLaporan';
import ThemeToggle, { useTheme } from './components/ThemeToggle';
import { dashApi } from './utils/api';

dayjs.locale('id');

const PAGES = [
  { id:'overview',    label:'Overview',    icon:'📊', desc:'Ringkasan & grafik harian'    },
  { id:'leaderboard', label:'Ranking PCL', icon:'🏆', desc:'Performa pencacah'             },
  { id:'monitor',     label:'Monitor SLS', icon:'📡', desc:'Cakupan pelaporan hari ini'    },
  { id:'input',       label:'Input Laporan',icon:'📝', desc:'Tambah / edit laporan SLS'   },
];

export default function App() {
  const [page,     setPage]     = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [kecList,  setKecList]  = useState([]);
  const { theme, setTheme } = useTheme();
  const cur = PAGES.find(p => p.id === page);

  useEffect(() => {
    dashApi.getKecamatan().then(r => setKecList(r.data)).catch(() => {});
  }, []);

  const nav = (id) => { setPage(id); setMenuOpen(false); };

  return (
    <div className="app">
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="sb-brand">
          <div className="sb-logo">👁️</div>
          <div>
            <div className="sb-name">MATA SE26</div>
            <div className="sb-sub">Dashboard Pemantauan</div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-label">Menu Utama</div>
          {PAGES.map(p => (
            <button
              key={p.id}
              className={'sb-btn' + (page === p.id ? ' active' : '')}
              onClick={() => nav(p.id)}
            >
              <span className="sb-btn-icon">{p.icon}</span>
              <span className="sb-btn-label">{p.label}</span>
              {page === p.id && <span className="sb-dot"/>}
            </button>
          ))}

          <div className="sb-label" style={{ marginTop:14 }}>Informasi</div>
          <div style={{ padding:'8px 10px', fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
            Aplikasi pelaporan lapangan<br/>
            <strong style={{ color:'var(--p3)' }}>Sensus Ekonomi 2026</strong><br/>
            BPS Kab. Padang Lawas Utara
          </div>
        </nav>

        <div className="sb-theme">
          <div className="sb-theme-label">Tema Tampilan</div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>

        <div className="sb-footer">
          <div className="sb-footer-text">Sensus Ekonomi 2026</div>
          <div className="sb-footer-sub">© BPS Kab. Padang Lawas Utara</div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>☰</button>
          <span className="mobile-brand">MATA SE26</span>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>

        {/* Desktop topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">{cur?.icon} {cur?.label}</div>
              <div className="topbar-sub">{cur?.desc}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div className="live-dot"/>
              <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>Live</span>
            </div>
            <div className="topbar-date">{dayjs().format('dddd, D MMM YYYY')}</div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>

        {/* Page content */}
        <div className="content">
          {page === 'overview'    && <Overview    kecamatanList={kecList} />}
          {page === 'leaderboard' && <Leaderboard kecamatanList={kecList} />}
          {page === 'monitor'     && <Monitor     kecamatanList={kecList} />}
          {page === 'input'       && <InputLaporan kecamatanList={kecList} />}
        </div>
      </div>
    </div>
  );
}
