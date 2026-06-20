import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import DatePicker, { todayStr } from '../components/DatePicker';
import SearchSelect from '../components/SearchSelect';
import '../components/custom-controls.css';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');
import { dashApi } from '../utils/api';

const MEDAL = ['🥇', '🥈', '🥉'];
const COLORS = ['#f59e0b', '#a3a3a3', '#cd7f32', '#6366f1', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#06b6d4', '#ec4899'];

/* ─────────────────────────────────────────────────────────────
   Konstanta paginasi tabel ranking
───────────────────────────────────────────────────────────── */
const RANK_PER_PAGE = 10;

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
  const heights = [90, 120, 75];
  const colors = ['#94a3b8', '#f59e0b', '#cd7f32'];
  const gradients = [
    'linear-gradient(135deg,rgba(148,163,184,0.18),rgba(100,116,139,0.08))',
    'linear-gradient(135deg,rgba(245,158,11,0.22),rgba(251,191,36,0.08))',
    'linear-gradient(135deg,rgba(205,127,50,0.18),rgba(180,100,30,0.08))',
  ];
  const borders = ['rgba(148,163,184,0.3)', 'rgba(245,158,11,0.4)', 'rgba(205,127,50,0.3)'];
  const countedVal = useCountUp(person?.total_terdata, 1000, delay);
  if (!person) return <div />;
  return (
    <div className="podium-card animate-fadein" style={{
      animationDelay: `${delay}ms`, textAlign: 'center', padding: '20px 12px 16px',
      background: gradients[rank], border: `1px solid ${borders[rank]}`,
      borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 6, position: 'relative',
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: heights[rank],
        background: `linear-gradient(0deg,${colors[rank]}22,transparent)`,
        borderRadius: '0 0 var(--r) var(--r)', pointerEvents: 'none'
      }} />
      <div style={{ fontSize: 32 }}>{rank === 1 ? '🥇' : rank === 0 ? '🥈' : '🥉'}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
        {(person._id || '').split(' ').slice(0, 2).join(' ')}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{person.nmkec}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: colors[rank], fontVariantNumeric: 'tabular-nums' }}>
        {countedVal.toLocaleString('id-ID')}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)' }}>unit terdata</div>
      <div className="pw" style={{ width: '80%', height: 4, marginTop: 4 }}>
        <div className="pf" style={{
          height: '100%',
          width: `${((person.total_terdata / maxVal) * 100)}%`,
          background: `linear-gradient(90deg,${colors[rank]},${colors[rank]}88)`,
          transition: 'width 1s ease'
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>🏢 {(person.total_usaha || 0).toLocaleString('id-ID')}</span>
        <span>🏠 {(person.total_keluarga || 0).toLocaleString('id-ID')}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>📅 {person.hari_lapor}x lapor</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helper: bangun array nomor halaman dengan ellipsis
───────────────────────────────────────────────────────────── */
function buildPageNumbers(current, total) {
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

/* ─────────────────────────────────────────────────────────────
   Tombol paginasi kecil — konsisten dengan Monitor.jsx
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Search bar estetik — inline di card Ranking Lengkap
───────────────────────────────────────────────────────────── */
function RankSearchBar({ value, onChange, total, filtered }) {
  const inputRef = useRef(null);
  const hasValue = value.trim().length > 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 13px',
        background: 'rgba(99,102,241,0.05)',
        border: '1.5px solid var(--border)',
        borderRadius: 10,
        marginBottom: 14,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        /* glow saat ada isi */
        ...(hasValue
          ? {
              borderColor: 'rgba(99,102,241,0.45)',
              boxShadow: '0 0 0 3px rgba(99,102,241,0.10)',
            }
          : {}),
      }}
      /* fokus via klik area */
      onClick={() => inputRef.current?.focus()}
    >
      {/* ikon search — sedikit glow saat ada query */}
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke={hasValue ? '#a78bfa' : 'var(--text3)'}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transition: 'stroke 0.2s' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      {/* input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Cari nama PCL, kecamatan, atau PML..."
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text)',
          fontFamily: 'inherit',
          caretColor: '#a78bfa',
        }}
      />

      {/* badge hasil filter — muncul hanya saat ada query */}
      {hasValue && (
        <span
          style={{
            padding: '2px 9px',
            borderRadius: 10,
            background: filtered < total
              ? 'rgba(99,102,241,0.15)'
              : 'rgba(16,185,129,0.12)',
            border: filtered < total
              ? '1px solid rgba(99,102,241,0.3)'
              : '1px solid rgba(16,185,129,0.28)',
            color: filtered < total ? '#a78bfa' : '#6ee7b7',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {filtered} / {total}
        </span>
      )}

      {/* tombol clear */}
      {hasValue && (
        <button
          onClick={e => { e.stopPropagation(); onChange(''); inputRef.current?.focus(); }}
          title="Hapus pencarian"
          style={{
            width: 22, height: 22,
            border: 'none',
            background: 'var(--surface3)',
            borderRadius: '50%',
            color: 'var(--text3)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(244,63,94,0.15)';
            e.currentTarget.style.color = '#fda4af';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--surface3)';
            e.currentTarget.style.color = 'var(--text3)';
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Komponen utama Leaderboard
───────────────────────────────────────────────────────────── */
export default function Leaderboard({ kecamatanList }) {
  const [dari, setDari] = useState(dayjs().format('YYYY-MM-DD'));
  const [sampai, setSampai] = useState(dayjs().format('YYYY-MM-DD'));
  const [kec, setKec] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ── State search + paginasi ranking ── */
  const [rankQuery, setRankQuery]   = useState('');
  const [rankPage,  setRankPage]    = useState(1);

  useEffect(() => {
    setLoading(true);
    const p = { tanggal_dari: dari, tanggal_sampai: sampai };
    if (kec) p.kecamatan = kec;
    dashApi.getLeaderboard(p)
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [dari, sampai, kec]);

  /* Reset paginasi & query saat filter berubah */
  useEffect(() => {
    setRankQuery('');
    setRankPage(1);
  }, [dari, sampai, kec]);

  /* Reset ke halaman 1 saat query berubah */
  useEffect(() => {
    setRankPage(1);
  }, [rankQuery]);

  const fmt = n => (n || 0).toLocaleString('id-ID');

  const safeData = Array.isArray(data) ? data : [];
  const maxVal   = safeData[0]?.total_terdata || 1;
  const maxHari  = safeData[0]?.hari_lapor    || 1;

  /* ── Filter berdasarkan query ── */
  const filteredData = rankQuery.trim()
    ? safeData.filter(r => {
        const q = rankQuery.toLowerCase();
        return (
          (r._id       || '').toLowerCase().includes(q) ||
          (r.nmkec     || '').toLowerCase().includes(q) ||
          (r.pengawas  || '').toLowerCase().includes(q)
        );
      })
    : safeData;

  /* ── Paginasi ── */
  const totalRankPages = Math.max(1, Math.ceil(filteredData.length / RANK_PER_PAGE));
  const safeRankPage   = Math.min(rankPage, totalRankPages);
  const rankStart      = (safeRankPage - 1) * RANK_PER_PAGE;
  const pageRows       = filteredData.slice(rankStart, rankStart + RANK_PER_PAGE);

  /* ── Chart data top 10 ── */
  const chartData = safeData.slice(0, 10).map((d, i) => ({
    name: (d._id || '').split(' ')[0],
    usaha: d.total_usaha || 0,
    keluarga: d.total_keluarga || 0,
    bku: d.total_bku || 0,
    total: d.total_terdata || 0,
    fill: COLORS[i] || '#6366f1',
  }));

  const top5 = safeData.slice(0, 5);

  const radarData = top5.length >= 3
    ? [
      {
        subject: 'Usaha (P2)',
        ...Object.fromEntries(
          top5.map(d => [(d._id || '').split(' ')[0], Math.round(((d.total_usaha || 0) / maxVal) * 100)])
        ),
      },
      {
        subject: 'Keluarga (P1)',
        ...Object.fromEntries(
          top5.map(d => [(d._id || '').split(' ')[0], Math.round(((d.total_keluarga || 0) / maxVal) * 100)])
        ),
      },
      {
        subject: 'BKU (P3)',
        ...Object.fromEntries(
          top5.map(d => [(d._id || '').split(' ')[0], Math.round(((d.total_bku || 0) / maxVal) * 100)])
        ),
      },
      {
        subject: 'Keaktifan',
        ...Object.fromEntries(
          top5.map(d => [(d._id || '').split(' ')[0], Math.round(((d.hari_lapor || 0) / maxHari) * 100)])
        ),
      },
    ]
    : [];

  return (
    <div>
      <div className="controls">
        <DatePicker value={dari}   onChange={setDari}   label="Dari Tanggal" />
        <DatePicker value={sampai} onChange={setSampai} label="Sampai Tanggal" />
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
        <div className="loading"><div className="spinner" /><div className="loading-text">Memuat ranking...</div></div>
      ) : safeData.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏆</div><div className="empty-title">Belum ada data</div></div>
      ) : (
        <>
          {/* Podium top 3 */}
          {safeData.length >= 3 && (
            <div className="card mb" style={{ overflow: 'visible' }}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-a">🏆</div>
                  <div>
                    <div className="c-title">Top 3 Petugas Terbaik</div>
                    <div className="c-sub">Berdasarkan total unit terdata (P1+P2+P3)</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14, alignItems: 'end' }}>
                <PodiumCard person={safeData[1]} rank={0} maxVal={maxVal} delay={100} />
                <PodiumCard person={safeData[0]} rank={1} maxVal={maxVal} delay={0} />
                <PodiumCard person={safeData[2]} rank={2} maxVal={maxVal} delay={200} />
              </div>
            </div>
          )}

          {/* Row: bar chart + radar chart */}
          <div className="g2 mb">
            {chartData.length > 0 && (
              <div className="card animate-fadein" style={{ animationDelay: '0.15s' }}>
                <div className="card-head">
                  <div className="card-title-g">
                    <div className="c-icon ci-p">📊</div>
                    <div>
                      <div className="c-title">Perbandingan Top 10 PCL</div>
                      <div className="c-sub">P1 Keluarga + P2 Usaha + P3 BKU</div>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 44 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,rgba(255,255,255,0.06))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="usaha"    name="P2 Usaha"    fill="#6366f1" stackId="a" animationDuration={1000} />
                    <Bar dataKey="keluarga" name="P1 Keluarga" fill="#10b981" stackId="a" animationDuration={1200} />
                    <Bar dataKey="bku"      name="P3 BKU"      fill="#f59e0b" radius={[3,3,0,0]} stackId="a" animationDuration={1400} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {radarData.length >= 3 && top5.length >= 3 && (
              <div className="card animate-fadein" style={{ animationDelay: '0.25s' }}>
                <div className="card-head">
                  <div className="card-title-g">
                    <div className="c-icon ci-g">🕸️</div>
                    <div>
                      <div className="c-title">Profil Top 5 PCL</div>
                      <div className="c-sub">Performa multi-dimensi (% relatif)</div>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]}
                      tick={{ fontSize: 9, fill: 'var(--text3)' }} tickCount={4} />
                    {top5.map((d, i) => {
                      const name = (d._id || '').split(' ')[0];
                      return (
                        <Radar key={name} name={name} dataKey={name}
                          stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.12}
                          strokeWidth={1.5} />
                      );
                    })}
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Progress bar vs peringkat 1 */}
          <div className="card mb animate-fadein" style={{ animationDelay: '0.3s' }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-b">🏅</div>
                <div>
                  <div className="c-title">Progress PCL vs Peringkat 1</div>
                  <div className="c-sub">Persentase capaian relatif total unit terdata</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {safeData.slice(0, 10).map((r, i) => {
                const pct = Math.round(((r.total_terdata || 0) / maxVal) * 100);
                const barColor = i === 0 ? '#f59e0b' : i < 3 ? '#6366f1' : '#10b981';
                return (
                  <div key={r._id || i} className="animate-fadein" style={{ animationDelay: `${i * 60}ms` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {MEDAL[i] || `#${i + 1}`} {(r._id || '').split(' ').slice(0, 2).join(' ')}
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{r.nmkec}</span>
                      </span>
                      <span style={{ fontWeight: 800, color: barColor }}>{fmt(r.total_terdata)}</span>
                    </div>
                    <div className="pw" style={{ height: 6 }}>
                      <div className="pf" style={{
                        height: '100%', width: `${pct}%`,
                        background: `linear-gradient(90deg,${barColor},${barColor}88)`,
                        transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms`
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              RANKING LENGKAP — dengan search bar + paginasi
          ═══════════════════════════════════════════════════ */}
          <div className="card animate-fadein" style={{ animationDelay: '0.4s' }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-g">📋</div>
                <div>
                  <div className="c-title">Ranking Lengkap</div>
                  <div className="c-sub">
                    {rankQuery.trim()
                      ? `${filteredData.length} dari ${safeData.length} PCL ditemukan`
                      : `${safeData.length} PCL aktif`}
                  </div>
                </div>
              </div>
              <span className="badge bp">{filteredData.length} PCL</span>
            </div>

            {/* ── Search bar ── */}
            <RankSearchBar
              value={rankQuery}
              onChange={setRankQuery}
              total={safeData.length}
              filtered={filteredData.length}
            />

            {/* ── Tabel ── */}
            {pageRows.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.6 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>
                  Tidak ada PCL yang cocok
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5 }}>
                  Coba kata kunci lain atau hapus pencarian
                </div>
              </div>
            ) : (
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
                    {pageRows.map((r, i) => {
                      /* rank asli di safeData, bukan filteredData */
                      const globalRank = safeData.findIndex(d => d._id === r._id);
                      return (
                        <tr
                          key={r._id || i}
                          style={{ animation: `fadeInUp 0.3s ease ${Math.min(i * 30, 300)}ms both` }}
                        >
                          <td className="rank-num">{MEDAL[globalRank] || `#${globalRank + 1}`}</td>
                          <td className="bold">{r._id}</td>
                          <td>{r.nmkec}</td>
                          <td style={{ color: 'var(--text3)', fontSize: 11 }}>{r.pengawas}</td>
                          <td>{fmt(r.total_usaha)}</td>
                          <td>{fmt(r.total_keluarga)}</td>
                          <td>{fmt(r.total_bku)}</td>
                          <td>{fmt(r.total_bangunan)}</td>
                          <td>
                            {(r.total_belum || 0) > 0
                              ? <span className="badge br">{fmt(r.total_belum)}</span>
                              : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                          <td><strong style={{ color: 'var(--p3)' }}>{fmt(r.total_terdata)}</strong></td>
                          <td><span className="badge bp">{r.hari_lapor}x</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Paginasi ── */}
            {totalRankPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--border)',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                {/* Info halaman */}
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                  Halaman{' '}
                  <strong style={{ color: 'var(--text2)' }}>{safeRankPage}</strong>
                  {' '}dari{' '}
                  <strong style={{ color: 'var(--text2)' }}>{totalRankPages}</strong>
                  {' · '}baris{' '}
                  <strong style={{ color: 'var(--text2)' }}>
                    {rankStart + 1}–{Math.min(rankStart + RANK_PER_PAGE, filteredData.length)}
                  </strong>
                  {' '}dari{' '}
                  <strong style={{ color: 'var(--text2)' }}>{filteredData.length}</strong>
                </span>

                {/* Tombol navigasi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <PagBtn
                    disabled={safeRankPage === 1}
                    onClick={() => setRankPage(1)}
                    title="Halaman pertama"
                  >«</PagBtn>

                  <PagBtn
                    disabled={safeRankPage === 1}
                    onClick={() => setRankPage(p => Math.max(1, p - 1))}
                    title="Sebelumnya"
                  >‹</PagBtn>

                  {buildPageNumbers(safeRankPage, totalRankPages).map((pg, idx) =>
                    pg === '…' ? (
                      <span key={`ellipsis-${idx}`} style={{
                        width: 28, textAlign: 'center',
                        fontSize: 12, color: 'var(--text3)',
                      }}>…</span>
                    ) : (
                      <PagBtn
                        key={pg}
                        active={pg === safeRankPage}
                        onClick={() => setRankPage(pg)}
                      >{pg}</PagBtn>
                    )
                  )}

                  <PagBtn
                    disabled={safeRankPage === totalRankPages}
                    onClick={() => setRankPage(p => Math.min(totalRankPages, p + 1))}
                    title="Berikutnya"
                  >›</PagBtn>

                  <PagBtn
                    disabled={safeRankPage === totalRankPages}
                    onClick={() => setRankPage(totalRankPages)}
                    title="Halaman terakhir"
                  >»</PagBtn>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}