import React, { useState, useEffect } from 'react';
import { loadAndEnrichDatasetAsync, subscribeDatasetChange, Dataset } from './services/dataLoader';
import { getSavedVisits } from './services/auditStore';
import { ChecklistSubmission, EnrichedOutlet } from './types/data';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardHomeView } from './components/dashboard/DashboardHomeView';
import { FieldBeatView } from './components/fieldApp/FieldBeatView';
import { OutletsDirectoryView } from './components/dashboard/OutletsDirectoryView';
import { OverviewKPIs } from './components/dashboard/OverviewKPIs';
import { RevenueTrendChart } from './components/dashboard/RevenueTrendChart';
import { BDMPerformanceTable } from './components/dashboard/BDMPerformanceTable';
import { TrustForensicsLab } from './components/dashboard/TrustForensicsLab';
import { DataHygieneCenter } from './components/dashboard/DataHygieneCenter';
import { RevivalPlaybook } from './components/dashboard/RevivalPlaybook';
import { DataCsvManagerView } from './components/dashboard/DataCsvManagerView';
import { CounterDetailDrawer } from './components/fieldApp/CounterDetailDrawer';
import { DataWarningBanner } from './components/common/DataWarningBanner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginView } from './components/auth/LoginView';

const AuthenticatedDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [activeTab, setActiveTab] = useState<NavTabId>('beat');
  const [selectedBdmCode, setSelectedBdmCode] = useState<string>('ALL'); // Default to Primary Account (Central Manager)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [savedVisitsCount, setSavedVisitsCount] = useState<number>(0);
  const [selectedOutletForDrawer, setSelectedOutletForDrawer] = useState<EnrichedOutlet | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial async load with SQLite & local enrichment
    loadAndEnrichDatasetAsync().then((data) => {
      setDataset(data);
    });

    // Subscribe to live dataset mutations (CSV uploads, edits, deletes)
    const unsubscribe = subscribeDatasetChange((newDataset) => {
      setDataset(newDataset);
    });

    setSavedVisitsCount(getSavedVisits().length);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0C0A09] text-slate-100">
        <div className="flex flex-col items-center gap-3 bg-[#1C1917] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase font-mono">
            Verifying Session Security Gate...
          </span>
        </div>
      </div>
    );
  }

  // 1. STRICT ACCESS CONTROL GATE: Unauthenticated users MUST NOT see any dashboard component
  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  if (!dataset) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5F9] text-slate-800">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-lg border border-slate-200">
          <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Initializing Mobile Commercial Engine...</span>
        </div>
      </div>
    );
  }

  const currentBdm = dataset.bdms.find((b) => b.code === selectedBdmCode);

  const territoryOutlets =
    selectedBdmCode === 'ALL'
      ? dataset.outlets
      : dataset.outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const handleSelectBdmCode = (code: string) => {
    setSelectedBdmCode(code);
  };

  const handleVisitLogged = (submission: ChecklistSubmission) => {
    setSavedVisitsCount((prev) => prev + 1);
    if (dataset) {
      const isOrderPlaced = !!(submission.orderBooked && submission.orderBooked.units > 0);
      const bookedUnits = submission.orderBooked?.units || 0;
      const bookedVal = submission.orderBooked?.estimatedValue || 0;

      const updatedOutlets = dataset.outlets.map((o) => {
        if (o.code !== submission.outletCode) return o;
        return {
          ...o,
          totalVisitsLogged: o.totalVisitsLogged + 1,
          lastVisitDate: submission.visitDate,
          lastVisitRemarks: submission.fieldNotes || 'Structured 5-point visit completed',
          commercialStatus: isOrderPlaced ? ('Active' as const) : o.commercialStatus,
          billing: {
            ...o.billing,
            jul26Units: isOrderPlaced ? o.billing.jul26Units + bookedUnits : o.billing.jul26Units,
            jul26Val: isOrderPlaced ? o.billing.jul26Val + bookedVal : o.billing.jul26Val,
            totalUnits6M: o.billing.totalUnits6M + bookedUnits,
            totalValue6M: o.billing.totalValue6M + bookedVal,
            activeInJuly: isOrderPlaced || o.billing.activeInJuly
          }
        };
      });

      const activeCount = updatedOutlets.filter((o) => o.commercialStatus === 'Active').length;

      setDataset({
        ...dataset,
        outlets: updatedOutlets,
        summary: {
          ...dataset.summary,
          activeJulyOutlets: activeCount
        }
      });
    }
  };

  const handleOpenOutletInDrawer = (target: string | EnrichedOutlet) => {
    if (!dataset) return;
    const code = typeof target === 'string' ? target : target.code;
    const found = dataset.outlets.find((o) => o.code === code);
    if (found) {
      setSelectedOutletForDrawer(found);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F9] text-slate-800 antialiased flex flex-col">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        dataset={dataset}
        selectedBdmCode={selectedBdmCode}
        onSelectBdmCode={handleSelectBdmCode}
        savedVisitsCount={savedVisitsCount}
      />

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 2. Main Work Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Clean Header with User Profile Pill and Upload Action */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          selectedBdmName={currentBdm ? currentBdm.name : 'Primary Account (Central)'}
          savedVisitsCount={savedVisitsCount}
          onNavigateToData={() => setActiveTab('data')}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Missing/Empty Data Warning Banner */}
          {dataset.missingFiles && dataset.missingFiles.length > 0 && (
            <DataWarningBanner
              missingFiles={dataset.missingFiles}
              onNavigateToData={() => setActiveTab('data')}
            />
          )}

          {/* Main 2-Column Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardHomeView
              dataset={dataset}
              selectedBdmCode={selectedBdmCode}
              onSelectOutlet={handleOpenOutletInDrawer}
              onNavigateToBeat={() => setActiveTab('beat')}
            />
          )}

          {/* Today's Beat */}
          {activeTab === 'beat' && (
            <FieldBeatView
              outlets={dataset.outlets}
              selectedBdmCode={selectedBdmCode}
              onVisitLogged={handleVisitLogged}
            />
          )}

          {/* Outlets Directory */}
          {activeTab === 'directory' && (
            <OutletsDirectoryView
              outlets={dataset.outlets}
              selectedBdmCode={selectedBdmCode}
              onVisitLogged={handleVisitLogged}
            />
          )}

          {/* Revival Playbook */}
          {activeTab === 'revival' && (
            <RevivalPlaybook
              dataset={dataset}
              selectedBdmCode={selectedBdmCode}
              onSelectOutletForField={handleOpenOutletInDrawer}
            />
          )}

          {/* Performance & Reach */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <OverviewKPIs
                summary={dataset.summary}
                dataset={dataset}
                selectedBdmCode={selectedBdmCode}
              />
              <RevenueTrendChart
                monthlyData={dataset.monthlyRevenue}
                outlets={territoryOutlets}
                selectedBdmCode={selectedBdmCode}
                selectedBdmName={currentBdm ? currentBdm.name : undefined}
              />
              <BDMPerformanceTable dataset={dataset} selectedBdmCode={selectedBdmCode} />
            </div>
          )}

          {/* Visit Forensics */}
          {activeTab === 'forensics' && (
            <TrustForensicsLab
              dataset={dataset}
              selectedBdmCode={selectedBdmCode}
            />
          )}

          {/* Data Hygiene */}
          {activeTab === 'hygiene' && (
            <DataHygieneCenter
              dataset={dataset}
            />
          )}

          {/* Data & CSV Management */}
          {activeTab === 'data' && (
            <DataCsvManagerView
              dataset={dataset}
              onDatasetUpdated={() => loadAndEnrichDatasetAsync(true).then(setDataset)}
            />
          )}
        </main>
      </div>

      {/* Global Slide-Over Drawer */}
      {selectedOutletForDrawer && (
        <CounterDetailDrawer
          outlet={selectedOutletForDrawer}
          onClose={() => setSelectedOutletForDrawer(null)}
          onVisitLogged={handleVisitLogged}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedDashboard />
    </AuthProvider>
  );
};

