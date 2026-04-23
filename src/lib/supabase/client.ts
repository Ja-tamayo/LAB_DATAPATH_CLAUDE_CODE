import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // This happens when the build was made without the Supabase env vars
    // (e.g. a CI build that couldn't read encrypted Vercel secrets).
    throw new Error(
      `Missing Supabase configuration — NEXT_PUBLIC_SUPABASE_URL is ${url === undefined ? 'undefined' : '"' + url + '"'}`
    )
  }
  return createBrowserClient(url, key)
}
