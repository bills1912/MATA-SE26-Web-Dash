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

export default function Overview({ kecamatanList }) {
  const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'));
  const [kecamatan, setKecamatan] = useState('');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [rekapDesa, setRekapDesa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statsRef, statsInView] = useInView(0.1);
  const [chartRef, chartInView] = useInView(0.1);

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 0 }}>
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