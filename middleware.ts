import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  // Must be created with { request } so refreshed cookies propagate to page handlers
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Apply to request first so downstream handlers see updated cookies
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          // Recreate response with updated request so page handlers inherit the cookies
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /planner and /dashboard
  const pathname = req.nextUrl.pathname
  if ((pathname.startsWith('/planner') || pathname.startsWith('/dashboard')) && !user) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ['/planner/:path*', '/dashboard/:path*'],
}
