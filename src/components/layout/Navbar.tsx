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
        <div className="brand-logo-badge flex items-center justify-center text-[#FFA928]">
          <Smartphone size={18} />
        </div>
        <div>
          <div className="brand-title">Tamil Nadu Mobile Distribution</div>
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
