import LlamaCloud, { toFile } from "@llamaindex/llama-cloud";
import { aiStructured, type ChatMessage, type JsonSchemaResponseFormat } from "@/lib/ai";

export type GeneratedQuiz = {
  titulo: string;
  aprobacionMin: number;
  preguntas: { enunciado: string; tipo: "unica" | "multiple"; opciones: { texto: string; esCorrecta: boolean }[] }[];
};

export type GeneratedLesson = {
  titulo: string;
  tipo: "texto" | "quiz";
  contenido: string;
  duracionMin: number;
  quiz: GeneratedQuiz;
};

export type CourseBlueprint = {
  descripcionCorta: string;
  descripcion: string;
  nivel: string;
  duracionHoras: number;
  modulos: { titulo: string; lecciones: GeneratedLesson[] }[];
};

const courseBlueprintSchema: JsonSchemaResponseFormat = {
  name: "course_blueprint",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["descripcionCorta", "descripcion", "nivel", "duracionHoras", "modulos"],
    properties: {
      descripcionCorta: { type: "string" },
      descripcion: { type: "string" },
      nivel: { type: "string" },
      duracionHoras: { type: "number" },
      modulos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["titulo", "lecciones"],
          properties: {
            titulo: { type: "string" },
            lecciones: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["titulo", "tipo", "contenido", "duracionMin", "quiz"],
                properties: {
                  titulo: { type: "string" },
                  tipo: { type: "string", enum: ["texto", "quiz"] },
                  contenido: { type: "string" },
                  duracionMin: { type: "number" },
                  quiz: {
                    type: "object",
                    additionalProperties: false,
                    required: ["titulo", "aprobacionMin", "preguntas"],
                    properties: {
                      titulo: { type: "string" },
                      aprobacionMin: { type: "number" },
                      preguntas: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: ["enunciado", "tipo", "opciones"],
                          properties: {
                            enunciado: { type: "string" },
                            tipo: { type: "string", enum: ["unica", "multiple"] },
                            opciones: {
                              type: "array",
                              items: {
                                type: "object",
                                additionalProperties: false,
                                required: ["texto", "esCorrecta"],
                                properties: {
                                  texto: { type: "string" },
                                  esCorrecta: { type: "boolean" },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export function llamaParseConfigured() {
  return Boolean(process.env.LLAMA_CLOUD_API_KEY);
}

export async function parseCourseMaterial(input: { file: Blob; filename: string; mimeType: string }) {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) throw new Error("no_llama_parse_key");
  const client = new LlamaCloud({ apiKey, timeout: 120_000 });
  const upload = await toFile(input.file, input.filename, { type: input.mimeType });
  const result = await client.parsing.parse({
    tier: "agentic",
    version: "latest",
    upload_file: upload,
    expand: ["markdown"],
  });
  const markdown = result.markdown?.pages
    .flatMap((page) => page.success ? [page.markdown] : [])
    .join("\n\n")
    .trim();
  if (!markdown) throw new Error("llama_parse_empty_result");
  return { markdown, jobId: result.job.id };
}

export async function createCourseBlueprint(courseTitle: string, source: string): Promise<CourseBlueprint> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Eres un diseñador instruccional experto. Creas cursos en español exclusivamente a partir del material entregado. " +
        "No inventes datos, normas, estadísticas ni contenidos que el material no sustente. " +
        "Construye una experiencia homogénea: 3 a 6 módulos, lecciones claras con Markdown simple, objetivos implícitos, ejemplos cuando existan y un quiz al final de cada módulo. " +
        "Cada lección de texto debe tener contenido útil y autosuficiente. Cada quiz debe tener 3 a 6 preguntas, 3 a 5 opciones por pregunta y una o más respuestas correctas. " +
        "Para las lecciones de texto deja quiz con preguntas vacías; para una lección de tipo quiz deja contenido vacío. " +
        "Usa nivel Básico, Intermedio o Avanzado y estima duraciones realistas. La salida debe cumplir estrictamente el esquema solicitado.",
    },
    {
      role: "user",
      content: `CURSO: ${courseTitle}\n\nMATERIAL FUENTE:\n${source}`,
    },
  ];
  const blueprint = await aiStructured<CourseBlueprint>(messages, courseBlueprintSchema, { maxTokens: 12_000, reasoning: "high" });
  validateBlueprint(blueprint);
  return blueprint;
}

function validateBlueprint(value: CourseBlueprint) {
  if (!value || !Array.isArray(value.modulos) || value.modulos.length === 0 || value.modulos.length > 8) {
    throw new Error("invalid_course_blueprint");
  }
  const totalLessons = value.modulos.reduce((count, modulo) => count + (Array.isArray(modulo.lecciones) ? modulo.lecciones.length : 0), 0);
  if (totalLessons === 0 || totalLessons > 40) throw new Error("invalid_course_blueprint");

  for (const moduleDefinition of value.modulos) {
    if (!moduleDefinition.titulo?.trim() || !Array.isArray(moduleDefinition.lecciones) || moduleDefinition.lecciones.length === 0) throw new Error("invalid_course_blueprint");
    for (const lesson of moduleDefinition.lecciones) {
      if (!lesson.titulo?.trim() || !["texto", "quiz"].includes(lesson.tipo)) throw new Error("invalid_course_blueprint");
      if (lesson.tipo === "texto" && !lesson.contenido.trim()) throw new Error("invalid_course_blueprint");
      if (lesson.tipo === "quiz") validateQuiz(lesson.quiz);
    }
  }
}

function validateQuiz(quiz: GeneratedQuiz) {
  if (!quiz?.titulo?.trim() || !Array.isArray(quiz.preguntas) || quiz.preguntas.length < 3 || quiz.preguntas.length > 8) {
    throw new Error("invalid_course_blueprint");
  }
  for (const question of quiz.preguntas) {
    const correct = question.opciones?.filter((option) => option.esCorrecta).length ?? 0;
    if (!question.enunciado?.trim() || !["unica", "multiple"].includes(question.tipo) ||
      !Array.isArray(question.opciones) || question.opciones.length < 2 || correct === 0 ||
      (question.tipo === "unica" && correct !== 1)) throw new Error("invalid_course_blueprint");
  }
}
