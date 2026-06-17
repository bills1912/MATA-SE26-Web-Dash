import { useState, useEffect, useRef, useCallback } from 'react';
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

// ── Konstanta paginasi accordion ──
const SLS_PER_PAGE = 10;

// ── Komponen accordion expand: tabel SLS dengan search + paginasi ──
function KecAccordionDetail({ sls, kecName }) {
  const [query,    setQuery]    = useState('');
  const [page,     setPage]     = useState(1);
  const inputRef               = useRef(null);

  // Reset saat data kecamatan berubah
  useEffect(() => { setQuery(''); setPage(1); }, [kecName]);

  // Filter berdasarkan query (cari di desa, SLS, pencacah, pengawas, idsubsls)
  const filtered = query.trim()
    ? sls.filter(s => {
        const q = query.toLowerCase();
        return (
          (s.nmdesa    || '').toLowerCase().includes(q) ||
          (s.nmsubsls  || '').toLowerCase().includes(q) ||
          (s.pencacah  || '').toLowerCase().includes(q) ||
          (s.pengawas  || '').toLowerCase().includes(q) ||
          (s.idsubsls  || '').toLowerCase().includes(q)
        );
      })
    : sls;

  const totalPages = Math.max(1, Math.ceil(filtered.length / SLS_PER_PAGE));

  // Kalau query berubah, kembali ke halaman 1
  useEffect(() => { setPage(1); }, [query]);

  // Pastikan page tidak melebihi totalPages
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * SLS_PER_PAGE;
  const pageRows   = filtered.slice(pageStart, pageStart + SLS_PER_PAGE);

  const handleClearQuery = () => { setQuery(''); inputRef.current?.focus(); };

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>

      {/* ── Search bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'rgba(99,102,241,0.04)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* ikon search */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari desa, SLS, PCL, PML..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            fontFamily: 'inherit',
          }}
        />

        {/* Info hasil filter */}
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {query.trim()
            ? `${filtered.length} dari ${sls.length} hasil`
            : `${sls.length} SLS`}
        </span>

        {/* Tombol hapus query */}
        {query && (
          <button
            onClick={handleClearQuery}
            style={{
              width: 20, height: 20,
              border: 'none',
              background: 'var(--surface3)',
              borderRadius: '50%',
              color: 'var(--text3)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0,
              transition: 'all 0.15s',
            }}
            title="Hapus pencarian"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Tabel hasil ── */}
      {pageRows.length === 0 ? (
        <div style={{
          padding: '28px 16px',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text3)',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          Tidak ada SLS yang cocok dengan "<strong>{query}</strong>"
        </div>
      ) : (
        <table className="tbl" style={{ minWidth: 'unset' }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Desa</th>
              <th>SLS</th>
              <th>PCL</th>
              <th>PML</th>
              <th>ID Subsls</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s, i) => (
              <tr key={s.idsubsls} style={{ animation: `fadeInUp 0.25s ease ${i * 30}ms both` }}>
                <td style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                  {pageStart + i + 1}
                </td>
                <td className="bold">{s.nmdesa}</td>
                <td>{s.nmsubsls}</td>
                <td>👤 {s.pencacah}</td>
                <td style={{ color: 'var(--text3)', fontSize: 11 }}>👁️ {s.pengawas}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--p3)' }}>{s.idsubsls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Paginasi ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(99,102,241,0.03)',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          {/* Info halaman */}
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Halaman{' '}
            <strong style={{ color: 'var(--text2)' }}>{safePage}</strong>
            {' '}dari{' '}
            <strong style={{ color: 'var(--text2)' }}>{totalPages}</strong>
            {' · '}
            baris{' '}
            <strong style={{ color: 'var(--text2)' }}>
              {pageStart + 1}–{Math.min(pageStart + SLS_PER_PAGE, filtered.length)}
            </strong>
          </span>

          {/* Tombol navigasi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* First */}
            <PagBtn
              disabled={safePage === 1}
              onClick={() => setPage(1)}
              title="Halaman pertama"
            >«</PagBtn>

            {/* Prev */}
            <PagBtn
              disabled={safePage === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              title="Sebelumnya"
            >‹</PagBtn>

            {/* Nomor halaman — tampilkan max 5 di tengah */}
            {buildPageNumbers(safePage, totalPages).map((pg, idx) =>
              pg === '…' ? (
                <span key={`ellipsis-${idx}`} style={{
                  width: 28, textAlign: 'center',
                  fontSize: 12, color: 'var(--text3)',
                }}>…</span>
              ) : (
                <PagBtn
                  key={pg}
                  active={pg === safePage}
                  onClick={() => setPage(pg)}
                >{pg}</PagBtn>
              )
            )}

            {/* Next */}
            <PagBtn
              disabled={safePage === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              title="Berikutnya"
            >›</PagBtn>

            {/* Last */}
            <PagBtn
              disabled={safePage === totalPages}
              onClick={() => setPage(totalPages)}
              title="Halaman terakhir"
            >»</PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: bangun array nomor halaman dengan ellipsis
function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  // Selalu tampilkan halaman pertama
  pages.push(1);
  if (current > 3) pages.push('…');
  // Halaman di sekitar current
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('…');
  // Selalu tampilkan halaman terakhir
  pages.push(total);
  return pages;
}

// Tombol paginasi kecil
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
          : disabled
            ? 'transparent'
            : 'var(--surface)',
        color: active
          ? '#a5b4fc'
          : disabled
            ? 'var(--text3)'
            : 'var(--text2)',
        fontWeight: active ? 800 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 5px',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.13s',
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponen utama Monitor
// ─────────────────────────────────────────────────────────────────────────────
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

  // Reset expanded saat data berubah
  useEffect(() => { setExpanded({}); }, [tanggal, kec]);

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
  const countedTotal = useCountUp(data?.total_sls   || 0, 1200, 100);

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
          {/* ── Row 1: Radial + Donut + Bar kecamatan ── */}
          <div className="g3 mb" style={{ alignItems: 'start' }}>

            {/* Radial gauge */}
            <div className="card animate-fadein" ref={chartRef}>
              <div className="card-head">
                <div className="card-title-g">
                  <div className="c-icon ci-g">📡</div>
                  <div>
                    <div className="c-title">Cakupan Pelaporan</div>
                    <div className="c-sub">{formatTanggal(tanggal)}</div>
                  </div>
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
                  <div>
                    <div className="c-title">Proporsi Pelaporan</div>
                    <div className="c-sub">Sudah vs Belum lapor hari ini</div>
                  </div>
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
                  <div>
                    <div className="c-title">Belum Lapor / Kecamatan</div>
                    <div className="c-sub">Jumlah SLS tertunda hari ini</div>
                  </div>
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

          {/* ── Row 2: Progress bar per kecamatan ── */}
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

          {/* ── Row 3: Detail collapsible per kecamatan — dengan search + paginasi ── */}
          <div className="sh">
            <span className="sh-title">📍 Detail SLS Belum Lapor</span>
            <span className="badge br">{data.belum_lapor} SLS</span>
          </div>

          {Object.entries(data.by_kecamatan || {})
            .sort((a, b) => b[1].length - a[1].length)
            .map(([k, sls], i) => {
              const isOpen = !!expanded[k];
              return (
                <div
                  key={k}
                  className="card mb animate-fadein"
                  style={{ padding: 0, overflow: 'hidden', animationDelay: `${i * 50}ms` }}
                >
                  {/* ── Header accordion ── */}
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '14px 16px',
                      border: 'none',
                      background: isOpen
                        ? 'rgba(99,102,241,0.06)'
                        : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      gap: 12,
                      transition: 'background 0.2s',
                    }}
                    onClick={() => toggle(k)}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span>📍</span>
                        <span>{k}</span>
                        {isOpen && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: 'rgba(99,102,241,0.12)',
                            border: '1px solid rgba(99,102,241,0.25)',
                            color: '#a5b4fc',
                            borderRadius: 10, padding: '1px 7px',
                          }}>expanded</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                        {sls.length} SLS belum melapor
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className="badge br">{sls.length}</span>
                      <span style={{
                        color: isOpen ? '#a5b4fc' : 'var(--text3)',
                        fontSize: 13,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s, color 0.2s',
                        display: 'inline-block',
                      }}>▼</span>
                    </div>
                  </button>

                  {/* ── Konten expand: search + tabel + paginasi ── */}
                  {isOpen && (
                    <KecAccordionDetail sls={sls} kecName={k} />
                  )}
                </div>
              );
            })}

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