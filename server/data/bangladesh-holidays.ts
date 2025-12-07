export interface Holiday {
  name: string;
  nameBn: string;
  date: string;
  type: 'national' | 'religious' | 'cultural';
  durationDays: number;
  isVariable: boolean;
}

export const bangladeshHolidays: Holiday[] = [
  // ============ 2024 HOLIDAYS ============
  // Fixed National Holidays 2024
  {
    name: "International Mother Language Day (Shaheed Day)",
    nameBn: "আন্তর্জাতিক মাতৃভাষা দিবস (শহীদ দিবস)",
    date: "2024-02-21",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Birth of Sheikh Mujibur Rahman",
    nameBn: "জাতির পিতা বঙ্গবন্ধু শেখ মুজিবুর রহমানের জন্মদিন",
    date: "2024-03-17",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Independence Day",
    nameBn: "স্বাধীনতা দিবস",
    date: "2024-03-26",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Bengali New Year (Pohela Boishakh)",
    nameBn: "পহেলা বৈশাখ",
    date: "2024-04-14",
    type: "cultural",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "May Day (International Workers' Day)",
    nameBn: "মে দিবস",
    date: "2024-05-01",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "National Mourning Day",
    nameBn: "জাতীয় শোক দিবস",
    date: "2024-08-15",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Victory Day",
    nameBn: "বিজয় দিবস",
    date: "2024-12-16",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Christmas Day",
    nameBn: "বড়দিন",
    date: "2024-12-25",
    type: "religious",
    durationDays: 1,
    isVariable: false
  },
  // Variable Religious Holidays 2024
  {
    name: "Shab-e-Meraj",
    nameBn: "শবে মেরাজ",
    date: "2024-02-07",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Shab-e-Barat",
    nameBn: "শবে বরাত",
    date: "2024-02-25",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid ul-Fitr",
    nameBn: "ঈদ-উল-ফিতর",
    date: "2024-04-10",
    type: "religious",
    durationDays: 3,
    isVariable: true
  },
  {
    name: "Buddha Purnima",
    nameBn: "বুদ্ধ পূর্ণিমা",
    date: "2024-05-23",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid ul-Adha",
    nameBn: "ঈদ-উল-আজহা",
    date: "2024-06-17",
    type: "religious",
    durationDays: 3,
    isVariable: true
  },
  {
    name: "Ashura",
    nameBn: "আশুরা",
    date: "2024-07-17",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Janmashtami",
    nameBn: "জন্মাষ্টমী",
    date: "2024-08-26",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid-e-Milad-un-Nabi",
    nameBn: "ঈদে মিলাদুন্নবী",
    date: "2024-09-16",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Durga Puja (Bijoya Dashami)",
    nameBn: "দুর্গাপূজা (বিজয়া দশমী)",
    date: "2024-10-12",
    type: "religious",
    durationDays: 4,
    isVariable: true
  },
  {
    name: "Shab-e-Qadr",
    nameBn: "শবে কদর",
    date: "2024-04-05",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },

  // ============ 2025 HOLIDAYS ============
  // Fixed National Holidays 2025
  {
    name: "International Mother Language Day (Shaheed Day)",
    nameBn: "আন্তর্জাতিক মাতৃভাষা দিবস (শহীদ দিবস)",
    date: "2025-02-21",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Birth of Sheikh Mujibur Rahman",
    nameBn: "জাতির পিতা বঙ্গবন্ধু শেখ মুজিবুর রহমানের জন্মদিন",
    date: "2025-03-17",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Independence Day",
    nameBn: "স্বাধীনতা দিবস",
    date: "2025-03-26",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Bengali New Year (Pohela Boishakh)",
    nameBn: "পহেলা বৈশাখ",
    date: "2025-04-14",
    type: "cultural",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "May Day (International Workers' Day)",
    nameBn: "মে দিবস",
    date: "2025-05-01",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "National Mourning Day",
    nameBn: "জাতীয় শোক দিবস",
    date: "2025-08-15",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Victory Day",
    nameBn: "বিজয় দিবস",
    date: "2025-12-16",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Christmas Day",
    nameBn: "বড়দিন",
    date: "2025-12-25",
    type: "religious",
    durationDays: 1,
    isVariable: false
  },
  // Variable Religious Holidays 2025
  {
    name: "Shab-e-Meraj",
    nameBn: "শবে মেরাজ",
    date: "2025-01-27",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Shab-e-Barat",
    nameBn: "শবে বরাত",
    date: "2025-02-14",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Shab-e-Qadr",
    nameBn: "শবে কদর",
    date: "2025-03-26",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid ul-Fitr",
    nameBn: "ঈদ-উল-ফিতর",
    date: "2025-03-30",
    type: "religious",
    durationDays: 3,
    isVariable: true
  },
  {
    name: "Buddha Purnima",
    nameBn: "বুদ্ধ পূর্ণিমা",
    date: "2025-05-12",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid ul-Adha",
    nameBn: "ঈদ-উল-আজহা",
    date: "2025-06-06",
    type: "religious",
    durationDays: 3,
    isVariable: true
  },
  {
    name: "Ashura",
    nameBn: "আশুরা",
    date: "2025-07-05",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Janmashtami",
    nameBn: "জন্মাষ্টমী",
    date: "2025-08-15",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid-e-Milad-un-Nabi",
    nameBn: "ঈদে মিলাদুন্নবী",
    date: "2025-09-05",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Durga Puja (Bijoya Dashami)",
    nameBn: "দুর্গাপূজা (বিজয়া দশমী)",
    date: "2025-10-02",
    type: "religious",
    durationDays: 4,
    isVariable: true
  },

  // ============ 2026 HOLIDAYS ============
  // Fixed National Holidays 2026
  {
    name: "International Mother Language Day (Shaheed Day)",
    nameBn: "আন্তর্জাতিক মাতৃভাষা দিবস (শহীদ দিবস)",
    date: "2026-02-21",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Birth of Sheikh Mujibur Rahman",
    nameBn: "জাতির পিতা বঙ্গবন্ধু শেখ মুজিবুর রহমানের জন্মদিন",
    date: "2026-03-17",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Independence Day",
    nameBn: "স্বাধীনতা দিবস",
    date: "2026-03-26",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Bengali New Year (Pohela Boishakh)",
    nameBn: "পহেলা বৈশাখ",
    date: "2026-04-14",
    type: "cultural",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "May Day (International Workers' Day)",
    nameBn: "মে দিবস",
    date: "2026-05-01",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "National Mourning Day",
    nameBn: "জাতীয় শোক দিবস",
    date: "2026-08-15",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Victory Day",
    nameBn: "বিজয় দিবস",
    date: "2026-12-16",
    type: "national",
    durationDays: 1,
    isVariable: false
  },
  {
    name: "Christmas Day",
    nameBn: "বড়দিন",
    date: "2026-12-25",
    type: "religious",
    durationDays: 1,
    isVariable: false
  },
  // Variable Religious Holidays 2026
  {
    name: "Shab-e-Meraj",
    nameBn: "শবে মেরাজ",
    date: "2026-01-16",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Shab-e-Barat",
    nameBn: "শবে বরাত",
    date: "2026-02-03",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Shab-e-Qadr",
    nameBn: "শবে কদর",
    date: "2026-03-15",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid ul-Fitr",
    nameBn: "ঈদ-উল-ফিতর",
    date: "2026-03-20",
    type: "religious",
    durationDays: 3,
    isVariable: true
  },
  {
    name: "Buddha Purnima",
    nameBn: "বুদ্ধ পূর্ণিমা",
    date: "2026-05-31",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid ul-Adha",
    nameBn: "ঈদ-উল-আজহা",
    date: "2026-05-27",
    type: "religious",
    durationDays: 3,
    isVariable: true
  },
  {
    name: "Ashura",
    nameBn: "আশুরা",
    date: "2026-06-25",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Janmashtami",
    nameBn: "জন্মাষ্টমী",
    date: "2026-09-04",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Eid-e-Milad-un-Nabi",
    nameBn: "ঈদে মিলাদুন্নবী",
    date: "2026-08-25",
    type: "religious",
    durationDays: 1,
    isVariable: true
  },
  {
    name: "Durga Puja (Bijoya Dashami)",
    nameBn: "দুর্গাপূজা (বিজয়া দশমী)",
    date: "2026-10-21",
    type: "religious",
    durationDays: 4,
    isVariable: true
  },
];

export function getHolidaysForYear(year: number): Holiday[] {
  return bangladeshHolidays.filter(h => h.date.startsWith(`${year}-`));
}

export function getHolidaysForDateRange(startDate: Date, endDate: Date): Holiday[] {
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return bangladeshHolidays.filter(h => {
    return h.date >= startStr && h.date <= endStr;
  });
}

export function isHoliday(date: Date): Holiday | null {
  const dateStr = date.toISOString().split('T')[0];
  
  for (const holiday of bangladeshHolidays) {
    const holidayDate = new Date(holiday.date);
    for (let i = 0; i < holiday.durationDays; i++) {
      const checkDate = new Date(holidayDate);
      checkDate.setDate(checkDate.getDate() + i);
      const checkStr = checkDate.toISOString().split('T')[0];
      if (checkStr === dateStr) {
        return holiday;
      }
    }
  }
  
  return null;
}

export function expandHolidayDates(holiday: Holiday): string[] {
  const dates: string[] = [];
  const startDate = new Date(holiday.date);
  
  for (let i = 0; i < holiday.durationDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}
