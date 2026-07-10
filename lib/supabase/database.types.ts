/**
 * Tipos de la base de datos (mantener en sync con supabase/migrations).
 * Se pueden regenerar con: supabase gen types typescript --project-id <ref>
 */

export type UserRole = "alumno" | "profesor" | "supervisor" | "admin";
export type CursoEstado = "borrador" | "publicado" | "archivado";
export type LeccionTipo = "video" | "texto" | "quiz";
export type InscripcionEstado = "activa" | "completada" | "cancelada";
export type PreguntaTipo = "unica" | "multiple";

export interface Institucion {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatar_url: string | null;
  rol: UserRole;
  institucion_id: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Curso {
  id: string;
  slug: string;
  titulo: string;
  descripcion_corta: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  nivel: string | null;
  categoria: string | null;
  duracion_horas: number | null;
  estado: CursoEstado;
  profesor_id: string | null;
  institucion_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  orden: number;
}

export interface Leccion {
  id: string;
  curso_id: string;
  modulo_id: string | null;
  titulo: string;
  tipo: LeccionTipo;
  contenido: string | null;
  video_url: string | null;
  duracion_min: number | null;
  orden: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  curso_id: string;
  leccion_id: string | null;
  titulo: string;
  descripcion: string | null;
  aprobacion_min: number;
  created_at: string;
}

export interface QuizPregunta {
  id: string;
  quiz_id: string;
  enunciado: string;
  tipo: PreguntaTipo;
  orden: number;
}

export interface QuizOpcion {
  id: string;
  pregunta_id: string;
  texto: string;
  es_correcta: boolean;
  orden: number;
}

export interface Inscripcion {
  id: string;
  alumno_id: string;
  curso_id: string;
  estado: InscripcionEstado;
  fecha_inscripcion: string;
}

export interface ProgresoLeccion {
  id: string;
  alumno_id: string;
  leccion_id: string;
  curso_id: string;
  completada: boolean;
  segundos_dedicados: number | null;
  ultima_vista: string | null;
}

export interface QuizIntento {
  id: string;
  alumno_id: string;
  quiz_id: string;
  puntaje: number;
  aprobado: boolean;
  respuestas: unknown;
  created_at: string;
}

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      instituciones: Table<Institucion>;
      profiles: Table<Profile>;
      cursos: Table<Curso>;
      modulos: Table<Modulo>;
      lecciones: Table<Leccion>;
      quizzes: Table<Quiz>;
      quiz_preguntas: Table<QuizPregunta>;
      quiz_opciones: Table<QuizOpcion>;
      inscripciones: Table<Inscripcion>;
      progreso_lecciones: Table<ProgresoLeccion>;
      quiz_intentos: Table<QuizIntento>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      curso_estado: CursoEstado;
      leccion_tipo: LeccionTipo;
      inscripcion_estado: InscripcionEstado;
      pregunta_tipo: PreguntaTipo;
    };
  };
}
