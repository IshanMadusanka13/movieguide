// app/api/discover/movies/route.ts
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

    // Fetch popular movies from TMDB
    const tmdbResponse = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`,
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
    const results = data.results.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      popularity: movie.popularity
    }));

    return NextResponse.json({
      success: true,
      data: results,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    });

  } catch (error) {
    console.error('Discover movies error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to discover movies' },
      { status: 500 }
    );
  }
}