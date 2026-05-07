import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject')
  const number = searchParams.get('number')
  const professor = searchParams.get('professor')
  const dept = searchParams.get('dept')

  let headline = 'CoursesIQ'
  let subline = 'Mississippi State University'

  if (subject && number) {
    headline = `${subject.toUpperCase()} ${number}`
    subline = 'Grade Distribution & Section Data — MSU'
  } else if (professor) {
    headline = professor
    subline = 'Professor Ratings & Grade Data — MSU'
  } else if (dept) {
    headline = `${dept.toUpperCase()} Department`
    subline = 'Course Catalog & Grade Data — MSU'
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #5D1725 0%, #3a0f17 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            📊
          </div>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
            CoursesIQ
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: headline.length > 20 ? '56px' : '72px',
            fontWeight: 900,
            letterSpacing: '-2px',
            lineHeight: 1.05,
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          {headline}
        </div>

        {/* Subline */}
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '28px', fontWeight: 500 }}>
          {subline}
        </div>

        {/* Bottom watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            right: '80px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
          coursesiq.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
    }
  )
}
