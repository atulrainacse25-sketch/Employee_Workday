import React, { useState } from 'react';
import { useAttendance } from '../../contexts/useAttendance';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

export const AttendanceCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { state } = useAttendance();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return state.records.find(record => record.date === dateStr);
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return state.holidays.find(holiday => holiday.date === dateStr);
  };

  const isWeekend = (date: Date) => {
    const d = date.getDay();
    return d === 0 || d === 6;
  };

  const getStatusStyles = (date: Date) => {
    const attendance = getAttendanceForDate(date);
    const holiday = getHolidayForDate(date) || (isWeekend(date) ? { name: 'Weekend', type: 'company' } : null);

    if (holiday) {
      const isWknd = holiday.name === 'Weekend';
      return {
        cell: 'bg-purple-50 border-purple-200 text-gray-900',
        badge: isWknd ? 'bg-purple-200 text-purple-800' : 'bg-purple-200 text-purple-800',
        badgeLabel: isWknd ? 'Weekend' : 'Holiday',
      };
    }

    if (!attendance) return { cell: 'bg-white border-gray-200 text-gray-900', badge: '', badgeLabel: '' };

    switch (attendance.status) {
      case 'present':
        return { cell: 'bg-green-50 border-green-200', badge: 'bg-green-200 text-green-800', badgeLabel: 'Present' };
      case 'late':
        return { cell: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-200 text-yellow-800', badgeLabel: 'Late' };
      case 'half-day':
        return { cell: 'bg-blue-50 border-blue-200', badge: 'bg-blue-200 text-blue-800', badgeLabel: 'Half Day' };
      case 'absent':
        return { cell: 'bg-red-50 border-red-200', badge: 'bg-red-200 text-red-800', badgeLabel: 'Absent' };
      default:
        return { cell: 'bg-white border-gray-200', badge: '', badgeLabel: '' };
    }
  };

  const formatTime = (t?: string | null) => {
    if (!t) return '-';
    try {
      const [hh, mm] = String(t).split(':');
      return `${hh}:${mm}`;
    } catch {
      return String(t);
    }
  };

  // status label class no longer used; colors are applied to day container

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          ['bg-green-100 border-green-300','Present'],
          ['bg-yellow-100 border-yellow-300','Late'],
          ['bg-blue-100 border-blue-300','Half Day'],
          ['bg-red-100 border-red-300','Absent'],
          ['bg-purple-100 border-purple-300','Holiday/Weekend'],
        ].map(([cls,label]) => (
          <div key={label as string} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded border ${cls as string}`}></div>
            <span>{label as string}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-white h-24"></div>
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const attendance = getAttendanceForDate(day);
            const holiday = getHolidayForDate(day);
            const isToday = isSameDay(day, new Date());
            const s = getStatusStyles(day);

            return (
              <div
                key={day.toString()}
                className={`relative h-32 p-2 border ${s.cell} ${isToday ? 'ring-2 ring-blue-500' : ''} overflow-hidden flex flex-col`}
              >
                {/* Date + badge */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-800">{format(day, 'd')}</div>
                  {s.badgeLabel && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.badge}`}>{s.badgeLabel}</span>
                  )}
                </div>

                {/* Content */}
                <div className="mt-1 text-[12px] space-y-1 overflow-hidden">
                  {holiday && (
                    <div className="font-medium truncate text-purple-800">{holiday.name}</div>
                  )}
                  {attendance && (
                    <div className="space-y-0.5">
                      <div className="truncate"><span className="font-semibold">In:</span> {formatTime(attendance.checkIn)}</div>
                      <div className="truncate"><span className="font-semibold">Out:</span> {formatTime(attendance.checkOut)}</div>
                    </div>
                  )}
                </div>

                {attendance?.totalHours && (
                  <div className="mt-auto pt-1 text-right text-[11px] font-semibold text-gray-700">{attendance.totalHours}h</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};