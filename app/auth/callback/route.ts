import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      // Check if this was a Google OAuth with calendar scope
      const provider = session.user.app_metadata.provider
      
      if (provider === 'google' && session.provider_token) {
        // Save Google tokens to user_settings
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: session.user.id,
            google_access_token: session.provider_token,
            google_refresh_token: session.provider_refresh_token,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
        
        if (settingsError) {
          console.error('Error saving Google tokens:', settingsError)
        }
      }
    }
  }

  // Redirect back to settings if it was a Google Calendar connection
  const next = requestUrl.searchParams.get('next')
  if (next) {
    return NextResponse.redirect(`${origin}${next}?connected=true`)
  }
  
  // Default redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}

