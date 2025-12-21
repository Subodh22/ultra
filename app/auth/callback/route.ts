import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('OAuth callback - Session:', session ? 'exists' : 'null')
    console.log('OAuth callback - Provider:', session?.user?.app_metadata?.provider)
    console.log('OAuth callback - Has provider_token:', !!session?.provider_token)
    console.log('OAuth callback - Has provider_refresh_token:', !!session?.provider_refresh_token)
    
    if (!error && session) {
      // Get the current session to access provider tokens
      const { data: sessionData } = await supabase.auth.getSession()
      const currentSession = sessionData.session
      
      console.log('Current session provider_token:', !!currentSession?.provider_token)
      console.log('Current session provider_refresh_token:', !!currentSession?.provider_refresh_token)
      
      // Check if this was a Google OAuth with calendar scope
      const isGoogleCalendarConnect = next?.includes('settings')
      
      if (isGoogleCalendarConnect && currentSession) {
        const providerToken = currentSession.provider_token
        const providerRefreshToken = currentSession.provider_refresh_token
        
        console.log('Saving tokens - access_token:', providerToken ? 'exists' : 'missing')
        console.log('Saving tokens - refresh_token:', providerRefreshToken ? 'exists' : 'missing')
        
        if (providerToken && providerRefreshToken) {
          // Calculate token expiry (Google tokens typically last 1 hour)
          const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
          
          const { error: settingsError } = await supabase
            .from('user_settings')
            .upsert({
              user_id: session.user.id,
              google_access_token: providerToken,
              google_refresh_token: providerRefreshToken,
              google_token_expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })
          
          if (settingsError) {
            console.error('❌ Error saving Google tokens:', settingsError)
          } else {
            console.log('✅ Successfully saved Google Calendar tokens')
          }
        } else {
          console.error('❌ Missing provider tokens from Google OAuth')
        }
      }
    } else if (error) {
      console.error('❌ OAuth error:', error)
    }
  }

  // Redirect back to settings if it was a Google Calendar connection
  if (next) {
    return NextResponse.redirect(`${origin}${next}${next.includes('?') ? '&' : '?'}connected=true`)
  }
  
  // Default redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}

