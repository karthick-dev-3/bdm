import React from 'react';
import { ArrowRight } from 'lucide-react';
import storeMapBadge from '../../assets/store-map-badge.png';

interface HeroWelcomeCardProps {
  selectedBdmName: string;
  selectedTerritory: string;
  todayBeatCount: number;
  atRiskCount: number;
  onViewBeat: () => void;
}

export const HeroWelcomeCard: React.FC<HeroWelcomeCardProps> = ({
  selectedBdmName,
  selectedTerritory,
  todayBeatCount,
  atRiskCount,
  onViewBeat
}) => {
  const isPrimary = selectedBdmName.includes('Central') || selectedBdmName.includes('Primary') || selectedTerritory.includes('Tamil Nadu');
  const greetingName = isPrimary ? 'Manager' : (selectedBdmName.split(' ')[0] || 'Manager');

  return (
    <div className="bg-gradient-to-r from-[#EC960A] via-[#EE9B12] to-[#F4AD1C] rounded-2xl p-6 sm:p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
      <div className="max-w-full md:max-w-[62%] flex flex-col gap-3 z-10">
        <h2 className="text-2xl font-bold tracking-tight leading-tight">Hello {greetingName}!</h2>
        <p className="text-sm text-white/95 leading-relaxed">
          {isPrimary ? (
            <>
              Across Tamil Nadu, you have <strong>{todayBeatCount} retail outlets</strong> active in the statewide network.
              {atRiskCount > 0
                ? ` Also ${atRiskCount} counters across all territories have revenue at risk and require urgent stock depth review.`
                : ' All assigned accounts across all territories are currently in healthy credit standing.'}
            </>
          ) : (
            <>
              Today you have <strong>{todayBeatCount} retail outlets</strong> scheduled on your beat in {selectedTerritory}.
              {atRiskCount > 0
                ? ` Also ${atRiskCount} counters have revenue at risk and require urgent stock depth review.`
                : ' All assigned accounts are currently in healthy credit standing.'}
            </>
          )}
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4 text-white hover:opacity-85 transition-opacity cursor-pointer w-fit"
          onClick={onViewBeat}
        >
          <span>{isPrimary ? 'View statewide beat operations' : 'View beat checklist'}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="w-40 h-32 flex items-center justify-center self-end md:self-auto z-10 shrink-0">
        <img
          src={storeMapBadge}
          alt="Tamil Nadu Retail & Beat Network"
          className="max-h-[135px] w-auto object-contain bg-transparent border-none"
        />
      </div>
    </div>
  );
};

