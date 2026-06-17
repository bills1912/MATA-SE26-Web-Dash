import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

function Dropdown({ triggerRef, onClose, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const calc = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const popH = 320;
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow >= popH
        ? r.bottom + window.scrollY + 4
        : r.top + window.scrollY - popH - 4;
      setPos({ top, left: r.left + window.scrollX, width: r.width });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, triggerRef]);

  return createPortal(
    <div
      ref={ref}
      className="ss-portal-dropdown"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {children}
    </div>,
    document.body
  );
}

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="ss-highlight">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchSelect({
  label,
  placeholder,
  value,
  onChange,
  options = [],
  disabled = false,
  icon,
  className = '',
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef(null);
  const inputRef   = useRef(null);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else setQuery('');
  }, [open]);

  const handleSelect = (opt) => { onChange(opt); close(); };
  const handleClear  = (e)   => { e.stopPropagation(); onChange(''); close(); };

  return (
    <div className={'ss-wrap ' + className}>
      {label && (
        <div className="ss-label">
          {icon && <span className="ss-label-icon">{icon}</span>}
          {label}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        className={
          'ss-trigger' +
          (open ? ' ss-open' : '') +
          (disabled ? ' ss-disabled' : '')
        }
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        disabled={disabled}
      >
        <span className={'ss-value' + (value ? '' : ' ss-placeholder')}>
          {value || placeholder || '— Pilih —'}
        </span>
        <span className="ss-icons">
          {value && !disabled && (
            <span className="ss-clear" onClick={handleClear} title="Hapus">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </span>
          )}
          <span className={'ss-arrow' + (open ? ' ss-arrow-up' : '')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </span>
      </button>

      {open && (
        <Dropdown triggerRef={triggerRef} onClose={close}>
          <div className="ss-search-wrap">
            <svg className="ss-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              className="ss-search"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Cari ${label?.toLowerCase() || ''}...`}
            />
            {query && (
              <button className="ss-search-clear" onClick={() => setQuery('')} type="button">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <div className="ss-count">
            {filtered.length === options.length
              ? `${options.length} pilihan tersedia`
              : `${filtered.length} dari ${options.length} hasil`}
          </div>
          <div className="ss-options">
            {filtered.length === 0 ? (
              <div className="ss-empty">Tidak ada hasil untuk "{query}"</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={'ss-option' + (opt === value ? ' ss-selected' : '')}
                  onClick={() => handleSelect(opt)}
                >
                  <span className="ss-check">
                    {opt === value && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                  <span className="ss-opt-text">{highlight(opt, query)}</span>
                </button>
              ))
            )}
          </div>
        </Dropdown>
      )}
    </div>
  );
}
