import "server-only";
import { encodeEvent } from "@/lib/ndjson";
import type { StreamEvent } from "@/lib/schema";

/** Pipes an async event generator into an NDJSON HTTP response. */
export function ndjsonResponse(
  events: AsyncGenerator<StreamEvent>,
  onError: (error: unknown) => string,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) controller.enqueue(encoder.encode(encodeEvent(event)));
      } catch (error) {
        console.error("stream failed", error);
        controller.enqueue(encoder.encode(encodeEvent({ type: "error", message: onError(error) })));
      } finally {
        controller.close();
      }
    },
    cancel() {
      void events.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
