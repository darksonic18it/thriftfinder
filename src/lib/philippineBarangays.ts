import barangayRows from '../data/philippineBarangays.json'

/**
 * Approximate barangay reference points sourced from the local coordinate
 * review dataset. Tuple shape: [barangay, city/municipality, province, lat, lon].
 * These are candidates, not independently verified survey coordinates.
 */
export type BarangayCoordinate = {
  barangay: string
  city: string
  province: string
  latitude: number
  longitude: number
  label: string
}

type BarangayTuple = [string, string, string, number, number]
const rows = barangayRows as BarangayTuple[]

const normalise = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const indexedRows = rows.map((row) => ({
  row,
  barangayText: normalise(row[0]),
  cityText: normalise(row[1]),
  labelText: normalise([row[0], row[1], row[2]].filter(Boolean).join(', ')),
  searchText: normalise(`${row[0]} ${row[1]} ${row[2]}`),
}))

export function searchBarangayCoordinates(query: string, limit = 12): BarangayCoordinate[] {
  const needle = normalise(query)
  if (needle.length < 2) return []
  const tokens = needle.split(' ').filter(Boolean)

  const matches: { row: BarangayTuple; score: number }[] = []
  for (const entry of indexedRows) {
    if (!tokens.every((token) => entry.searchText.includes(token))) continue
    const score = entry.labelText.startsWith(needle)
      ? 0
      : entry.barangayText.startsWith(needle)
        ? 1
        : entry.cityText.startsWith(needle)
          ? 2
          : 3
    matches.push({ row: entry.row, score })
    // Broad queries such as a province name can match thousands of rows.
    // Keep the search work bounded while still returning ranked suggestions.
    if (matches.length >= 1500) break
  }

  matches.sort((a, b) => a.score - b.score || a.row[2].localeCompare(b.row[2]) || a.row[1].localeCompare(b.row[1]) || a.row[0].localeCompare(b.row[0]))
  return matches.slice(0, limit).map(({ row }) => ({
    barangay: row[0],
    city: row[1],
    province: row[2],
    latitude: row[3],
    longitude: row[4],
    label: [row[0], row[1], row[2]].filter(Boolean).join(', '),
  }))
}

/**
 * Resolve a seller-entered barangay + city/municipality only when the dataset
 * contains an exact, unambiguous match. Never pick the first fuzzy search hit.
 */
export function findExactBarangayCoordinates(
  barangay: string,
  city: string
): BarangayCoordinate[] {
  const barangayNeedle = normalise(barangay)
  const cityNeedle = normaliseCity(city)
  if (!barangayNeedle || !cityNeedle) return []

  const matches = rows.filter((row) =>
    normalise(row[0]) === barangayNeedle && normaliseCity(row[1]) === cityNeedle
  )
  const unique = new Map<string, BarangayCoordinate>()
  for (const row of matches) {
    const key = `${row[3].toFixed(6)},${row[4].toFixed(6)}`
    if (!unique.has(key)) {
      unique.set(key, {
        barangay: row[0],
        city: row[1],
        province: row[2],
        latitude: row[3],
        longitude: row[4],
        label: [row[0], row[1], row[2]].filter(Boolean).join(', '),
      })
    }
  }
  return [...unique.values()]
}

function normaliseCity(value: string): string {
  return normalise(value)
    .replace(/^(city|municipality|municipal town) of /, '')
    .replace(/\b(city|municipality)$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}