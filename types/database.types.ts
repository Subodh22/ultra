export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_path?: string
          file_type?: string
          file_size?: number
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          note_id: string
          user_id: string
          card_type: 'fact' | 'concept' | 'procedure'
          question: string
          answer: string
          difficulty: number
          ease_factor: number
          interval: number
          repetitions: number
          next_review: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          card_type: 'fact' | 'concept' | 'procedure'
          question: string
          answer: string
          difficulty?: number
          ease_factor?: number
          interval?: number
          repetitions?: number
          next_review?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          card_type?: 'fact' | 'concept' | 'procedure'
          question?: string
          answer?: string
          difficulty?: number
          ease_factor?: number
          interval?: number
          repetitions?: number
          next_review?: string
          created_at?: string
          updated_at?: string
        }
      }
      drill_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: 'fact' | 'concept' | 'procedure' | 'mixed'
          cards_count: number
          completed_count: number
          calendar_event_id: string | null
          scheduled_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_type: 'fact' | 'concept' | 'procedure' | 'mixed'
          cards_count: number
          completed_count?: number
          calendar_event_id?: string | null
          scheduled_at: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: 'fact' | 'concept' | 'procedure' | 'mixed'
          cards_count?: number
          completed_count?: number
          calendar_event_id?: string | null
          scheduled_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      card_reviews: {
        Row: {
          id: string
          card_id: string
          user_id: string
          session_id: string | null
          quality: number
          time_taken: number
          reviewed_at: string
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          session_id?: string | null
          quality: number
          time_taken: number
          reviewed_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          user_id?: string
          session_id?: string | null
          quality?: number
          time_taken?: number
          reviewed_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          google_refresh_token: string | null
          google_access_token: string | null
          calendar_id: string | null
          drill_duration: number
          daily_drill_count: number
          preferred_time_slots: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          google_refresh_token?: string | null
          google_access_token?: string | null
          calendar_id?: string | null
          drill_duration?: number
          daily_drill_count?: number
          preferred_time_slots?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          google_refresh_token?: string | null
          google_access_token?: string | null
          calendar_id?: string | null
          drill_duration?: number
          daily_drill_count?: number
          preferred_time_slots?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

