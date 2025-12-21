import { NextResponse } from "next/server";
import { getSafeHeaders } from "../shared";

/**
 * Player clubs endpoint - GET /api/player/clubs
 * Delegates to existing /api/(player)/clubs route
 * This ensures consistency with the new store structure
 */
export async function GET(request: Request) {
  // Get the full URL and search params
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  
  // Construct the target URL with the same search params
  const baseUrl = url.origin;
  const targetUrl = `${baseUrl}/api/(player)/clubs${searchParams ? `?${searchParams}` : ''}`;
  
  try {
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
      console.error("Error in player clubs proxy:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
