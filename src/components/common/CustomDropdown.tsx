import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Info } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  theme?: 'dark' | 'light';
  minWidth?: string;
  align?: 'left' | 'right';
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  icon,
  theme = 'light',
  minWidth = '180px',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanVal = (value || '').trim().toLowerCase();
  const selectedOption = options.find((o) => {
    const oVal = (o.value || '').trim().toLowerCase();
    const oLbl = (o.label || '').trim().toLowerCase();
    return (
      o.value === value ||
      oVal === cleanVal ||
      oLbl === cleanVal ||
      (cleanVal.length > 0 && (oVal.includes(cleanVal) || cleanVal.includes(oVal)))
    );
  });

  const displayLabel = selectedOption ? selectedOption.label : (value && value.trim().length > 0 ? value : placeholder);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${isOpen ? 'z-50' : 'z-10'}`}
      style={{ minWidth }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[38px] rounded-full text-xs font-medium flex items-center justify-between cursor-pointer relative transition-all duration-150 ${
          icon ? 'pl-8 pr-7' : 'pl-3.5 pr-7'
        } ${
          isDark
            ? 'bg-white/5 border border-white/15 text-white hover:border-white/30'
            : 'bg-white border border-slate-200 text-slate-900 shadow-xs hover:border-slate-300'
        }`}
      >
        {icon && (
          <span className="absolute left-2.5 flex items-center text-[#FFA928]">
            {icon}
          </span>
        )}

        <span className="truncate text-left pr-1.5">
          {displayLabel}
        </span>

        <ChevronDown
          size={13}
          className={`absolute right-2.5 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          } ${isDark ? 'text-[#A0A0AB]' : 'text-slate-400'}`}
        />
      </button>

      {/* Floating Custom Menu with Solid Background, High Z-Index & No Clipping */}
      {isOpen && (
        <div
          className={`custom-dropdown-menu absolute top-[calc(100%+6px)] ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-full min-w-[270px] sm:min-w-[310px] z-50 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1 border ring-1 ring-black/5 ${
            isDark
              ? 'dark bg-[#1E1B26] border-white/15 shadow-black/60 text-white'
              : 'light bg-white border-slate-200 shadow-slate-900/20 text-slate-900'
          }`}
        >
          {options.map((option) => {
            const isSelected = selectedOption ? option.value === selectedOption.value : option.value === value;
            const isDisabled = !!option.disabled;

            if (isDisabled) {
              return (
                <div
                  key={option.value}
                  title={option.disabledTooltip || 'Option disabled'}
                  className={`w-full p-2.5 rounded-xl text-xs flex flex-col gap-1 cursor-not-allowed select-none transition-colors border ${
                    isDark
                      ? 'bg-rose-950/30 text-slate-400 border-rose-900/40'
                      : 'bg-rose-50/80 text-slate-600 border-rose-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-500 line-through truncate">
                      {option.label}
                    </span>
                    <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300 shrink-0">
                      Disabled
                    </span>
                  </div>
                  {option.disabledTooltip && (
                    <div className="text-[0.68rem] text-rose-700 leading-snug whitespace-normal break-words flex items-start gap-1 mt-0.5 font-normal">
                      <Info size={11} className="shrink-0 mt-0.5 text-rose-500" />
                      <span>{option.disabledTooltip}</span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer text-left transition-colors ${
                  isSelected
                    ? isDark
                      ? 'bg-[#FFA928]/20 text-[#FFA928] font-semibold'
                      : 'bg-[#FFA928]/15 text-[#E68A00] font-semibold'
                    : isDark
                    ? 'text-slate-200 hover:bg-white/5 font-normal'
                    : 'text-slate-700 hover:bg-slate-100 font-normal'
                }`}
              >
                <div>
                  <div className="leading-snug font-medium">{option.label}</div>
                  {option.sublabel && (
                    <div
                      className={`text-[0.68rem] mt-0.5 ${
                        isDark ? 'text-[#A0A0AB]' : 'text-slate-400'
                      }`}
                    >
                      {option.sublabel}
                    </div>
                  )}
                </div>

                {isSelected && (
                  <Check size={14} className="text-[#FFA928] ml-2 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


