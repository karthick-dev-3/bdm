import React, { useState, useEffect } from 'react';
import { Mail, Bell, Menu, CloudCheck, CloudUpload, CloudOff, RefreshCw, LogOut, ShieldAlert, X } from 'lucide-react';
import { NavTabId } from './Sidebar';
import { subscribeSyncStatus, syncPendingVisitsToBackend, SyncStatusInfo } from '../../services/backendSyncService';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  activeTab: NavTabId;
  onOpenMobileMenu: () => void;
  selectedBdmName: string;
  savedVisitsCount: number;
  onNavigateToData?: () => void;
}

const tabDisplayTitles: Record<NavTabId, string> = {
  dashboard: 'Dashboard',
  beat: 'Field Beat Operations',
  directory: 'Outlets Directory',
  revival: 'Dormant Revival Playbook',
  performance: 'Performance & Reach',
  forensics: 'Visit Forensics Lab',
  hygiene: 'Data Quality & Hygiene',
  data: 'Data & CSV Management'
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  selectedBdmName,
  savedVisitsCount,
  onNavigateToData
}) => {
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pageTitle = tabDisplayTitles[activeTab] || 'Dashboard';
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    state: 'synced',
    pendingCount: 0,
    lastSyncedTimestamp: null
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setSyncStatus);
    return () => unsubscribe();
  }, []);

  const handleManualSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    syncPendingVisitsToBackend();
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Page Title & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={onOpenMobileMenu}
            aria-label="Open Navigation"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">{pageTitle}</h1>
            <div className="flex items-center gap-1.5 text-[0.68rem] text-slate-400 font-medium">
              <span>Apple iPhone Retail Intelligence</span>
              <span>•</span>
              <span className="text-amber-600 font-semibold">{selectedBdmName}</span>
            </div>
          </div>
        </div>

        {/* Right Action Icons, Sync Status & Auth Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Background Auto-Sync Status Badge */}
          <button
            type="button"
            onClick={handleManualSync}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              syncStatus.state === 'synced'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : syncStatus.state === 'syncing'
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : syncStatus.state === 'offline_queued'
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
            title={
              syncStatus.state === 'synced'
                ? 'All field visits synced to Central Hub'
                : syncStatus.state === 'syncing'
                ? 'Synchronizing in background...'
                : 'Working offline. Records will auto-sync on reconnect.'
            }
          >
            {syncStatus.state === 'synced' && (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Central Synced</span>
              </>
            )}
            {syncStatus.state === 'syncing' && (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Syncing{syncStatus.pendingCount > 0 ? ` (${syncStatus.pendingCount})` : ''}...</span>
              </>
            )}
            {syncStatus.state === 'offline_queued' && (
              <>
                <CloudOff size={12} />
                <span>Offline Queue{syncStatus.pendingCount > 0 ? ` (${syncStatus.pendingCount})` : ''}</span>
              </>
            )}
            {syncStatus.state === 'error' && (
              <>
                <RefreshCw size={12} />
                <span>Retry Sync{syncStatus.pendingCount > 0 ? ` (${syncStatus.pendingCount})` : ''}</span>
              </>
            )}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                {user?.name || user?.username || 'Admin'}
                <span className="text-[0.65rem] px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold uppercase tracking-wider">
                  {user?.role || 'Admin'}
                </span>
              </div>
              <div className="text-[0.68rem] text-slate-400 truncate max-w-[130px]">
                {user?.email || 'bdmadmin@bdm.local'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center ring-2 ring-amber-400/20 shadow-xs">
              {(user?.name?.[0] || user?.username?.[0] || 'B').toUpperCase()}
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            title="Sign out of Admin Dashboard"
            aria-label="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Custom Project Styled Sign Out Modal */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !isLoggingOut && setIsLogoutModalOpen(false)}
        >
          <div
            className="bg-[#181622] border border-white/10 rounded-3xl max-w-sm w-full p-6 text-slate-200 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Icon Header */}
            <div className="w-13 h-13 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
              <LogOut size={24} />
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              Sign Out of Admin Dashboard?
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Your active session will be invalidated. You can log back in at any time with your credentials.
            </p>

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5 w-full mt-6">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};



