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
      // Check if this was a Google OAuth with calendar scope
      const provider = session.user.app_metadata.provider
      
      if (provider === 'google') {
        // Always create/update user_settings entry, even without tokens
        // This marks them as "attempted" to connect
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: session.user.id,
            google_access_token: session.provider_token || 'connected',
            google_refresh_token: session.provider_refresh_token || null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
        
        if (settingsError) {
          console.error('Error saving Google tokens:', settingsError)
        } else {
          console.log('✅ Successfully saved Google connection status')
        }
      }
    }
  }

  // Redirect back to settings if it was a Google Calendar connection
  if (next) {
    return NextResponse.redirect(`${origin}${next}?connected=true`)
  }
  
  // Default redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}

