import { describe, it, expect } from "vitest";
import { buildJudgePrompt, parseVerdict } from "./judge";
import type { Rubric } from "./types";

const rubric: Rubric = {
  id: "r1",
  name: "Task completion",
  instructions: "Judge whether the agent completed the task.",
  criteria: [
    { id: "c1", label: "Followed instructions", description: "Did what was asked", weight: 2 },
    { id: "c2", label: "No unnecessary tool calls" },
  ],
  created_at: "",
  updated_at: "",
  archived_at: null,
};

describe("buildJudgePrompt", () => {
  it("includes instructions, criteria, and transcript", () => {
    const prompt = buildJudgePrompt(rubric, "[user]\nhello");
    expect(prompt).toContain("Judge whether the agent completed the task.");
    expect(prompt).toContain("c1: Followed instructions — Did what was asked (weight 2)");
    expect(prompt).toContain("c2: No unnecessary tool calls");
    expect(prompt).toContain("[user]\nhello");
  });

  it("notes when there are no criteria", () => {
    const prompt = buildJudgePrompt({ ...rubric, criteria: [] }, "transcript");
    expect(prompt).toContain("(no criteria defined — judge holistically)");
  });
});

describe("parseVerdict", () => {
  it("parses a well-formed verdict", () => {
    const text = JSON.stringify({
      overall_score: 0.8,
      pass: true,
      rationale: "Did well",
      per_criterion: [{ criterion_id: "c1", score: 0.9, note: "good" }],
    });
    expect(parseVerdict(text)).toEqual({
      overall_score: 0.8,
      pass: true,
      rationale: "Did well",
      per_criterion: [{ criterion_id: "c1", score: 0.9, note: "good" }],
    });
  });

  it("extracts JSON even when the judge wraps it in prose", () => {
    const text = `Here is my assessment:\n${JSON.stringify({ overall_score: 0.5, pass: false, rationale: "meh", per_criterion: [] })}\nThanks!`;
    const verdict = parseVerdict(text);
    expect(verdict?.overall_score).toBe(0.5);
    expect(verdict?.pass).toBe(false);
  });

  it("returns null for non-JSON text", () => {
    expect(parseVerdict("I refuse to answer in JSON.")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseVerdict(JSON.stringify({ rationale: "no score or pass field" }))).toBeNull();
  });
});
