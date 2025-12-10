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

    watchedShows.forEach((watchedShow: any) => {
      const show = showMap.get(watchedShow.id);
      if (!show) return;

      watchedShow.seasons.forEach((watchedSeason: any) => {
        const showSeason = show.seasons.find((s: any) => s.season_number === watchedSeason.season_number);

        watchedSeason.episodes.forEach((watchedEpisode: any) => {
          if (!watchedEpisode.watched_at) return;

          const showEpisode = showSeason?.episodes.find(
            (e: any) => e.episode_number === watchedEpisode.episode_number
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