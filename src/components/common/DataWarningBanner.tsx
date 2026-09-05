import React from 'react';
import { FileSpreadsheet, ShieldAlert, Info } from 'lucide-react';
import { MissingFileInfo } from '../../services/dataLoader';

interface DataWarningBannerProps {
  missingFiles: MissingFileInfo[];
  onNavigateToData?: () => void;
}

export const DataWarningBanner: React.FC<DataWarningBannerProps> = ({
  missingFiles
}) => {
  if (!missingFiles || missingFiles.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-rose-50/80 to-amber-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5 mb-5 flex flex-col gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
          <ShieldAlert size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm sm:text-base text-slate-900">
            Data Notice: {missingFiles.length} Core Dataset File{missingFiles.length > 1 ? 's' : ''} Missing or Empty
          </div>
          <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            The application is operating in safe fallback mode. The following data file{missingFiles.length > 1 ? 's have' : ' has'} no records:
          </div>

          <div className="flex gap-2 flex-wrap mt-2.5">
            {missingFiles.map((f) => (
              <span
                key={f.category}
                className="text-xs px-2.5 py-1 rounded-md bg-rose-100/70 border border-rose-200 text-rose-700 font-semibold inline-flex items-center gap-1"
              >
                <FileSpreadsheet size={12} />
                <span>{f.fileName} ({f.displayName})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Guidance Section */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed flex items-center gap-2">
        <Info size={16} className="text-[#E68A00] shrink-0" />
        <span>
          <strong>Guidance:</strong> To populate or restore data, navigate to the <strong>Data &amp; File Manager</strong> tab in the left sidebar and upload the corresponding CSV file(s) ({missingFiles.map((f) => f.fileName).join(', ')}).
        </span>
      </div>
    </div>
  );
};
