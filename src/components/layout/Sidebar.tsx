import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Compass,
  Store,
  RefreshCw,
  BarChart3,
  ShieldAlert,
  Database,
  PanelLeftClose,
  PanelLeft,
  MapPin,
  Shield,
  FileSpreadsheet,
  UploadCloud,
  Smartphone
} from 'lucide-react';
import { Dataset } from '../../services/dataLoader';
import { getAllMetadata } from '../../services/dbStore';
import { CustomDropdown, DropdownOption } from '../common/CustomDropdown';

export type NavTabId = 'dashboard' | 'beat' | 'directory' | 'revival' | 'performance' | 'forensics' | 'hygiene' | 'data';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  dataset: Dataset;
  selectedBdmCode: string;
  onSelectBdmCode: (code: string) => void;
  savedVisitsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  dataset,
  selectedBdmCode,
  onSelectBdmCode,
  savedVisitsCount
}) => {
  const [customCsvCount, setCustomCsvCount] = useState<number>(0);

  useEffect(() => {
    const checkCustom = async () => {
      try {
        const meta = await getAllMetadata();
        const customCount = Object.values(meta).reduce(
          (acc, files) => acc + (Array.isArray(files) ? files.length : (files ? 1 : 0)),
          0
        );
        setCustomCsvCount(customCount);
      } catch (e) {
        // silent
      }
    };
    checkCustom();
  }, [dataset]);

  const isPrimaryAccount = selectedBdmCode === 'ALL';
  const currentBdm = dataset.bdms.find((b) => b.code === selectedBdmCode);

  // User-scoped counts for badges
  const userOutlets = isPrimaryAccount
    ? dataset.outlets
    : dataset.outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const revivalCount = userOutlets.filter(
    (o) => o.billing.peakMonthVal >= 200000 && o.billing.jul26Val === 0
  ).length;

  const hygieneCount = userOutlets.filter(
    (o) => o.isDuplicateSuspect || o.hasMissingCoords
  ).length;

  // ALL menus are permanently visible for all accounts.
  const menuItems = [
    { id: 'dashboard' as NavTabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'beat' as NavTabId, label: 'Daily Visit Plan', icon: Compass, count: userOutlets.length },
    { id: 'directory' as NavTabId, label: 'Store Directory', icon: Store, count: userOutlets.length },
    { id: 'revival' as NavTabId, label: 'Inactive Store Revival', icon: RefreshCw, count: revivalCount },
    { id: 'performance' as NavTabId, label: 'Sales & Coverage Reports', icon: BarChart3 },
    { id: 'forensics' as NavTabId, label: 'Visit Verification & Audit', icon: ShieldAlert },
    { id: 'hygiene' as NavTabId, label: 'Data Quality & Cleanup', icon: Database, count: hygieneCount },
    { id: 'data' as NavTabId, label: 'Data & File Manager', icon: FileSpreadsheet, count: customCsvCount > 0 ? `${customCsvCount} Custom` : undefined },
  ];

  // Territory / Account Options with Clean Labels
  const territoryOptions: DropdownOption[] = [
    {
      value: 'ALL',
      label: 'Primary Account (Central)',
      sublabel: dataset.bdms.length > 0 ? `Executive Overview • All ${dataset.bdms.length}` : 'Executive Overview'
    },
    ...dataset.bdms.map((b) => ({
      value: b.code,
      label: `${b.name} — ${b.territory}`,
      sublabel: `${b.code} • ${dataset.outlets.filter((o) => o.assignedBdmCode === b.code).length} outlets`
    }))
  ];

  return (
    <aside
      className={`h-screen fixed top-0 bottom-0 left-0 bg-[#1B1920] flex flex-col z-40 transition-all duration-200 border-r border-white/5 select-none overflow-hidden ${
        isCollapsed ? 'w-[72px] min-w-[72px]' : 'w-[250px] min-w-[250px]'
      }`}
    >
      {/* 1. Brand Header with Smartphone Icon */}
      <div className="h-[68px] px-4 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#FFA928]">
            <Smartphone size={20} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-[1.02rem] font-bold text-white tracking-tight">Mobile TN Sales</span>
              <span className="text-[0.66rem] text-[#A0A0AB] uppercase tracking-wider font-medium">
                {isPrimaryAccount ? 'Central Command' : `${currentBdm ? currentBdm.territory : 'Active'} Territory`}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="w-8 h-8 rounded-md flex items-center justify-center text-[#A0A0AB] hover:text-white hover:bg-white/10 transition-colors shrink-0"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* 2. Account Switcher Dropdown */}
      {!isCollapsed && (
        <div className="px-3.5 pb-3 w-full">
          <CustomDropdown
            options={territoryOptions}
            value={selectedBdmCode}
            onChange={onSelectBdmCode}
            theme="dark"
            icon={isPrimaryAccount ? <Shield size={14} /> : <MapPin size={14} />}
            minWidth="100%"
          />
        </div>
      )}

      {/* 3. Navigation List (All menus visible, user-scoped badges) */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`relative flex items-center gap-3 w-full h-[42px] px-3.5 rounded-xl text-sm font-medium transition-colors text-left shrink-0 cursor-pointer ${
                isActive
                  ? 'text-[#FFA928] font-semibold bg-[#FFA928]/10'
                  : 'text-[#A0A0AB] hover:text-white hover:bg-white/5'
              }`}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="flex items-center justify-center min-w-[20px]">
                <Icon size={18} />
              </span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.count !== undefined && item.count !== 0 && item.count !== '0' && (
                    <span
                      className={`text-[0.7rem] px-2 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-[#FFA928]/25 text-[#FFA928]'
                          : 'bg-white/10 text-[#A0A0AB]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-[#FFA928]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. Distribution Network Status Card */}
      {!isCollapsed && (
        <div className="m-3 mb-2.5 bg-[#141217] border border-white/10 rounded-xl p-2.5 flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[0.68rem] text-[#A0A0AB] uppercase tracking-wider font-semibold">
              Network Status
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[0.68rem] text-emerald-500 font-semibold">Live</span>
            </div>
          </div>

          <div className="text-xs text-white font-semibold leading-tight">
            {userOutlets.filter((o) => o.commercialStatus === 'Active').length} / {userOutlets.length} Stores Billed
          </div>
          <div className="text-[0.68rem] text-[#A0A0AB] mt-0.5 leading-tight">
            {isPrimaryAccount
              ? (dataset.bdms.length > 0 ? `All ${dataset.bdms.length} Territories • July 2026` : 'All Territories • July 2026')
              : `${currentBdm ? currentBdm.name : 'BDM'} • ${currentBdm ? currentBdm.territory : 'Territory'}`}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[0.68rem] text-[#A0A0AB]">Storage</span>
            <span className="text-[0.7rem] text-[#FFA928] font-semibold font-mono">
              {customCsvCount > 0 ? `${customCsvCount} Custom DB` : 'Factory Baseline'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
