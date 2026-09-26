export type GroundingCitation = { start: number; end: number; title: string; url: string };
export type WebGrounding = { generatedAt: string; text: string; citations: GroundingCitation[]; model: string; searchCalls: number; inputTokens: number; outputTokens: number };
export function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") && !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname) ? url.href : null; } catch { return null; }
}
export function parseGroundingResponse(payload: any): WebGrounding {
  if (payload.status !== "completed") throw new Error("Web research did not finish. Try again later.");
  const searchCalls = (payload.output ?? []).filter((item: any) => item.type === "web_search_call" && item.status === "completed").length;
  let text = ""; const citations: GroundingCitation[] = [];
  for (const item of payload.output ?? []) for (const block of item.content ?? []) {
    if (block.type !== "output_text" || typeof block.text !== "string") continue;
    const offset = text.length; text += block.text + "\n";
    for (const annotation of block.annotations ?? []) {
      const url = safeSourceUrl(annotation.url);
      if (annotation.type !== "url_citation" || !url || !Number.isInteger(annotation.start_index) || !Number.isInteger(annotation.end_index) || annotation.start_index < 0 || annotation.end_index > block.text.length || annotation.end_index <= annotation.start_index) continue;
      citations.push({ start: offset + annotation.start_index, end: offset + annotation.end_index, title: String(annotation.title || new URL(url).hostname), url });
    }
  }
  if (!searchCalls || !text.trim() || !citations.length) throw new Error("No cited web evidence was returned. The original report has not changed.");
  return { generatedAt: new Date().toISOString(), text, citations: citations.sort((a,b) => a.start-b.start), model: payload.model ?? "unknown", searchCalls,
    inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0 };
}
