import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart,
} from 'recharts';
import DatePicker, { todayStr } from '../components/DatePicker';
import SearchSelect from '../components/SearchSelect';
import { RefreshButton, ExportButton } from '../components/ActionButtons';
import '../components/custom-controls.css';
import { dashApi } from '../utils/api';

dayjs.locale('id');

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#a855f7'];
const ROSE_COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#e11d48', '#be123c', '#9f1239', '#881337'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        <div className="tt-row" key={i}>
          <span className="tt-dot" style={{ background: p.color }} />
          {p.name}: <strong>{(p.value || 0).toLocaleString('id-ID')}</strong>
        </div>
      ))}
    </div>
  );
};

function useCountUp(target, duration = 1000, delay = 0, trigger = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger || !target) return;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        const pct = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - pct, 3);
        setVal(Math.round(ease * target));
        if (pct < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay, trigger]);
  return val;
}

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function StatCard({ icon, label, value, className, delay = 0, inView }) {
  const animated = useCountUp(value, 1000, delay, inView);
  return (
    <div className={`stat-card ${className} animate-fadein`} style={{ animationDelay: `${delay}ms` }}>
      <div className="s-icon">{icon}</div>
      <div className="s-val" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {animated.toLocaleString('id-ID')}
      </div>
      <div className="s-label">{label}</div>
    </div>
  );
}

function BelumGauge({ pct, total }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(244,63,94,0.1)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="url(#roseGrad)" strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <defs>
          <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fda4af', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>dari total</div>
      </div>
    </div>
  );
}

// ── Komponen panel detail petugas P6 per kecamatan — dengan paginasi ──────────
const P6_DETAIL_PER_PAGE = 5;

function P6KecDetail({ kecamatan, data, color }) {
  const rows = data || [];
  const [detailPage, setDetailPage] = useState(1);

  // Reset ke halaman 1 kalau data berubah (kecamatan berganti)
  useEffect(() => { setDetailPage(1); }, [kecamatan]);

  if (rows.length === 0) return null;

  const totalDetailPages = Math.ceil(rows.length / P6_DETAIL_PER_PAGE);
  const pageStart        = (detailPage - 1) * P6_DETAIL_PER_PAGE;
  const pageRows         = rows.slice(pageStart, pageStart + P6_DETAIL_PER_PAGE);

  return (
    <div style={{
      marginTop: 10,
      borderRadius: 10,
      border: `1px solid ${color}33`,
      background: `${color}08`,
      overflow: 'hidden',
      animation: 'fadeInUp 0.3s ease both',
    }}>
      {/* Header mini */}
      <div style={{
        padding: '8px 14px',
        background: `${color}14`,
        borderBottom: `1px solid ${color}22`,
        fontSize: 11,
        fontWeight: 700,
        color: color,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        <span>👤</span>
        <span>Detail Petugas Belum Submit — {kecamatan}</span>
        <span style={{
          marginLeft: 'auto',
          background: `${color}22`,
          border: `1px solid ${color}44`,
          borderRadius: 10,
          padding: '1px 8px',
          fontSize: 10,
          fontWeight: 800,
        }}>{rows.length} entri</span>
      </div>

      {/* Tabel petugas — hanya pageRows */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          minWidth: 480,
        }}>
          <thead>
            <tr>
              {['Desa', 'SLS', 'PCL (Pencacah)', 'PML (Pengawas)', 'Jml Belum', 'Catatan P6'].map(h => (
                <th key={h} style={{
                  padding: '7px 12px',
                  textAlign: 'left',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: `${color}0d`,
                  borderBottom: `1px solid ${color}22`,
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={pageStart + i} style={{
                borderBottom: `1px solid ${color}14`,
                animation: `fadeInUp 0.3s ease ${i * 40}ms both`,
              }}>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--text)' }}>{r.nmdesa}</td>
                <td style={{ padding: '9px 12px', color: 'var(--text2)', fontSize: 11 }}>{r.nmsubsls}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 6, padding: '3px 8px',
                    fontSize: 11, fontWeight: 700, color: '#a5b4fc',
                  }}>
                    👤 {r.pencacah}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--text3)' }}>
                  👁️ {r.pengawas}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    background: 'rgba(244,63,94,0.12)',
                    border: '1px solid rgba(244,63,94,0.25)',
                    borderRadius: 6, padding: '3px 8px',
                    fontSize: 12, fontWeight: 800, color: '#fda4af',
                  }}>{(r.jumlah_belum_submit || 0).toLocaleString('id-ID')}</span>
                </td>
                <td style={{ padding: '9px 12px', maxWidth: 260 }}>
                  {r.catatan_belum_submit ? (
                    <div style={{
                      fontSize: 11,
                      color: '#fcd34d',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: 6,
                      padding: '5px 9px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      💬 {r.catatan_belum_submit}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Paginasi detail petugas ── */}
      {totalDetailPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: `1px solid ${color}20`,
          background: `${color}08`,
          gap: 8,
          flexWrap: 'wrap',
        }}>
          {/* Info */}
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Menampilkan{' '}
            <strong style={{ color: 'var(--text2)' }}>{pageStart + 1}–{Math.min(pageStart + P6_DETAIL_PER_PAGE, rows.length)}</strong>
            {' '}dari{' '}
            <strong style={{ color: 'var(--text2)' }}>{rows.length}</strong> entri
          </span>

          {/* Tombol navigasi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Prev */}
            <button
              disabled={detailPage === 1}
              onClick={() => setDetailPage(p => p - 1)}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${color}30`,
                background: detailPage === 1 ? 'transparent' : `${color}12`,
                color: detailPage === 1 ? 'var(--text3)' : color,
                cursor: detailPage === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: detailPage === 1 ? 0.35 : 1,
                transition: 'all 0.15s',
              }}
            >‹</button>

            {/* Nomor halaman */}
            {Array.from({ length: totalDetailPages }, (_, i) => i + 1).map(pg => (
              <button
                key={pg}
                onClick={() => setDetailPage(pg)}
                style={{
                  minWidth: 28, height: 28, borderRadius: 6,
                  border: pg === detailPage
                    ? `1px solid ${color}60`
                    : `1px solid ${color}20`,
                  background: pg === detailPage ? `${color}20` : 'transparent',
                  color: pg === detailPage ? color : 'var(--text3)',
                  fontWeight: pg === detailPage ? 800 : 500,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                  transition: 'all 0.15s',
                }}
              >{pg}</button>
            ))}

            {/* Next */}
            <button
              disabled={detailPage === totalDetailPages}
              onClick={() => setDetailPage(p => p + 1)}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${color}30`,
                background: detailPage === totalDetailPages ? 'transparent' : `${color}12`,
                color: detailPage === totalDetailPages ? 'var(--text3)' : color,
                cursor: detailPage === totalDetailPages ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: detailPage === totalDetailPages ? 0.35 : 1,
                transition: 'all 0.15s',
              }}
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: bangun array nomor halaman dengan ellipsis ──
function buildPageNums(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

// ── Tombol paginasi ──
function PagBtn({ children, onClick, disabled, active, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 28, height: 28,
        borderRadius: 6,
        border: active
          ? '1px solid rgba(99,102,241,0.55)'
          : '1px solid var(--border)',
        background: active
          ? 'rgba(99,102,241,0.18)'
          : disabled ? 'transparent' : 'var(--surface)',
        color: active ? '#a5b4fc' : disabled ? 'var(--text3)' : 'var(--text2)',
        fontWeight: active ? 800 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 5px',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.13s',
      }}
    >{children}</button>
  );
}

export default function Overview({ kecamatanList }) {
  const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'));
  const [kecamatan, setKecamatan] = useState('');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [rekapDesa, setRekapDesa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [belumExpanded, setBelumExpanded] = useState(false);

  // State untuk P6 detail toggle per kecamatan
  const [p6Detail, setP6Detail] = useState({});          // { [nmkec]: [rows] }
  const [p6DetailLoading, setP6DetailLoading] = useState(false);
  const [p6ExpandedKec, setP6ExpandedKec] = useState({}); // { [nmkec]: bool }

  // Paginasi card "Urutan Kecamatan — P6 Tertinggi"
  const P6_PER_PAGE = 5;
  const [p6Page, setP6Page] = useState(1);

  // Rekap per Desa — search, filter kecamatan, paginasi
  const REKAP_PER_PAGE = 10;
  const [rekapQuery,    setRekapQuery]    = useState('');
  const [rekapKecFilter, setRekapKecFilter] = useState('');
  const [rekapSortCol,  setRekapSortCol]  = useState('kecamatan'); // kecamatan | desa | p1 | p2 | p3 | bangunan | belum | sls
  const [rekapSortDir,  setRekapSortDir]  = useState('asc');
  const [rekapPage,     setRekapPage]     = useState(1);

  const [statsRef, statsInView] = useInView(0.1);
  const [chartRef, chartInView] = useInView(0.1);
  const [belumRef, belumInView] = useInView(0.1);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    const p = { tanggal };
    if (kecamatan) p.kecamatan = kecamatan;
    try {
      const [s, r, t] = await Promise.all([
        dashApi.getSummary(p),
        dashApi.getRekap(p),
        dashApi.getTrend({ hari: 14, ...(kecamatan ? { kecamatan } : {}) }),
      ]);
      setSummary(s.data);
      setRekapDesa(Array.isArray(r.data) ? r.data : []);
      setTrend(Array.isArray(t.data) ? t.data.map(d => ({
        tgl: d._id.slice(5),
        usaha: d.total_usaha_submit || 0,
        keluarga: d.total_keluarga_submit || 0,
        bku: d.total_bku_submit || 0,
        belum: d.total_belum_submit || 0,
        total: (d.total_usaha_submit || 0) + (d.total_keluarga_submit || 0),
        laporan: d.jumlah_laporan || 0,
      })) : []);
      // Reset P6 detail saat data utama reload
      setP6Detail({});
      setP6ExpandedKec({});
      setP6Page(1);
      // Reset rekap table
      setRekapQuery('');
      setRekapKecFilter('');
      setRekapPage(1);
    } catch { }
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, [tanggal, kecamatan]);

  // Load detail P6 (lazy — hanya saat toggle dibuka pertama kali)
  const loadP6Detail = async () => {
    if (Object.keys(p6Detail).length > 0) return; // sudah ada, skip
    setP6DetailLoading(true);
    try {
      const p = { tanggal };
      if (kecamatan) p.kecamatan = kecamatan;
      const res = await dashApi.getP6Detail(p);
      setP6Detail(res.data || {});
    } catch {
      setP6Detail({});
    } finally {
      setP6DetailLoading(false);
    }
  };

  const toggleP6Kec = async (kecName) => {
    // Muat data jika belum ada
    if (Object.keys(p6Detail).length === 0) {
      await loadP6Detail();
    }
    setP6ExpandedKec(prev => ({ ...prev, [kecName]: !prev[kecName] }));
  };

  const safeRekap = Array.isArray(rekapDesa) ? rekapDesa : [];

  const pieData = Object.entries(
    safeRekap.reduce((acc, r) => {
      const k = r._id?.kecamatan || 'Lainnya';
      if (!acc[k]) acc[k] = 0;
      acc[k] += (r.total_usaha_submit || 0) + (r.total_keluarga_submit || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const kecBarData = Object.entries(
    safeRekap.reduce((acc, r) => {
      const k = r._id?.kecamatan || 'Lainnya';
      if (!acc[k]) acc[k] = { name: k.length > 14 ? k.slice(0, 12) + '…' : k, usaha: 0, keluarga: 0, bku: 0, bangunan: 0 };
      acc[k].usaha += r.total_usaha_submit || 0;
      acc[k].keluarga += r.total_keluarga_submit || 0;
      acc[k].bku += r.total_bku_submit || 0;
      acc[k].bangunan += r.total_bangunan || 0;
      return acc;
    }, {})
  ).map(([, v]) => v).sort((a, b) => (b.usaha + b.keluarga) - (a.usaha + a.keluarga));

  const totalBelum = summary?.total_belum_submit || 0;
  const totalSubmitAll = (summary?.total_usaha_submit || 0) + (summary?.total_keluarga_submit || 0) + (summary?.total_bku_submit || 0);
  const pctBelum = totalSubmitAll + totalBelum > 0
    ? Math.round((totalBelum / (totalSubmitAll + totalBelum)) * 100)
    : 0;

  const belumKecData = Object.entries(
    safeRekap.reduce((acc, r) => {
      const k = r._id?.kecamatan || 'Lainnya';
      if (!acc[k]) acc[k] = { name: k.length > 16 ? k.slice(0, 14) + '…' : k, fullName: k, belum: 0 };
      acc[k].belum += r.total_belum_submit || 0;
      return acc;
    }, {})
  )
    .map(([, v]) => v)
    .filter(v => v.belum > 0)
    .sort((a, b) => b.belum - a.belum);

  const belumTrendData = trend.filter(d => d.belum > 0);

  const desaBelumList = safeRekap
    .filter(r => (r.total_belum_submit || 0) > 0)
    .sort((a, b) => (b.total_belum_submit || 0) - (a.total_belum_submit || 0));

  const SHOW_LIMIT = 5;

  return (
    <div>
      <div className="controls-row">
        <DatePicker value={tanggal} onChange={setTanggal} label="Tanggal" />
        <SearchSelect
          className="ss-kec"
          label="Kecamatan"
          placeholder="— Semua Kecamatan —"
          value={kecamatan}
          onChange={setKecamatan}
          options={Array.isArray(kecamatanList) ? kecamatanList : []}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <RefreshButton onClick={() => load(true)} loading={refreshing} />
          <ExportButton onClick={() => dashApi.exportCsv({ tanggal, ...(kecamatan ? { kecamatan } : {}) })} />
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /><div className="loading-text">Memuat data...</div></div>
      ) : (
        <>
          {/* Stat cards */}
          <div ref={statsRef}>
            <div className="g4 mb">
              <StatCard icon="📋" label="Laporan Masuk" value={summary?.jumlah_laporan} className="sc-p" delay={0} inView={statsInView} />
              <StatCard icon="🏢" label="Usaha Submit (P2)" value={summary?.total_usaha_submit} className="sc-g" delay={80} inView={statsInView} />
              <StatCard icon="🏠" label="Keluarga Submit (P1)" value={summary?.total_keluarga_submit} className="sc-a" delay={160} inView={statsInView} />
              <StatCard icon="📒" label="BKU Submit (P3)" value={summary?.total_bku_submit} className="sc-b" delay={240} inView={statsInView} />
            </div>
            <div className="g4 mb">
              <StatCard icon="🏗️" label="Total Bangunan" value={summary?.total_bangunan} className="sc-p" delay={320} inView={statsInView} />
              <StatCard icon="⬜" label="Bangunan Kosong (P4)" value={summary?.total_bangunan_kosong} className="sc-r" delay={400} inView={statsInView} />
              <StatCard icon="⏳" label="Belum Submit (P6)" value={summary?.total_belum_submit} className="sc-a" delay={480} inView={statsInView} />
              <div className="stat-card sc-g animate-fadein" style={{ animationDelay: '560ms' }}>
                <div className="s-icon">👥</div>
                <div className="s-val">{(summary?.jumlah_pcl || []).length}</div>
                <div className="s-label">PCL Aktif Melapor</div>
              </div>
            </div>
          </div>

          {/* Trend chart */}
          {trend.length > 0 && (
            <div className="card mb animate-fadein" ref={chartRef} style={{ animationDelay: '0.1s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-p">📈</div>
                  <div>
                    <div className="c-title">Trend Pendataan Harian</div>
                    <div className="c-sub">14 hari terakhir — usaha (P2) & keluarga (P1) submit</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gUsaha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gKel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gBku" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                  <XAxis dataKey="tgl" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="usaha" name="Usaha (P2)" stroke="#6366f1" fill="url(#gUsaha)" strokeWidth={2.5} animationDuration={1200} />
                  <Area type="monotone" dataKey="keluarga" name="Keluarga (P1)" stroke="#10b981" fill="url(#gKel)" strokeWidth={2.5} animationDuration={1400} />
                  <Area type="monotone" dataKey="bku" name="BKU (P3)" stroke="#f59e0b" fill="url(#gBku)" strokeWidth={2} animationDuration={1600} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar laporan/hari + pie kecamatan */}
          <div className="g2 mb">
            {trend.length > 0 && (
              <div className="card animate-fadein" style={{ animationDelay: '0.2s' }}>
                <div className="card-head">
                  <div className="card-title-g">
                    <div className="c-icon ci-a">📊</div>
                    <div><div className="c-title">Laporan Masuk / Hari</div><div className="c-sub">Jumlah SLS melapor per hari</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                    <XAxis dataKey="tgl" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="laporan" name="Laporan" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {pieData.length > 0 && (
              <div className="card animate-fadein" style={{ animationDelay: '0.3s' }}>
                <div className="card-head">
                  <div className="card-title-g">
                    <div className="c-icon ci-g">🥧</div>
                    <div><div className="c-title">Distribusi per Kecamatan</div><div className="c-sub">Proporsi unit terdata (usaha + keluarga)</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      paddingAngle={2} dataKey="value" animationBegin={300} animationDuration={1000}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => v.toLocaleString('id-ID')} />
                    <Legend formatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Stacked bar per kecamatan */}
          {kecBarData.length > 0 && (
            <div className="card mb animate-fadein" style={{ animationDelay: '0.35s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-b">🏛️</div>
                  <div>
                    <div className="c-title">Rekap Unit per Kecamatan</div>
                    <div className="c-sub">P1 Keluarga + P2 Usaha + P3 BKU yang berhasil submit</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kecBarData} margin={{ top: 30, right: 8, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                  <Bar dataKey="usaha" name="Usaha (P2)" fill="#6366f1" stackId="a" animationDuration={1000} />
                  <Bar dataKey="keluarga" name="Keluarga (P1)" fill="#10b981" stackId="a" animationDuration={1200} />
                  <Bar dataKey="bku" name="BKU (P3)" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="a" animationDuration={1400} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Line chart total trend */}
          {trend.length > 0 && (
            <div className="card mb animate-fadein" style={{ animationDelay: '0.4s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-a">📉</div>
                  <div>
                    <div className="c-title">Total Unit Submit per Hari (P1+P2)</div>
                    <div className="c-sub">Gabungan keluarga + usaha berhasil submit (14 hari)</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={trend} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                  <XAxis dataKey="tgl" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Total Submit" stroke="#f59e0b" fill="url(#gTotal)" strokeWidth={0} animationDuration={1400} />
                  <Line type="monotone" dataKey="total" name="Total Submit" stroke="#f59e0b" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} animationDuration={1400} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              SECTION P6 — BELUM SUBMIT
          ═══════════════════════════════════════════════════ */}
          {totalBelum > 0 && (
            <div ref={belumRef}>

              {/* Divider header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                margin: '8px 0 16px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px',
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  borderRadius: 20,
                }}>
                  <span style={{ fontSize: 14 }}>⏳</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fda4af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    P6 — Belum Submit
                  </span>
                  <span style={{
                    background: 'rgba(244,63,94,0.2)', color: '#fda4af',
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                  }}>{totalBelum.toLocaleString('id-ID')} unit</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'rgba(244,63,94,0.15)' }} />
              </div>

              {/* Row 1: Gauge + Bar kecamatan + Trend */}
              <div className="g3 mb animate-fadein" style={{ animationDelay: '0.05s', alignItems: 'start' }}>

                {/* Gauge card */}
                <div className="card" style={{
                  background: 'linear-gradient(135deg,rgba(244,63,94,0.12),rgba(251,113,133,0.05))',
                  border: '1px solid rgba(244,63,94,0.25)',
                }}>
                  <div className="card-head">
                    <div className="card-title-g">
                      <div className="c-icon ci-r">⏳</div>
                      <div>
                        <div className="c-title">Proporsi Belum Submit</div>
                        <div className="c-sub">Dari total unit yang didata</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', padding: '8px 0 4px' }}>
                    <BelumGauge pct={pctBelum} total={totalBelum} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Belum Submit', val: totalBelum, color: '#fda4af', bg: 'rgba(244,63,94,0.12)' },
                        { label: 'Sudah Submit', val: totalSubmitAll, color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)' },
                      ].map(item => (
                        <div key={item.label} style={{
                          padding: '8px 12px', borderRadius: 8,
                          background: item.bg,
                          display: 'flex', flexDirection: 'column', gap: 2,
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                            {item.val.toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar P6 per kecamatan */}
                <div className="card" style={{
                  background: 'linear-gradient(135deg,rgba(244,63,94,0.08),rgba(251,113,133,0.03))',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}>
                  <div className="card-head">
                    <div className="card-title-g">
                      <div className="c-icon ci-r">📍</div>
                      <div>
                        <div className="c-title">P6 per Kecamatan</div>
                        <div className="c-sub">Unit yang belum disubmit hari ini</div>
                      </div>
                    </div>
                  </div>
                  {belumKecData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={belumKecData} layout="vertical"
                        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,94,0.1)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--text3)' }} width={88} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="belum" name="Belum Submit" radius={[0, 5, 5, 0]} animationBegin={300} animationDuration={1000}>
                          {belumKecData.map((_, i) => (
                            <Cell key={i} fill={ROSE_COLORS[i % ROSE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty" style={{ padding: '30px 0' }}>
                      <div className="empty-icon">🎉</div>
                      <div className="empty-title" style={{ fontSize: 12 }}>Semua sudah submit!</div>
                    </div>
                  )}
                </div>

                {/* Trend P6 harian */}
                <div className="card" style={{
                  background: 'linear-gradient(135deg,rgba(244,63,94,0.08),rgba(251,113,133,0.03))',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}>
                  <div className="card-head">
                    <div className="card-title-g">
                      <div className="c-icon ci-r">📈</div>
                      <div>
                        <div className="c-title">Trend P6 Harian</div>
                        <div className="c-sub">Belum submit 14 hari terakhir</div>
                      </div>
                    </div>
                  </div>
                  {trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gBelum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,94,0.08)" />
                        <XAxis dataKey="tgl" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone" dataKey="belum" name="Belum Submit (P6)"
                          stroke="#f43f5e" fill="url(#gBelum)" strokeWidth={2.5}
                          dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#fb7185' }}
                          animationDuration={1200}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty" style={{ padding: '30px 0' }}>
                      <div className="empty-icon">📊</div>
                      <div className="empty-title" style={{ fontSize: 12 }}>Belum ada data trend</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Progress bar per kecamatan + TOGGLE DETAIL PETUGAS ── */}
              {belumKecData.length > 0 && (() => {
                const totalPages = Math.ceil(belumKecData.length / P6_PER_PAGE);
                const pageStart  = (p6Page - 1) * P6_PER_PAGE;
                const pageSlice  = belumKecData.slice(pageStart, pageStart + P6_PER_PAGE);

                return (
                  <div className="card mb animate-fadein" style={{
                    animationDelay: '0.15s',
                    border: '1px solid rgba(244,63,94,0.2)',
                  }}>
                    {/* ── Card header ── */}
                    <div className="card-head">
                      <div className="card-title-g">
                        <div className="c-icon ci-r">🎯</div>
                        <div>
                          <div className="c-title">Urutan Kecamatan — P6 Tertinggi</div>
                          <div className="c-sub">Klik nama kecamatan untuk melihat detail petugas & catatan</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge br">{totalBelum.toLocaleString('id-ID')} unit</span>
                        {p6DetailLoading && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            Memuat...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Daftar kecamatan halaman ini ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {pageSlice.map((d, idx) => {
                        const globalIdx  = pageStart + idx;
                        const pct        = Math.round((d.belum / belumKecData[0].belum) * 100);
                        const barColor   = ROSE_COLORS[globalIdx % ROSE_COLORS.length];
                        const isExpanded = p6ExpandedKec[d.fullName];
                        const detailRows = p6Detail[d.fullName] || [];

                        return (
                          <div key={d.fullName} className="animate-fadein" style={{ animationDelay: `${idx * 55}ms` }}>
                            {/* Row: nomor + tombol toggle + jumlah */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <button
                                onClick={() => toggleP6Kec(d.fullName)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 7,
                                  background: isExpanded ? `${barColor}18` : 'transparent',
                                  border: isExpanded ? `1px solid ${barColor}44` : '1px solid transparent',
                                  borderRadius: 7, padding: '4px 10px 4px 6px',
                                  cursor: 'pointer', fontFamily: 'inherit',
                                  transition: 'all 0.18s',
                                }}
                              >
                                <span style={{
                                  width: 22, height: 22, borderRadius: 6,
                                  background: `${barColor}28`,
                                  border: `1px solid ${barColor}55`,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 800, color: barColor,
                                  flexShrink: 0,
                                }}>{globalIdx + 1}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{d.fullName}</span>
                                <span style={{
                                  fontSize: 10, color: barColor,
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                  marginLeft: 2,
                                }}>▼</span>
                              </button>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {!isExpanded && (
                                  <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>
                                    👆 klik untuk detail
                                  </span>
                                )}
                                <span style={{ fontWeight: 800, color: barColor, fontSize: 13 }}>
                                  {d.belum.toLocaleString('id-ID')} unit
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="pw" style={{ height: 7, borderRadius: 8 }}>
                              <div style={{
                                height: '100%',
                                width: belumInView ? `${pct}%` : '0%',
                                background: `linear-gradient(90deg,${barColor},${barColor}88)`,
                                borderRadius: 8,
                                transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${idx * 60}ms`,
                              }} />
                            </div>

                            {/* Panel detail petugas (collapsible) — DENGAN PAGINASI */}
                            {isExpanded && (
                              <P6KecDetail
                                kecamatan={d.fullName}
                                data={detailRows}
                                color={barColor}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Kontrol paginasi kecamatan ── */}
                    {totalPages > 1 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: 18, paddingTop: 14,
                        borderTop: '1px solid rgba(244,63,94,0.15)',
                        gap: 8, flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                          Halaman <strong style={{ color: 'var(--text2)' }}>{p6Page}</strong> dari <strong style={{ color: 'var(--text2)' }}>{totalPages}</strong>
                          &nbsp;·&nbsp;
                          {pageStart + 1}–{Math.min(pageStart + P6_PER_PAGE, belumKecData.length)} dari {belumKecData.length} kecamatan
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            disabled={p6Page === 1}
                            onClick={() => { setP6Page(p => p - 1); setP6ExpandedKec({}); }}
                            style={{
                              width: 32, height: 32, borderRadius: 7,
                              border: '1px solid rgba(244,63,94,0.25)',
                              background: p6Page === 1 ? 'transparent' : 'rgba(244,63,94,0.08)',
                              color: p6Page === 1 ? 'var(--text3)' : '#fda4af',
                              cursor: p6Page === 1 ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', opacity: p6Page === 1 ? 0.4 : 1,
                            }}
                          >‹</button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                            <button
                              key={pg}
                              onClick={() => { setP6Page(pg); setP6ExpandedKec({}); }}
                              style={{
                                minWidth: 32, height: 32, borderRadius: 7,
                                border: pg === p6Page
                                  ? '1px solid rgba(244,63,94,0.5)'
                                  : '1px solid rgba(244,63,94,0.18)',
                                background: pg === p6Page
                                  ? 'rgba(244,63,94,0.18)'
                                  : 'transparent',
                                color: pg === p6Page ? '#fda4af' : 'var(--text3)',
                                fontWeight: pg === p6Page ? 800 : 500,
                                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                                padding: '0 6px',
                              }}
                            >{pg}</button>
                          ))}

                          <button
                            disabled={p6Page === totalPages}
                            onClick={() => { setP6Page(p => p + 1); setP6ExpandedKec({}); }}
                            style={{
                              width: 32, height: 32, borderRadius: 7,
                              border: '1px solid rgba(244,63,94,0.25)',
                              background: p6Page === totalPages ? 'transparent' : 'rgba(244,63,94,0.08)',
                              color: p6Page === totalPages ? 'var(--text3)' : '#fda4af',
                              cursor: p6Page === totalPages ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', opacity: p6Page === totalPages ? 0.4 : 1,
                            }}
                          >›</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tabel detail desa dengan P6 */}
              {desaBelumList.length > 0 && (
                <div className="card mb animate-fadein" style={{
                  animationDelay: '0.25s',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}>
                  <div className="card-head">
                    <div className="card-title-g">
                      <div className="c-icon ci-r">📋</div>
                      <div>
                        <div className="c-title">Detail Desa — Belum Submit (P6)</div>
                        <div className="c-sub">{desaBelumList.length} desa masih punya unit belum disubmit</div>
                      </div>
                    </div>
                    <span className="badge br">{desaBelumList.length} desa</span>
                  </div>
                  <div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Kecamatan</th>
                          <th>Desa</th>
                          <th>P6 Belum</th>
                          <th>Submit (P1+P2+P3)</th>
                          <th>% Belum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(belumExpanded ? desaBelumList : desaBelumList.slice(0, SHOW_LIMIT)).map((r, i) => {
                          const submitDesa = (r.total_usaha_submit || 0) + (r.total_keluarga_submit || 0) + (r.total_bku_submit || 0);
                          const belumDesa = r.total_belum_submit || 0;
                          const pctDesa = submitDesa + belumDesa > 0
                            ? Math.round((belumDesa / (submitDesa + belumDesa)) * 100)
                            : 0;
                          const barColor = pctDesa >= 50 ? '#f43f5e' : pctDesa >= 25 ? '#f59e0b' : '#6366f1';
                          return (
                            <tr key={i} style={{ animation: `fadeInUp 0.35s ease ${Math.min(i * 30, 450)}ms both` }}>
                              <td style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>{i + 1}</td>
                              <td style={{ fontSize: 12, color: 'var(--text2)' }}>{r._id?.kecamatan}</td>
                              <td className="bold">{r._id?.desa}</td>
                              <td>
                                <span className="badge br" style={{ fontSize: 12 }}>
                                  {belumDesa.toLocaleString('id-ID')}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text2)' }}>{submitDesa.toLocaleString('id-ID')}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 60 }}>
                                    <div className="pw" style={{ height: 5 }}>
                                      <div style={{
                                        height: '100%', width: `${pctDesa}%`,
                                        background: `linear-gradient(90deg,${barColor},${barColor}88)`,
                                        borderRadius: 4,
                                        transition: 'width 0.8s ease',
                                      }} />
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: barColor, minWidth: 32, textAlign: 'right' }}>
                                    {pctDesa}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {desaBelumList.length > SHOW_LIMIT && (
                    <div style={{ padding: '12px 0 0', textAlign: 'center' }}>
                      <button
                        onClick={() => setBelumExpanded(e => !e)}
                        style={{
                          background: 'rgba(244,63,94,0.08)',
                          border: '1px solid rgba(244,63,94,0.25)',
                          borderRadius: 8, color: '#fda4af',
                          padding: '7px 20px', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {belumExpanded
                          ? '▲ Sembunyikan'
                          : `▼ Tampilkan semua (${desaBelumList.length - SHOW_LIMIT} lainnya)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              REKAP PER DESA — search + filter + sort + paginasi
          ══════════════════════════════════════════ */}
          {safeRekap.length > 0 && (() => {
            // ── List kecamatan unik untuk filter dropdown ──
            const kecOptions = [...new Set(safeRekap.map(r => r._id?.kecamatan).filter(Boolean))].sort();

            // ── Filter: query teks + filter kecamatan ──
            const afterFilter = safeRekap.filter(r => {
              const matchKec = rekapKecFilter ? r._id?.kecamatan === rekapKecFilter : true;
              if (!matchKec) return false;
              if (!rekapQuery.trim()) return true;
              const q = rekapQuery.toLowerCase();
              return (
                (r._id?.kecamatan || '').toLowerCase().includes(q) ||
                (r._id?.desa      || '').toLowerCase().includes(q)
              );
            });

            // ── Sort ──
            const sortVal = (r) => {
              switch (rekapSortCol) {
                case 'desa':      return (r._id?.desa || '').toLowerCase();
                case 'kecamatan': return (r._id?.kecamatan || '').toLowerCase();
                case 'sls':       return r.jumlah_laporan || 0;
                case 'p1':        return r.total_keluarga_submit || 0;
                case 'p2':        return r.total_usaha_submit || 0;
                case 'p3':        return r.total_bku_submit || 0;
                case 'bangunan':  return r.total_bangunan || 0;
                case 'belum':     return r.total_belum_submit || 0;
                default:          return (r._id?.kecamatan || '').toLowerCase();
              }
            };
            const afterSort = [...afterFilter].sort((a, b) => {
              const va = sortVal(a), vb = sortVal(b);
              const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
              return rekapSortDir === 'asc' ? cmp : -cmp;
            });

            // ── Paginasi ──
            const totalRekapPages = Math.max(1, Math.ceil(afterSort.length / REKAP_PER_PAGE));
            const safeRekapPage   = Math.min(rekapPage, totalRekapPages);
            const rekapStart      = (safeRekapPage - 1) * REKAP_PER_PAGE;
            const pageRows        = afterSort.slice(rekapStart, rekapStart + REKAP_PER_PAGE);

            // Handler sort: toggle arah jika kolom sama, set asc jika beda
            const handleSort = (col) => {
              if (col === rekapSortCol) {
                setRekapSortDir(d => d === 'asc' ? 'desc' : 'asc');
              } else {
                setRekapSortCol(col);
                setRekapSortDir('asc');
              }
              setRekapPage(1);
            };

            const SortIcon = ({ col }) => {
              if (col !== rekapSortCol) return <span style={{ opacity: 0.3, fontSize: 9 }}>⇅</span>;
              return <span style={{ fontSize: 9, color: '#a5b4fc' }}>{rekapSortDir === 'asc' ? '▲' : '▼'}</span>;
            };

            const thStyle = (col) => ({
              cursor: 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
              color: col === rekapSortCol ? '#a5b4fc' : undefined,
            });

            return (
              <div className="card animate-fadein" style={{ animationDelay: '0.45s' }}>

                {/* ── Card head ── */}
                <div className="card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div className="card-title-g">
                    <div className="c-icon ci-b">📍</div>
                    <div>
                      <div className="c-title">Rekap per Desa</div>
                      <div className="c-sub">
                        {afterFilter.length === safeRekap.length
                          ? `${safeRekap.length} desa telah melapor`
                          : `${afterFilter.length} dari ${safeRekap.length} desa`}
                      </div>
                    </div>
                  </div>
                  <span className="badge bp">{afterFilter.length} desa</span>
                </div>

                {/* ── Toolbar: search + filter kecamatan ── */}
                <div style={{
                  display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
                  marginBottom: 14,
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)',
                }}>
                  {/* Search box */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    flex: '1 1 200px', minWidth: 180,
                    padding: '0 10px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    height: 36,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      value={rekapQuery}
                      onChange={e => { setRekapQuery(e.target.value); setRekapPage(1); }}
                      placeholder="Cari kecamatan atau desa..."
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        outline: 'none', fontSize: 13, fontWeight: 500,
                        color: 'var(--text)', fontFamily: 'inherit',
                      }}
                    />
                    {rekapQuery && (
                      <button
                        onClick={() => { setRekapQuery(''); setRekapPage(1); }}
                        style={{
                          width: 18, height: 18, border: 'none', padding: 0,
                          background: 'var(--surface3)', borderRadius: '50%',
                          color: 'var(--text3)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Filter kecamatan dropdown */}
                  <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                    <select
                      value={rekapKecFilter}
                      onChange={e => { setRekapKecFilter(e.target.value); setRekapPage(1); }}
                      className="ctrl-sel"
                      style={{ width: '100%', padding: '8px 28px 8px 10px', fontSize: 12, height: 36 }}
                    >
                      <option value="">— Semua Kecamatan —</option>
                      {kecOptions.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>

                  {/* Filter: hanya yang ada P6 */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 12, fontWeight: 600, color: 'var(--text2)',
                    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    <input
                      type="checkbox"
                      checked={rekapSortCol === 'belum' && rekapKecFilter === rekapKecFilter}
                      onChange={e => {
                        // Toggle filter "hanya ada P6" via quick-sort ke kolom belum desc
                        if (e.target.checked) {
                          setRekapSortCol('belum');
                          setRekapSortDir('desc');
                        } else {
                          setRekapSortCol('kecamatan');
                          setRekapSortDir('asc');
                        }
                        setRekapPage(1);
                      }}
                      style={{ accentColor: '#f43f5e', width: 14, height: 14 }}
                    />
                    <span style={{ color: '#fda4af' }}>Urutkan P6 terbanyak</span>
                  </label>

                  {/* Tombol reset filter */}
                  {(rekapQuery || rekapKecFilter || rekapSortCol !== 'kecamatan') && (
                    <button
                      onClick={() => {
                        setRekapQuery('');
                        setRekapKecFilter('');
                        setRekapSortCol('kecamatan');
                        setRekapSortDir('asc');
                        setRekapPage(1);
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                        color: '#fda4af', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Reset
                    </button>
                  )}
                </div>

                {/* ── Tabel ── */}
                {pageRows.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>
                      Tidak ada data yang cocok
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      Coba ubah kata kunci atau filter
                    </div>
                  </div>
                ) : (
                  <div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}>#</th>
                          <th style={thStyle('kecamatan')} onClick={() => handleSort('kecamatan')}>
                            Kecamatan <SortIcon col="kecamatan" />
                          </th>
                          <th style={thStyle('desa')} onClick={() => handleSort('desa')}>
                            Desa <SortIcon col="desa" />
                          </th>
                          <th style={thStyle('sls')} onClick={() => handleSort('sls')}>
                            SLS Lapor <SortIcon col="sls" />
                          </th>
                          <th style={thStyle('p1')} onClick={() => handleSort('p1')}>
                            P1 Keluarga <SortIcon col="p1" />
                          </th>
                          <th style={thStyle('p2')} onClick={() => handleSort('p2')}>
                            P2 Usaha <SortIcon col="p2" />
                          </th>
                          <th style={thStyle('p3')} onClick={() => handleSort('p3')}>
                            P3 BKU <SortIcon col="p3" />
                          </th>
                          <th style={thStyle('bangunan')} onClick={() => handleSort('bangunan')}>
                            Bangunan <SortIcon col="bangunan" />
                          </th>
                          <th style={thStyle('belum')} onClick={() => handleSort('belum')}>
                            P6 Belum <SortIcon col="belum" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r, i) => (
                          <tr key={i} style={{ animation: `fadeInUp 0.3s ease ${i * 25}ms both` }}>
                            <td style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                              {rekapStart + i + 1}
                            </td>
                            <td className="bold">{r._id?.kecamatan}</td>
                            <td>{r._id?.desa}</td>
                            <td><span className="badge bp">{r.jumlah_laporan}</span></td>
                            <td>{(r.total_keluarga_submit || 0).toLocaleString('id-ID')}</td>
                            <td>{(r.total_usaha_submit || 0).toLocaleString('id-ID')}</td>
                            <td>{(r.total_bku_submit || 0).toLocaleString('id-ID')}</td>
                            <td>{(r.total_bangunan || 0).toLocaleString('id-ID')}</td>
                            <td>
                              {(r.total_belum_submit || 0) > 0
                                ? <span className="badge br">{r.total_belum_submit}</span>
                                : <span style={{ color: 'var(--text3)' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Paginasi footer ── */}
                {totalRekapPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 14, paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                    gap: 8, flexWrap: 'wrap',
                  }}>
                    {/* Info */}
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                      Halaman{' '}
                      <strong style={{ color: 'var(--text2)' }}>{safeRekapPage}</strong>
                      {' '}dari{' '}
                      <strong style={{ color: 'var(--text2)' }}>{totalRekapPages}</strong>
                      {' · '}baris{' '}
                      <strong style={{ color: 'var(--text2)' }}>
                        {rekapStart + 1}–{Math.min(rekapStart + REKAP_PER_PAGE, afterSort.length)}
                      </strong>
                      {' '}dari{' '}
                      <strong style={{ color: 'var(--text2)' }}>{afterSort.length}</strong>
                    </span>

                    {/* Tombol navigasi */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <PagBtn disabled={safeRekapPage === 1} onClick={() => setRekapPage(1)} title="Pertama">«</PagBtn>
                      <PagBtn disabled={safeRekapPage === 1} onClick={() => setRekapPage(p => p - 1)} title="Sebelumnya">‹</PagBtn>
                      {buildPageNums(safeRekapPage, totalRekapPages).map((pg, idx) =>
                        pg === '…' ? (
                          <span key={`e${idx}`} style={{ width: 28, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>…</span>
                        ) : (
                          <PagBtn key={pg} active={pg === safeRekapPage} onClick={() => setRekapPage(pg)}>{pg}</PagBtn>
                        )
                      )}
                      <PagBtn disabled={safeRekapPage === totalRekapPages} onClick={() => setRekapPage(p => p + 1)} title="Berikutnya">›</PagBtn>
                      <PagBtn disabled={safeRekapPage === totalRekapPages} onClick={() => setRekapPage(totalRekapPages)} title="Terakhir">»</PagBtn>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}