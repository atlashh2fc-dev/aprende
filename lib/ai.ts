/**
 * Cliente de IA (SOLO servidor) contra la API OpenAI-compatible de Inception Labs.
 * Docs: https://docs.inceptionlabs.ai — base https://api.inceptionlabs.ai/v1, modelo mercury-2.
 * La API key se lee de INCEPTION_API_KEY y nunca se expone al cliente.
 */
const AI_BASE = process.env.INCEPTION_API_BASE || "https://api.inceptionlabs.ai/v1";
const AI_MODEL = process.env.INCEPTION_MODEL || "mercury-2";

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

export function aiConfigured(): boolean {
  return !!process.env.INCEPTION_API_KEY;
}

export async function aiChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; reasoning?: "instant" | "low" | "medium" | "high" } = {}
): Promise<string> {
  const key = process.env.INCEPTION_API_KEY;
  if (!key) throw new Error("no_ai_key");

  const res = await fetch(`${AI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1024,
      reasoning_effort: opts.reasoning ?? "medium",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ai_http_${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
