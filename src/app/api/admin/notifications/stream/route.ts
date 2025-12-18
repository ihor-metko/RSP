import { auth } from "@/lib/auth";
import { notificationEmitter, NotificationPayload } from "@/lib/notificationEmitter";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode, createMockAdminNotification } from "@/services/mockDb";

/**
 * GET /api/admin/notifications/stream
 * Server-Sent Events endpoint for real-time admin notifications
 * Only accessible by authenticated root admins
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

  if (!session.user.isRoot) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
  // In mock mode, simulate periodic notification events
  if (isMockMode()) {
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

        // In mock mode, simulate a new notification every 2 minutes
        const MOCK_NOTIFICATION_INTERVAL_MS = 120000; // 2 minutes
        const mockNotificationInterval = setInterval(() => {
          try {
            // Create a mock notification
            const notificationTypes = ["REQUESTED", "ACCEPTED", "DECLINED", "CANCELED"] as const;
            const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
            
            const mockNotif = createMockAdminNotification({
              type: randomType,
              playerId: "user-4",
              coachId: "coach-1",
              trainingRequestId: `tr-mock-${Date.now()}`,
              bookingId: null,
              sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
              sessionTime: "10:00",
              courtInfo: "Court 1 - Downtown Padel Club",
            });

            // Create the notification payload
            const notification: NotificationPayload = {
              id: mockNotif.id,
              type: mockNotif.type as "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED",
              bookingId: mockNotif.bookingId,
              coachId: mockNotif.coachId,
              playerId: mockNotif.playerId,
              trainingRequestId: mockNotif.trainingRequestId,
              sessionDate: mockNotif.sessionDate?.toISOString().split("T")[0] || null,
              sessionTime: mockNotif.sessionTime,
              courtInfo: mockNotif.courtInfo,
              summary: `Mock notification: ${randomType}`,
              createdAt: mockNotif.createdAt.toISOString(),
            };

            const data = JSON.stringify(notification);
            controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
          } catch {
            // Stream closed, clean up
            clearInterval(heartbeatInterval);
            clearInterval(mockNotificationInterval);
          }
        }, MOCK_NOTIFICATION_INTERVAL_MS);

        // Handle stream close
        return () => {
          clearInterval(heartbeatInterval);
          clearInterval(mockNotificationInterval);
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

  // Create a ReadableStream for SSE (real mode)
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
