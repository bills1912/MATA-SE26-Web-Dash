import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import dayjs from 'dayjs';
import { dashApi } from '../utils/api';

const MEDAL = ['🥇','🥈','🥉'];
const COLORS = ['#f59e0b','#a3a3a3','#cd7f32','#6366f1','#10b981','#3b82f6','#8b5cf6','#f43f5e','#06b6d4','#ec4899'];

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

function useCountUp(target, duration = 900, delay = 0, trigger = true) {
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

function PodiumCard({ person, rank, maxVal, delay }) {
  const heights   = [90, 120, 75];
  const colors    = ['#94a3b8','#f59e0b','#cd7f32'];
  const gradients = [
    'linear-gradient(135deg,rgba(148,163,184,0.18),rgba(100,116,139,0.08))',
    'linear-gradient(135deg,rgba(245,158,11,0.22),rgba(251,191,36,0.08))',
    'linear-gradient(135deg,rgba(205,127,50,0.18),rgba(180,100,30,0.08))',
  ];
  const borders = ['rgba(148,163,184,0.3)','rgba(245,158,11,0.4)','rgba(205,127,50,0.3)'];
  const countedVal = useCountUp(person?.total_terdata, 1000, delay);
  if (!person) return <div/>;
  return (
    <div className="podium-card animate-fadein" style={{
      animationDelay: `${delay}ms`, textAlign: 'center', padding: '20px 12px 16px',
      background: gradients[rank], border: `1px solid ${borders[rank]}`,
      borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 6, position: 'relative',
    }}>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:heights[rank],
        background:`linear-gradient(0deg,${colors[rank]}22,transparent)`,
        borderRadius:'0 0 var(--r) var(--r)', pointerEvents:'none' }}/>
      <div style={{ fontSize:32 }}>{rank === 1 ? '🥇' : rank === 0 ? '🥈' : '🥉'}</div>
      <div style={{ fontSize:11, fontWeight:800, color:'var(--text)', lineHeight:1.3 }}>
        {(person._id || '').split(' ').slice(0, 2).join(' ')}
      </div>
      <div style={{ fontSize:10, color:'var(--text3)' }}>{person.nmkec}</div>
      <div style={{ fontSize:26, fontWeight:900, color:colors[rank], fontVariantNumeric:'tabular-nums' }}>
        {countedVal.toLocaleString('id-ID')}
      </div>
      <div style={{ fontSize:10, color:'var(--text3)' }}>unit terdata</div>
      <div className="pw" style={{ width:'80%', height:4, marginTop:4 }}>
        <div className="pf" style={{ height:'100%',
          width: ((person.total_terdata / maxVal) * 100) + '%',
          background:`linear-gradient(90deg,${colors[rank]},${colors[rank]}88)`,
          transition:'width 1s ease' }}/>
      </div>
      <div style={{ fontSize:10, color:'var(--text3)', display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        <span>🏢 {(person.total_usaha||0).toLocaleString('id-ID')}</span>
        <span>🏠 {(person.total_keluarga||0).toLocaleString('id-ID')}</span>
      </div>
      <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>📅 {person.hari_lapor}x lapor</div>
    </div>
  );
}

export default function Leaderboard({ kecamatanList }) {
  const [dari,    setDari]    = useState(dayjs().format('YYYY-MM-DD'));
  const [sampai,  setSampai]  = useState(dayjs().format('YYYY-MM-DD'));
  const [kec,     setKec]     = useState('');
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const p = { tanggal_dari: dari, tanggal_sampai: sampai };
    if (kec) p.kecamatan = kec;
    dashApi.getLeaderboard(p)
      // ✅ FIX: pastikan selalu array, jaga dari r.data = null / object
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [dari, sampai, kec]);

  const fmt    = n => (n || 0).toLocaleString('id-ID');
  const maxVal = data[0]?.total_terdata || 1;

  // ✅ FIX: guard Array.isArray sebelum semua operasi
  const safeData = Array.isArray(data) ? data : [];

  // Chart top 10
  const chartData = safeData.slice(0, 10).map((d, i) => ({
    name:     (d._id || '').split(' ')[0],
    usaha:    d.total_usaha    || 0,
    keluarga: d.total_keluarga || 0,
    bku:      d.total_bku      || 0,
    total:    d.total_terdata  || 0,
    fill: COLORS[i] || '#6366f1',
  }));

  // ✅ FIX UTAMA: format radarData yang benar untuk RadarChart
  // RadarChart butuh array of objects di mana setiap object = 1 baris (1 subject/axis)
  // dengan key per orang. Format lama salah karena radarData.map(d=>[d.name, d.X])
  // menghasilkan nested array, bukan object.
  const top5 = safeData.slice(0, 5);
  const maxHari = safeData[0]?.hari_lapor || 1;

  // Setiap item = 1 sumbu radar, berisi nilai semua orang untuk sumbu itu
  const radarData = top5.length >= 3
    ? [
        {
          subject: 'Usaha (P2)',
          ...Object.fromEntries(
            top5.map(d => [(d._id || '').split(' ')[0],
              Math.round(((d.total_usaha || 0) / maxVal) * 100)])
          ),
        },
        {
          subject: 'Keluarga (P1)',
          ...Object.fromEntries(
            top5.map(d => [(d._id || '').split(' ')[0],
              Math.round(((d.total_keluarga || 0) / maxVal) * 100)])
          ),
        },
        {
          subject: 'BKU (P3)',
          ...Object.fromEntries(
            top5.map(d => [(d._id || '').split(' ')[0],
              Math.round(((d.total_bku || 0) / maxVal) * 100)])
          ),
        },
        {
          subject: 'Keaktifan',
          ...Object.fromEntries(
            top5.map(d => [(d._id || '').split(' ')[0],
              Math.round(((d.hari_lapor || 0) / maxHari) * 100)])
          ),
        },
      ]
    : [];

  return (
    <div>
      <div className="controls">
        <input type="date" className="ctrl-date" value={dari}
          onChange={e => setDari(e.target.value)} max={dayjs().format('YYYY-MM-DD')} />
        <span style={{ color:'var(--text3)', fontSize:12 }}>s/d</span>
        <input type="date" className="ctrl-date" value={sampai}
          onChange={e => setSampai(e.target.value)} max={dayjs().format('YYYY-MM-DD')} />
        <select className="ctrl-sel" value={kec} onChange={e => setKec(e.target.value)}>
          <option value="">— Semua Kecamatan —</option>
          {(Array.isArray(kecamatanList) ? kecamatanList : []).map(k =>
            <option key={k} value={k}>{k}</option>
          )}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"/><div className="loading-text">Memuat ranking...</div></div>
      ) : safeData.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏆</div><div className="empty-title">Belum ada data</div></div>
      ) : (
        <>
          {/* Podium top 3 */}
          {safeData.length >= 3 && (
            <div className="card mb" style={{ overflow:'visible' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-a">🏆</div>
                  <div><div className="c-title">Top 3 Petugas Terbaik</div>
                    <div className="c-sub">Berdasarkan total unit terdata (P1+P2+P3)</div></div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr', gap:14, alignItems:'end' }}>
                <PodiumCard person={safeData[1]} rank={0} maxVal={maxVal} delay={100}/>
                <PodiumCard person={safeData[0]} rank={1} maxVal={maxVal} delay={0}/>
                <PodiumCard person={safeData[2]} rank={2} maxVal={maxVal} delay={200}/>
              </div>
            </div>
          )}

          {/* Row: bar chart + radar chart */}
          <div className="g2 mb">
            {chartData.length > 0 && (
              <div className="card animate-fadein" style={{ animationDelay:'0.15s' }}>
                <div className="card-head">
                  <div className="card-title-g"><div className="c-icon ci-p">📊</div>
                    <div><div className="c-title">Perbandingan Top 10 PCL</div>
                      <div className="c-sub">P1 Keluarga + P2 Usaha + P3 BKU</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chartData} margin={{ top:4, right:8, left:0, bottom:44 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))"/>
                    <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text3)' }} angle={-30} textAnchor="end"/>
                    <YAxis tick={{ fontSize:10, fill:'var(--text3)' }}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend wrapperStyle={{ fontSize:11 }}/>
                    <Bar dataKey="usaha"    name="P2 Usaha"    fill="#6366f1" stackId="a" animationDuration={1000}/>
                    <Bar dataKey="keluarga" name="P1 Keluarga" fill="#10b981" stackId="a" animationDuration={1200}/>
                    <Bar dataKey="bku"      name="P3 BKU"      fill="#f59e0b" radius={[3,3,0,0]} stackId="a" animationDuration={1400}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ✅ FIX: pakai radarData yang sudah benar formatnya, bukan transform ulang di sini */}
            {radarData.length >= 3 && top5.length >= 3 && (
              <div className="card animate-fadein" style={{ animationDelay:'0.25s' }}>
                <div className="card-head">
                  <div className="card-title-g"><div className="c-icon ci-g">🕸️</div>
                    <div><div className="c-title">Profil Top 5 PCL</div>
                      <div className="c-sub">Performa multi-dimensi (% relatif)</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:'var(--text3)' }}/>
                    <PolarRadiusAxis angle={30} domain={[0,100]}
                      tick={{ fontSize:9, fill:'var(--text3)' }} tickCount={4}/>
                    {top5.map((d, i) => {
                      const name = (d._id || '').split(' ')[0];
                      return (
                        <Radar key={name} name={name} dataKey={name}
                          stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.12}
                          strokeWidth={1.5}/>
                      );
                    })}
                    <Tooltip/>
                    <Legend wrapperStyle={{ fontSize:10 }}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Progress bar vs peringkat 1 */}
          <div className="card mb animate-fadein" style={{ animationDelay:'0.3s' }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-b">🏅</div>
                <div><div className="c-title">Progress PCL vs Peringkat 1</div>
                  <div className="c-sub">Persentase capaian relatif total unit terdata</div></div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {safeData.slice(0, 10).map((r, i) => {
                const pct = Math.round(((r.total_terdata || 0) / maxVal) * 100);
                const barColor = i === 0 ? '#f59e0b' : i < 3 ? '#6366f1' : '#10b981';
                return (
                  <div key={r._id || i} className="animate-fadein" style={{ animationDelay:`${i * 60}ms` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                      <span style={{ fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                        {MEDAL[i] || `#${i+1}`} {(r._id || '').split(' ').slice(0,2).join(' ')}
                        <span style={{ fontSize:10, color:'var(--text3)', fontWeight:400 }}>{r.nmkec}</span>
                      </span>
                      <span style={{ fontWeight:800, color:barColor }}>{fmt(r.total_terdata)}</span>
                    </div>
                    <div className="pw" style={{ height:6 }}>
                      <div className="pf" style={{ height:'100%', width:pct + '%',
                        background:`linear-gradient(90deg,${barColor},${barColor}88)`,
                        transition:`width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${i*60}ms` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabel ranking lengkap */}
          <div className="card animate-fadein" style={{ animationDelay:'0.4s' }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-g">📋</div>
                <div><div className="c-title">Ranking Lengkap</div>
                  <div className="c-sub">{safeData.length} PCL aktif</div></div>
              </div>
              <span className="badge bp">{safeData.length} PCL</span>
            </div>
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th><th>PCL</th><th>Kecamatan</th><th>PML</th>
                    <th>P2 Usaha</th><th>P1 Keluarga</th><th>P3 BKU</th>
                    <th>Bangunan</th><th>Belum</th><th>Total</th><th>Hari</th>
                  </tr>
                </thead>
                <tbody>
                  {safeData.map((r, i) => (
                    <tr key={r._id || i} style={{ animation:`fadeInUp 0.35s ease ${Math.min(i*25,500)}ms both` }}>
                      <td className="rank-num">{MEDAL[i] || `#${r.rank}`}</td>
                      <td className="bold">{r._id}</td>
                      <td>{r.nmkec}</td>
                      <td style={{ color:'var(--text3)', fontSize:11 }}>{r.pengawas}</td>
                      <td>{fmt(r.total_usaha)}</td>
                      <td>{fmt(r.total_keluarga)}</td>
                      <td>{fmt(r.total_bku)}</td>
                      <td>{fmt(r.total_bangunan)}</td>
                      <td>
                        {(r.total_belum || 0) > 0
                          ? <span className="badge br">{fmt(r.total_belum)}</span>
                          : <span style={{ color:'var(--text3)' }}>—</span>}
                      </td>
                      <td><strong style={{ color:'var(--p3)' }}>{fmt(r.total_terdata)}</strong></td>
                      <td><span className="badge bp">{r.hari_lapor}x</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}