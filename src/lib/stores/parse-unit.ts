export function parseUnit(raw: string): { unitValue: number | null; unitType: 'g' | 'ml' | 'count'; unit: string } {
  const s = raw.trim().toUpperCase()
  if (!s) return { unitValue: null, unitType: 'count', unit: raw.trim() }

  const kgMatch = s.match(/(\d+(?:\.\d+)?)\s*(KG|K\.?\s*G|KILOGRAM)/)
  if (kgMatch) return { unitValue: parseFloat(kgMatch[1]) * 1000, unitType: 'g', unit: raw.trim() }

  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*(GR?|GRAM)\b/)
  if (gMatch) return { unitValue: parseFloat(gMatch[1]), unitType: 'g', unit: raw.trim() }

  const mlMatch = s.match(/(\d+(?:\.\d+)?)\s*ML\b/)
  if (mlMatch) return { unitValue: parseFloat(mlMatch[1]), unitType: 'ml', unit: raw.trim() }

  const lMatch = s.match(/(\d+(?:\.\d+)?)\s*(L|LTR|LITRE|LITER)\b/)
  if (lMatch) return { unitValue: parseFloat(lMatch[1]) * 1000, unitType: 'ml', unit: raw.trim() }

  const numMatch = s.match(/(\d+(?:\.\d+)?)/)
  if (numMatch) return { unitValue: parseFloat(numMatch[1]), unitType: 'count', unit: raw.trim() }

  return { unitValue: null, unitType: 'count', unit: raw.trim() }
}

export function calcPricePerUnit(price: number, unitValue: number | null): number {
  return unitValue && unitValue > 0 ? price / unitValue : price
}
