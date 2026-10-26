import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './lib/i18n';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;

  // Arabic first — most customers here are on Arabic phones. English only if they ask for it.
  const wantsEnglish = req.headers.get('accept-language')?.toLowerCase().startsWith('en');
  const url = req.nextUrl.clone();
  url.pathname = `/${wantsEnglish ? 'en' : 'ar'}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};
