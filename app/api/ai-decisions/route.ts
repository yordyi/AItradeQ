import { NextResponse } from 'next/server';

// Placeholder for AI decisions - will be implemented when AI engine is integrated
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // For now, return empty array
    // In the future, this would fetch from database or AI service
    return NextResponse.json([]);
  } catch (error: any) {
    console.error('Failed to fetch AI decisions:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
