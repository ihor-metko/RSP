import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * User information response type.
 */
export interface MeResponse {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
  isRoot: boolean;
}

/**
 * GET /api/me
 * 
 * Returns the current user's information for client-side awareness.
 * This endpoint is used by the UI to determine what elements to show/hide.
 * 
 * Note: Client-side should never enforce authorization, only use this
 * to render appropriate UI elements. All authorization checks must
 * happen on the server.
 * 
 * @returns User information including userId and isRoot flag
 */
export async function GET(): Promise<NextResponse<MeResponse | { error: string }>> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const response: MeResponse = {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isRoot: session.user.isRoot ?? false,
  };

  return NextResponse.json(response);
}
