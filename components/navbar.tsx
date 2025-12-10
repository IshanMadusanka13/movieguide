"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Film, Tv, Menu, X, Clock, TrendingUp, Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [discoverDropdown, setDiscoverDropdown] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  const navLinks = [
    { name: 'Search', icon: Search, href: '/search' },
    { name: 'Movie', icon: Film, href: '/movie/timeline' },
  ];

  const discoverLinks = [
    { name: 'Movie', icon: Film, href: '/movie/discover' },
    { name: 'Show', icon: Tv, href: '/show/discover' },
  ];

  const showSubLinks = [
    { name: 'TimeLine', icon: Clock, href: '/show/timeline' },
    { name: 'Progress', icon: TrendingUp, href: '/show/progress' },
  ];

  const handleShowClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleDiscoverClick = () => {
    setDiscoverDropdown(!discoverDropdown);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-purple-900/50 to-slate-900 backdrop-blur-lg border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/home" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                MovieGuide
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Discover Dropdown */}
            <div className="relative">
              <button
                onClick={handleDiscoverClick}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  pathname.startsWith('/movie/discover') || pathname.startsWith('/show/discover')
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Compass className="w-5 h-5" />
                <span>Discover</span>
              </button>

              {discoverDropdown && (
                <div className="absolute left-0 mt-2 w-48 bg-slate-800/90 backdrop-blur-lg rounded-xl border border-purple-500/20 shadow-lg py-2 z-50">
                  {discoverLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="flex items-center space-x-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/50 transition group"
                      onClick={() => setDiscoverDropdown(false)}
                    >
                      <link.icon className="w-4 h-4 group-hover:text-emerald-400" />
                      <span>{link.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  pathname === link.href
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            ))}

            {/* Show Dropdown */}
            <div className="relative">
              <button
                onClick={handleShowClick}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  pathname.startsWith('/show/timeline') || pathname.startsWith('/show/progress')
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Tv className="w-5 h-5" />
                <span>Show</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800/90 backdrop-blur-lg rounded-xl border border-purple-500/20 shadow-lg py-2 z-50">
                  {showSubLinks.map((sublink) => (
                    <Link
                      key={sublink.name}
                      href={sublink.href}
                      className="flex items-center space-x-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/50 transition group"
                      onClick={() => setShowDropdown(false)}
                    >
                      <sublink.icon className="w-4 h-4 group-hover:text-blue-400" />
                      <span>{sublink.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            {isAuthenticated && (
              <div className="ml-4 pl-4 border-l border-slate-700">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 rounded-lg border border-red-500/30 hover:border-red-500/50 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-800/90 backdrop-blur-lg rounded-xl border border-purple-500/20 my-2 py-4">
            <div className="flex flex-col space-y-2 px-4">
              {/* Discover Section in Mobile */}
              <div className="px-4 py-2">
                <div className="text-slate-400 text-sm font-medium mb-2 flex items-center space-x-2">
                  <Compass className="w-4 h-4" />
                  <span>Discover</span>
                </div>
                <div className="ml-4 space-y-2">
                  {discoverLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <link.icon className="w-4 h-4" />
                      <span>{link.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    pathname === link.href
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              ))}

              {/* Show Section in Mobile */}
              <div className="px-4 py-2">
                <div className="text-slate-400 text-sm font-medium mb-2 flex items-center space-x-2">
                  <Tv className="w-4 h-4" />
                  <span>Show</span>
                </div>
                <div className="ml-4 space-y-2">
                  {showSubLinks.map((sublink) => (
                    <Link
                      key={sublink.name}
                      href={sublink.href}
                      className="flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <sublink.icon className="w-4 h-4" />
                      <span>{sublink.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Logout in Mobile */}
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="mt-4 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 rounded-lg border border-red-500/30 hover:border-red-500/50 transition text-left"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showDropdown || discoverDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setDiscoverDropdown(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navbar;