// Phase 1 stub — full implementation in Phase 2
// establishSession: POSTs to MSU Banner SSB /term/search, stores JSESSIONID
// getSeatsByCRN: GETs /searchResults/searchResults, filters by courseReferenceNumber client-side

export async function establishSession(): Promise<string> {
  throw new Error('Not implemented — Phase 2')
}

export async function getSeatsByCRN(
  _crn: string,
  _subject: string,
  _courseNumber: string,
  _termCode: string
): Promise<unknown> {
  throw new Error('Not implemented — Phase 2')
}
