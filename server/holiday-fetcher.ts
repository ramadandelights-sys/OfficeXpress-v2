import * as cron from 'node-cron';
import { IStorage } from './storage';
import type { CarpoolBlackoutDate, InsertCarpoolBlackoutDate } from '@shared/schema';

// Nager.Date API types
interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

// Mock data for Bangladesh holidays (fallback)
const MOCK_BANGLADESH_HOLIDAYS = [
  { month: 2, day: 21, name: "Language Martyrs' Day", localName: "শহীদ দিবস" },
  { month: 3, day: 17, name: "Sheikh Mujibur Rahman's Birthday", localName: "বঙ্গবন্ধু জন্মদিন" },
  { month: 3, day: 26, name: "Independence Day", localName: "স্বাধীনতা দিবস" },
  { month: 4, day: 14, name: "Pohela Boishakh (Bengali New Year)", localName: "পহেলা বৈশাখ" },
  { month: 12, day: 16, name: "Victory Day", localName: "বিজয় দিবস" },
  { month: 12, day: 25, name: "Christmas", localName: "বড়দিন" },
];

// Variable holidays (approximate dates, would need proper calculation)
const VARIABLE_HOLIDAYS = [
  { name: "Eid ul-Fitr", localName: "ঈদুল ফিতর", description: "End of Ramadan" },
  { name: "Eid ul-Adha", localName: "ঈদুল আযহা", description: "Festival of Sacrifice" },
  { name: "Durga Puja", localName: "দুর্গা পূজা", description: "Hindu festival" },
  { name: "Buddha Purnima", localName: "বুদ্ধ পূর্ণিমা", description: "Buddha's birthday" },
];

export class HolidayFetcherService {
  private storage: IStorage;
  private cronJob: cron.ScheduledTask | null = null;
  private enabled: boolean = false;
  private lastFetchCache: Map<string, { data: NagerHoliday[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor(storage: IStorage) {
    this.storage = storage;
    this.enabled = process.env.HOLIDAY_FETCHER_ENABLED !== 'false';
  }

  /**
   * Start the holiday fetcher service
   */
  start() {
    if (!this.enabled) {
      console.log('[HolidayFetcher] Service disabled via environment variable');
      return;
    }

    console.log('[HolidayFetcher] Starting holiday fetcher service...');

    // Fetch holidays on startup
    this.fetchAndStoreHolidays()
      .catch(err => console.error('[HolidayFetcher] Error fetching holidays on startup:', err));

    // Schedule daily fetch at 3 AM
    this.cronJob = cron.schedule('0 3 * * *', () => {
      console.log('[HolidayFetcher] Running scheduled holiday fetch...');
      this.fetchAndStoreHolidays()
        .catch(err => console.error('[HolidayFetcher] Error in scheduled fetch:', err));
    });

    console.log('[HolidayFetcher] Service started, scheduled to run daily at 3 AM');
  }

  /**
   * Stop the holiday fetcher service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[HolidayFetcher] Service stopped');
    }
  }

  /**
   * Fetch holidays from Nager.Date API with caching
   */
  async fetchHolidaysFromAPI(year: number): Promise<NagerHoliday[]> {
    const cacheKey = `holidays-${year}`;
    const cached = this.lastFetchCache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[HolidayFetcher] Using cached data for year ${year}`);
      return cached.data;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `https://date.nager.at/api/v3/publicholidays/${year}/BD`;
        console.log(`[HolidayFetcher] Fetching holidays from ${url} (attempt ${attempt}/${maxRetries})...`);

        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000), // 10 second timeout
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'OfficeXpress-HolidayFetcher/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: NagerHoliday[] = await response.json();
        
        // Cache the successful response
        this.lastFetchCache.set(cacheKey, { data, timestamp: Date.now() });
        
        console.log(`[HolidayFetcher] Successfully fetched ${data.length} holidays for year ${year}`);
        return data;
      } catch (error) {
        lastError = error as Error;
        console.error(`[HolidayFetcher] Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[HolidayFetcher] All API attempts failed, using mock data. Last error:`, lastError);
    return this.getMockHolidaysForYear(year);
  }

  /**
   * Get mock holidays for a specific year (fallback)
   */
  getMockHolidaysForYear(year: number): NagerHoliday[] {
    const holidays: NagerHoliday[] = [];

    // Add fixed holidays
    for (const holiday of MOCK_BANGLADESH_HOLIDAYS) {
      const date = new Date(year, holiday.month - 1, holiday.day);
      holidays.push({
        date: date.toISOString().split('T')[0],
        localName: holiday.localName,
        name: holiday.name,
        countryCode: 'BD',
        fixed: true,
        global: true,
        counties: null,
        launchYear: null,
        types: ['Public']
      });
    }

    // Add approximate dates for variable holidays
    // In production, these would need proper Islamic/lunar calendar calculations
    if (year === 2025) {
      holidays.push(
        {
          date: '2025-03-31',
          localName: 'ঈদুল ফিতর',
          name: 'Eid ul-Fitr',
          countryCode: 'BD',
          fixed: false,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public', 'Religious']
        },
        {
          date: '2025-06-07',
          localName: 'ঈদুল আযহা',
          name: 'Eid ul-Adha',
          countryCode: 'BD',
          fixed: false,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public', 'Religious']
        }
      );
    } else if (year === 2026) {
      holidays.push(
        {
          date: '2026-03-20',
          localName: 'ঈদুল ফিতর',
          name: 'Eid ul-Fitr',
          countryCode: 'BD',
          fixed: false,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public', 'Religious']
        },
        {
          date: '2026-05-27',
          localName: 'ঈদুল আযহা',
          name: 'Eid ul-Adha',
          countryCode: 'BD',
          fixed: false,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public', 'Religious']
        }
      );
    }

    return holidays;
  }

  /**
   * Fetch and store holidays for current and next year
   */
  async fetchAndStoreHolidays(specificYear?: number): Promise<void> {
    const currentYear = new Date().getFullYear();
    const years = specificYear ? [specificYear] : [currentYear, currentYear + 1];

    for (const year of years) {
      try {
        console.log(`[HolidayFetcher] Processing holidays for year ${year}...`);
        
        // Fetch holidays from API or fallback to mock data
        const holidays = await this.fetchHolidaysFromAPI(year);
        
        // Convert and store holidays
        const blackoutDates: InsertCarpoolBlackoutDate[] = [];
        
        for (const holiday of holidays) {
          // Check if this holiday already exists
          const date = new Date(holiday.date);
          const reason = `${holiday.name} (${holiday.localName})`;
          
          const exists = await this.storage.checkHolidayExists(date, reason);
          if (!exists) {
            blackoutDates.push({
              date,
              reason,
              source: 'api',
              isRecurring: holiday.fixed
            });
          }
        }

        if (blackoutDates.length > 0) {
          await this.storage.bulkCreateBlackoutDates(blackoutDates);
          console.log(`[HolidayFetcher] Stored ${blackoutDates.length} new holidays for year ${year}`);
        } else {
          console.log(`[HolidayFetcher] No new holidays to store for year ${year}`);
        }
      } catch (error) {
        console.error(`[HolidayFetcher] Error processing holidays for year ${year}:`, error);
      }
    }
  }

  /**
   * Get upcoming holidays within specified days
   */
  async getUpcomingHolidays(days: number = 30): Promise<CarpoolBlackoutDate[]> {
    return await this.storage.getUpcomingHolidays(days);
  }

  /**
   * Get holiday suggestions (holidays not yet in blackout dates)
   */
  async getHolidaySuggestions(): Promise<Array<{
    date: string;
    name: string;
    localName: string;
    isNational: boolean;
  }>> {
    const currentYear = new Date().getFullYear();
    const suggestions: Array<{
      date: string;
      name: string;
      localName: string;
      isNational: boolean;
    }> = [];

    // Fetch holidays for current and next year
    for (const year of [currentYear, currentYear + 1]) {
      const holidays = await this.fetchHolidaysFromAPI(year);
      
      for (const holiday of holidays) {
        const date = new Date(holiday.date);
        const reason = `${holiday.name} (${holiday.localName})`;
        
        // Check if this holiday is already added
        const exists = await this.storage.checkHolidayExists(date, reason);
        
        if (!exists) {
          suggestions.push({
            date: holiday.date,
            name: holiday.name,
            localName: holiday.localName,
            isNational: holiday.global
          });
        }
      }
    }

    return suggestions.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Manually sync holidays for a specific year
   */
  async syncHolidaysForYear(year: number): Promise<{
    fetched: number;
    stored: number;
    skipped: number;
  }> {
    console.log(`[HolidayFetcher] Manual sync initiated for year ${year}`);
    
    const holidays = await this.fetchHolidaysFromAPI(year);
    const blackoutDates: InsertCarpoolBlackoutDate[] = [];
    let skipped = 0;
    
    for (const holiday of holidays) {
      const date = new Date(holiday.date);
      const reason = `${holiday.name} (${holiday.localName})`;
      
      const exists = await this.storage.checkHolidayExists(date, reason);
      if (!exists) {
        blackoutDates.push({
          date,
          reason,
          source: 'api',
          isRecurring: holiday.fixed
        });
      } else {
        skipped++;
      }
    }

    if (blackoutDates.length > 0) {
      await this.storage.bulkCreateBlackoutDates(blackoutDates);
    }

    return {
      fetched: holidays.length,
      stored: blackoutDates.length,
      skipped
    };
  }
}

// Export a singleton instance
let holidayFetcherInstance: HolidayFetcherService | null = null;

export function getHolidayFetcherService(storage: IStorage): HolidayFetcherService {
  if (!holidayFetcherInstance) {
    holidayFetcherInstance = new HolidayFetcherService(storage);
  }
  return holidayFetcherInstance;
}

export function startHolidayFetcherService(storage: IStorage): void {
  const service = getHolidayFetcherService(storage);
  service.start();
}

export function stopHolidayFetcherService(): void {
  if (holidayFetcherInstance) {
    holidayFetcherInstance.stop();
  }
}