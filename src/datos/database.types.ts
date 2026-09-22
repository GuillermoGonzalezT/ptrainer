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
      cliente_metricas: {
        Row: {
          cliente_id: string
          cliente_puede_cargar: boolean
          created_at: string
          id: string
          metrica_id: string
        }
        Insert: {
          cliente_id: string
          cliente_puede_cargar?: boolean
          created_at?: string
          id?: string
          metrica_id: string
        }
        Update: {
          cliente_id?: string
          cliente_puede_cargar?: boolean
          created_at?: string
          id?: string
          metrica_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_metricas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_metricas_metrica_id_fkey"
            columns: ["metrica_id"]
            isOneToOne: false
            referencedRelation: "metricas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          entrenador_id: string
          estado: string
          fecha_nacimiento: string | null
          foto_path: string | null
          id: string
          lesiones: string | null
          modalidad: string
          nivel: string | null
          nombre: string
          objetivos: string | null
          telefono: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          entrenador_id: string
          estado?: string
          fecha_nacimiento?: string | null
          foto_path?: string | null
          id?: string
          lesiones?: string | null
          modalidad?: string
          nivel?: string | null
          nombre: string
          objetivos?: string | null
          telefono?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          entrenador_id?: string
          estado?: string
          fecha_nacimiento?: string | null
          foto_path?: string | null
          id?: string
          lesiones?: string | null
          modalidad?: string
          nivel?: string | null
          nombre?: string
          objetivos?: string | null
          telefono?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicio_videos: {
        Row: {
          created_at: string
          duracion_s: number | null
          ejercicio_id: string
          id: string
          orden: number
          principal: boolean
          storage_path: string
        }
        Insert: {
          created_at?: string
          duracion_s?: number | null
          ejercicio_id: string
          id?: string
          orden?: number
          principal?: boolean
          storage_path: string
        }
        Update: {
          created_at?: string
          duracion_s?: number | null
          ejercicio_id?: string
          id?: string
          orden?: number
          principal?: boolean
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejercicio_videos_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicios: {
        Row: {
          archivado: boolean
          consejos: string | null
          created_at: string
          descripcion: string | null
          entrenador_id: string | null
          equipamiento: string | null
          grupo_muscular: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          archivado?: boolean
          consejos?: string | null
          created_at?: string
          descripcion?: string | null
          entrenador_id?: string | null
          equipamiento?: string | null
          grupo_muscular?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          archivado?: boolean
          consejos?: string | null
          created_at?: string
          descripcion?: string | null
          entrenador_id?: string | null
          equipamiento?: string | null
          grupo_muscular?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejercicios_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
        ]
      }
      entrenadores: {
        Row: {
          created_at: string
          dias_sin_entrenar: number
          id: string
        }
        Insert: {
          created_at?: string
          dias_sin_entrenar?: number
          id: string
        }
        Update: {
          created_at?: string
          dias_sin_entrenar?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrenadores_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          expira_en: string
          usada_en: string | null
          usada_por: string | null
        }
        Insert: {
          cliente_id: string
          codigo?: string
          created_at?: string
          expira_en?: string
          usada_en?: string | null
          usada_por?: string | null
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          expira_en?: string
          usada_en?: string | null
          usada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_usada_por_fkey"
            columns: ["usada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mediciones: {
        Row: {
          cliente_metrica_id: string
          created_at: string
          fecha: string
          id: string
          intentos: number[]
          nota: string | null
          registrada_por: string | null
          valor: number
        }
        Insert: {
          cliente_metrica_id: string
          created_at?: string
          fecha?: string
          id?: string
          intentos: number[]
          nota?: string | null
          registrada_por?: string | null
          valor: number
        }
        Update: {
          cliente_metrica_id?: string
          created_at?: string
          fecha?: string
          id?: string
          intentos?: number[]
          nota?: string | null
          registrada_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "mediciones_cliente_metrica_id_fkey"
            columns: ["cliente_metrica_id"]
            isOneToOne: false
            referencedRelation: "cliente_metricas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediciones_registrada_por_fkey"
            columns: ["registrada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas: {
        Row: {
          archivada: boolean
          created_at: string
          entrenador_id: string | null
          id: string
          mejor: string
          nombre: string
          protocolo: string | null
          unidad: string
          updated_at: string
          video_path: string | null
        }
        Insert: {
          archivada?: boolean
          created_at?: string
          entrenador_id?: string | null
          id?: string
          mejor?: string
          nombre: string
          protocolo?: string | null
          unidad: string
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          archivada?: boolean
          created_at?: string
          entrenador_id?: string | null
          id?: string
          mejor?: string
          nombre?: string
          protocolo?: string | null
          unidad?: string
          updated_at?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_cliente: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          texto: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          texto: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id: string
          nombre?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      rutina_ejercicios: {
        Row: {
          carga_kg: number | null
          carga_pct_1rm: number | null
          descanso_s: number | null
          ejercicio_id: string
          id: string
          notas: string | null
          orden: number
          pedir_rpe: boolean
          reps_max: number | null
          reps_min: number | null
          rir: number | null
          rpe: number | null
          rutina_id: string
          segundos: number | null
          series: number
          tempo: string | null
        }
        Insert: {
          carga_kg?: number | null
          carga_pct_1rm?: number | null
          descanso_s?: number | null
          ejercicio_id: string
          id?: string
          notas?: string | null
          orden: number
          pedir_rpe?: boolean
          reps_max?: number | null
          reps_min?: number | null
          rir?: number | null
          rpe?: number | null
          rutina_id: string
          segundos?: number | null
          series: number
          tempo?: string | null
        }
        Update: {
          carga_kg?: number | null
          carga_pct_1rm?: number | null
          descanso_s?: number | null
          ejercicio_id?: string
          id?: string
          notas?: string | null
          orden?: number
          pedir_rpe?: boolean
          reps_max?: number | null
          reps_min?: number | null
          rir?: number | null
          rpe?: number | null
          rutina_id?: string
          segundos?: number | null
          series?: number
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutina_ejercicios_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutina_ejercicios_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      rutinas: {
        Row: {
          archivada: boolean
          cliente_id: string | null
          created_at: string
          descripcion: string | null
          dias_semana: number[]
          entrenador_id: string
          id: string
          nombre: string
          plantilla_id: string | null
          updated_at: string
        }
        Insert: {
          archivada?: boolean
          cliente_id?: string | null
          created_at?: string
          descripcion?: string | null
          dias_semana?: number[]
          entrenador_id: string
          id?: string
          nombre: string
          plantilla_id?: string | null
          updated_at?: string
        }
        Update: {
          archivada?: boolean
          cliente_id?: string | null
          created_at?: string
          descripcion?: string | null
          dias_semana?: number[]
          entrenador_id?: string
          id?: string
          nombre?: string
          plantilla_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rutinas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutinas_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutinas_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_comentarios: {
        Row: {
          created_at: string
          sesion_id: string
          texto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          sesion_id: string
          texto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          sesion_id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesion_comentarios_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: true
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_series: {
        Row: {
          completada: boolean
          created_at: string
          ejercicio_id: string
          id: string
          numero: number
          orden_ejercicio: number
          peso_kg: number | null
          reps: number | null
          rpe: number | null
          rutina_ejercicio_id: string | null
          segundos: number | null
          sesion_id: string
        }
        Insert: {
          completada?: boolean
          created_at?: string
          ejercicio_id: string
          id?: string
          numero: number
          orden_ejercicio: number
          peso_kg?: number | null
          reps?: number | null
          rpe?: number | null
          rutina_ejercicio_id?: string | null
          segundos?: number | null
          sesion_id: string
        }
        Update: {
          completada?: boolean
          created_at?: string
          ejercicio_id?: string
          id?: string
          numero?: number
          orden_ejercicio?: number
          peso_kg?: number | null
          reps?: number | null
          rpe?: number | null
          rutina_ejercicio_id?: string | null
          segundos?: number | null
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesion_series_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_series_rutina_ejercicio_id_fkey"
            columns: ["rutina_ejercicio_id"]
            isOneToOne: false
            referencedRelation: "rutina_ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_series_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          cliente_id: string
          comentario: string | null
          created_at: string
          esfuerzo: number | null
          finalizada_en: string | null
          id: string
          iniciada_en: string
          registrada_por: string | null
          rutina_id: string | null
          rutina_nombre: string
        }
        Insert: {
          cliente_id: string
          comentario?: string | null
          created_at?: string
          esfuerzo?: number | null
          finalizada_en?: string | null
          id?: string
          iniciada_en?: string
          registrada_por?: string | null
          rutina_id?: string | null
          rutina_nombre: string
        }
        Update: {
          cliente_id?: string
          comentario?: string | null
          created_at?: string
          esfuerzo?: number | null
          finalizada_en?: string | null
          id?: string
          iniciada_en?: string
          registrada_por?: string | null
          rutina_id?: string | null
          rutina_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_registrada_por_fkey"
            columns: ["registrada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_invitacion: { Args: { p_codigo: string }; Returns: string }
      asignar_plantilla: {
        Args: { p_cliente_ids: string[]; p_rutina_id: string }
        Returns: string[]
      }
      ejercicios_realizados: {
        Args: { p_cliente_id: string }
        Returns: {
          carga_max: number
          ejercicio_id: string
          nombre: string
          sesiones: number
          ultima: string
        }[]
      }
      guardar_ejercicios_rutina: {
        Args: { p_ejercicios: Json; p_rutina_id: string }
        Returns: undefined
      }
      progreso_ejercicio: {
        Args: { p_cliente_id: string; p_ejercicio_id: string }
        Returns: {
          carga_max: number
          fecha: string
          reps_max: number
          reps_total: number
          segundos_max: number
          series: number
          sesion_id: string
          volumen: number
        }[]
      }
      registrar_sesion: { Args: { p_sesion: Json }; Returns: string }
      ultima_vez: {
        Args: { p_cliente_id: string; p_ejercicio_ids: string[] }
        Returns: {
          ejercicio_id: string
          fecha: string
          numero: number
          peso_kg: number
          reps: number
          rpe: number
          segundos: number
        }[]
      }
      ultimo_entrenamiento: {
        Args: never
        Returns: {
          cliente_id: string
          ultima: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
