// app/api/users/[username]/watched/movies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/utils/dbConnect';
import User from '@/models/User';
import WatchedMovie from '@/models/WatchedMovie';
import Movie from '@/models/Movie';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await dbConnect();

    const { username } = await params;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all watched movies for this user
    const watchedMovies = await WatchedMovie.find({ user_id: user.user_id })
      .sort({ watched_at: -1 })
      .lean();

    // Get movie details for each watched movie
    const movieIds = watchedMovies.map(wm => wm.id);
    const movies = await Movie.find({ id: { $in: movieIds } }).lean();

    // Create a map for quick lookup
    const movieMap = new Map(movies.map(m => [m.id, m]));

    // Combine watched movie data with movie details
    const result = watchedMovies.map(watchedMovie => {
      const movie = movieMap.get(watchedMovie.id);
      if (!movie) {
        return null;
      }

      return {
        movie_id: movie.id,
        title: movie.title,
        overview: movie.overview,
        genres: movie.genres,
        release_date: movie.release_date,
        poster_path: movie.poster_path,
        runtime: movie.runtime,
        watched_at: watchedMovie.watched_at.toISOString()
      };
    }).filter(Boolean); // Remove null entries

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching watched movies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watched movies' },
      { status: 500 }
    );
  }
}