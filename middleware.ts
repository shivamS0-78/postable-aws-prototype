import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

const protectedRoutes = ['/dashboard', '/scheduler', '/analytics', '/settings', '/metadata-studio', '/video', '/upload']
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if path requires protection
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

    // Default to unprotected if we don't care about it
    if (!isProtectedRoute && !isAuthRoute) {
        return NextResponse.next()
    }

    const sessionCookie = request.cookies.get('postable_session')?.value
    const decodedSession = await verifyToken(sessionCookie)
    const isAuthenticated = !!decodedSession

    // Redirect unauthenticated users away from protected pages
    if (isProtectedRoute && !isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect authenticated users away from the login page
    if (isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
