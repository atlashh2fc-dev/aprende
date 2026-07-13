/**
 * Tipos de la base de datos (mantener en sync con supabase/migrations).
 * Se pueden regenerar con: supabase gen types typescript --project-id <ref>
 */

export type UserRole = "alumno" | "profesor" | "supervisor" | "admin";
export type CursoEstado = "borrador" | "publicado" | "archivado";
export type LeccionTipo = "video" | "texto" | "quiz";
export type InscripcionEstado = "activa" | "completada" | "cancelada";
export type PreguntaTipo = "unica" | "multiple";
export type EventoAcademicoTipo = "evaluacion" | "entrega" | "sesion" | "aviso";

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
  fecha_limite: string | null;
  intentos_maximos: number | null;
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
  fecha_limite: string | null;
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
  feedback_docente: string | null;
  revisado_at: string | null;
  revisado_por: string | null;
  created_at: string;
}

export interface Certificado {
  id: string;
  codigo: string;
  alumno_id: string;
  curso_id: string;
  emitido_at: string;
}

export interface EventoAcademico {
  id: string;
  curso_id: string;
  titulo: string;
  tipo: EventoAcademicoTipo;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  creado_por: string;
  created_at: string;
  updated_at: string;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  curso_id: string | null;
  evento_id: string | null;
  tipo: EventoAcademicoTipo;
  titulo: string;
  mensaje: string | null;
  enlace: string | null;
  leida_at: string | null;
  created_at: string;
}

export interface NotaLeccion {
  id: string;
  alumno_id: string;
  curso_id: string;
  leccion_id: string;
  contenido: string;
  created_at: string;
  updated_at: string;
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
      certificados: Table<Certificado>;
      eventos_academicos: Table<EventoAcademico>;
      notas_leccion: Table<NotaLeccion>;
      notificaciones: Table<Notificacion>;
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
