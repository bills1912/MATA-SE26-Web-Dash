import { useState, useEffect, useRef } from 'react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import DatePicker, { todayStr } from '../components/DatePicker';
import SearchSelect from '../components/SearchSelect';
import '../components/custom-controls.css';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');
import { dashApi } from '../utils/api';
import { formatTanggal } from '../utils/date';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div className="tt-label">{label || payload[0]?.name}</div>
      {payload.map((p, i) => (
        <div className="tt-row" key={i}>
          <span className="tt-dot" style={{ background: p.color || p.fill }} />
          {p.name}: <strong>{(p.value || 0).toLocaleString('id-ID')}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Monitor({ kecamatanList }) {
  const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'));
  const [kec, setKec] = useState('');
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [chartRef, chartInView] = useInView();
  const [barRef, barInView] = useInView();

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
  const pct = data ? parseFloat(data.pct_selesai) : 0;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';

  const radialData = [
    { name: 'selesai', value: pct, fill: color },
    { name: 'bg', value: 100, fill: 'rgba(255,255,255,0.05)' },
  ];

  const kecBelumData = data
    ? Object.entries(data.by_kecamatan || {})
      .map(([name, belum]) => ({
        name: name.length > 16 ? name.slice(0, 14) + '…' : name,
        belumLapor: belum.length,
      }))
      .sort((a, b) => b.belumLapor - a.belumLapor)
    : [];

  const pieData = data
    ? [
      { name: 'Sudah Lapor', value: data.sudah_lapor, fill: '#10b981' },
      { name: 'Belum Lapor', value: data.belum_lapor, fill: '#f43f5e' },
    ]
    : [];

  const countedSudah = useCountUp(data?.sudah_lapor || 0, 1200, 300);
  const countedBelum = useCountUp(data?.belum_lapor || 0, 1200, 500);
  const countedTotal = useCountUp(data?.total_sls || 0, 1200, 100);

  return (
    <div>
      <div className="controls">
        <DatePicker value={tanggal} onChange={setTanggal} label="Tanggal" />
        <SearchSelect
          className="ss-kec"
          label="Kecamatan"
          placeholder="— Semua Kecamatan —"
          value={kec}
          onChange={setKec}
          options={Array.isArray(kecamatanList) ? kecamatanList : []}
        />
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /><div className="loading-text">Memeriksa SLS...</div></div>
      ) : !data ? (
        <div className="empty"><div className="empty-icon">📡</div><div className="empty-title">Data tidak tersedia</div></div>
      ) : (
        <>
          {/* Row 1: Radial + Donut + Bar kecamatan */}
          <div className="g3 mb" style={{ alignItems: 'start' }}>

            {/* Radial gauge */}
            <div className="card animate-fadein" ref={chartRef}>
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
                    <RadialBar dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {data.pct_selesai}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>selesai</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                {[
                  { val: countedSudah, color: '#10b981', label: 'Sudah' },
                  { val: countedBelum, color: '#f43f5e', label: 'Belum' },
                  { val: countedTotal, color: 'var(--text2)', label: 'Total' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.val.toLocaleString('id-ID')}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut pie */}
            <div className="card animate-fadein" style={{ animationDelay: '0.12s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-p">🥧</div>
                  <div><div className="c-title">Proporsi Pelaporan</div><div className="c-sub">Sudah vs Belum lapor hari ini</div></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value" animationBegin={300} animationDuration={1000}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {pieData.map(d => (
                  <div key={d.name} className="ir">
                    <span className="ir-l" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
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

            {/* Bar belum per kecamatan */}
            <div className="card animate-fadein" style={{ animationDelay: '0.22s' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-r">⏳</div>
                  <div><div className="c-title">Belum Lapor / Kecamatan</div><div className="c-sub">Jumlah SLS tertunda hari ini</div></div>
                </div>
              </div>
              {kecBelumData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={kecBelumData} layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--text3)' }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="belumLapor" name="Belum Lapor" fill="#f43f5e"
                      radius={[0, 4, 4, 0]} animationBegin={400} animationDuration={1000} />
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

          {/* Row 2: Progress bar per kecamatan */}
          {kecBelumData.length > 0 && (
            <div className="card mb animate-fadein" style={{ animationDelay: '0.3s' }} ref={barRef}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-b">📊</div>
                  <div>
                    <div className="c-title">Kecamatan Belum 100%</div>
                    <div className="c-sub">Urut dari yang paling banyak SLS tertunda</div>
                  </div>
                </div>
                <span className="badge br">{data.belum_lapor} SLS belum</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {kecBelumData.map((kd, i) => (
                  <div key={kd.name} className="kec-progress-row" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="kec-pr-header">
                      <div className="kec-pr-name">📍 {kd.name}</div>
                      <span className="badge br">{kd.belumLapor} SLS belum</span>
                    </div>
                    <div className="pw" style={{ height: 7, borderRadius: 8 }}>
                      <div className="pf" style={{
                        width: barInView
                          ? Math.min((kd.belumLapor / (kecBelumData[0]?.belumLapor || 1)) * 100, 100) + '%'
                          : '0%',
                        background: 'linear-gradient(90deg,#f43f5e,#fb7185)',
                        transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms`,
                        borderRadius: 8, height: '100%',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Detail collapsible per kecamatan */}
          <div className="sh">
            <span className="sh-title">📍 Detail SLS Belum Lapor</span>
            <span className="badge br">{data.belum_lapor} SLS</span>
          </div>

          {Object.entries(data.by_kecamatan || {})
            .sort((a, b) => b[1].length - a[1].length)
            .map(([k, sls], i) => (
              <div key={k} className="card mb animate-fadein" style={{ padding: 0, overflow: 'hidden', animationDelay: `${i * 50}ms` }}>
                <button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', gap: 12 }}
                  onClick={() => toggle(k)}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>📍 {k}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sls.length} SLS belum melapor</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className="badge br">{sls.length}</span>
                    <span style={{ color: 'var(--text3)', fontSize: 14 }}>{expanded[k] ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded[k] && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <table className="tbl" style={{ minWidth: 'unset' }}>
                      <thead>
                        <tr><th>Desa</th><th>SLS</th><th>PCL</th><th>PML</th><th>ID Subsls</th></tr>
                      </thead>
                      <tbody>
                        {sls.map(s => (
                          <tr key={s.idsubsls}>
                            <td className="bold">{s.nmdesa}</td>
                            <td>{s.nmsubsls}</td>
                            <td>👤 {s.pencacah}</td>
                            <td style={{ color: 'var(--text3)', fontSize: 11 }}>👁️ {s.pengawas}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--p3)' }}>{s.idsubsls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

          {Object.keys(data.by_kecamatan || {}).length === 0 && (
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
