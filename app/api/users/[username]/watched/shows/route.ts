// app/api/users/[username]/watched/shows/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {dbConnect} from '@/utils/dbConnect';
import User from '@/models/User';
import WatchedShow from '@/models/WatchedShow';
import Show from '@/models/Show';

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

    // Get all watched shows for this user
    const watchedShows = await WatchedShow.find({ user_id: user.user_id }).lean();

    // Get show details for each watched show
    const showIds = watchedShows.map(ws => ws.id);
    const shows = await Show.find({ id: { $in: showIds } }).lean();

    // Create a map for quick lookup
    const showMap = new Map(shows.map(s => [s.id, s]));

    // Flatten all episodes with their watch dates
    const allEpisodes: any[] = [];

    watchedShows.forEach(watchedShow => {
      const show = showMap.get(watchedShow.id);
      if (!show) return;

      watchedShow.seasons.forEach(watchedSeason => {
        const showSeason = show.seasons.find(s => s.season_number === watchedSeason.season_number);

        watchedSeason.episodes.forEach(watchedEpisode => {
          if (!watchedEpisode.watched_at) return;

          const showEpisode = showSeason?.episodes.find(
            e => e.episode_number === watchedEpisode.episode_number
          );

          allEpisodes.push({
            show_id: show.id,
            show_name: show.name,
            poster_path: show.poster_path,
            season_number: watchedSeason.season_number,
            episode_number: watchedEpisode.episode_number,
            episode_name: showEpisode?.name || `Episode ${watchedEpisode.episode_number}`,
            watched_at: watchedEpisode.watched_at
          });
        });
      });
    });

    // Sort by watched_at date (most recent first)
    allEpisodes.sort((a, b) => {
      return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
    });

    return NextResponse.json({
      success: true,
      data: allEpisodes
    });

  } catch (error) {
    console.error('Error fetching watched episodes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watched episodes' },
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
    const { show_id, season_number, episode_number } = await request.json();

    if (!show_id || season_number === undefined || episode_number === undefined) {
      return NextResponse.json(
        { success: false, error: 'show_id, season_number, and episode_number are required' },
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

    // Check if show exists
    const show = await Show.findOne({ id: show_id });
    if (!show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404 }
      );
    }

    // Verify season and episode exist in the show
    const season = show.seasons.find(s => s.season_number === season_number);
    if (!season) {
      return NextResponse.json(
        { success: false, error: 'Season not found' },
        { status: 404 }
      );
    }

    const episode = season.episodes.find(e => e.episode_number === episode_number);
    if (!episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404 }
      );
    }

    // Find or create watched show entry
    let watchedShow = await WatchedShow.findOne({
      user_id: user.user_id,
      id: show_id
    });

    if (!watchedShow) {
      // Create new watched show entry
      watchedShow = await WatchedShow.create({
        user_id: user.user_id,
        id: show_id,
        seasons: [{
          season_number,
          episodes: [{
            episode_number,
            watched_at: new Date()
          }]
        }]
      });
    } else {
      // Update existing watched show
      const seasonIndex = watchedShow.seasons.findIndex(s => s.season_number === season_number);
      
      if (seasonIndex === -1) {
        // Add new season
        watchedShow.seasons.push({
          season_number,
          episodes: [{
            episode_number,
            watched_at: new Date()
          }]
        });
      } else {
        // Update existing season
        const episodeIndex = watchedShow.seasons[seasonIndex].episodes.findIndex(
          e => e.episode_number === episode_number
        );
        
        if (episodeIndex === -1) {
          // Add new episode
          watchedShow.seasons[seasonIndex].episodes.push({
            episode_number,
            watched_at: new Date()
          });
        } else {
          // Update existing episode
          watchedShow.seasons[seasonIndex].episodes[episodeIndex].watched_at = new Date();
        }
      }

      await watchedShow.save();
    }

    return NextResponse.json({
      success: true,
      data: watchedShow
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding watched episode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add watched episode' },
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
    const show_id = searchParams.get('show_id');
    const season_number = searchParams.get('season_number');
    const episode_number = searchParams.get('episode_number');

    if (!show_id) {
      return NextResponse.json(
        { success: false, error: 'show_id is required' },
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

    const watchedShow = await WatchedShow.findOne({
      user_id: user.user_id,
      id: parseInt(show_id)
    });

    if (!watchedShow) {
      return NextResponse.json(
        { success: false, error: 'Watched show not found' },
        { status: 404 }
      );
    }

    // If season and episode specified, remove just that episode
    if (season_number && episode_number) {
      const seasonIndex = watchedShow.seasons.findIndex(
        s => s.season_number === parseInt(season_number)
      );

      if (seasonIndex !== -1) {
        watchedShow.seasons[seasonIndex].episodes = watchedShow.seasons[seasonIndex].episodes.filter(
          e => e.episode_number !== parseInt(episode_number)
        );

        // Remove season if no episodes left
        if (watchedShow.seasons[seasonIndex].episodes.length === 0) {
          watchedShow.seasons.splice(seasonIndex, 1);
        }

        // Remove show if no seasons left
        if (watchedShow.seasons.length === 0) {
          await WatchedShow.findByIdAndDelete(watchedShow._id);
        } else {
          await watchedShow.save();
        }
      }
    } else {
      // Remove entire show
      await WatchedShow.findByIdAndDelete(watchedShow._id);
    }

    return NextResponse.json({
      success: true,
      message: 'Watched episode/show removed successfully'
    });

  } catch (error) {
    console.error('Error deleting watched show:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete watched show' },
      { status: 500 }
    );
  }
}