"use client";
import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface WatchedMovie {
  movie_id: number;
  title: string;
  overview: string;
  genres: string[];
  release_date: string;
  poster_path: string;
  runtime: number;
  watched_at: string;
}

interface GroupedMovies {
  [date: string]: WatchedMovie[];
}

export default function WatchedMoviesTimeline() {
  const [moviesByDate, setMoviesByDate] = useState<GroupedMovies>({});
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
      fetchMovies();
    }
  }, [isAuthenticated]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${username}/watched/movies`);

      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch movies');
      }

      const movies: WatchedMovie[] = result.data;

      // Group movies by date
      const grouped: GroupedMovies = {};
      movies.forEach((movie) => {
        const date = new Date(movie.watched_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(movie);
      });

      setMoviesByDate(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          Loading your movie timeline...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-200 text-center">{error}</p>
          <button 
            onClick={fetchMovies}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalMovies = Object.values(moviesByDate).reduce((sum, movies) => sum + movies.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Film className="w-10 h-10" />
            Movie Watch Timeline
          </h1>
          <p className="text-purple-200">Your cinematic journey through time</p>
          <p className="text-purple-300 text-sm mt-2">{totalMovies} movies watched</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-44 top-0 bottom-0 w-0.5 bg-purple-500/30"></div>

          {/* Movies grouped by date */}
          <div className="space-y-12">
            {Object.entries(moviesByDate).map(([date, movies], dateIndex) => (
              <div key={dateIndex} className="relative">
                {/* Date label and dot */}
                <div className="absolute left-0 top-3 w-36 text-right pr-6">
                  <div className="text-purple-300 font-semibold text-sm">
                    {date}
                  </div>
                </div>
                <div className="absolute left-[172px] top-3 w-5 h-5 bg-purple-500 rounded-full border-4 border-slate-900 z-10"></div>

                {/* Movie cards */}
                <div className="pl-52 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {movies.map((movie, movieIndex) => (
                    <div key={movieIndex} className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-purple-500/20 hover:border-purple-500/40 transition-all hover:transform hover:scale-[1.02] shadow-xl">
                      {/* Poster */}
                      <div className="w-full h-64 bg-slate-700">
                        {movie.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
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
                            <Film className="w-16 h-16 text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
                          {movie.title}
                        </h2>
                        <p className="text-purple-300 text-sm mb-3">
                          {new Date(movie.release_date).getFullYear()}
                        </p>

                        {/* Genres */}
                        {movie.genres && movie.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {movie.genres.slice(0, 3).map((genre, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-purple-500/20 text-purple-200 rounded-full text-xs font-medium border border-purple-500/30"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Runtime */}
                        {movie.runtime && (
                          <div className="text-xs text-slate-400">
                            {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                          </div>
                        )}
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