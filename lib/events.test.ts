import { describe, it, expect } from "vitest";
import { eventsToTranscriptText } from "./events";
import type { SessionEvent } from "./types";

describe("eventsToTranscriptText", () => {
  it("preserves thinking and tool calls that eventsToMessages skips/reformats", () => {
    const events: SessionEvent[] = [
      { id: "1", type: "user.message", processed_at: null, content: [{ type: "text", text: "do the thing" }] },
      { id: "2", type: "agent.thinking", processed_at: null, content: [{ type: "text", text: "let me think" }] },
      { id: "3", type: "agent.tool_use", processed_at: null, name: "bash", input: { command: "ls" } },
      { id: "4", type: "agent.tool_result", processed_at: null, content: [{ type: "text", text: "file.txt" }] },
      { id: "5", type: "agent.message", processed_at: null, content: [{ type: "text", text: "done" }] },
    ];

    const transcript = eventsToTranscriptText(events);

    expect(transcript).toContain("[user]\ndo the thing");
    expect(transcript).toContain("[assistant:thinking]\nlet me think");
    expect(transcript).toContain('[tool_use bash]\n{"command":"ls"}');
    expect(transcript).toContain("[tool_result]\nfile.txt");
    expect(transcript).toContain("[assistant]\ndone");
  });

  it("marks failed tool results", () => {
    const events: SessionEvent[] = [
      { id: "1", type: "agent.tool_result", processed_at: null, is_error: true, content: [{ type: "text", text: "boom" }] },
    ];
    expect(eventsToTranscriptText(events)).toContain("[tool_result error]\nboom");
  });
});
