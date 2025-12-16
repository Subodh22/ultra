'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Save } from 'lucide-react'
import { PracticeCalendar } from '@/components/practice-calendar'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [settings, setSettings] = useState({
    drill_duration: 30,
    daily_drill_count: 3,
    preferred_time_slots: [
      { hour: 9, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 19, minute: 0 },
    ],
  })
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
    
    // Check URL for OAuth return
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      // Save connection status
      fetch('/api/settings/google-connect', {
        method: 'POST',
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setGoogleConnected(true)
            setMessage('Google Calendar connected successfully!')
            setTimeout(() => setMessage(''), 3000)
            // Clean up URL
            window.history.replaceState({}, '', '/dashboard/settings')
          }
        })
        .catch(err => {
          console.error('Error marking as connected:', err)
        })
    }
  }, [])

  async function loadSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setSettings({
        drill_duration: data.drill_duration,
        daily_drill_count: data.daily_drill_count,
        preferred_time_slots: data.preferred_time_slots || settings.preferred_time_slots,
      })
      // Check if Google is connected (either has refresh token or access token marked as 'connected')
      setGoogleConnected(!!(data.google_refresh_token || data.google_access_token))
      console.log('Google connection status:', !!(data.google_refresh_token || data.google_access_token))
    }
  }

  async function handleSaveSettings() {
    setLoading(true)
    setMessage('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          drill_duration: settings.drill_duration,
          daily_drill_count: settings.daily_drill_count,
          preferred_time_slots: settings.preferred_time_slots,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnectGoogle() {
    try {
      setLoading(true)
      
      // Get the correct origin (production or local)
      const redirectOrigin = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/auth/callback?next=/dashboard/settings`,
          scopes: 'https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
      
      // After OAuth redirect (when user comes back), mark as connected
      // This will be handled by the useEffect checking for 'connected=true' param
    } catch (error: any) {
      setMessage(`Error connecting Google: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your learning preferences and calendar integration
        </p>
      </div>

      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to automatically schedule drill sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                {googleConnected
                  ? 'Connected to Google Calendar'
                  : 'Not connected'}
              </p>
            </div>
            <Badge variant={googleConnected ? 'default' : 'secondary'}>
              {googleConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {!googleConnected && (
            <Button onClick={handleConnectGoogle} className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Connect Google Calendar
            </Button>
          )}

          {googleConnected && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your drill sessions will be automatically added to your Google Calendar
                based on your preferred time slots below.
              </p>
              <Button
                variant="outline"
                onClick={() => {}}
                className="w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Next Week's Sessions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar View */}
      {googleConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Your Calendar</CardTitle>
            <CardDescription>
              Click on any time slot to schedule a practice session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PracticeCalendar />
          </CardContent>
        </Card>
      )}

      {/* Drill Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Drill Settings
          </CardTitle>
          <CardDescription>
            Customize your practice sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Session Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="10"
              max="120"
              value={settings.drill_duration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  drill_duration: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 25-30 minutes per session
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily-count">Daily Drill Sessions</Label>
            <Input
              id="daily-count"
              type="number"
              min="1"
              max="10"
              value={settings.daily_drill_count}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  daily_drill_count: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              How many drill sessions per day
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preferred Time Slots</Label>
            <div className="space-y-2">
              {settings.preferred_time_slots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={`${String(slot.hour).padStart(2, '0')}:${String(
                      slot.minute
                    ).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [hour, minute] = e.target.value.split(':')
                      const newSlots = [...settings.preferred_time_slots]
                      newSlots[index] = {
                        hour: parseInt(hour),
                        minute: parseInt(minute),
                      }
                      setSettings({ ...settings, preferred_time_slots: newSlots })
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Times when you prefer to have drill sessions scheduled
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>

          {message && (
            <p
              className={`text-sm ${
                message.includes('Error') ? 'text-destructive' : 'text-green-600'
              }`}
            >
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

