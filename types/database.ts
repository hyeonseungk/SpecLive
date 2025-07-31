export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      actors: {
        Row: {
          author_id: string | null
          created_at: string | null
          id: string
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          event_type: string
          id: string
          resource_id: string
          sent_at: string | null
          target_user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          resource_id: string
          sent_at?: string | null
          target_user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          resource_id?: string
          sent_at?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      feature_policies: {
        Row: {
          created_at: string | null
          feature_id: string | null
          id: string
          policy_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature_id?: string | null
          id?: string
          policy_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature_id?: string | null
          id?: string
          policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_policies_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_policies_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          author_id: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          usecase_id: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          usecase_id?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          usecase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "features_usecase_id_fkey"
            columns: ["usecase_id"]
            isOneToOne: false
            referencedRelation: "usecases"
            referencedColumns: ["id"]
          },
        ]
      }
      glossaries: {
        Row: {
          author_id: string | null
          created_at: string | null
          definition: string
          examples: string | null
          id: string
          name: string
          project_id: string | null
          sequence: number
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          definition: string
          examples?: string | null
          id?: string
          name: string
          project_id?: string | null
          sequence?: number
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          definition?: string
          examples?: string | null
          id?: string
          name?: string
          project_id?: string | null
          sequence?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glossaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_links: {
        Row: {
          created_at: string | null
          glossary_id: string | null
          id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          glossary_id?: string | null
          id?: string
          url: string
        }
        Update: {
          created_at?: string | null
          glossary_id?: string | null
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_links_glossary_id_fkey"
            columns: ["glossary_id"]
            isOneToOne: false
            referencedRelation: "glossaries"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_relations: {
        Row: {
          created_at: string | null
          glossary_id: string | null
          id: string
          related_id: string | null
        }
        Insert: {
          created_at?: string | null
          glossary_id?: string | null
          id?: string
          related_id?: string | null
        }
        Update: {
          created_at?: string | null
          glossary_id?: string | null
          id?: string
          related_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glossary_relations_glossary_id_fkey"
            columns: ["glossary_id"]
            isOneToOne: false
            referencedRelation: "glossaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glossary_relations_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "glossaries"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          receive_emails: boolean | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          receive_emails?: boolean | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          receive_emails?: boolean | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          author_id: string | null
          body: string
          category: string
          created_at: string | null
          id: string
          project_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          category: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          category?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_links: {
        Row: {
          created_at: string | null
          id: string
          policy_id: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          policy_id?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          policy_id?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_links_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_terms: {
        Row: {
          created_at: string | null
          glossary_id: string | null
          id: string
          policy_id: string | null
        }
        Insert: {
          created_at?: string | null
          glossary_id?: string | null
          id?: string
          policy_id?: string | null
        }
        Update: {
          created_at?: string | null
          glossary_id?: string | null
          id?: string
          policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_terms_glossary_id_fkey"
            columns: ["glossary_id"]
            isOneToOne: false
            referencedRelation: "glossaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_terms_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      prds: {
        Row: {
          author_id: string | null
          contents: string
          created_at: string | null
          id: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          contents?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          contents?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usecases: {
        Row: {
          actor_id: string | null
          author_id: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          actor_id?: string | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          actor_id?: string | null
          author_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usecases_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const