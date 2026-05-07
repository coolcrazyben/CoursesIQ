'use client'

import { useEffect } from 'react'
import { trackPublicPageView } from '@/lib/analytics'

interface Props {
  page_type: 'course' | 'professor' | 'department'
  slug: string
  subject?: string
  course_number?: string
  professor?: string
}

export default function PublicPageTracker(props: Props) {
  useEffect(() => {
    trackPublicPageView(props)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
