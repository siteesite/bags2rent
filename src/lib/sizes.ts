export const SIZE_MAP: Record<string, string> = {
  's': 'P',
  'm': 'M',
  'l': 'G',
  'xl': 'GG',
  'small': 'P',
  'medium': 'M',
  'large': 'G',
  'extra large': 'GG',
  'pequeno': 'P',
  'medio': 'M',
  'médio': 'M',
  'grande': 'G'
};

export const EXCLUDED_SIZES = new Set([
  '3 dias', '1 dia', '2 dias', '4 dias', '5 dias', '7 dias',
  'default title', 'tamanho-unico', 'tamanho unico', 'único', 'unico',
  'os', 'one size', 'sem tamanho', '',
]);

export function formatSize(size: string): string {
  if (!size) return '';
  const trimmed = size.trim().toLowerCase();
  return SIZE_MAP[trimmed] || size;
}

export function parseProductSizes(sizeField: string | null | undefined): string[] {
  if (!sizeField) return [];
  return sizeField
    .split(';')
    .map(s => s.trim())
    .map(s => formatSize(s))
    .filter(s => s && !EXCLUDED_SIZES.has(s.toLowerCase()));
}
