// Builds the prompt sent to the judge agent and parses its verdict back out.
// Kept separate from the trigger route so both can be unit tested directly.
import type { Rubric, EvalVerdict } from "./types";

export function buildJudgePrompt(rubric: Rubric, transcript: string): string {
  const criteriaList = rubric.criteria
    .map((c) => `- ${c.id}: ${c.label}${c.description ? ` — ${c.description}` : ""}${c.weight ? ` (weight ${c.weight})` : ""}`)
    .join("\n");

  return [
    rubric.instructions,
    "",
    "## Criteria",
    criteriaList || "(no criteria defined — judge holistically)",
    "",
    "## Transcript to evaluate",
    transcript,
    "",
    "## Response format",
    "Respond with exactly one JSON object and nothing else, matching this shape:",
    '{"overall_score": number (0-1), "pass": boolean, "rationale": string, "per_criterion": [{"criterion_id": string, "score": number (0-1), "note": string}]}',
  ].join("\n");
}

export function parseVerdict(text: string): EvalVerdict | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.overall_score !== "number" || typeof parsed.pass !== "boolean") return null;
    return {
      overall_score: parsed.overall_score,
      pass: parsed.pass,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
      per_criterion: Array.isArray(parsed.per_criterion) ? parsed.per_criterion : [],
    };
  } catch {
    return null;
  }
}
