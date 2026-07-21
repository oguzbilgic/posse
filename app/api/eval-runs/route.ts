import { NextRequest, NextResponse } from "next/server";
import { createEvalRun, listEvalRuns, getRubric, updateEvalRun } from "../../../lib/rubrics-store";
import {
  getSessionServer,
  listSessionEventsServer,
  createSessionServer,
  sendSessionEventServer,
} from "../../../lib/anthropic-server";
import { eventsToTranscriptText } from "../../../lib/events";
import { buildJudgePrompt } from "../../../lib/judge";
import type { Rubric } from "../../../lib/types";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") || undefined;
  return NextResponse.json({ data: listEvalRuns(sessionId) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, rubric_id, eval_agent_id } = body;
  if (!session_id || !rubric_id || !eval_agent_id) {
    return NextResponse.json({ error: "session_id, rubric_id, and eval_agent_id are required" }, { status: 400 });
  }

  const rubric = getRubric(rubric_id);
  if (!rubric) return NextResponse.json({ error: "rubric not found" }, { status: 404 });

  const run = createEvalRun({ session_id, rubric_id, eval_agent_id });

  // Don't await — kicking off the judge session can take a while, and the
  // client polls GET /api/eval-runs/[id] the same way posse already polls
  // chat sessions, so there's no need to hold this request open.
  runEval(run.id, session_id, rubric, eval_agent_id).catch((e) => {
    updateEvalRun(run.id, { status: "failed", error: e instanceof Error ? e.message : String(e) });
  });

  return NextResponse.json(run, { status: 201 });
}

async function runEval(runId: string, sessionId: string, rubric: Rubric, evalAgentId: string) {
  const [target, events] = await Promise.all([getSessionServer(sessionId), listSessionEventsServer(sessionId)]);
  const transcript = eventsToTranscriptText(events);
  const prompt = buildJudgePrompt(rubric, transcript);

  const evalSession = await createSessionServer(evalAgentId, target.environment_id);
  updateEvalRun(runId, { eval_session_id: evalSession.id, status: "running" });
  await sendSessionEventServer(evalSession.id, prompt);
}
