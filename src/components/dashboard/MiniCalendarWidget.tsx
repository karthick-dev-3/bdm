import React, { useState } from 'react';
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

export const MiniCalendarWidget: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(23);
  const [currentMonth, setCurrentMonth] = useState<string>('September 2026');

  // Days of week
  const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // Calendar dates matching reference grid
  const calendarDays = [
    { day: 31, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true },
    { day: 4, isCurrentMonth: true },
    { day: 5, isCurrentMonth: true },
    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true, badge: 'purple' }, // e.g. Audit review
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true },
    { day: 12, isCurrentMonth: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true, badge: 'teal' }, // e.g. Stock dispatch
    { day: 17, isCurrentMonth: true, badge: 'teal' },
    { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true, isSelected: true }, // Today / selected
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
    { day: 3, isCurrentMonth: false },
    { day: 4, isCurrentMonth: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Calendar</h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium cursor-pointer hover:text-slate-800">
          <span>{currentMonth}</span>
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {daysOfWeek.map((dow) => (
          <div key={dow} className="text-[0.7rem] font-bold text-slate-400 py-1">
            {dow}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((item, idx) => {
          const isSelected = selectedDay === item.day && item.isCurrentMonth;
          return (
            <button
              key={idx}
              type="button"
              className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                !item.isCurrentMonth
                  ? 'text-slate-300 pointer-events-none'
                  : isSelected
                  ? 'bg-[#E68A00] text-white font-bold shadow-xs'
                  : item.badge === 'purple'
                  ? 'bg-purple-100 text-purple-700 font-bold'
                  : item.badge === 'teal'
                  ? 'bg-teal-100 text-teal-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => item.isCurrentMonth && setSelectedDay(item.day)}
            >
              <span>{item.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
