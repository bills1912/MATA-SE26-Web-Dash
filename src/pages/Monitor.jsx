import { useState, useEffect, useRef } from 'react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { dashApi } from '../utils/api';
import { formatTanggal } from '../utils/date';

// Animated counter hook
function useCountUp(target, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
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
  }, [target, duration, delay]);
  return val;
}

// Hook to detect when element enters viewport
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

const COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#3b82f6','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div className="tt-label">{label || payload[0]?.name}</div>
      {payload.map((p, i) => (
        <div className="tt-row" key={i}>
          <span className="tt-dot" style={{ background: p.color || p.fill }}/>
          {p.name}: <strong>{(p.value || 0).toLocaleString('id-ID')}</strong>
        </div>
      ))}
    </div>
  );
};

// Animated progress bar per kecamatan
function KecProgressBar({ name, sudah, total, color, delay, inView }) {
  const pct = total > 0 ? Math.round((sudah / total) * 100) : 0;
  const animPct = inView ? pct : 0;
  const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  const countedSudah = useCountUp(inView ? sudah : 0, 900, delay);
  const countedTotal = useCountUp(inView ? total : 0, 900, delay);

  return (
    <div className="kec-progress-row" style={{ animationDelay: `${delay}ms` }}>
      <div className="kec-pr-header">
        <div className="kec-pr-name">📍 {name}</div>
        <div className="kec-pr-stat">
          <span style={{ color: barColor, fontWeight: 800 }}>{countedSudah}</span>
          <span style={{ color: 'var(--text3)' }}>/{countedTotal} SLS</span>
          <span className="badge" style={{
            background: pct >= 80 ? 'rgba(16,185,129,0.18)' : pct >= 50 ? 'rgba(245,158,11,0.18)' : 'rgba(244,63,94,0.18)',
            color: barColor,
            border: `1px solid ${barColor}44`,
          }}>{pct}%</span>
        </div>
      </div>
      <div className="pw" style={{ height: 8, borderRadius: 8 }}>
        <div className="pf" style={{
          width: animPct + '%',
          background: `linear-gradient(90deg,${barColor},${barColor}bb)`,
          transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
          borderRadius: 8,
          height: '100%',
        }}/>
      </div>
    </div>
  );
}

export default function Monitor({ kecamatanList }) {
  const [tanggal,  setTanggal]  = useState(dayjs().format('YYYY-MM-DD'));
  const [kec,      setKec]      = useState('');
  const [data,     setData]     = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [chartRef, chartInView] = useInView();
  const [barRef,   barInView]   = useInView();

  useEffect(() => {
    setLoading(true);
    const p = { tanggal };
    if (kec) p.kecamatan = kec;
    dashApi.getBelumLapor(p)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [tanggal, kec]);

  const toggle = (k) => setExpanded(e => ({ ...e, [k]: !e[k] }));
  const pct    = data ? parseFloat(data.pct_selesai) : 0;
  const color  = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';

  // Radial chart data
  const radialData = [
    { name:'selesai', value: pct, fill: color },
    { name:'bg',      value: 100, fill:'rgba(255,255,255,0.05)' },
  ];

  // Per-kecamatan breakdown untuk chart
  const kecData = data
    ? Object.entries(data.by_kecamatan || {}).map(([name, belum]) => {
        const totalSls = data.total_sls; // approximate; use by_kecamatan length as belum
        return { name: name.length > 16 ? name.slice(0, 14) + '…' : name, belumLapor: belum.length };
      }).sort((a, b) => b.belumLapor - a.belumLapor)
    : [];

  // Pie: sudah vs belum
  const pieData = data
    ? [
        { name: 'Sudah Lapor', value: data.sudah_lapor, fill: '#10b981' },
        { name: 'Belum Lapor', value: data.belum_lapor, fill: '#f43f5e' },
      ]
    : [];

  // Per-kecamatan sudah lapor (estimasi dari data belum)
  const kecProgressData = data
    ? Object.entries(data.by_kecamatan || {}).map(([name, belumList]) => ({
        name,
        belum: belumList.length,
      })).sort((a, b) => a.belum - b.belum)
    : [];

  const animPct = data ? pct : 0;
  const countedSudah = useCountUp(data?.sudah_lapor || 0, 1200, 300);
  const countedBelum = useCountUp(data?.belum_lapor || 0, 1200, 500);
  const countedTotal = useCountUp(data?.total_sls || 0, 1200, 100);

  return (
    <div>
      <div className="controls">
        <input type="date" className="ctrl-date" value={tanggal}
          onChange={e => setTanggal(e.target.value)} max={dayjs().format('YYYY-MM-DD')} />
        <select className="ctrl-sel" value={kec} onChange={e => setKec(e.target.value)}>
          <option value="">— Semua Kecamatan —</option>
          {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"/><div className="loading-text">Memeriksa SLS...</div></div>
      ) : !data ? (
        <div className="empty"><div className="empty-icon">📡</div><div className="empty-title">Data tidak tersedia</div></div>
      ) : (
        <>
          {/* ── Row 1: Radial gauge + Donut + Stat cards ── */}
          <div className="g3 mb" style={{ alignItems: 'start' }}>

            {/* Radial gauge */}
            <div className="card mon-gauge-card animate-fadein" ref={chartRef}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-g">📡</div>
                  <div><div className="c-title">Cakupan Pelaporan</div><div className="c-sub">{formatTanggal(tanggal)}</div></div>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width={200} height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="82%"
                    data={radialData} startAngle={90} endAngle={-270} barSize={16}>
                    <RadialBar dataKey="value" cornerRadius={8}/>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
                  <div style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {data.pct_selesai}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>selesai</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{countedSudah.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sudah</div>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }}/>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#f43f5e' }}>{countedBelum.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Belum</div>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }}/>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text2)' }}>{countedTotal.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                </div>
              </div>
            </div>

            {/* Donut pie chart */}
            <div className="card animate-fadein" style={{ animationDelay: '0.12s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-p">🥧</div>
                  <div><div className="c-title">Proporsi Pelaporan</div><div className="c-sub">Sudah vs Belum lapor</div></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value" animationBegin={300} animationDuration={1000}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  </Pie>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{ fontSize: 12 }}/>
                </PieChart>
              </ResponsiveContainer>
              {/* Mini info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {pieData.map(d => (
                  <div key={d.name} className="ir">
                    <span className="ir-l" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }}/>
                      {d.name}
                    </span>
                    <strong style={{ color: d.fill }}>{d.value} SLS</strong>
                  </div>
                ))}
                <div className="ir">
                  <span className="ir-l">Total SLS</span>
                  <strong style={{ color: 'var(--text)' }}>{data.total_sls} SLS</strong>
                </div>
              </div>
            </div>

            {/* SLS belum lapor per kecamatan bar chart */}
            <div className="card animate-fadein" style={{ animationDelay: '0.22s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-r">⏳</div>
                  <div><div className="c-title">Belum Lapor / Kecamatan</div><div className="c-sub">Jumlah SLS tertunda</div></div>
                </div>
              </div>
              {kecData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={kecData} layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--text3)' }} width={90}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="belumLapor" name="Belum Lapor" fill="#f43f5e" radius={[0,4,4,0]}
                      animationBegin={400} animationDuration={1000}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty" style={{ padding: '30px 10px' }}>
                  <div className="empty-icon">🎉</div>
                  <div className="empty-title" style={{ fontSize: 12 }}>Semua sudah lapor!</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: Progress bar per kecamatan ── */}
          {kecProgressData.length > 0 && (
            <div className="card mb animate-fadein" style={{ animationDelay: '0.3s' }} ref={barRef}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-b">📊</div>
                  <div>
                    <div className="c-title">Progress per Kecamatan</div>
                    <div className="c-sub">Kecamatan dengan SLS belum melapor</div>
                  </div>
                </div>
                <span className="badge br">{kecProgressData.reduce((s, d) => s + d.belum, 0)} belum</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {kecProgressData.map((kd, i) => {
                  // Estimate total SLS per kec from belum (since we don't have sudah per kec)
                  const approxTotal = kd.belum; // only showing belum data
                  return (
                    <div key={kd.name} className="kec-progress-row" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="kec-pr-header">
                        <div className="kec-pr-name">📍 {kd.name}</div>
                        <span className="badge br">{kd.belum} SLS belum</span>
                      </div>
                      <div className="pw" style={{ height: 7, borderRadius: 8 }}>
                        <div className="pf" style={{
                          width: barInView ? Math.min((kd.belum / (kecProgressData[0]?.belum || 1)) * 100, 100) + '%' : '0%',
                          background: 'linear-gradient(90deg,#f43f5e,#fb7185)',
                          transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms`,
                          borderRadius: 8, height: '100%',
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Row 3: Detail collapsible per kecamatan ── */}
          <div className="sh">
            <span className="sh-title">📍 Detail per Kecamatan</span>
            <span className="badge br">{data.belum_lapor} SLS belum</span>
          </div>

          {Object.entries(data.by_kecamatan || {}).sort((a,b)=>b[1].length-a[1].length).map(([k, sls], i) => (
            <div key={k} className="card mb animate-fadein" style={{ padding:0, overflow:'hidden', animationDelay: `${i * 50}ms` }}>
              <button
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'14px 16px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', gap:12 }}
                onClick={() => toggle(k)}
              >
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>📍 {k}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{sls.length} SLS belum melapor</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span className="badge br">{sls.length}</span>
                  <span style={{ color:'var(--text3)', fontSize:14 }}>{expanded[k]?'▲':'▼'}</span>
                </div>
              </button>
              {expanded[k] && (
                <div style={{ borderTop:'1px solid var(--border)' }}>
                  <table className="tbl" style={{ minWidth:'unset' }}>
                    <thead>
                      <tr><th>Desa</th><th>SLS</th><th>PCL</th><th>ID Subsls</th></tr>
                    </thead>
                    <tbody>
                      {sls.map(s => (
                        <tr key={s.idsubsls}>
                          <td className="bold">{s.nmdesa}</td>
                          <td>{s.nmsubsls}</td>
                          <td>👤 {s.pencacah}</td>
                          <td style={{ fontFamily:'monospace', fontSize:10, color:'var(--p3)' }}>{s.idsubsls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {Object.keys(data.by_kecamatan||{}).length === 0 && (
            <div className="empty">
              <div className="empty-icon">🎉</div>
              <div className="empty-title">Semua SLS sudah melapor!</div>
              <div className="empty-sub">Cakupan 100% pada {formatTanggal(tanggal)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
