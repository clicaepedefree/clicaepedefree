export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addon_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          max_selections: number | null
          min_selections: number | null
          name: string
          restaurant_id: string
          selection_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name: string
          restaurant_id: string
          selection_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          restaurant_id?: string
          selection_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_options: {
        Row: {
          addon_group_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number | null
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean | null
          neighborhood: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean | null
          neighborhood: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean | null
          neighborhood?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_value: number
          restaurant_id: string
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_value?: number
          restaurant_id: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_value?: number
          restaurant_id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          open_time: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          open_time?: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          open_time?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_access_logs: {
        Row: {
          access_type: string
          accessed_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          order_id: string
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          order_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          order_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_access_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_access_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "secure_orders_view"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          id: string
          items: Json
          order_number: number | null
          payment_method: string | null
          payment_status: string
          pix_copia_cola: string | null
          pix_e2e_id: string | null
          pix_expires_at: string | null
          pix_paid_at: string | null
          pix_qrcode: string | null
          pix_txid: string | null
          restaurant_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          id?: string
          items: Json
          order_number?: number | null
          payment_method?: string | null
          payment_status?: string
          pix_copia_cola?: string | null
          pix_e2e_id?: string | null
          pix_expires_at?: string | null
          pix_paid_at?: string | null
          pix_qrcode?: string | null
          pix_txid?: string | null
          restaurant_id: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          id?: string
          items?: Json
          order_number?: number | null
          payment_method?: string | null
          payment_status?: string
          pix_copia_cola?: string | null
          pix_e2e_id?: string | null
          pix_expires_at?: string | null
          pix_paid_at?: string | null
          pix_qrcode?: string | null
          pix_txid?: string | null
          restaurant_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          method_type: string
          pix_key: string | null
          pix_online_enabled: boolean
          restaurant_id: string
          restaurant_pix_key: string | null
          restaurant_pix_key_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          method_type: string
          pix_key?: string | null
          pix_online_enabled?: boolean
          restaurant_id: string
          restaurant_pix_key?: string | null
          restaurant_pix_key_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          method_type?: string
          pix_key?: string | null
          pix_online_enabled?: boolean
          restaurant_id?: string
          restaurant_pix_key?: string | null
          restaurant_pix_key_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_transactions: {
        Row: {
          amount: number
          created_at: string
          destination_pix_key: string | null
          destination_pix_key_type: string | null
          efi_e2e_id: string | null
          efi_endtoend: string | null
          efi_txid: string | null
          error_message: string | null
          id: string
          order_id: string
          raw_payload: Json | null
          restaurant_id: string
          status: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination_pix_key?: string | null
          destination_pix_key_type?: string | null
          efi_e2e_id?: string | null
          efi_endtoend?: string | null
          efi_txid?: string | null
          error_message?: string | null
          id?: string
          order_id: string
          raw_payload?: Json | null
          restaurant_id: string
          status?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination_pix_key?: string | null
          destination_pix_key_type?: string | null
          efi_e2e_id?: string | null
          efi_endtoend?: string | null
          efi_txid?: string | null
          error_message?: string | null
          id?: string
          order_id?: string
          raw_payload?: Json | null
          restaurant_id?: string
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "secure_orders_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_groups: {
        Row: {
          addon_group_id: string
          id: string
          product_id: string
        }
        Insert: {
          addon_group_id: string
          id?: string
          product_id: string
        }
        Update: {
          addon_group_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          banner_url: string | null
          created_at: string
          delivery_enabled: boolean | null
          id: string
          is_blocked: boolean | null
          is_open: boolean | null
          logo_url: string | null
          monthly_revenue: number | null
          name: string
          pickup_enabled: boolean | null
          responsible_name: string | null
          revenue_block_exempt_until: string | null
          slug: string
          tax_id: string | null
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          id?: string
          is_blocked?: boolean | null
          is_open?: boolean | null
          logo_url?: string | null
          monthly_revenue?: number | null
          name: string
          pickup_enabled?: boolean | null
          responsible_name?: string | null
          revenue_block_exempt_until?: string | null
          slug: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          id?: string
          is_blocked?: boolean | null
          is_open?: boolean | null
          logo_url?: string | null
          monthly_revenue?: number | null
          name?: string
          pickup_enabled?: boolean | null
          responsible_name?: string | null
          revenue_block_exempt_until?: string | null
          slug?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      super_admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      secure_orders_view: {
        Row: {
          address: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          id: string | null
          items: Json | null
          order_number: number | null
          payment_method: string | null
          restaurant_id: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string | null
          items?: Json | null
          order_number?: number | null
          payment_method?: string | null
          restaurant_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string | null
          items?: Json | null
          order_number?: number | null
          payment_method?: string | null
          restaurant_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_mark_restaurant_paid: {
        Args: { for_time?: string; restaurant_id: string }
        Returns: string
      }
      admin_set_restaurant_block: {
        Args: {
          exempt_until?: string
          restaurant_id: string
          set_blocked: boolean
        }
        Returns: boolean
      }
      anonymize_old_orders: { Args: never; Returns: number }
      check_restaurant_open_status: {
        Args: { check_time?: string; restaurant_id_param: string }
        Returns: boolean
      }
      check_revenue_limits: {
        Args: { target_time?: string; tz?: string }
        Returns: number
      }
      create_public_order: {
        Args: {
          _address: string
          _customer_name: string
          _customer_phone: string
          _delivery_fee: number
          _items: Json
          _payment_method: string
          _payment_status: string
          _restaurant_id: string
          _status: string
          _subtotal: number
          _total: number
        }
        Returns: string
      }
      generate_unique_slug: {
        Args: { restaurant_name: string }
        Returns: string
      }
      get_monthly_revenue: {
        Args: { restaurant_id_param: string; target_time?: string; tz?: string }
        Returns: number
      }
      get_public_restaurant_by_slug: {
        Args: { slug_input: string }
        Returns: {
          banner_url: string
          delivery_enabled: boolean
          id: string
          is_open: boolean
          logo_url: string
          name: string
          pickup_enabled: boolean
          slug: string
          whatsapp: string
        }[]
      }
      get_restaurants_with_emails: {
        Args: never
        Returns: {
          banner_url: string
          created_at: string
          id: string
          is_blocked: boolean
          is_open: boolean
          logo_url: string
          monthly_orders: number
          monthly_revenue: number
          name: string
          responsible_name: string
          revenue_block_exempt_until: string
          slug: string
          tax_id: string
          total_revenue: number
          user_email: string
          whatsapp: string
        }[]
      }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      mask_customer_data: {
        Args: {
          customer_name: string
          customer_phone: string
          is_owner?: boolean
        }
        Returns: Json
      }
      restaurant_accepts_orders: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
      update_monthly_revenues: {
        Args: { target_time?: string; tz?: string }
        Returns: number
      }
      update_restaurants_open_status: { Args: never; Returns: number }
      user_owns_order_restaurant: {
        Args: { order_id: string }
        Returns: boolean
      }
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
