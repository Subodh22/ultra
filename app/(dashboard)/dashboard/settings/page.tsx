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
      // Check if Google Calendar is connected
      setGoogleConnected(!!data.google_refresh_token)
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

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Practice sessions are automatically scheduled to your Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                {googleConnected 
                  ? 'Google Calendar is connected' 
                  : 'Connect your Google Calendar to schedule sessions'}
              </p>
            </div>
            {googleConnected ? (
              <Badge variant="default">
                Connected
              </Badge>
            ) : (
              <Button onClick={handleConnectGoogle} disabled={loading}>
                Connect Google Calendar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {googleConnected 
                ? 'Your drill sessions will be automatically added to your calendar based on your preferred time slots below.'
                : 'Connect your Google Calendar to automatically schedule practice sessions.'}
            </p>
          </div>
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

