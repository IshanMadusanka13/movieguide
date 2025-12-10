// app/api/detail/[id]/show/season/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/utils/dbConnect';
import Show from '@/models/Show';
import User from '@/models/User';
import WatchedShow from '@/models/WatchedShow';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// POST handler: mark all episodes in a season as watched
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { username, season_number } = await request.json();
    const { id } = await params;
    const showId = parseInt(id);

    if (!showId) {
      return NextResponse.json(
        { success: false, error: 'Invalid show ID' },
        { status: 400 }
      );
    }

    if (!username || season_number === undefined) {
      return NextResponse.json(
        { success: false, error: 'Username and season_number are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if show exists in our database
    let show = await Show.findOne({ id: showId });

    if (!show) {
      // Show doesn't exist, fetch from TMDB and save
      if (!TMDB_API_KEY) {
        return NextResponse.json(
          { success: false, error: 'TMDB API key not configured' },
          { status: 500 }
        );
      }

      const tmdbResponse = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!tmdbResponse.ok) {
        throw new Error('Failed to fetch show from TMDB');
      }

      const tmdbData = await tmdbResponse.json();

      // Fetch all seasons with episodes
      const seasonsWithEpisodes = await Promise.all(
        tmdbData.seasons
          .filter((s: any) => s.season_number > 0)
          .map(async (season: any) => {
            try {
              const seasonResponse = await fetch(
                `${TMDB_BASE_URL}/tv/${showId}/season/${season.season_number}?api_key=${TMDB_API_KEY}`,
                { headers: { 'Content-Type': 'application/json' } }
              );

              if (!seasonResponse.ok) {
                return {
                  season_number: season.season_number,
                  name: season.name,
                  episode_count: season.episode_count,
                  episodes: []
                };
              }

              const seasonData = await seasonResponse.json();

              return {
                season_number: season.season_number,
                name: season.name,
                episode_count: season.episode_count,
                episodes: seasonData.episodes.map((ep: any) => ({
                  episode_number: ep.episode_number,
                  name: ep.name,
                  runtime: ep.runtime || 0
                }))
              };
            } catch (error) {
              return {
                season_number: season.season_number,
                name: season.name,
                episode_count: season.episode_count,
                episodes: []
              };
            }
          })
      );

      // Save show to database
      show = await Show.create({
        id: tmdbData.id,
        name: tmdbData.name,
        overview: tmdbData.overview,
        genres: tmdbData.genres.map((g: any) => g.name),
        number_of_episodes: tmdbData.number_of_episodes,
        number_of_seasons: tmdbData.number_of_seasons,
        poster_path: tmdbData.poster_path,
        seasons: seasonsWithEpisodes,
        status: tmdbData.status,
        tagline: tmdbData.tagline || ''
      });
    }

    // Find the season in the show
    const season = show.seasons.find((s: any) => s.season_number === season_number);
    if (!season) {
      return NextResponse.json(
        { success: false, error: 'Season not found' },
        { status: 404 }
      );
    }

    // Find or create watched show entry
    let watchedShow = await WatchedShow.findOne({
      user_id: user.user_id,
      id: showId
    });

    if (!watchedShow) {
      watchedShow = await WatchedShow.create({
        user_id: user.user_id,
        id: showId,
        seasons: []
      });
    }

    // Find or create the season in watched show
    const watchedSeasonIndex = watchedShow.seasons.findIndex(
      (s: any) => s.season_number === season_number
    );

    const currentTime = new Date();
    
    // Get all episode numbers from the show's season
    const allEpisodeNumbers = season.episodes.map((ep: any) => ep.episode_number);

    if (watchedSeasonIndex === -1) {
      // Season doesn't exist in watched show, add all episodes
      watchedShow.seasons.push({
        season_number,
        episodes: allEpisodeNumbers.map((epNum: any) => ({
          episode_number: epNum,
          watched_at: currentTime
        }))
      });
    } else {
      // Season exists, find unwatched episodes
      const watchedEpisodeNumbers = watchedShow.seasons[watchedSeasonIndex].episodes.map(
        (e: any) => e.episode_number
      );

      const unwatchedEpisodeNumbers = allEpisodeNumbers.filter(
        (epNum: any) => !watchedEpisodeNumbers.includes(epNum)
      );

      // Add unwatched episodes
      unwatchedEpisodeNumbers.forEach((epNum: any) => {
        watchedShow.seasons[watchedSeasonIndex].episodes.push({
          episode_number: epNum,
          watched_at: currentTime
        });
      });

      if (unwatchedEpisodeNumbers.length === 0) {
        return NextResponse.json(
          { success: false, error: 'All episodes in this season are already watched' },
          { status: 400 }
        );
      }
    }

    await watchedShow.save();

    return NextResponse.json({
      success: true,
      message: 'Season marked as watched',
      data: watchedShow
    });

  } catch (error) {
    console.error('Error marking season as watched:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark season as watched' },
      { status: 500 }
    );
  }
}