import { NextResponse } from "next/server";
import { getSafeHeaders } from "../../shared";

/**
 * Player club detail endpoint - GET /api/player/clubs/:id
 * Delegates to existing /api/(player)/clubs/:id route
 * This ensures consistency with the new store structure
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;
    
    // Get the base URL
    const url = new URL(request.url);
    const baseUrl = url.origin;
    
    // Construct the target URL
    const targetUrl = `${baseUrl}/api/(player)/clubs/${clubId}`;
    
    // Forward the request with only safe headers
    const safeHeaders = getSafeHeaders(request);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: safeHeaders,
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return with the same status
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error in player club detail proxy:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
