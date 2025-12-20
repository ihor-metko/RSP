import { NextResponse } from 'next/server';
import type { TypedServer } from '@/types/socket';

/**
 * GET /api/socket
 * 
 * This endpoint allows clients to verify that Socket.IO is available
 * The actual Socket.IO server is initialized in server.js
 */
export async function GET() {
  // Check if io instance is available
  const io: TypedServer | undefined = global.io;
  
  if (!io) {
    return NextResponse.json(
      { 
        error: 'Socket.IO server not initialized',
        message: 'Please ensure the app is running via the custom server (npm run dev or npm start)'
      },
      { status: 503 }
    );
  }

  // Return connection info
  return NextResponse.json({
    message: 'Socket.IO server is running',
    connected: io.engine.clientsCount || 0,
  });
}
