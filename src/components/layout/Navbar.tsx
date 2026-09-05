import React from 'react';
import { Smartphone, LayoutDashboard, Database, RefreshCw, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentMode: 'dashboard' | 'field-app';
  onModeChange: (mode: 'dashboard' | 'field-app') => void;
  outletsCount: number;
  activeJulyCount: number;
  savedVisitsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onModeChange,
  outletsCount,
  activeJulyCount,
  savedVisitsCount
}) => {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-logo-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.08 1.74-.95 2.77.99.08 2.05-.52 2.68-1.27z"/>
          </svg>
        </div>
        <div>
          <div className="brand-title">Tamil Nadu iPhone Distribution</div>
          <div className="brand-subtitle">Commercial Territory Operations & BDM Copilot</div>
        </div>
      </div>

      <div className="mode-toggle-group">
        <button
          className={`mode-btn ${currentMode === 'dashboard' ? 'active' : ''}`}
          onClick={() => onModeChange('dashboard')}
        >
          <LayoutDashboard size={15} />
          <span>Executive Command Center</span>
        </button>
        <button
          className={`mode-btn ${currentMode === 'field-app' ? 'active' : ''}`}
          onClick={() => onModeChange('field-app')}
        >
          <Smartphone size={15} />
          <span>BDM Field App</span>
          {savedVisitsCount > 0 && (
            <span style={{ background: '#30D158', color: '#000', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>
              +{savedVisitsCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <Database size={13} color="#0A84FF" />
          <span>{outletsCount > 0 ? `${outletsCount} Outlets` : 'Outlets Database'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#30D158' }}>
          <ShieldCheck size={13} />
          <span>Local Engine Active</span>
        </div>
      </div>
    </header>
  );
};
