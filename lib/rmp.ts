import 'server-only'

const RMP_GRAPHQL = 'https://www.ratemyprofessors.com/graphql'
// base64("School-617") — MSU Starkville
const MSU_SCHOOL_ID = 'U2Nob29sLTYxNw=='

export interface RMPProfessor {
  rmpId: string
  firstName: string
  lastName: string
  rating: number | null       // avgRating
  difficulty: number | null   // avgDifficulty
  numRatings: number
  wouldTakeAgain: number | null  // percentage 0-100
}

const SEARCH_QUERY = `
  query NewSearchTeachersQuery($text: String!, $schoolID: ID!) {
    newSearch {
      teachers(query: { text: $text, schoolID: $schoolID }, first: 8) {
        edges {
          node {
            id
            legacyId
            firstName
            lastName
            avgRating
            avgDifficulty
            numRatings
            wouldTakeAgainPercent
            school {
              id
            }
          }
        }
      }
    }
  }
`

async function rmpFetch(query: string, variables: Record<string, unknown>) {
  const res = await fetch(RMP_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic dGVzdDp0ZXN0',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://www.ratemyprofessors.com',
      'Referer': 'https://www.ratemyprofessors.com/',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`RMP GraphQL HTTP ${res.status}`)
  }

  return res.json()
}

// RMP can return the school ID as the base64 global ID or raw "602"
function isMSU(schoolId: string | undefined): boolean {
  if (!schoolId) return false
  return schoolId === MSU_SCHOOL_ID || schoolId === '602'
}

async function queryRMP(text: string): Promise<Array<{ node: Record<string, unknown> }>> {
  let result
  try {
    result = await rmpFetch(SEARCH_QUERY, { text, schoolID: MSU_SCHOOL_ID })
  } catch (err) {
    console.error('[rmp] fetch error:', err)
    return []
  }
  const edges = result?.data?.newSearch?.teachers?.edges
  if (!Array.isArray(edges)) return []
  // Only keep professors confirmed at MSU
  return edges.filter((e: { node?: { school?: { id?: string } } }) =>
    isMSU(e?.node?.school?.id)
  )
}

/**
 * Search for a professor by name at MSU.
 * name should be "First Last" format.
 * Returns the best match, or null if no MSU professor found with a matching name.
 */
export async function searchProfessor(name: string): Promise<RMPProfessor | null> {
  const nameLower = name.toLowerCase().trim()
  const parts = nameLower.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const lastName = parts[parts.length - 1]

  // First try: full name search
  let msuEdges = await queryRMP(name)

  // Fallback: search by last name only (handles nickname/middle-name mismatches)
  if (msuEdges.length === 0 && parts.length > 1) {
    msuEdges = await queryRMP(lastName)
  }

  if (msuEdges.length === 0) return null

  // Score each result — require last name to match at minimum
  type Scored = { e: { node: Record<string, unknown> }; hits: number }
  const scored: Scored[] = msuEdges
    .map((e) => {
      const full = `${e.node.firstName ?? ''} ${e.node.lastName ?? ''}`.toLowerCase()
      const hits = parts.filter(t => full.includes(t)).length
      return { e, hits }
    })
    .filter(({ e }) => {
      // Last name must appear in the RMP professor's full name
      const full = `${e.node.firstName ?? ''} ${e.node.lastName ?? ''}`.toLowerCase()
      return full.includes(lastName)
    })

  if (scored.length === 0) return null

  scored.sort((a, b) => b.hits - a.hits)
  const node = scored[0].e?.node
  if (!node) return null

  return {
    rmpId: String(node.legacyId),
    firstName: String(node.firstName ?? ''),
    lastName: String(node.lastName ?? ''),
    rating: (node.avgRating as number) ?? null,
    difficulty: (node.avgDifficulty as number) ?? null,
    numRatings: (node.numRatings as number) ?? 0,
    wouldTakeAgain: node.wouldTakeAgainPercent != null
      ? Math.round(node.wouldTakeAgainPercent as number)
      : null,
  }
}
