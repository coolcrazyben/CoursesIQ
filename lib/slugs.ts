export function courseSlug(subject: string, courseNumber: string): string {
  return `${subject.toLowerCase()}-${courseNumber.toLowerCase()}`
}

export function parseCourseSlug(slug: string): { subject: string; courseNumber: string } | null {
  const match = slug.match(/^([a-z]+)-(\d+[a-z]*)$/)
  if (!match) return null
  return { subject: match[1].toUpperCase(), courseNumber: match[2] }
}

export function professorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function departmentSlug(subject: string): string {
  return subject.toLowerCase()
}
