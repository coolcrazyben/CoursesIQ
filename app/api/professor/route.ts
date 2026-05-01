import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchProfessor } from '@/lib/rmp'

const CACHE_TTL_DAYS = 7

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function formatNameForRMP(name: string): string {
  // Strip parenthetical nicknames: "Allison Pilgrim (Allie)" → "Allison Pilgrim"
  let cleaned = name.replace(/\s*\(.*?\)/g, '').trim()
  // Convert "Last, First" → "First Last"
  if (cleaned.includes(',')) {
    const [last, ...firstParts] = cleaned.split(',').map(s => s.trim())
    const first = firstParts.join(' ')
    if (first) cleaned = `${first} ${last}`
  }
  return cleaned
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const normalized = normalizeName(name)

  // Check cache
  const { data: cached } = await supabase
    .from('professors')
    .select('*')
    .eq('name_normalized', normalized)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.updated_at).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    if (ageDays < CACHE_TTL_DAYS) {
      // Return cached (may have null rating if professor not on RMP)
      return NextResponse.json({
        rating: cached.rating,
        num_ratings: cached.num_ratings,
        difficulty: cached.difficulty,
        rmp_id: cached.rmp_id,
        would_take_again: cached.would_take_again,
      })
    }
  }

  // Fetch from RMP (convert "Last, First" → "First Last" for better RMP matching)
  const rmp = await searchProfessor(formatNameForRMP(name))

  const record = {
    name_normalized: normalized,
    name_display: name,
    rmp_id: rmp?.rmpId ?? null,
    rating: rmp?.rating ?? null,
    num_ratings: rmp?.numRatings ?? null,
    difficulty: rmp?.difficulty ?? null,
    would_take_again: rmp?.wouldTakeAgain ?? null,
    school_id: '617',
    updated_at: new Date().toISOString(),
  }

  // Upsert into cache (ignore errors — cache is best-effort)
  await supabase
    .from('professors')
    .upsert(record, { onConflict: 'name_normalized' })

  return NextResponse.json({
    rating: record.rating,
    num_ratings: record.num_ratings,
    difficulty: record.difficulty,
    rmp_id: record.rmp_id,
    would_take_again: record.would_take_again,
  })
}
