import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../client/src/locales');
const SOURCE_LOCALE = 'en';
const TARGET_LOCALES = ['bn', 'zh', 'ja'];

const BANGLA_TRANSLITERATIONS: Record<string, string> = {
  'Rental': 'রেন্টাল',
  'Vendor': 'ভেন্ডর',
  'Corporate': 'কর্পোরেট',
  'VIP': 'ভিআইপি',
  'GPS': 'জিপিএস',
  'SMS': 'এসএমএস',
  'VTS': 'ভিটিএস',
};

type LocaleData = Record<string, any>;

function readLocaleFile(locale: string): LocaleData {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeLocaleFile(locale: string, data: LocaleData): void {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getAllKeys(obj: LocaleData, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function getValueByPath(obj: LocaleData, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current[part] === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

function setValueByPath(obj: LocaleData, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}

function applyBanglaTransliterations(englishValue: string): string {
  let result = englishValue;
  
  for (const [english, bangla] of Object.entries(BANGLA_TRANSLITERATIONS)) {
    const regex = new RegExp(english, 'g');
    result = result.replace(regex, bangla);
  }
  
  return result;
}

function syncLocale(sourceData: LocaleData, targetLocale: string): { added: number; preserved: number } {
  const targetData = readLocaleFile(targetLocale);
  const sourceKeys = getAllKeys(sourceData);
  
  let added = 0;
  let preserved = 0;
  
  for (const key of sourceKeys) {
    const existingValue = getValueByPath(targetData, key);
    
    if (existingValue === undefined) {
      const sourceValue = getValueByPath(sourceData, key);
      let placeholderValue: any;
      
      if (targetLocale === 'bn') {
        placeholderValue = applyBanglaTransliterations(sourceValue);
      } else {
        placeholderValue = `[TODO: ${sourceValue}]`;
      }
      
      setValueByPath(targetData, key, placeholderValue);
      added++;
    } else {
      preserved++;
    }
  }
  
  writeLocaleFile(targetLocale, targetData);
  
  return { added, preserved };
}

function main() {
  console.log('🌐 Starting i18n sync...\n');
  
  const sourceData = readLocaleFile(SOURCE_LOCALE);
  const sourceKeysCount = getAllKeys(sourceData).length;
  
  console.log(`📚 Source locale (${SOURCE_LOCALE}): ${sourceKeysCount} keys\n`);
  
  for (const targetLocale of TARGET_LOCALES) {
    const { added, preserved } = syncLocale(sourceData, targetLocale);
    
    console.log(`✓ ${targetLocale}.json:`);
    console.log(`  - Added: ${added} new keys`);
    console.log(`  - Preserved: ${preserved} existing translations\n`);
  }
  
  console.log('✨ Sync complete! Please review and translate [TODO] placeholders.');
}

main();
