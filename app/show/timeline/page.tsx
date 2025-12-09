"use client";
import React, { useState, useEffect } from 'react';
import { Tv } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface WatchedEpisode {
  show_id: number;
  show_name: string;
  poster_path: string;
  season_number: number;
  episode_number: number;
  episode_name: string;
  watched_at: string;
}

interface GroupedEpisodes {
  [date: string]: WatchedEpisode[];
}

export default function WatchedShowsTimeline() {
  const [episodesByDate, setEpisodesByDate] = useState<GroupedEpisodes>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { username, isAuthenticated } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated) {
      //router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEpisodes();
    }
  }, [isAuthenticated]);

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${username}/watched/shows`);

      if (!response.ok) {
        throw new Error('Failed to fetch episodes');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch episodes');
      }

      const episodes: WatchedEpisode[] = result.data;

      // Group episodes by date
      const grouped: GroupedEpisodes = {};
      episodes.forEach((episode) => {
        const date = new Date(episode.watched_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(episode);
      });

      setEpisodesByDate(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatEpisodeCode = (season: number, episode: number) => {
    return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          Loading your episode timeline...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-200 text-center">{error}</p>
          <button 
            onClick={fetchEpisodes}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalEpisodes = Object.values(episodesByDate).reduce((sum, episodes) => sum + episodes.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Tv className="w-10 h-10" />
            Episode Watch Timeline
          </h1>
          <p className="text-blue-200">Your episode-by-episode journey</p>
          <p className="text-blue-300 text-sm mt-2">{totalEpisodes} episodes watched</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-44 top-0 bottom-0 w-0.5 bg-blue-500/30"></div>

          {/* Episodes grouped by date */}
          <div className="space-y-12">
            {Object.entries(episodesByDate).map(([date, episodes], dateIndex) => (
              <div key={dateIndex} className="relative">
                {/* Date label and dot */}
                <div className="absolute left-0 top-3 w-36 text-right pr-6">
                  <div className="text-blue-300 font-semibold text-sm">
                    {date}
                  </div>
                </div>
                <div className="absolute left-[172px] top-3 w-5 h-5 bg-blue-500 rounded-full border-4 border-slate-900 z-10"></div>

                {/* Episode cards */}
                <div className="pl-52 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {episodes.map((episode, episodeIndex) => (
                    <div key={episodeIndex} className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-500/20 hover:border-blue-500/40 transition-all hover:transform hover:scale-[1.02] shadow-xl">
                      {/* Poster */}
                      <div className="w-full h-48 bg-slate-700 relative">
                        {episode.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${episode.poster_path}`}
                            alt={episode.show_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'w-full h-full flex items-center justify-center';
                                placeholder.innerHTML = '<svg class="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Tv className="w-16 h-16 text-slate-500" />
                          </div>
                        )}
                        
                        {/* Episode badge */}
                        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                          {formatEpisodeCode(episode.season_number, episode.episode_number)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h2 className="text-base font-bold text-white mb-2 line-clamp-1">
                          {episode.show_name}
                        </h2>
                        
                        <p className="text-sm text-blue-200 line-clamp-2">
                          {episode.episode_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}