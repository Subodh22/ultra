import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark user as having connected Google Calendar
    // In a real implementation, this would store actual OAuth tokens
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        google_access_token: 'connected_via_oauth',
        google_refresh_token: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving connection:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, connected: true })
  } catch (error: any) {
    console.error('Error in google-connect:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


