// app/api/shows/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {dbConnect} from '@/utils/dbConnect';
import Show from '@/models/Show';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface SyncResult {
  showId: number;
  showName: string;
  status: 'updated' | 'unchanged' | 'error';
  previousSeasons: number;
  currentSeasons: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    // Get all shows from database
    const shows = await Show.find({}).lean();

    if (shows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No shows to sync',
        results: []
      });
    }

    const results: SyncResult[] = [];
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    // Process each show
    for (const show of shows) {
      try {
        // Fetch latest data from TMDB
        const tmdbResponse = await fetch(
          `${TMDB_BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!tmdbResponse.ok) {
          results.push({
            showId: show.id,
            showName: show.name,
            status: 'error',
            previousSeasons: show.number_of_seasons,
            currentSeasons: show.number_of_seasons,
            error: 'Failed to fetch from TMDB'
          });
          errorCount++;
          continue;
        }

        const tmdbData = await tmdbResponse.json();

        // Fetch all seasons with episodes
        const seasonsWithEpisodes = [];
        for (let seasonNum = 1; seasonNum <= tmdbData.number_of_seasons; seasonNum++) {
          const seasonResponse = await fetch(
            `${TMDB_BASE_URL}/tv/${show.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`,
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (seasonResponse.ok) {
            const seasonData = await seasonResponse.json();
            seasonsWithEpisodes.push({
              season_number: seasonData.season_number,
              name: seasonData.name,
              overview: seasonData.overview || '',
              episode_count: seasonData.episodes.length,
              air_date: seasonData.air_date || '',
              episodes: seasonData.episodes.map((ep: any) => ({
                episode_number: ep.episode_number,
                name: ep.name,
                overview: ep.overview || '',
                runtime: ep.runtime || 0
              }))
            });
          }
        }

        // Check if update is needed
        const hasChanges = 
          tmdbData.number_of_seasons !== show.number_of_seasons ||
          tmdbData.number_of_episodes !== show.number_of_episodes ||
          tmdbData.status !== show.status;

        if (hasChanges || seasonsWithEpisodes.length !== show.seasons.length) {
          // Update the show
          await Show.findOneAndUpdate(
            { id: show.id },
            {
              $set: {
                name: tmdbData.name,
                overview: tmdbData.overview,
                genres: tmdbData.genres.map((g: any) => g.name),
                number_of_episodes: tmdbData.number_of_episodes,
                number_of_seasons: tmdbData.number_of_seasons,
                poster_path: tmdbData.poster_path,
                seasons: seasonsWithEpisodes,
                status: tmdbData.status,
                tagline: tmdbData.tagline || ''
              }
            }
          );

          results.push({
            showId: show.id,
            showName: show.name,
            status: 'updated',
            previousSeasons: show.number_of_seasons,
            currentSeasons: tmdbData.number_of_seasons
          });
          updatedCount++;
        } else {
          results.push({
            showId: show.id,
            showName: show.name,
            status: 'unchanged',
            previousSeasons: show.number_of_seasons,
            currentSeasons: tmdbData.number_of_seasons
          });
          unchangedCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (error) {
        results.push({
          showId: show.id,
          showName: show.name,
          status: 'error',
          previousSeasons: show.number_of_seasons,
          currentSeasons: show.number_of_seasons,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      summary: {
        total: shows.length,
        updated: updatedCount,
        unchanged: unchangedCount,
        errors: errorCount
      },
      results
    });

  } catch (error) {
    console.error('Sync shows error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync shows' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to sync a single show by ID
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('id');

    if (!showId) {
      return NextResponse.json(
        { success: false, error: 'Show ID is required' },
        { status: 400 }
      );
    }

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    const show = await Show.findOne({ id: parseInt(showId) });

    if (!show) {
      return NextResponse.json(
        { success: false, error: 'Show not found in database' },
        { status: 404 }
      );
    }

    // Fetch latest data from TMDB
    const tmdbResponse = await fetch(
      `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tmdbResponse.ok) {
      throw new Error('Failed to fetch from TMDB');
    }

    const tmdbData = await tmdbResponse.json();

    // Fetch all seasons with episodes
    const seasonsWithEpisodes = [];
    for (let seasonNum = 1; seasonNum <= tmdbData.number_of_seasons; seasonNum++) {
      const seasonResponse = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNum}?api_key=${TMDB_API_KEY}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        seasonsWithEpisodes.push({
          season_number: seasonData.season_number,
          name: seasonData.name,
          overview: seasonData.overview || '',
          episode_count: seasonData.episodes.length,
          air_date: seasonData.air_date || '',
          episodes: seasonData.episodes.map((ep: any) => ({
            episode_number: ep.episode_number,
            name: ep.name,
            overview: ep.overview || '',
            runtime: ep.runtime || 0
          }))
        });
      }
    }

    // Update the show
    const updatedShow = await Show.findOneAndUpdate(
      { id: parseInt(showId) },
      {
        $set: {
          name: tmdbData.name,
          overview: tmdbData.overview,
          genres: tmdbData.genres.map((g: any) => g.name),
          number_of_episodes: tmdbData.number_of_episodes,
          number_of_seasons: tmdbData.number_of_seasons,
          poster_path: tmdbData.poster_path,
          seasons: seasonsWithEpisodes,
          status: tmdbData.status,
          tagline: tmdbData.tagline || ''
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Show synced successfully',
      data: {
        showId: updatedShow.id,
        showName: updatedShow.name,
        previousSeasons: show.number_of_seasons,
        currentSeasons: updatedShow.number_of_seasons,
        previousEpisodes: show.number_of_episodes,
        currentEpisodes: updatedShow.number_of_episodes
      }
    });

  } catch (error) {
    console.error('Sync single show error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync show' },
      { status: 500 }
    );
  }
}