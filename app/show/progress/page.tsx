"use client";
import React, { useState, useEffect } from 'react';
import { Tv, Play, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ShowProgress {
  show_id: number;
  show_name: string;
  poster_path: string;
  total_episodes: number;
  watched_episodes: number;
  next_episode: {
    season_number: number;
    episode_number: number;
    episode_name: string;
  } | null;
  status: string;
  is_completed: boolean;
}

export default function ShowProgressPage() {
  const [shows, setShows] = useState<ShowProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { username, isAuthenticated } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchShowProgress();
    }
  }, [isAuthenticated]);

  const fetchShowProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${username}/shows/progress`);

      if (!response.ok) {
        throw new Error('Failed to fetch show progress');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch show progress');
      }

      setShows(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatEpisode = (season: number, episode: number) => {
    return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  };

  const getProgressPercentage = (watched: number, total: number) => {
    return Math.round((watched / total) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'returning series':
      case 'in production':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'ended':
      case 'canceled':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          Loading your show progress...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-200 text-center">{error}</p>
          <button 
            onClick={fetchShowProgress}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const inProgressShows = shows.filter(s => !s.is_completed);
  const completedShows = shows.filter(s => s.is_completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Tv className="w-10 h-10" />
            Show Progress
          </h1>
          <p className="text-indigo-200">Track your viewing progress</p>
          <p className="text-indigo-300 text-sm mt-2">
            {inProgressShows.length} in progress • {completedShows.length} completed
          </p>
        </div>

        {/* In Progress Shows */}
        {inProgressShows.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              In Progress
            </h2>
            <div className="space-y-4">
              {inProgressShows.map((show) => (
                <div 
                  key={show.show_id}
                  onClick={() => router.push(`/show/${show.show_id}`)}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/40 transition-all shadow-xl"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Poster */}
                    <div className="w-full md:w-48 h-64 md:h-auto bg-slate-700 flex-shrink-0">
                      {show.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                          alt={show.show_name}
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
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-bold text-white">
                          {show.show_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(show.status)}`}>
                          {show.status}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm text-indigo-300 mb-2">
                          <span>{show.watched_episodes} / {show.total_episodes} episodes</span>
                          <span>{getProgressPercentage(show.watched_episodes, show.total_episodes)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all"
                            style={{ 
                              width: `${getProgressPercentage(show.watched_episodes, show.total_episodes)}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Next Episode */}
                      {show.next_episode && (
                        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                          <Play className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-indigo-300 mb-1">Up Next</p>
                            <p className="text-white font-semibold">
                              {formatEpisode(show.next_episode.season_number, show.next_episode.episode_number)}
                              {' - '}
                              {show.next_episode.episode_name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Shows */}
        {completedShows.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              Completed
            </h2>
            <div className="space-y-4">
              {completedShows.map((show) => (
                <div 
                  key={show.show_id}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-green-500/20 hover:border-green-500/40 transition-all shadow-xl"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Poster */}
                    <div className="w-full md:w-48 h-64 md:h-auto bg-slate-700 flex-shrink-0">
                      {show.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                          alt={show.show_name}
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
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-bold text-white">
                          {show.show_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(show.status)}`}>
                          {show.status}
                        </span>
                      </div>

                      {/* Completed Badge */}
                      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-white font-semibold">
                            All {show.total_episodes} episodes watched
                          </p>
                          <p className="text-xs text-green-300">100% Complete</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {shows.length === 0 && (
          <div className="text-center py-12">
            <Tv className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No shows tracked yet</p>
            <p className="text-slate-500 text-sm mt-2">Start watching shows to see your progress here</p>
          </div>
        )}
      </div>
    </div>
  );
}