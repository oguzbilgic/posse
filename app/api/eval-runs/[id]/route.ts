import { NextRequest, NextResponse } from "next/server";
import { getEvalRun, updateEvalRun } from "../../../../lib/rubrics-store";
import { getSessionServer, listSessionEventsServer } from "../../../../lib/anthropic-server";
import { eventsToMessages } from "../../../../lib/events";
import { parseVerdict } from "../../../../lib/judge";

// Polled by the client every ~2s while a run is pending/running — mirrors the
// polling loop posse already uses for chat sessions (app/page.tsx handleSend).
// On each call, check whether the underlying judge session has finished and,
// if so, parse its verdict and settle the run.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let run = getEvalRun(id);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (run.status === "running" && run.eval_session_id) {
    const [evalSession, events] = await Promise.all([
      getSessionServer(run.eval_session_id),
      listSessionEventsServer(run.eval_session_id),
    ]);

    if (evalSession.status === "idle" || evalSession.status === "terminated") {
      const messages = eventsToMessages(events);
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      const verdict = lastAssistant ? parseVerdict(lastAssistant.content) : null;
      const completed_at = new Date().toISOString();

      run = verdict
        ? updateEvalRun(id, { status: "completed", verdict, completed_at })
        : updateEvalRun(id, { status: "failed", error: "Judge did not return a parseable verdict", completed_at });
    }
  }

  return NextResponse.json(run);
}
