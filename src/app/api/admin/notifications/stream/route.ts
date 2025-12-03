import { auth } from "@/lib/auth";
import { Roles } from "@/constants/roles";
import { notificationEmitter, NotificationPayload } from "@/lib/notificationEmitter";

/**
 * GET /api/admin/notifications/stream
 * Server-Sent Events endpoint for real-time admin notifications
 * Only accessible by authenticated admins
 */
export async function GET(): Promise<Response> {
  // Authenticate the request
  const session = await auth();

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.user.role !== Roles.SuperAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(encoder.encode("event: connected\ndata: {\"status\":\"connected\"}\n\n"));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream closed, clean up
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Subscribe to notification events
      const unsubscribe = notificationEmitter.subscribe((notification: NotificationPayload) => {
        try {
          const data = JSON.stringify(notification);
          controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
        } catch {
          // Stream closed, clean up
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      });

      // Handle stream close
      return () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      };
    },
    cancel() {
      // Clean up when client disconnects
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering for nginx
    },
  });
}
