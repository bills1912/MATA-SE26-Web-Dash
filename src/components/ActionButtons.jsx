import './action-buttons.css';

/**
 * RefreshButton — tombol refresh dengan animasi spin saat loading
 */
export function RefreshButton({ onClick, loading = false, label = 'Refresh' }) {
  return (
    <button
      type="button"
      className={`ab-btn ab-refresh${loading ? ' ab-loading' : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      <span className="ab-icon">
        {loading ? (
          /* spinner SVG */
          <svg className="ab-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          /* refresh SVG */
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        )}
      </span>
      <span>{loading ? 'Memuat...' : label}</span>
    </button>
  );
}

/**
 * ExportButton — tombol export CSV dengan animasi download
 */
export function ExportButton({ onClick, label = 'Export CSV' }) {
  return (
    <button
      type="button"
      className="ab-btn ab-export"
      onClick={onClick}
    >
      <span className="ab-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}
