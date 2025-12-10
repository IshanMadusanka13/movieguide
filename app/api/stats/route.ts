// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/utils/dbConnect';
import User from '@/models/User';
import Movie from '@/models/Movie';
import Show from '@/models/Show';
import WatchedMovie from '@/models/WatchedMovie';
import WatchedShow from '@/models/WatchedShow';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
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

    // Get all watched movies for this user
    const watchedMovies = await WatchedMovie.find({ user_id: user.user_id })
      .sort({ watched_at: -1 });

    // Get all watched shows for this user
    const watchedShows = await WatchedShow.find({ user_id: user.user_id });

    // Calculate movie stats
    const moviesWatched = watchedMovies.length;
    const movieIds = watchedMovies.map(wm => wm.id);
    const movies = await Movie.find({ id: { $in: movieIds } });

    const totalMovieTime = movies.reduce((total, movie) => {
      return total + (movie.runtime || 0);
    }, 0);

    // Calculate show/episode stats
    let episodesWatched = 0;
    let totalShowTime = 0;
    const showIds = watchedShows.map(ws => ws.id);
    const shows = await Show.find({ id: { $in: showIds } });

    // Create a map of shows for quick lookup
    const showMap = new Map();
    shows.forEach(show => {
      showMap.set(show.id, show);
    });

    // Count episodes and calculate total show time
    watchedShows.forEach(watchedShow => {
      const show = showMap.get(watchedShow.id);
      if (show) {
        watchedShow.seasons.forEach((watchedSeason: any) => {
          episodesWatched += watchedSeason.episodes.length;

          // Find the corresponding season in the show
          const season = show.seasons.find((s: any) => s.season_number === watchedSeason.season_number);
          if (season) {
            watchedSeason.episodes.forEach((watchedEpisode: any) => {
              const episode = season.episodes.find((e: any) => e.episode_number === watchedEpisode.episode_number);
              if (episode && episode.runtime) {
                totalShowTime += episode.runtime;
              }
            });
          }
        });
      }
    });

    const showsWatched = watchedShows.length;

    // Get recent movies (last 10)
    const recentMovieData = await Promise.all(
      watchedMovies.slice(0, 10).map(async (wm) => {
        const movie = movies.find(m => m.id === wm.id);
        return {
          id: wm.id,
          title: movie?.title || 'Unknown Movie',
          poster_path: movie?.poster_path || '',
          watched_at: wm.watched_at.toISOString(),
          runtime: movie?.runtime || 0
        };
      })
    );

    // Get recent episodes (last 10)
    const recentEpisodeData: any[] = [];
    
    for (const watchedShow of watchedShows) {
      const show = showMap.get(watchedShow.id);
      if (!show) continue;

      for (const watchedSeason of watchedShow.seasons) {
        const season = show.seasons.find((s: any) => s.season_number === watchedSeason.season_number);
        if (!season) continue;

        for (const watchedEpisode of watchedSeason.episodes) {
          const episode = season.episodes.find((e: any) => e.episode_number === watchedEpisode.episode_number);
          if (!episode) continue;

          recentEpisodeData.push({
            show_id: watchedShow.id,
            show_name: show.name,
            show_poster_path: show.poster_path,
            season_number: watchedSeason.season_number,
            episode_number: watchedEpisode.episode_number,
            episode_name: episode.name,
            watched_at: watchedEpisode.watched_at ? watchedEpisode.watched_at.toISOString() : new Date().toISOString()
          });
        }
      }
    }

    // Sort recent episodes by watched_at and take last 10
    recentEpisodeData.sort((a, b) => {
      return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
    });
    const recentEpisodes = recentEpisodeData.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        moviesWatched,
        showsWatched,
        episodesWatched,
        totalMovieTime,
        totalShowTime,
        recentMovies: recentMovieData,
        recentEpisodes
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}