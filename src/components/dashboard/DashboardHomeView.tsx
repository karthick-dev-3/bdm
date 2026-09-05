import React from 'react';
import { Dataset } from '../../services/dataLoader';
import { EnrichedOutlet } from '../../types/data';
import { HeroWelcomeCard } from './HeroWelcomeCard';
import { BeatProgressTable } from './BeatProgressTable';
import { TerritoryFormatDistributionCard } from './TerritoryFormatDistributionCard';
import { BDMProfileCard } from './BDMProfileCard';
import { CommercialClassificationGuide } from './CommercialClassificationGuide';

interface DashboardHomeViewProps {
  dataset: Dataset;
  selectedBdmCode: string;
  onSelectOutlet: (outlet: EnrichedOutlet) => void;
  onNavigateToBeat: () => void;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  dataset,
  selectedBdmCode,
  onSelectOutlet,
  onNavigateToBeat
}) => {
  const isPrimary = selectedBdmCode === 'ALL';
  const currentBdm = isPrimary
    ? {
        code: 'ALL',
        name: 'Primary Account (Central)',
        territory: 'Tamil Nadu Network',
        phone: '',
        joinedDate: ''
      }
    : (dataset.bdms.find((b) => b.code === selectedBdmCode) || dataset.bdms[0]);

  // Filter outlets assigned to this BDM
  const territoryOutlets = isPrimary
    ? dataset.outlets
    : dataset.outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const atRiskCount = territoryOutlets.filter((o) => o.priorityTier === 'Revenue At Risk').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_1fr] gap-6 items-start">
      {/* Left Main Column (Hero Card + Guide + Progress Table) */}
      <div className="flex flex-col gap-6 min-w-0">
        <HeroWelcomeCard
          selectedBdmName={currentBdm.name}
          selectedTerritory={currentBdm.territory}
          todayBeatCount={territoryOutlets.length}
          atRiskCount={atRiskCount}
          onViewBeat={onNavigateToBeat}
        />

        <CommercialClassificationGuide />

        <BeatProgressTable
          outlets={territoryOutlets}
          onSelectOutlet={onSelectOutlet}
          onViewAll={onNavigateToBeat}
        />
      </div>

      {/* Right Column (Real CSV Format Performance + BDM Profile Card) */}
      <div className="flex flex-col gap-6 min-w-0">
        <TerritoryFormatDistributionCard
          selectedBdmCode={selectedBdmCode}
          dataset={dataset}
        />

        <BDMProfileCard
          selectedBdmCode={selectedBdmCode}
          dataset={dataset}
        />
      </div>
    </div>
  );
};
