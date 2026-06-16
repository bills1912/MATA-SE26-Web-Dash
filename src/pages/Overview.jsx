import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart,
} from 'recharts';
import dayjs from 'dayjs';
import { dashApi } from '../utils/api';

const COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#3b82f6','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6','#a855f7'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        <div className="tt-row" key={i}>
          <span className="tt-dot" style={{ background: p.color }}/>
          {p.name}: <strong>{(p.value||0).toLocaleString('id-ID')}</strong>
        </div>
      ))}
    </div>
  );
};

// Animated counter
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

// InView hook
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

// Animated stat card
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
  const [tanggal, setTanggal]     = useState(dayjs().format('YYYY-MM-DD'));
  const [kecamatan, setKecamatan] = useState('');
  const [summary, setSummary]     = useState(null);
  const [trend, setTrend]         = useState([]);
  const [rekapDesa, setRekapDesa] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statsRef, statsInView]   = useInView(0.1);
  const [chartRef, chartInView]   = useInView(0.1);

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
      setRekapDesa(r.data);
      setTrend(t.data.map(d => ({
        tgl: d._id.slice(5),
        usaha: d.total_usaha,
        keluarga: d.total_keluarga,
        total: d.total_usaha + d.total_keluarga,
        laporan: d.jumlah_laporan,
      })));
    } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, [tanggal, kecamatan]);

  const fmt = n => (n || 0).toLocaleString('id-ID');

  // Pie data per kecamatan
  const pieData = Object.entries(
    rekapDesa.reduce((acc, r) => {
      const k = r._id.kecamatan;
      if (!acc[k]) acc[k] = 0;
      acc[k] += r.total_usaha + r.total_keluarga_non_usaha;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value);

  // Stacked bar per kecamatan from rekap
  const kecBarData = Object.entries(
    rekapDesa.reduce((acc, r) => {
      const k = r._id.kecamatan;
      if (!acc[k]) acc[k] = { name: k.length > 14 ? k.slice(0,12)+'…' : k, usaha: 0, keluarga: 0, bangunan: 0 };
      acc[k].usaha    += r.total_usaha    || 0;
      acc[k].keluarga += r.total_keluarga_non_usaha || 0;
      acc[k].bangunan += r.total_bangunan || 0;
      return acc;
    }, {})
  ).map(([, v]) => v).sort((a, b) => (b.usaha + b.keluarga) - (a.usaha + a.keluarga));

  return (
    <div>
      {/* Controls */}
      <div className="controls">
        <input type="date" className="ctrl-date" value={tanggal}
          onChange={e => setTanggal(e.target.value)} max={dayjs().format('YYYY-MM-DD')} />
        <select className="ctrl-sel" value={kecamatan} onChange={e => setKecamatan(e.target.value)}>
          <option value="">— Semua Kecamatan —</option>
          {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <button className="btn-ref" onClick={() => load(true)}>
          <span className={refreshing ? 'spin' : ''}>🔄</span> Refresh
        </button>
        <button className="btn-exp" onClick={() => dashApi.exportCsv({ tanggal, ...(kecamatan ? { kecamatan } : {}) })}>
          ⬇️ Export CSV
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"/><div className="loading-text">Memuat data...</div></div>
      ) : (
        <>
          {/* Stat cards — animated on mount */}
          <div ref={statsRef}>
            <div className="g4 mb">
              <StatCard icon="📋" label="Laporan Masuk"   value={summary?.jumlah_laporan}          className="sc-p" delay={0}   inView={statsInView}/>
              <StatCard icon="🏢" label="Total Usaha"     value={summary?.total_usaha}              className="sc-g" delay={80}  inView={statsInView}/>
              <StatCard icon="🏠" label="Kel. Non-Usaha"  value={summary?.total_keluarga_non_usaha} className="sc-a" delay={160} inView={statsInView}/>
              <StatCard icon="🏗️" label="Total Bangunan"  value={summary?.total_bangunan}           className="sc-b" delay={240} inView={statsInView}/>
            </div>
            <div className="g4 mb" style={{ gridTemplateColumns:'1fr 1fr' }}>
              <StatCard icon="⬜" label="Bangunan Kosong" value={summary?.total_bangunan_kosong}    className="sc-r" delay={320} inView={statsInView}/>
              <div className="stat-card sc-p animate-fadein" style={{ animationDelay: '400ms', background:'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.08))' }}>
                <div className="s-icon">👥</div>
                <div className="s-val">{(summary?.jumlah_pcl||[]).length}</div>
                <div className="s-label">PCL Aktif Melapor</div>
              </div>
            </div>
          </div>

          {/* Trend chart - area */}
          {trend.length > 0 && (
            <div className="card mb animate-fadein" ref={chartRef} style={{ animationDelay: '0.1s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-p">📈</div>
                  <div>
                    <div className="c-title">Trend Pendataan Harian</div>
                    <div className="c-sub">14 hari terakhir — usaha & keluarga terdata</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top:5, right:10, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gUsaha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gKel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                  <XAxis dataKey="tgl" tick={{ fontSize:11, fill:'var(--text3)' }} />
                  <YAxis tick={{ fontSize:11, fill:'var(--text3)' }} />
                  <Tooltip content={<CustomTooltip/>} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Area type="monotone" dataKey="usaha"    name="Usaha"    stroke="#6366f1" fill="url(#gUsaha)" strokeWidth={2.5} animationDuration={1200}/>
                  <Area type="monotone" dataKey="keluarga" name="Keluarga" stroke="#10b981" fill="url(#gKel)"   strokeWidth={2.5} animationDuration={1400}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Row: bar laporan/hari + pie kecamatan */}
          <div className="g2 mb">
            {trend.length > 0 && (
              <div className="card animate-fadein" style={{ animationDelay: '0.2s' }}>
                <div className="card-head">
                  <div className="card-title-g">
                    <div className="c-icon ci-a">📊</div>
                    <div><div className="c-title">Laporan Masuk / Hari</div><div className="c-sub">Jumlah SLS melapor</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trend} margin={{ top:4, right:8, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                    <XAxis dataKey="tgl" tick={{ fontSize:10, fill:'var(--text3)' }} />
                    <YAxis tick={{ fontSize:10, fill:'var(--text3)' }} />
                    <Tooltip content={<CustomTooltip/>} />
                    <Bar dataKey="laporan" name="Laporan" fill="#6366f1" radius={[4,4,0,0]} animationDuration={1000}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="card animate-fadein" style={{ animationDelay: '0.3s' }}>
                <div className="card-head">
                  <div className="card-title-g">
                    <div className="c-icon ci-g">🥧</div>
                    <div><div className="c-title">Distribusi per Kecamatan</div><div className="c-sub">Proporsi unit terdata</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      paddingAngle={2} dataKey="value" animationBegin={300} animationDuration={1000}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v.toLocaleString('id-ID')} />
                    <Legend formatter={(v) => v.length > 14 ? v.slice(0,13)+'…' : v} wrapperStyle={{ fontSize:10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* NEW: Stacked bar per kecamatan (usaha + keluarga) */}
          {kecBarData.length > 0 && (
            <div className="card mb animate-fadein" style={{ animationDelay: '0.35s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-b">🏛️</div>
                  <div>
                    <div className="c-title">Rekap Unit per Kecamatan</div>
                    <div className="c-sub">Usaha & keluarga non-usaha terdata</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={kecBarData} margin={{ top:4, right:8, left:0, bottom:44 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))"/>
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text3)' }} angle={-30} textAnchor="end"/>
                  <YAxis tick={{ fontSize:10, fill:'var(--text3)' }}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <Bar dataKey="usaha"    name="Usaha"           fill="#6366f1" radius={[0,0,0,0]} stackId="a" animationDuration={1000}/>
                  <Bar dataKey="keluarga" name="Kel. Non-Usaha"  fill="#10b981" radius={[3,3,0,0]} stackId="a" animationDuration={1200}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* NEW: Line chart total trend (usaha + keluarga gabungan) */}
          {trend.length > 0 && (
            <div className="card mb animate-fadein" style={{ animationDelay: '0.4s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-a">📉</div>
                  <div>
                    <div className="c-title">Total Unit Terdata per Hari</div>
                    <div className="c-sub">Gabungan usaha + keluarga (14 hari terakhir)</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={trend} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))"/>
                  <XAxis dataKey="tgl" tick={{ fontSize:10, fill:'var(--text3)' }}/>
                  <YAxis tick={{ fontSize:10, fill:'var(--text3)' }}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="total" name="Total Unit" stroke="#f59e0b" fill="url(#gTotal)" strokeWidth={0} animationDuration={1400}/>
                  <Line type="monotone" dataKey="total" name="Total Unit" stroke="#f59e0b" strokeWidth={2.5} dot={{ r:3, fill:'#f59e0b' }} activeDot={{ r:5 }} animationDuration={1400}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rekap per desa tabel */}
          {rekapDesa.length > 0 && (
            <div className="card animate-fadein" style={{ animationDelay: '0.45s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-b">📍</div>
                  <div><div className="c-title">Rekap per Desa</div><div className="c-sub">{rekapDesa.length} desa telah melapor</div></div>
                </div>
                <span className="badge bp">{rekapDesa.length} desa</span>
              </div>
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Kecamatan</th><th>Desa</th><th>SLS</th>
                      <th>Usaha</th><th>Kel. Non-Usaha</th><th>Bangunan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapDesa.map((r, i) => (
                      <tr key={i} style={{ animation: `fadeInUp 0.4s ease ${Math.min(i * 30, 600)}ms both` }}>
                        <td className="bold">{r._id.kecamatan}</td>
                        <td>{r._id.desa}</td>
                        <td><span className="badge bp">{r.jumlah_laporan}</span></td>
                        <td>{(r.total_usaha||0).toLocaleString('id-ID')}</td>
                        <td>{(r.total_keluarga_non_usaha||0).toLocaleString('id-ID')}</td>
                        <td>{(r.total_bangunan||0).toLocaleString('id-ID')}</td>
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
