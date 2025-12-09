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

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect();

    const { username } = params;
    const { movie_id } = await request.json();

    if (!movie_id) {
      return NextResponse.json(
        { success: false, error: 'movie_id is required' },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if movie exists
    const movie = await Movie.findOne({ id: movie_id });
    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Check if already watched
    const existingWatch = await WatchedMovie.findOne({
      user_id: user.user_id,
      movie_id: movie_id
    });

    if (existingWatch) {
      return NextResponse.json(
        { success: false, error: 'Movie already marked as watched' },
        { status: 400 }
      );
    }

    // Create new watched movie entry
    const watchedMovie = await WatchedMovie.create({
      user_id: user.user_id,
      movie_id: movie_id,
      watched_at: new Date()
    });

    return NextResponse.json({
      success: true,
      data: watchedMovie
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding watched movie:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add watched movie' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect();

    const { username } = params;
    const { searchParams } = new URL(request.url);
    const movie_id = searchParams.get('movie_id');

    if (!movie_id) {
      return NextResponse.json(
        { success: false, error: 'movie_id is required' },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete watched movie entry
    const result = await WatchedMovie.findOneAndDelete({
      user_id: user.user_id,
      movie_id: parseInt(movie_id)
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Watched movie entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Watched movie removed successfully'
    });

  } catch (error) {
    console.error('Error deleting watched movie:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete watched movie' },
      { status: 500 }
    );
  }
}