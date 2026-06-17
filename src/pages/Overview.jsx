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

// ── Gauge ring untuk P6 ──────────────────────────────────
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

export default function Overview({ kecamatanList }) {
  const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'));
  const [kecamatan, setKecamatan] = useState('');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [rekapDesa, setRekapDesa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [belumExpanded, setBelumExpanded] = useState(false);
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
    } catch { }
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, [tanggal, kecamatan]);

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

  // ── P6 Belum Submit ──────────────────────────────────────
  const totalBelum = summary?.total_belum_submit || 0;
  const totalSubmitAll = (summary?.total_usaha_submit || 0) + (summary?.total_keluarga_submit || 0) + (summary?.total_bku_submit || 0);
  const pctBelum = totalSubmitAll + totalBelum > 0
    ? Math.round((totalBelum / (totalSubmitAll + totalBelum)) * 100)
    : 0;

  // Bar chart P6 per kecamatan
  const belumKecData = Object.entries(
    safeRekap.reduce((acc, r) => {
      const k = r._id?.kecamatan || 'Lainnya';
      if (!acc[k]) acc[k] = { name: k.length > 16 ? k.slice(0, 14) + '…' : k, belum: 0 };
      acc[k].belum += r.total_belum_submit || 0;
      return acc;
    }, {})
  )
    .map(([, v]) => v)
    .filter(v => v.belum > 0)
    .sort((a, b) => b.belum - a.belum);

  // Trend P6 harian
  const belumTrendData = trend.filter(d => d.belum > 0);

  // Daftar desa yang punya P6 > 0
  const desaBelumList = safeRekap
    .filter(r => (r.total_belum_submit || 0) > 0)
    .sort((a, b) => (b.total_belum_submit || 0) - (a.total_belum_submit || 0));

  const SHOW_LIMIT = 5;

  return (
    <div>
      <div className="controls-row">
        <DatePicker value={tanggal} onChange={setTanggal} label="Tanggal" />
        <SearchSelect
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

              {/* Row 2: Progress bar per kecamatan */}
              {belumKecData.length > 0 && (
                <div className="card mb animate-fadein" style={{
                  animationDelay: '0.15s',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}>
                  <div className="card-head">
                    <div className="card-title-g">
                      <div className="c-icon ci-r">🎯</div>
                      <div>
                        <div className="c-title">Urutan Kecamatan — P6 Tertinggi</div>
                        <div className="c-sub">Relatif terhadap kecamatan dengan P6 terbanyak</div>
                      </div>
                    </div>
                    <span className="badge br">{totalBelum.toLocaleString('id-ID')} unit</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {belumKecData.map((d, i) => {
                      const pct = Math.round((d.belum / belumKecData[0].belum) * 100);
                      return (
                        <div key={d.name} className="animate-fadein" style={{ animationDelay: `${i * 55}ms` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, fontSize: 12 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 20, height: 20, borderRadius: 5,
                                background: `${ROSE_COLORS[i % ROSE_COLORS.length]}30`,
                                border: `1px solid ${ROSE_COLORS[i % ROSE_COLORS.length]}60`,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 800, color: ROSE_COLORS[i % ROSE_COLORS.length],
                              }}>{i + 1}</span>
                              {d.name}
                            </span>
                            <span style={{ fontWeight: 800, color: ROSE_COLORS[i % ROSE_COLORS.length] }}>
                              {d.belum.toLocaleString('id-ID')} unit
                            </span>
                          </div>
                          <div className="pw" style={{ height: 7, borderRadius: 8 }}>
                            <div style={{
                              height: '100%',
                              width: belumInView ? `${pct}%` : '0%',
                              background: `linear-gradient(90deg,${ROSE_COLORS[i % ROSE_COLORS.length]},${ROSE_COLORS[i % ROSE_COLORS.length]}88)`,
                              borderRadius: 8,
                              transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms`,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 3: Tabel detail desa dengan P6 */}
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

          {/* Rekap per desa tabel */}
          {safeRekap.length > 0 && (
            <div className="card animate-fadein" style={{ animationDelay: '0.45s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-b">📍</div>
                  <div>
                    <div className="c-title">Rekap per Desa</div>
                    <div className="c-sub">{safeRekap.length} desa telah melapor</div>
                  </div>
                </div>
                <span className="badge bp">{safeRekap.length} desa</span>
              </div>
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Kecamatan</th><th>Desa</th><th>SLS Lapor</th>
                      <th>P1 Keluarga</th><th>P2 Usaha</th><th>P3 BKU</th>
                      <th>Bangunan</th><th>P6 Belum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeRekap.map((r, i) => (
                      <tr key={i} style={{ animation: `fadeInUp 0.4s ease ${Math.min(i * 30, 600)}ms both` }}>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}