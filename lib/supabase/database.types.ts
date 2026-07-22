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
export type EntregaEstado = "enviada" | "atrasada" | "revisada";
export type AreaTipo = "area" | "unidad_negocio" | "campana";
export type MaterialCursoEstado = "subido" | "procesando" | "listo" | "error";
export type GeneracionCursoEstado = "procesando" | "completado" | "error";

export interface Institucion {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface Area {
  id: string;
  institucion_id: string;
  nombre: string;
  slug: string;
  tipo: AreaTipo;
  descripcion: string | null;
  created_at: string;
}

export interface ProfileArea {
  profile_id: string;
  area_id: string;
  created_at: string;
}

export interface CursoArea {
  curso_id: string;
  area_id: string;
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

export interface CursoMaterial {
  id: string;
  curso_id: string;
  nombre_archivo: string;
  storage_path: string;
  mime_type: string;
  tamanio_bytes: number;
  estado: MaterialCursoEstado;
  texto_extraido: string | null;
  llama_file_id: string | null;
  llama_job_id: string | null;
  detalle_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CursoGeneracion {
  id: string;
  curso_id: string;
  creado_por: string;
  estado: GeneracionCursoEstado;
  progreso: number;
  etapa: string;
  mensaje_progreso: string | null;
  materiales_procesados: number;
  detalle_error: string | null;
  created_at: string;
  completed_at: string | null;
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

export interface Tarea {
  id: string;
  curso_id: string;
  titulo: string;
  instrucciones: string;
  fecha_limite: string | null;
  puntaje_maximo: number;
  permitir_reentrega: boolean;
  publicada: boolean;
  creado_por: string;
  created_at: string;
  updated_at: string;
}

export interface EntregaTarea {
  id: string;
  tarea_id: string;
  alumno_id: string;
  texto: string | null;
  enlace: string | null;
  archivo_path: string | null;
  estado: EntregaEstado;
  entregado_at: string;
  puntaje: number | null;
  feedback_docente: string | null;
  revisado_at: string | null;
  revisado_por: string | null;
  updated_at: string;
}

export interface TareaRubrica {
  id: string;
  tarea_id: string;
  criterio: string;
  descripcion: string | null;
  puntaje_maximo: number;
  orden: number;
  created_at: string;
}

export interface EntregaRubricaResultado {
  id: string;
  entrega_id: string;
  rubrica_id: string;
  puntaje: number;
  comentario: string | null;
  created_at: string;
  updated_at: string;
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
      areas: Table<Area>;
      profile_areas: Table<ProfileArea>;
      curso_areas: Table<CursoArea>;
      profiles: Table<Profile>;
      cursos: Table<Curso>;
      curso_materiales: Table<CursoMaterial>;
      curso_generaciones: Table<CursoGeneracion>;
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
      tareas: Table<Tarea>;
      entregas_tarea: Table<EntregaTarea>;
      tarea_rubricas: Table<TareaRubrica>;
      entrega_rubrica_resultados: Table<EntregaRubricaResultado>;
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
