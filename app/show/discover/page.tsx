"use client";
import React, { useState, useEffect } from 'react';
import { Tv, Star, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Show {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  popularity: number;
}

export default function DiscoverShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchShows();
    }
  }, [isAuthenticated, page]);

  const fetchShows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/discover/shows?page=${page}`);

      if (!response.ok) {
        throw new Error('Failed to fetch TV shows');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch TV shows');
      }

      if (page === 1) {
        setShows(result.data);
      } else {
        setShows(prev => [...prev, ...result.data]);
      }

      setHasMore(result.data.length > 0 && page < result.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleShowClick = (showId: number) => {
    router.push(`/show/${showId}`);
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          Discovering popular TV shows...
        </div>
      </div>
    );
  }

  if (error && shows.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-200 text-center">{error}</p>
          <button 
            onClick={() => {
              setPage(1);
              fetchShows();
            }}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <TrendingUp className="w-10 h-10" />
            Discover Popular TV Shows
          </h1>
          <p className="text-blue-200">Trending TV shows right now</p>
        </div>

        {/* Shows Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {shows.map((show) => (
            <button
              key={show.id}
              onClick={() => handleShowClick(show.id)}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-500/20 hover:border-blue-500/60 transition-all hover:transform hover:scale-105 shadow-xl text-left group"
            >
              {/* Poster */}
              <div className="w-full aspect-[2/3] bg-slate-700 relative overflow-hidden">
                {show.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                    alt={show.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-full flex items-center justify-center';
                        placeholder.innerHTML = '<svg class="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tv className="w-12 h-12 text-slate-500" />
                  </div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-semibold text-sm px-4 text-center">
                    View Details
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                  {show.name}
                </h3>
                
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A'}
                    </span>
                  </div>

                  {show.vote_average > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-yellow-500 font-semibold">
                        {show.vote_average.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Loading...
                </span>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}

        {!hasMore && shows.length > 0 && (
          <div className="text-center text-slate-400">
            <p>You've reached the end!</p>
          </div>
        )}
      </div>
    </div>
  );
}