// app/api/init-db/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/utils/dbConnect';
import Movie from '@/models/Movie';
import Show from '@/models/Show';
import WatchedMovie from '@/models/WatchedMovie';
import WatchedShow from '@/models/WatchedShow';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchFromTMDB(endpoint: string) {
  const response = await fetch(`${TMDB_BASE_URL}${endpoint}`,{
    headers: {
      Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (action === 'init-movies') {
      return await initMovies();
    } else if (action === 'init-shows') {
      return await initShows();
    } else if (action === 'init-all') {
      return await initAll();
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "init-movies", "init-shows", or "init-all"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function initMovies() {
  // Get all watched movie IDs
  const watchedMovies = await WatchedMovie.find({}, 'id').lean();
  const movieIds = [...new Set(watchedMovies.map(w => w.id))];

  console.log(`Found ${movieIds.length} unique movies to fetch`);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const movieId of movieIds) {
    try {
      // Check if movie already exists
      const existingMovie = await Movie.findOne({ id: movieId });
      if (existingMovie) {
        console.log(`Movie ${movieId} already exists, skipping...`);
        continue;
      }

      // Fetch movie from TMDB
      const tmdbMovie = await fetchFromTMDB(`/movie/${movieId}`);
      
      // Transform to our schema
      const movieData = {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        overview: tmdbMovie.overview,
        genres: tmdbMovie.genres?.map((g: any) => g.name) || [],
        release_date: tmdbMovie.release_date,
        poster_path: tmdbMovie.poster_path,
        runtime: tmdbMovie.runtime,
      };

      // Save to database
      await Movie.create(movieData);
      console.log(`✓ Movie "${movieData.title}" (ID: ${movieId}) inserted`);
      results.success++;

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`✗ Failed to fetch/insert movie ${movieId}:`, error);
      results.failed++;
      results.errors.push(`Movie ${movieId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({
    message: `Movie initialization completed. Success: ${results.success}, Failed: ${results.failed}`,
    details: results
  });
}

async function initShows() {
  // Get all watched show IDs
  const watchedShows = await WatchedShow.find({}, 'id').lean();
  const showIds = [...new Set(watchedShows.map(w => w.id))];

  console.log(`Found ${showIds.length} unique shows to fetch`);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const showId of showIds) {
    try {
      // Check if show already exists
      const existingShow = await Show.findOne({ id: showId });
      if (existingShow) {
        console.log(`Show ${showId} already exists, skipping...`);
        continue;
      }

      // Fetch show details from TMDB
      const tmdbShow = await fetchFromTMDB(`/tv/${showId}`);

      // Fetch seasons data
      const seasonsData = [];
      for (let seasonNumber = 1; seasonNumber <= tmdbShow.number_of_seasons; seasonNumber++) {
        try {
          const season = await fetchFromTMDB(`/tv/${showId}/season/${seasonNumber}`);
          
          // Get episode runtimes
          const episodes = season.episodes?.map((ep: any) => ({
            episode_number: ep.episode_number,
            name: ep.name,
            runtime: ep.runtime || 0
          })) || [];

          seasonsData.push({
            season_number: season.season_number,
            name: season.name,
            episode_count: season.episodes?.length || 0,
            air_date: season.air_date || '',
            episodes: episodes
          });

          // Add delay between season requests
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (seasonError) {
          console.warn(`  Could not fetch season ${seasonNumber} for show ${showId}:`, seasonError);
          // Create placeholder season
          seasonsData.push({
            season_number: seasonNumber,
            name: `Season ${seasonNumber}`,
            episode_count: 0,
            air_date: '',
            episodes: []
          });
        }
      }

      // Transform to our schema
      const showData = {
        id: tmdbShow.id,
        name: tmdbShow.name,
        overview: tmdbShow.overview,
        genres: tmdbShow.genres?.map((g: any) => g.name) || [],
        number_of_episodes: tmdbShow.number_of_episodes,
        number_of_seasons: tmdbShow.number_of_seasons,
        poster_path: tmdbShow.poster_path,
        seasons: seasonsData,
        status: tmdbShow.status || 'Unavailable',
      };

      // Save to database
      await Show.create(showData);
      console.log(`✓ Show "${showData.name}" (ID: ${showId}) inserted with ${showData.seasons.length} seasons`);
      results.success++;

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`✗ Failed to fetch/insert show ${showId}:`, error);
      results.failed++;
      results.errors.push(`Show ${showId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({
    message: `Show initialization completed. Success: ${results.success}, Failed: ${results.failed}`,
    details: results
  });
}

async function initAll() {
  const movieResult = await initMovies();
  const showResult = await initShows();
  
  return NextResponse.json({
    message: 'All initialization completed',
    movies: await movieResult.json(),
    shows: await showResult.json()
  });
}