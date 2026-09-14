import { db } from '../db';

const STOP_WORDS = new Set([
  'the', 'and', 'of', 'facility', 'depot', 'hub', 'terminal', 'warehouse',
  'distribution', 'logistics', 'site', 'central', 'commercial', 'rapid',
  'transit', 'freight', 'cold'
]);

function getRegionCode(name: string, address: string): string {
  const value = `${name} ${address}`.toLowerCase();
  if (value.includes('delhi')) return 'DL';
  if (value.includes('noida')) return 'NO';
  if (value.includes('gurugram') || value.includes('gurgaon')) return 'GR';
  return value.replace(/[^a-z]/g, '').slice(0, 2).toUpperCase() || 'XX';
}

function getPlaceCode(name: string): string {
  const words = name.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] || 'SITE').slice(0, 3).toUpperCase();
}

export function generateAreaCode(name: string, address: string): string {
  const postalCode = address.match(/\b\d{6}\b/)?.[0] || '000000';
  const base = `${getRegionCode(name, address)}-${getPlaceCode(name)}-${postalCode}`;
  const existing = db.prepare(`SELECT area_code FROM destinations WHERE area_code LIKE ?`).all(`${base}-%`) as { area_code: string }[];
  const nextSequence = existing.reduce((max, row) => {
    const sequence = Number(row.area_code.slice(base.length + 1));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0) + 1;

  return `${base}-${String(nextSequence).padStart(2, '0')}`;
}
