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
      profiles: {
        Row: {
          id: string
          email: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      slabs: {
        Row: {
          id: string
          name: string
          type: 'marble' | 'granite' | 'quartzite'
          description: string
          image_url: string
          thumbnail_url: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'marble' | 'granite' | 'quartzite'
          description?: string
          image_url: string
          thumbnail_url?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'marble' | 'granite' | 'quartzite'
          description?: string
          image_url?: string
          thumbnail_url?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          slab_id: string | null
          name: string
          reference_image_url: string
          result_image_url: string | null
          prompt_used: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slab_id?: string | null
          name: string
          reference_image_url: string
          result_image_url?: string | null
          prompt_used?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slab_id?: string | null
          name?: string
          reference_image_url?: string
          result_image_url?: string | null
          prompt_used?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Slab = Database['public']['Tables']['slabs']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
