const MUNICIPALITY_ALIASES = Object.freeze({
  'El Nido (Bacuit)': 'El Nido',
  'El Nido': 'El Nido',
  'Rizal (Marcos)': 'Rizal',
  'Rizal': 'Rizal',
  'Española': 'Sofronio Española',
  'Sofronio Española': 'Sofronio Española',
})

export function normalizeMunicipalityName(value = '') {
  const text = String(value ?? '').trim()
  const aliased = MUNICIPALITY_ALIASES[text] || text

  return aliased
    .replace(/[’‘]/g, "'")
    .replace(/\(.*?\)/g, '')
    .replace(/\b(city|municipality)\b/gi, ' ')
    .replace(/\bpalawan\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function municipalityNamesMatch(left, right) {
  const normalizedLeft = normalizeMunicipalityName(left)
  const normalizedRight = normalizeMunicipalityName(right)
  return Boolean(normalizedLeft && normalizedLeft === normalizedRight)
}

export function findMunicipalityInLocation(location = '', municipalityNames = []) {
  const normalizedLocation = normalizeMunicipalityName(location)
  if (!normalizedLocation) return null

  const candidates = municipalityNames
    .filter(Boolean)
    .slice()
    .sort((a, b) => normalizeMunicipalityName(b).length - normalizeMunicipalityName(a).length)

  return candidates.find((name) => {
    const normalizedName = normalizeMunicipalityName(name)
    return normalizedName && normalizedLocation.includes(normalizedName)
  }) || null
}

export { MUNICIPALITY_ALIASES }
