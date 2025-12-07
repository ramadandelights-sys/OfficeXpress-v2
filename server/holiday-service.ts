import { 
  bangladeshHolidays, 
  getHolidaysForYear, 
  getHolidaysForDateRange,
  isHoliday,
  expandHolidayDates,
  type Holiday 
} from './data/bangladesh-holidays';

export interface HolidayWithStatus extends Holiday {
  isAlreadyBlackout: boolean;
  expandedDates: string[];
}

export interface HolidaySuggestion {
  holiday: Holiday;
  expandedDates: string[];
  overlappingBlackouts: string[];
  fullyAdded: boolean;
  partiallyAdded: boolean;
}

export class HolidayService {
  getUpcomingHolidays(months: number = 12): Holiday[] {
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    return getHolidaysForDateRange(now, endDate);
  }

  getHolidaysForYear(year: number): Holiday[] {
    return getHolidaysForYear(year);
  }

  isHoliday(date: Date): Holiday | null {
    return isHoliday(date);
  }

  getAllHolidays(): Holiday[] {
    return bangladeshHolidays;
  }

  async getHolidaySuggestions(
    existingBlackoutDates: { startDate: Date; endDate: Date; name: string }[]
  ): Promise<HolidaySuggestion[]> {
    const upcomingHolidays = this.getUpcomingHolidays(12);
    const suggestions: HolidaySuggestion[] = [];

    for (const holiday of upcomingHolidays) {
      const expandedDates = expandHolidayDates(holiday);
      const overlappingBlackouts: string[] = [];

      for (const dateStr of expandedDates) {
        const holidayDate = new Date(dateStr);
        for (const blackout of existingBlackoutDates) {
          const blackoutStart = new Date(blackout.startDate);
          const blackoutEnd = new Date(blackout.endDate);
          blackoutStart.setHours(0, 0, 0, 0);
          blackoutEnd.setHours(23, 59, 59, 999);
          
          if (holidayDate >= blackoutStart && holidayDate <= blackoutEnd) {
            if (!overlappingBlackouts.includes(dateStr)) {
              overlappingBlackouts.push(dateStr);
            }
          }
        }
      }

      const fullyAdded = expandedDates.length > 0 && 
        expandedDates.every(d => overlappingBlackouts.includes(d));
      const partiallyAdded = overlappingBlackouts.length > 0 && !fullyAdded;

      suggestions.push({
        holiday,
        expandedDates,
        overlappingBlackouts,
        fullyAdded,
        partiallyAdded,
      });
    }

    return suggestions;
  }

  prepareBlackoutDatesForHoliday(holiday: Holiday): {
    name: string;
    startDate: Date;
    endDate: Date;
  }[] {
    const expandedDates = expandHolidayDates(holiday);
    
    if (expandedDates.length === 0) return [];

    const startDate = new Date(expandedDates[0]);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(expandedDates[expandedDates.length - 1]);
    endDate.setHours(23, 59, 59, 999);

    return [{
      name: `${holiday.name} (${holiday.nameBn})`,
      startDate,
      endDate,
    }];
  }

  prepareBulkBlackoutDates(holidays: Holiday[]): {
    name: string;
    startDate: Date;
    endDate: Date;
  }[] {
    const allDates: { name: string; startDate: Date; endDate: Date }[] = [];
    
    for (const holiday of holidays) {
      const prepared = this.prepareBlackoutDatesForHoliday(holiday);
      allDates.push(...prepared);
    }
    
    return allDates;
  }
}

export const holidayService = new HolidayService();
