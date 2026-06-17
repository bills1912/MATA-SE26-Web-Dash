import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');

const HARI  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

export function formatTanggal(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('dddd, D MMMM YYYY');
}

function CalendarPopup({ triggerRef, value, onChange, onClose, max }) {
  const ref    = useRef(null);
  const today  = dayjs();
  const maxDay = max ? dayjs(max) : today;
  const selected = value ? dayjs(value) : null;
  const [view, setView] = useState(selected || today);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const calc = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const popH = 340;
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow >= popH
        ? r.bottom + window.scrollY + 4
        : r.top + window.scrollY - popH - 4;
      setPos({ top, left: r.left + window.scrollX, width: Math.max(r.width, 280) });
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
      if (ref.current && !ref.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, triggerRef]);

  const prevMonth = () => setView(v => v.subtract(1, 'month'));
  const nextMonth = () => {
    const next = view.add(1, 'month');
    if (next.isAfter(maxDay, 'month')) return;
    setView(next);
  };

  const firstDay = view.startOf('month').day();
  const daysInMonth = view.daysInMonth();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleDay = (d) => {
    if (!d) return;
    const date = view.date(d);
    if (date.isAfter(maxDay, 'day')) return;
    onChange(date.format('YYYY-MM-DD'));
    onClose();
  };

  const isSelected = (d) =>
    selected && selected.year() === view.year() &&
    selected.month() === view.month() && selected.date() === d;
  const isToday = (d) =>
    today.year() === view.year() && today.month() === view.month() && today.date() === d;
  const isFuture = (d) => d && view.date(d).isAfter(maxDay, 'day');
  const canNext  = !view.add(1, 'month').startOf('month').isAfter(maxDay, 'month');

  return createPortal(
    <div
      ref={ref}
      className="dp-popup"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      <div className="dp-header">
        <button type="button" className="dp-nav" onClick={prevMonth}>‹</button>
        <div className="dp-month-label">
          {BULAN[view.month()]} {view.year()}
        </div>
        <button type="button" className="dp-nav" onClick={nextMonth} disabled={!canNext}>›</button>
      </div>

      <div className="dp-weekdays">
        {HARI.map(h => <div key={h} className="dp-wd">{h}</div>)}
      </div>

      <div className="dp-grid">
        {cells.map((d, i) => (
          <button
            key={i}
            type="button"
            className={
              'dp-day' +
              (d === null ? ' dp-empty' : '') +
              (isSelected(d) ? ' dp-selected' : '') +
              (isToday(d) && !isSelected(d) ? ' dp-today' : '') +
              (isFuture(d) ? ' dp-disabled' : '')
            }
            onClick={() => handleDay(d)}
            disabled={!d || isFuture(d)}
          >
            {d || ''}
          </button>
        ))}
      </div>

      <div className="dp-footer">
        <button
          type="button"
          className="dp-today-btn"
          onClick={() => { onChange(today.format('YYYY-MM-DD')); onClose(); }}
        >
          Hari Ini
        </button>
        {value && (
          <button
            type="button"
            className="dp-clear-btn"
            onClick={() => { onChange(''); onClose(); }}
          >
            Hapus
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DatePicker({ value, onChange, label, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className={'dp-wrap ' + className}>
      {label && (
        <div className="dp-label">{label}</div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className={'dp-trigger' + (open ? ' dp-open' : '')}
        onClick={() => setOpen(o => !o)}
      >
        <span className="dp-cal-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <span className={'dp-value' + (!value ? ' dp-placeholder' : '')}>
          {value ? formatTanggal(value) : (placeholder || '— Pilih Tanggal —')}
        </span>
        <span className={'dp-arrow' + (open ? ' dp-arrow-up' : '')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {open && (
        <CalendarPopup
          triggerRef={triggerRef}
          value={value}
          onChange={onChange}
          onClose={close}
          max={todayStr()}
        />
      )}
    </div>
  );
}
