import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const OPTS = [
  { id:'dark',   icon:'🌙', label:'Gelap',  sub:'Dark mode' },
  { id:'light',  icon:'☀️', label:'Terang', sub:'Light mode' },
  { id:'system', icon:'💻', label:'Sistem',  sub:'Ikuti OS'  },
];

export function useTheme() {
  const [theme, setT] = useState(() => localStorage.getItem('mata-dash-theme') || 'dark');

  const resolve = (t) =>
    t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolve(theme));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => {
      if (theme === 'system')
        document.documentElement.setAttribute('data-theme', resolve('system'));
    };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [theme]);

  const setTheme = (t) => {
    localStorage.setItem('mata-dash-theme', t);
    setT(t);
    document.documentElement.setAttribute('data-theme', resolve(t));
  };

  return { theme, setTheme };
}

function Menu({ triggerRef, onClose, theme, setTheme }) {
  const menuRef   = useRef(null);
  const [pos, setPos] = useState(null); // null = belum dihitung

  // Hitung posisi — hanya dipanggil secara eksplisit, bukan setiap render
  const calcPos = () => {
    if (!triggerRef.current || !menuRef.current) return;
    const tr   = triggerRef.current.getBoundingClientRect();
    const popH = menuRef.current.offsetHeight;
    const popW = menuRef.current.offsetWidth || 180;
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;

    const top = (vh - tr.bottom) >= popH + 8
      ? tr.bottom + window.scrollY + 8
      : tr.top   + window.scrollY - popH - 8;

    let left = tr.right - popW + window.scrollX;
    if (left < 8)           left = 8;
    if (left + popW > vw - 8) left = vw - popW - 8;

    setPos({ top, left, width: Math.max(popW, 180) });
  };

  // Jalankan sekali setelah menu ter-render di DOM
  useEffect(() => {
    // rAF agar browser sudah layout elemen sebelum kita baca dimensinya
    const id = requestAnimationFrame(calcPos);
    return () => cancelAnimationFrame(id);
  }, []); // kosong — hanya mount

  // Update posisi saat resize / scroll
  useEffect(() => {
    window.addEventListener('resize', calcPos);
    window.addEventListener('scroll', calcPos, true);
    return () => {
      window.removeEventListener('resize', calcPos);
      window.removeEventListener('scroll', calcPos, true);
    };
  }, []);

  // Tutup saat klik di luar
  useEffect(() => {
    const h = (e) => {
      if (
        menuRef.current    && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, triggerRef]);

  // Render dengan visibility:hidden sampai posisi dihitung agar tidak berkedip
  const style = pos
    ? { position:'absolute', ...pos }
    : { position:'absolute', visibility:'hidden', top:0, left:0 };

  return createPortal(
    <div ref={menuRef} className="tt-menu" style={style}>
      <div className="tt-menu-title">Tema Tampilan</div>
      {OPTS.map(o => (
        <button
          key={o.id}
          type="button"
          className={'tt-opt' + (theme === o.id ? ' ac' : '')}
          onClick={() => { setTheme(o.id); onClose(); }}
        >
          <span className="tt-opt-icon">{o.icon}</span>
          <div>
            <span className="tt-opt-label">{o.label}</span>
            <span className="tt-opt-sub">{o.sub}</span>
          </div>
          {theme === o.id && <span className="tt-check">✓</span>}
        </button>
      ))}
    </div>,
    document.body
  );
}

export default function ThemeToggle({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const cur = OPTS.find(o => o.id === theme);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="tt-btn"
        onClick={() => setOpen(o => !o)}
      >
        <span>{cur?.icon}</span>
        <span>{cur?.label}</span>
      </button>
      {open && (
        <Menu
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </>
  );
}
