// app/api/users/[username]/shows/progress/route.ts
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

    // Calculate progress for each show
    const result = watchedShows.map(watchedShow => {
      const show = showMap.get(watchedShow.id);
      if (!show) return null;

      // Count total watched episodes
      let watchedEpisodeCount = 0;
      const watchedEpisodesSet = new Set<string>();

      watchedShow.seasons.forEach((watchedSeason: any) => {
        watchedSeason.episodes.forEach((watchedEpisode: any) => {
          if (watchedEpisode.watched_at) {
            const key = `S${watchedSeason.season_number}E${watchedEpisode.episode_number}`;
            watchedEpisodesSet.add(key);
            watchedEpisodeCount++;
          }
        });
      });

      // Find next unwatched episode
      let nextEpisode = null;
      let foundNext = false;

      for (const season of show.seasons.sort((a: any, b: any) => a.season_number - b.season_number)) {
        if (foundNext) break;
        
        const sortedEpisodes = season.episodes.sort((a: any, b: any) => a.episode_number - b.episode_number);
        
        for (const episode of sortedEpisodes) {
          const key = `S${season.season_number}E${episode.episode_number}`;
          
          if (!watchedEpisodesSet.has(key)) {
            nextEpisode = {
              season_number: season.season_number,
              episode_number: episode.episode_number,
              episode_name: episode.name
            };
            foundNext = true;
            break;
          }
        }
      }

      // Check if completed
      const isCompleted = watchedEpisodeCount >= show.number_of_episodes;

      return {
        show_id: show.id,
        show_name: show.name,
        poster_path: show.poster_path,
        total_episodes: show.number_of_episodes,
        watched_episodes: watchedEpisodeCount,
        next_episode: nextEpisode,
        status: show.status,
        is_completed: isCompleted
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null); // Remove null entries

    // Sort: in-progress shows first (by progress %), then completed shows (by name)
    result.sort((a, b) => {
      if (a.is_completed && !b.is_completed) return 1;
      if (!a.is_completed && b.is_completed) return -1;
      
      if (!a.is_completed && !b.is_completed) {
        const progressA = (a.watched_episodes / a.total_episodes) * 100;
        const progressB = (b.watched_episodes / b.total_episodes) * 100;
        return progressB - progressA; // Higher progress first
      }
      
      return a.show_name.localeCompare(b.show_name);
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching show progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch show progress' },
      { status: 500 }
    );
  }
}