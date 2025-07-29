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
      organizations: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          created_at?: string
        }
      }
      prds: {
        Row: {
          id: string
          project_id: string
          contents: string
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contents?: string
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          contents?: string
          author_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'admin' | 'member'
          receive_emails: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'admin' | 'member'
          receive_emails?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          receive_emails?: boolean
          created_at?: string
        }
      }
      glossaries: {
        Row: {
          id: string
          project_id: string
          name: string
          definition: string
          author_id: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          definition: string
          author_id: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          definition?: string
          author_id?: string
          updated_at?: string
          created_at?: string
        }
      }
      policies: {
        Row: {
          id: string
          project_id: string
          title: string
          body: string
          category: string
          author_id: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          body: string
          category: string
          author_id: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          body?: string
          category?: string
          author_id?: string
          updated_at?: string
          created_at?: string
        }
      }
      policy_links: {
        Row: {
          id: string
          policy_id: string
          url: string
          type: 'context' | 'figma' | 'github'
          created_at: string
        }
        Insert: {
          id?: string
          policy_id: string
          url: string
          type: 'context' | 'figma' | 'github'
          created_at?: string
        }
        Update: {
          id?: string
          policy_id?: string
          url?: string
          type?: 'context' | 'figma' | 'github'
          created_at?: string
        }
      }
      glossary_links: {
        Row: {
          id: string
          glossary_id: string
          url: string
          type: 'github'
          created_at: string
        }
        Insert: {
          id?: string
          glossary_id: string
          url: string
          type?: 'github'
          created_at?: string
        }
        Update: {
          id?: string
          glossary_id?: string
          url?: string
          type?: 'github'
          created_at?: string
        }
      }
      policy_terms: {
        Row: {
          id: string
          policy_id: string
          glossary_id: string
          created_at: string
        }
        Insert: {
          id?: string
          policy_id: string
          glossary_id: string
          created_at?: string
        }
        Update: {
          id?: string
          policy_id?: string
          glossary_id?: string
          created_at?: string
        }
      }
      glossary_relations: {
        Row: {
          id: string
          glossary_id: string
          related_id: string
          created_at: string
        }
        Insert: {
          id?: string
          glossary_id: string
          related_id: string
          created_at?: string
        }
        Update: {
          id?: string
          glossary_id?: string
          related_id?: string
          created_at?: string
        }
      }
      email_events: {
        Row: {
          id: string
          target_user_id: string
          event_type: string
          resource_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          target_user_id: string
          event_type: string
          resource_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          target_user_id?: string
          event_type?: string
          resource_id?: string
          sent_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'] 