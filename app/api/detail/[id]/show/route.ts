// app/api/detail/[id]/show/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/utils/dbConnect';
import Show from '@/models/Show';
import User from '@/models/User';
import WatchedShow from '@/models/WatchedShow';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// GET handler: fetch show details (DB -> TMDB) and check watched status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const showId = parseInt(id);
    if (!showId) {
      return NextResponse.json({ success: false, error: 'Invalid show ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const username = url.searchParams.get('username') || undefined;

    // Try to find show in DB
    let show = await Show.findOne({ id: showId });

    if (!show) {
      if (!TMDB_API_KEY) {
        return NextResponse.json(
          { success: false, error: 'TMDB API key not configured' },
          { status: 500 }
        );
      }

      // Fetch show details from TMDB
      const tmdbResponse = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!tmdbResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch show from TMDB' },
          { status: 502 }
        );
      }

      const tmdbData = await tmdbResponse.json();

      // Fetch all seasons with episodes
      const seasonsWithEpisodes = await Promise.all(
        tmdbData.seasons
          .filter((s: any) => s.season_number > 0) // Skip specials (season 0)
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
                  overview: season.overview || '',
                  episode_count: season.episode_count,
                  air_date: season.air_date || '',
                  episodes: []
                };
              }

              const seasonData = await seasonResponse.json();

              return {
                season_number: season.season_number,
                name: season.name,
                overview: season.overview || '',
                episode_count: season.episode_count,
                air_date: season.air_date || '',
                episodes: seasonData.episodes.map((ep: any) => ({
                  episode_number: ep.episode_number,
                  name: ep.name,
                  overview: ep.overview || '',
                  runtime: ep.runtime || 0
                }))
              };
            } catch (error) {
              console.error(`Error fetching season ${season.season_number}:`, error);
              return {
                season_number: season.season_number,
                name: season.name,
                overview: season.overview || '',
                episode_count: season.episode_count,
                air_date: season.air_date || '',
                episodes: []
              };
            }
          })
      );

      // Construct show object (do NOT persist yet)
      show = {
        id: tmdbData.id,
        name: tmdbData.name,
        overview: tmdbData.overview,
        genres: Array.isArray(tmdbData.genres) ? tmdbData.genres.map((g: any) => g.name) : [],
        number_of_episodes: tmdbData.number_of_episodes,
        number_of_seasons: tmdbData.number_of_seasons,
        poster_path: tmdbData.poster_path,
        seasons: seasonsWithEpisodes,
        status: tmdbData.status,
        tagline: tmdbData.tagline || ''
      } as any;
    }

    // Check watched status for each episode if username provided
    if (username) {
      const user = await User.findOne({ username });
      if (user) {
        const watchedShow = await WatchedShow.findOne({
          user_id: user.user_id,
          id: showId
        });

        if (watchedShow) {
          // Mark episodes as watched based on watchedShow data
          const showData = show.toObject ? show.toObject() : show;
          showData.seasons = showData.seasons.map((season: any) => {
            const watchedSeason = watchedShow.seasons.find(
              (ws: any) => ws.season_number === season.season_number
            );

            if (watchedSeason) {
              season.episodes = season.episodes.map((episode: any) => {
                const watchedEpisode = watchedSeason.episodes.find(
                  (we: any) => we.episode_number === episode.episode_number
                );
                return {
                  ...episode,
                  watched: !!watchedEpisode
                };
              });
            } else {
              season.episodes = season.episodes.map((episode: any) => ({
                ...episode,
                watched: false
              }));
            }

            return season;
          });

          show = showData;
        } else {
          // No watched data, mark all as unwatched
          const showData = show.toObject ? show.toObject() : show;
          showData.seasons = showData.seasons.map((season: any) => ({
            ...season,
            episodes: season.episodes.map((episode: any) => ({
              ...episode,
              watched: false
            }))
          }));
          show = showData;
        }
      } else {
        // User not found, mark all as unwatched
        const showData = show.toObject ? show.toObject() : show;
        showData.seasons = showData.seasons.map((season: any) => ({
          ...season,
          episodes: season.episodes.map((episode: any) => ({
            ...episode,
            watched: false
          }))
        }));
        show = showData;
      }
    } else {
      // No username, mark all as unwatched
      const showData = show.toObject ? show.toObject() : show;
      showData.seasons = showData.seasons.map((season: any) => ({
        ...season,
        episodes: season.episodes.map((episode: any) => ({
          ...episode,
          watched: false
        }))
      }));
      show = showData;
    }

    return NextResponse.json({
      success: true,
      data: show
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching show details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch show details' },
      { status: 500 }
    );
  }
}

// POST handler: mark a single episode as watched
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { username, season_number, episode_number } = await request.json();
    const { id } = await params;
    const showId = parseInt(id);

    if (!showId) {
      return NextResponse.json(
        { success: false, error: 'Invalid show ID' },
        { status: 400 }
      );
    }

    if (!username || season_number === undefined || episode_number === undefined) {
      return NextResponse.json(
        { success: false, error: 'Username, season_number, and episode_number are required' },
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

    // Check if episode is already marked as watched
    const seasonIndex = watchedShow.seasons.findIndex(
      (s: any) => s.season_number === season_number
    );

    if (seasonIndex === -1) {
      // Season doesn't exist, add it with the episode
      watchedShow.seasons.push({
        season_number,
        episodes: [{
          episode_number,
          watched_at: new Date()
        }]
      });
    } else {
      // Season exists, check if episode is already watched
      const episodeIndex = watchedShow.seasons[seasonIndex].episodes.findIndex(
        (e: any) => e.episode_number === episode_number
      );

      if (episodeIndex === -1) {
        // Episode not watched yet, add it
        watchedShow.seasons[seasonIndex].episodes.push({
          episode_number,
          watched_at: new Date()
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Episode already marked as watched' },
          { status: 400 }
        );
      }
    }

    await watchedShow.save();

    return NextResponse.json({
      success: true,
      message: 'Episode marked as watched',
      data: watchedShow
    });

  } catch (error) {
    console.error('Error marking episode as watched:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark episode as watched' },
      { status: 500 }
    );
  }
}