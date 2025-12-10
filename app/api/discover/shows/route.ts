import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    // Fetch popular TV shows from TMDB
    const tmdbResponse = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tmdbResponse.ok) {
      throw new Error('Failed to fetch from TMDB');
    }

    const data = await tmdbResponse.json();

    // Format the results
    const results = data.results.map((show: any) => ({
      id: show.id,
      name: show.name,
      overview: show.overview,
      poster_path: show.poster_path,
      first_air_date: show.first_air_date,
      vote_average: show.vote_average,
      popularity: show.popularity
    }));

    return NextResponse.json({
      success: true,
      data: results,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    });

  } catch (error) {
    console.error('Discover TV shows error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to discover TV shows' },
      { status: 500 }
    );
  }
}