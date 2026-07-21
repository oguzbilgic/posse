// Convert raw SessionEvents into displayable Messages
import type { SessionEvent, Message } from "./types";

function extractText(content?: Array<{ type: string; text?: string }>): string {
  if (!content) return "";
  return content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n");
}

export function eventsToMessages(events: SessionEvent[]): Message[] {
  const messages: Message[] = [];

  for (const ev of events) {
    const ts = ev.processed_at || undefined;

    switch (ev.type) {
      case "user.message": {
        const text = extractText(ev.content);
        if (text) messages.push({ role: "user", content: text, eventType: ev.type, timestamp: ts });
        break;
      }

      case "agent.message": {
        // content is directly on the event, not nested under message
        const text = extractText(ev.content);
        if (text) messages.push({ role: "assistant", content: text, eventType: ev.type, timestamp: ts });
        break;
      }

      case "agent.thinking": {
        // skip thinking events for now
        break;
      }

      case "agent.tool_use": {
        const name = ev.name || "tool";
        const input = typeof ev.input === "string"
          ? ev.input
          : JSON.stringify(ev.input, null, 2);
        messages.push({
          role: "tool",
          content: `🔧 ${name}\n${input}`,
          eventType: ev.type,
          timestamp: ts,
        });
        break;
      }

      case "agent.tool_result": {
        const text = extractText(ev.content);
        const isError = ev.is_error;
        if (text) {
          messages.push({
            role: "tool",
            content: isError ? `❌ ${text}` : text,
            eventType: ev.type,
            timestamp: ts,
          });
        }
        break;
      }

      case "session.status_idle":
      case "session.status_running":
      case "session.status_rescheduling":
      case "session.status_terminated": {
        const status = ev.type.replace("session.status_", "");
        messages.push({
          role: "system",
          content: `Session ${status}`,
          eventType: ev.type,
          timestamp: ts,
        });
        break;
      }

      // Skip span.model_request_start/end and unknown types
    }
  }

  return messages;
}

// Full-fidelity transcript for a judge agent — unlike eventsToMessages, this
// keeps thinking and tool calls/results verbatim, since a judge needs to see
// what the agent actually did, not just what a human would read in the chat.
export function eventsToTranscriptText(events: SessionEvent[]): string {
  const lines: string[] = [];

  for (const ev of events) {
    switch (ev.type) {
      case "user.message":
        lines.push(`[user]\n${extractText(ev.content)}`);
        break;
      case "agent.message":
        lines.push(`[assistant]\n${extractText(ev.content)}`);
        break;
      case "agent.thinking":
        lines.push(`[assistant:thinking]\n${extractText(ev.content)}`);
        break;
      case "agent.tool_use": {
        const input = typeof ev.input === "string" ? ev.input : JSON.stringify(ev.input);
        lines.push(`[tool_use ${ev.name || "tool"}]\n${input}`);
        break;
      }
      case "agent.tool_result": {
        const text = extractText(ev.content);
        lines.push(`[tool_result${ev.is_error ? " error" : ""}]\n${text}`);
        break;
      }
      default:
        break;
    }
  }

  return lines.join("\n\n");
}
