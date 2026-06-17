import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { dashApi } from '../utils/api';

// ─── Komponen Toast Notifikasi ───
function Toast({ toasts, remove }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10, maxWidth:360 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex', alignItems:'flex-start', gap:12,
          padding:'12px 16px',
          background: t.type === 'success' ? 'rgba(16,185,129,0.15)' : t.type === 'error' ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.35)' : t.type === 'error' ? 'rgba(244,63,94,0.35)' : 'rgba(99,102,241,0.35)'}`,
          borderRadius:'var(--r)',
          boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
          animation:'fadeInUp 0.3s ease',
          backdropFilter:'blur(8px)',
        }}>
          <span style={{ fontSize:18, flexShrink:0 }}>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{t.title}</div>
            {t.msg && <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{t.msg}</div>}
          </div>
          <button onClick={() => remove(t.id)} style={{ background:'transparent', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>×</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((type, title, msg) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, title, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);
  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, add, remove };
}

// ─── Field angka dengan label ───
function NumField({ label, sub, name, value, onChange, min = 0, required = false }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>
        {label}
        {required && <span style={{ color:'#f43f5e', marginLeft:3 }}>*</span>}
        {sub && <span style={{ fontWeight:400, color:'var(--text3)', marginLeft:6, fontSize:11 }}>{sub}</span>}
      </label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min={min}
        style={{
          width:'100%', padding:'9px 12px',
          background:'var(--surface2)', border:'1px solid var(--border)',
          borderRadius:'var(--r-sm)', color:'var(--text)',
          fontSize:14, fontWeight:600, fontFamily:'inherit',
          outline:'none', transition:'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--p1)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  );
}

// ─── INITIAL STATE FORM ───
const INIT = {
  tanggal: dayjs().format('YYYY-MM-DD'),
  kecamatan: '', desa: '', idsubsls: '',
  // P1–P6
  jumlah_keluarga_submit: 0,
  jumlah_usaha_submit:    0,
  jumlah_bku_submit:      0,
  jumlah_bangunan_kosong: 0,
  total_bangunan:         0,
  jumlah_belum_submit:    0,
  catatan_belum_submit:   '',
  catatan:                '',
};

export default function InputLaporan({ kecamatanList }) {
  const [form,       setForm]       = useState(INIT);
  const [desaList,   setDesaList]   = useState([]);
  const [slsList,    setSlsList]    = useState([]);
  const [slsInfo,    setSlsInfo]    = useState(null);   // detail SLS terpilih
  const [existing,   setExisting]   = useState(null);   // laporan existing hari ini
  const [editMode,   setEditMode]   = useState(false);  // true = update, false = baru
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const { toasts, add: addToast, remove: removeToast } = useToast();

  // Load desa saat kecamatan berubah
  useEffect(() => {
    setDesaList([]); setSlsList([]); setSlsInfo(null); setExisting(null);
    setForm(f => ({ ...f, desa:'', idsubsls:'' }));
    if (!form.kecamatan) return;
    dashApi.getDesa(form.kecamatan).then(r => setDesaList(r.data)).catch(() => {});
  }, [form.kecamatan]);

  // Load SLS saat desa berubah
  useEffect(() => {
    setSlsList([]); setSlsInfo(null); setExisting(null);
    setForm(f => ({ ...f, idsubsls:'' }));
    if (!form.kecamatan || !form.desa) return;
    dashApi.getSls({ kecamatan: form.kecamatan, desa: form.desa })
      .then(r => setSlsList(r.data))
      .catch(() => {});
  }, [form.desa]);

  // Load detail SLS + cek existing laporan saat SLS berubah
  useEffect(() => {
    setSlsInfo(null); setExisting(null); setEditMode(false);
    if (!form.idsubsls || !form.tanggal) return;

    // Ambil detail SLS
    dashApi.getSlsDetail(form.idsubsls)
      .then(r => setSlsInfo(r.data))
      .catch(() => {});

    // Cek laporan existing
    dashApi.checkLaporan({ tanggal: form.tanggal, idsubsls: form.idsubsls })
      .then(r => {
        if (r.data) {
          setExisting(r.data);
          // Pre-fill form dengan data existing
          setForm(f => ({
            ...f,
            jumlah_keluarga_submit: r.data.jumlah_keluarga_submit || 0,
            jumlah_usaha_submit:    r.data.jumlah_usaha_submit    || 0,
            jumlah_bku_submit:      r.data.jumlah_bku_submit      || 0,
            jumlah_bangunan_kosong: r.data.jumlah_bangunan_kosong || 0,
            total_bangunan:         r.data.total_bangunan         || 0,
            jumlah_belum_submit:    r.data.jumlah_belum_submit    || 0,
            catatan_belum_submit:   r.data.catatan_belum_submit   || '',
            catatan:                r.data.catatan                || '',
          }));
        } else {
          // Reset angka
          setForm(f => ({
            ...f,
            jumlah_keluarga_submit: 0,
            jumlah_usaha_submit:    0,
            jumlah_bku_submit:      0,
            jumlah_bangunan_kosong: 0,
            total_bangunan:         0,
            jumlah_belum_submit:    0,
            catatan_belum_submit:   '',
            catatan:                '',
          }));
        }
      })
      .catch(() => {});
  }, [form.idsubsls, form.tanggal]);

  const handleChange = e => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'number' ? Math.max(0, Number(value)) : value }));
  };

  const handleKecChange = e => setForm(f => ({ ...f, kecamatan: e.target.value, desa:'', idsubsls:'' }));
  const handleDesaChange = e => setForm(f => ({ ...f, desa: e.target.value, idsubsls:'' }));

  const handleSls = e => {
    const id = e.target.value;
    const sls = slsList.find(s => s.idsubsls === id);
    setForm(f => ({ ...f, idsubsls: id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idsubsls) { addToast('error', 'Pilih SLS terlebih dahulu'); return; }
    if (!form.tanggal)  { addToast('error', 'Tanggal wajib diisi'); return; }
    if (form.jumlah_belum_submit > 0 && !form.catatan_belum_submit.trim()) {
      addToast('error', 'Wajib isi catatan', 'Isi catatan untuk P6 > 0 (siapa yang belum submit dan kenapa)');
      return;
    }

    setSaving(true);
    const slsSelected = slsList.find(s => s.idsubsls === form.idsubsls) || {};

    const payload = {
      tanggal:                 form.tanggal,
      idsubsls:                form.idsubsls,
      nmkec:                   form.kecamatan,
      nmdesa:                  form.desa,
      nmsubsls:                slsSelected.nmsubsls || '',
      pencacah:                slsSelected.pencacah || '',
      pengawas:                slsSelected.pengawas || '',
      jumlah_keluarga_submit:  form.jumlah_keluarga_submit,
      jumlah_usaha_submit:     form.jumlah_usaha_submit,
      jumlah_bku_submit:       form.jumlah_bku_submit,
      jumlah_bangunan_kosong:  form.jumlah_bangunan_kosong,
      total_bangunan:          form.total_bangunan,
      jumlah_belum_submit:     form.jumlah_belum_submit,
      catatan_belum_submit:    form.catatan_belum_submit,
      catatan:                 form.catatan,
    };

    try {
      if (existing && editMode) {
        await dashApi.updateLaporan(existing._id, payload);
        addToast('success', 'Laporan diperbarui', `SLS ${form.idsubsls}`);
      } else {
        await dashApi.postLaporan(payload);
        addToast('success', 'Laporan berhasil disimpan!', `SLS ${form.idsubsls} — ${form.tanggal}`);
      }
      // Reset angka setelah save, tapi pertahankan lokasi
      setForm(f => ({
        ...f,
        jumlah_keluarga_submit: 0,
        jumlah_usaha_submit:    0,
        jumlah_bku_submit:      0,
        jumlah_bangunan_kosong: 0,
        total_bangunan:         0,
        jumlah_belum_submit:    0,
        catatan_belum_submit:   '',
        catatan:                '',
        idsubsls:               '',
      }));
      setExisting(null); setEditMode(false); setSlsInfo(null);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      addToast('error', 'Gagal menyimpan', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirm(`Hapus laporan SLS ${form.idsubsls} tanggal ${form.tanggal}?`)) return;
    setDeleting(true);
    try {
      await dashApi.deleteLaporan(existing._id);
      addToast('success', 'Laporan dihapus');
      setExisting(null); setEditMode(false);
      setForm(f => ({
        ...f,
        jumlah_keluarga_submit: 0, jumlah_usaha_submit: 0,
        jumlah_bku_submit: 0, jumlah_bangunan_kosong: 0,
        total_bangunan: 0, jumlah_belum_submit: 0,
        catatan_belum_submit: '', catatan: '', idsubsls: '',
      }));
      setSlsInfo(null);
    } catch (err) {
      addToast('error', 'Gagal menghapus', err?.response?.data?.error);
    } finally {
      setDeleting(false);
    }
  };

  const totalSubmit = form.jumlah_keluarga_submit + form.jumlah_usaha_submit + form.jumlah_bku_submit;

  return (
    <div>
      <Toast toasts={toasts} remove={removeToast} />

      <div style={{ maxWidth:860, margin:'0 auto' }}>

        {/* Header info card */}
        <div className="card mb animate-fadein" style={{
          background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))',
          border:'1px solid rgba(99,102,241,0.25)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:36 }}>📝</div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--text)' }}>Input Laporan Harian SE2026</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:4, lineHeight:1.6 }}>
                Isi progress pendataan per SLS. Pilih kecamatan → desa → SLS, lalu isi data P1–P6.
                Jika laporan sudah ada, form akan tampil dengan data existing untuk diedit.
              </div>
            </div>
          </div>
          {/* Legenda P1-P6 */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
            {[
              { p:'P1', label:'Keluarga Non-Usaha Submit', color:'#10b981' },
              { p:'P2', label:'Keluarga Usaha Submit',     color:'#6366f1' },
              { p:'P3', label:'BKU Submit',                color:'#f59e0b' },
              { p:'P4', label:'Bangunan Kosong/Non-Hunian',color:'#f43f5e' },
              { p:'P5', label:'Total Bangunan Disticker',  color:'#3b82f6' },
              { p:'P6', label:'Sudah Didata, Belum Submit',color:'#8b5cf6' },
            ].map(({ p, label, color }) => (
              <div key={p} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'4px 10px', borderRadius:20,
                background:`${color}18`, border:`1px solid ${color}33`,
                fontSize:11, fontWeight:600,
              }}>
                <span style={{ color, fontWeight:800 }}>{p}</span>
                <span style={{ color:'var(--text3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── SECTION 1: Tanggal & Lokasi ── */}
          <div className="card mb animate-fadein" style={{ animationDelay:'0.05s' }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-p">📅</div>
                <div><div className="c-title">Tanggal & Lokasi SLS</div></div>
              </div>
            </div>

            {/* Tanggal */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>
                Tanggal Laporan <span style={{ color:'#f43f5e' }}>*</span>
              </label>
              <input type="date" name="tanggal" value={form.tanggal}
                onChange={handleChange}
                max={dayjs().format('YYYY-MM-DD')}
                className="ctrl-date"
                style={{ width:'100%', padding:'9px 12px', fontSize:14 }}
              />
            </div>

            <div className="g3" style={{ gap:12 }}>
              {/* Kecamatan */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>
                  Kecamatan <span style={{ color:'#f43f5e' }}>*</span>
                </label>
                <select value={form.kecamatan} onChange={handleKecChange} className="ctrl-sel"
                  style={{ width:'100%', padding:'9px 12px', fontSize:13 }}>
                  <option value="">— Pilih Kecamatan —</option>
                  {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Desa */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>
                  Desa <span style={{ color:'#f43f5e' }}>*</span>
                </label>
                <select value={form.desa} onChange={handleDesaChange} className="ctrl-sel"
                  disabled={!form.kecamatan}
                  style={{ width:'100%', padding:'9px 12px', fontSize:13, opacity: form.kecamatan ? 1 : 0.5 }}>
                  <option value="">— Pilih Desa —</option>
                  {desaList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* SLS */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>
                  SLS (Subsls) <span style={{ color:'#f43f5e' }}>*</span>
                </label>
                <select value={form.idsubsls} onChange={handleSls} className="ctrl-sel"
                  disabled={!form.desa}
                  style={{ width:'100%', padding:'9px 12px', fontSize:12, opacity: form.desa ? 1 : 0.5 }}>
                  <option value="">— Pilih SLS —</option>
                  {slsList.map(s => (
                    <option key={s.idsubsls} value={s.idsubsls}>
                      {s.nmsubsls} ({s.idsubsls.slice(-6)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info SLS terpilih */}
            {slsInfo && (
              <div style={{
                marginTop:14, padding:'12px 14px',
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:'var(--r-sm)', fontSize:12,
              }}>
                <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                  <span>👤 PCL: <strong style={{ color:'var(--text)' }}>{slsInfo.pencacah}</strong></span>
                  <span>👁️ PML: <strong style={{ color:'var(--text)' }}>{slsInfo.pengawas}</strong></span>
                  <span>🗂️ {slsInfo.nmsls}</span>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--p3)' }}>{slsInfo.idsubsls}</span>
                </div>
              </div>
            )}

            {/* Status: laporan sudah ada */}
            {existing && (
              <div style={{
                marginTop:12, padding:'12px 14px',
                background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)',
                borderRadius:'var(--r-sm)', display:'flex', alignItems:'center', gap:12,
              }}>
                <span style={{ fontSize:20 }}>⚠️</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                    Laporan sudah ada untuk SLS ini pada {form.tanggal}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
                    Form sudah diisi dengan data existing. {editMode ? 'Mode edit aktif.' : 'Klik Edit untuk mengubah.'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {!editMode && (
                    <button type="button" onClick={() => setEditMode(true)} className="btn-ref" style={{ padding:'6px 12px', fontSize:11 }}>
                      ✏️ Edit
                    </button>
                  )}
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    style={{
                      padding:'6px 12px', fontSize:11, fontWeight:700,
                      background:'rgba(244,63,94,0.12)', border:'1px solid rgba(244,63,94,0.3)',
                      borderRadius:'var(--r-sm)', color:'#fda4af', cursor:'pointer', fontFamily:'inherit',
                    }}>
                    {deleting ? '⏳' : '🗑️'} Hapus
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 2: Data Progress P1–P6 ── */}
          <div className="card mb animate-fadein" style={{
            animationDelay:'0.1s',
            opacity: (existing && !editMode) ? 0.65 : 1,
            pointerEvents: (existing && !editMode) ? 'none' : 'auto',
          }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-g">📊</div>
                <div>
                  <div className="c-title">Data Progress Pendataan</div>
                  <div className="c-sub">Isi sesuai kondisi lapangan hari ini</div>
                </div>
              </div>
              {/* Preview total */}
              {totalSubmit > 0 && (
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:900, color:'var(--p3)' }}>{totalSubmit.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>Total submit (P1+P2+P3)</div>
                </div>
              )}
            </div>

            <div className="g2" style={{ gap:16, marginBottom:16 }}>
              <NumField
                label="P1 — Keluarga Non-Usaha" name="jumlah_keluarga_submit"
                sub="berhasil submit"
                value={form.jumlah_keluarga_submit} onChange={handleChange}
              />
              <NumField
                label="P2 — Keluarga Usaha" name="jumlah_usaha_submit"
                sub="berhasil submit"
                value={form.jumlah_usaha_submit} onChange={handleChange}
              />
              <NumField
                label="P3 — BKU" name="jumlah_bku_submit"
                sub="berhasil submit"
                value={form.jumlah_bku_submit} onChange={handleChange}
              />
              <NumField
                label="P4 — Bangunan Kosong / Non-Hunian" name="jumlah_bangunan_kosong"
                sub="sudah disticker"
                value={form.jumlah_bangunan_kosong} onChange={handleChange}
              />
              <NumField
                label="P5 — Total Bangunan" name="total_bangunan"
                sub="sudah disticker"
                value={form.total_bangunan} onChange={handleChange}
              />
              <NumField
                label="P6 — Sudah Didata, Belum Submit" name="jumlah_belum_submit"
                value={form.jumlah_belum_submit} onChange={handleChange}
              />
            </div>

            {/* Catatan belum submit — hanya wajib jika P6 > 0 */}
            {form.jumlah_belum_submit > 0 && (
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#fcd34d', marginBottom:6 }}>
                  Catatan P6 (wajib) <span style={{ color:'#f43f5e' }}>*</span>
                  <span style={{ fontWeight:400, color:'var(--text3)', marginLeft:6 }}>siapa dan kenapa belum submit</span>
                </label>
                <textarea
                  name="catatan_belum_submit"
                  value={form.catatan_belum_submit}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Contoh: RT 02 Pak Ahmad belum submit karena HP rusak, dijadwalkan besok..."
                  style={{
                    width:'100%', padding:'10px 12px',
                    background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)',
                    borderRadius:'var(--r-sm)', color:'var(--text)',
                    fontSize:13, fontFamily:'inherit', resize:'vertical',
                    outline:'none',
                  }}
                />
              </div>
            )}

            {/* Catatan umum */}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>
                Catatan Umum
                <span style={{ fontWeight:400, color:'var(--text3)', marginLeft:6 }}>opsional</span>
              </label>
              <textarea
                name="catatan"
                value={form.catatan}
                onChange={handleChange}
                rows={2}
                placeholder="Kendala lapangan, informasi tambahan, dll..."
                style={{
                  width:'100%', padding:'10px 12px',
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-sm)', color:'var(--text)',
                  fontSize:13, fontFamily:'inherit', resize:'vertical',
                  outline:'none', transition:'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--p1)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* ── SECTION 3: Preview & Tombol Submit ── */}
          <div className="card mb animate-fadein" style={{ animationDelay:'0.15s' }}>
            <div className="card-head">
              <div className="card-title-g">
                <div className="c-icon ci-b">✅</div>
                <div><div className="c-title">Ringkasan</div></div>
              </div>
            </div>

            <div className="g4" style={{ marginBottom:16 }}>
              {[
                { label:'P1 Keluarga', val: form.jumlah_keluarga_submit, color:'#10b981' },
                { label:'P2 Usaha',    val: form.jumlah_usaha_submit,    color:'#6366f1' },
                { label:'P3 BKU',      val: form.jumlah_bku_submit,      color:'#f59e0b' },
                { label:'P4 Kosong',   val: form.jumlah_bangunan_kosong, color:'#f43f5e' },
                { label:'P5 Bangunan', val: form.total_bangunan,         color:'#3b82f6' },
                { label:'P6 Belum',    val: form.jumlah_belum_submit,    color:'#8b5cf6' },
                { label:'Total Submit',val: totalSubmit,                 color:'var(--p3)', big: true },
              ].map(({ label, val, color, big }) => (
                <div key={label} style={{
                  textAlign:'center', padding:'10px 8px',
                  background:'var(--surface)', borderRadius:'var(--r-sm)',
                  border: big ? `1px solid ${color}44` : '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: big ? 22 : 18, fontWeight:900, color }}>{val}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, fontWeight:700 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button
                type="submit"
                disabled={saving || !form.idsubsls || (existing && !editMode)}
                style={{
                  flex:1, padding:'12px 20px',
                  background: (saving || !form.idsubsls || (existing && !editMode))
                    ? 'rgba(99,102,241,0.15)'
                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius:'var(--r-sm)', color:'white',
                  fontSize:14, fontWeight:800, cursor: (saving || !form.idsubsls || (existing && !editMode)) ? 'not-allowed' : 'pointer',
                  fontFamily:'inherit', transition:'all 0.2s',
                  opacity: (existing && !editMode) ? 0.5 : 1,
                }}
              >
                {saving ? '⏳ Menyimpan...' : existing && editMode ? '💾 Perbarui Laporan' : '📤 Simpan Laporan'}
              </button>

              {(editMode || form.idsubsls) && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(f => ({
                      ...f, idsubsls:'',
                      jumlah_keluarga_submit:0, jumlah_usaha_submit:0,
                      jumlah_bku_submit:0, jumlah_bangunan_kosong:0,
                      total_bangunan:0, jumlah_belum_submit:0,
                      catatan_belum_submit:'', catatan:'',
                    }));
                    setExisting(null); setEditMode(false); setSlsInfo(null);
                  }}
                  className="btn-ref"
                  style={{ padding:'12px 20px', fontSize:13 }}
                >
                  🔄 Reset
                </button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
