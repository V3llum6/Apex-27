import React, { useState, useMemo } from 'react';
import { CareerMatchRecord, UserProfile } from '../types';
import { audio } from '../services/audioService';
import { 
  History, Calendar, Clock, Trophy, Search, Filter, 
  ChevronRight, CheckCircle2, XCircle, MinusCircle, 
  Shield, Star, Zap, Flame, RotateCcw, X, Eye, 
  Activity, ArrowUpDown, ChevronDown, Award, Gamepad2
} from 'lucide-react';

interface MatchHistoryProps {
  matches: CareerMatchRecord[];
  userProfile: UserProfile;
  onPlayRematch?: (opponentName: string) => void;
  onNavigateToPlay?: () => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  matches,
  userProfile,
  onPlayRematch,
  onNavigateToPlay,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'W' | 'D' | 'L'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'arcade' | 'quick_sim'>('all');
  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_goals' | 'biggest_margin'>('newest');
  const [selectedMatch, setSelectedMatch] = useState<CareerMatchRecord | null>(null);

  // Available seasons in the history
  const seasons = useMemo(() => {
    const s = new Set<number>();
    matches.forEach(m => s.add(m.season));
    return Array.from(s).sort((a, b) => b - a);
  }, [matches]);

  // Aggregate stats across all matches
  const stats = useMemo(() => {
    const total = matches.length;
    const wins = matches.filter(m => m.result === 'W').length;
    const draws = matches.filter(m => m.result === 'D').length;
    const losses = matches.filter(m => m.result === 'L').length;
    const goalsFor = matches.reduce((acc, m) => acc + m.userScore, 0);
    const goalsAgainst = matches.reduce((acc, m) => acc + m.cpuScore, 0);
    const cleanSheets = matches.filter(m => m.cpuScore === 0).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const avgGoals = total > 0 ? (goalsFor / total).toFixed(1) : '0.0';

    // Recent form (last 5 matches)
    const sortedByTimeDesc = [...matches].sort((a, b) => b.timestamp - a.timestamp);
    const recentForm = sortedByTimeDesc.slice(0, 5).map(m => m.result);

    return {
      total,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      cleanSheets,
      winRate,
      avgGoals,
      recentForm,
    };
  }, [matches]);

  // Filtered and sorted matches
  const filteredMatches = useMemo(() => {
    return matches
      .filter(m => {
        // Search by opponent name
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          if (!m.opponentName.toLowerCase().includes(query)) return false;
        }

        // Result filter
        if (resultFilter !== 'all' && m.result !== resultFilter) return false;

        // Type filter
        if (typeFilter !== 'all' && m.matchType !== typeFilter) return false;

        // Season filter
        if (seasonFilter !== 'all' && m.season !== seasonFilter) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return a.timestamp - b.timestamp;
          case 'highest_goals':
            return (b.userScore + b.cpuScore) - (a.userScore + a.cpuScore);
          case 'biggest_margin':
            return (b.userScore - b.cpuScore) - (a.userScore - a.cpuScore);
          case 'newest':
          default:
            return b.timestamp - a.timestamp;
        }
      });
  }, [matches, searchQuery, resultFilter, typeFilter, seasonFilter, sortBy]);

  // Helper to format timestamp to human readable date & relative time
  const formatMatchDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    let relative = dateStr;
    if (isToday) relative = `Today, ${timeStr}`;
    else if (isYesterday) relative = `Yesterday, ${timeStr}`;

    return { dateStr, timeStr, relative };
  };

  const resetFilters = () => {
    audio.playClick();
    setSearchQuery('');
    setResultFilter('all');
    setTypeFilter('all');
    setSeasonFilter('all');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Fixture Archive
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400 font-semibold">
                Historical Scorelines & Opponent Results
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight flex items-center gap-2.5">
              <span>Match History</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
              Track results of every previous match with exact scores, opponent details, match dates, player ratings, and tactical possession records.
            </p>
          </div>

          {/* Quick Play CTA */}
          {onNavigateToPlay && (
            <button
              onClick={() => {
                audio.playClick();
                onNavigateToPlay();
              }}
              className="self-start md:self-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <Gamepad2 className="w-4 h-4 fill-neutral-950" />
              <span>Play Next Match</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Overview Metrics Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Matches */}
        <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Total Matches
          </span>
          <div className="mt-2 text-2xl font-mono font-black text-white">
            {stats.total}
          </div>
          <span className="text-[10px] text-gray-500 font-bold">All Competitions</span>
        </div>

        {/* Record (W-D-L) */}
        <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            W - D - L Record
          </span>
          <div className="mt-2 text-xl font-mono font-black flex items-center gap-1.5">
            <span className="text-emerald-400">{stats.wins}W</span>
            <span className="text-gray-600">-</span>
            <span className="text-cyan-400">{stats.draws}D</span>
            <span className="text-gray-600">-</span>
            <span className="text-rose-400">{stats.losses}L</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">{stats.winRate}% Win Rate</span>
        </div>

        {/* Goals For / Against */}
        <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Goals Scored
          </span>
          <div className="mt-2 text-2xl font-mono font-black text-yellow-400">
            {stats.goalsFor} <span className="text-xs text-gray-500 font-normal">({stats.goalsAgainst} conc)</span>
          </div>
          <span className="text-[10px] text-gray-400 font-bold">
            {stats.goalDifference >= 0 ? `+${stats.goalDifference}` : stats.goalDifference} GD • {stats.avgGoals} G/M
          </span>
        </div>

        {/* Clean Sheets */}
        <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            Clean Sheets
          </span>
          <div className="mt-2 text-2xl font-mono font-black text-cyan-300">
            {stats.cleanSheets}
          </div>
          <span className="text-[10px] text-gray-500 font-bold">
            {stats.total > 0 ? `${Math.round((stats.cleanSheets / stats.total) * 100)}% of matches` : '0%'}
          </span>
        </div>

        {/* Recent Form */}
        <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-2">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            Recent Form (Last 5)
          </span>
          <div className="mt-2 flex items-center gap-2">
            {stats.recentForm.length > 0 ? (
              stats.recentForm.map((res, i) => (
                <span
                  key={i}
                  className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center border shadow-sm ${
                    res === 'W'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : res === 'D'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}
                >
                  {res}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic">No matches played yet</span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 font-bold">
            Club: <span className="text-white">{userProfile.clubName}</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search by opponent */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opponent (e.g., Real Madrid, Arsenal, Barcelona)..."
              className="w-full bg-[#151B28] border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#151B28] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_goals">Highest Total Goals</option>
              <option value="biggest_margin">Biggest Victory Margin</option>
            </select>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              Result:
            </span>

            {(['all', 'W', 'D', 'L'] as const).map(res => (
              <button
                key={res}
                onClick={() => {
                  audio.playClick();
                  setResultFilter(res);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  resultFilter === res
                    ? res === 'W'
                      ? 'bg-emerald-500 text-neutral-950 font-black'
                      : res === 'D'
                      ? 'bg-cyan-500 text-neutral-950 font-black'
                      : res === 'L'
                      ? 'bg-rose-500 text-white font-black'
                      : 'bg-white text-neutral-950 font-black'
                    : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {res === 'all' ? 'All Results' : res === 'W' ? 'Wins' : res === 'D' ? 'Draws' : 'Losses'}
              </button>
            ))}

            <span className="text-gray-700 mx-1">•</span>

            <span className="text-[11px] font-bold text-gray-500 mr-1">Mode:</span>
            {(['all', 'arcade', 'quick_sim'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  audio.playClick();
                  setTypeFilter(type);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === type
                    ? 'bg-cyan-500 text-neutral-950 font-black'
                    : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {type === 'all' ? 'All Types' : type === 'arcade' ? 'Arcade' : 'Quick Sim'}
              </button>
            ))}

            {seasons.length > 1 && (
              <>
                <span className="text-gray-700 mx-1">•</span>
                <span className="text-[11px] font-bold text-gray-500 mr-1">Season:</span>
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-[#151B28] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Seasons</option>
                  {seasons.map(s => (
                    <option key={s} value={s}>Season {s}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {(searchQuery || resultFilter !== 'all' || typeFilter !== 'all' || seasonFilter !== 'all' || sortBy !== 'newest') && (
            <button
              onClick={resetFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Match History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-semibold">
          <span>Showing {filteredMatches.length} of {matches.length} matches</span>
          <span>Click any fixture for full tactical match report</span>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-800/60 border border-gray-700 flex items-center justify-center mx-auto text-gray-500">
              <History className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                No Matches Found
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                {matches.length === 0
                  ? 'No matches have been played yet. Head over to the Exhibition Stadium or Season 38 to start your career history!'
                  : 'No matches matched your selected search filters.'}
              </p>
            </div>

            {matches.length === 0 && onNavigateToPlay ? (
              <button
                onClick={() => {
                  audio.playClick();
                  onNavigateToPlay();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer inline-flex items-center gap-2 hover:scale-105 transition-all"
              >
                <Gamepad2 className="w-4 h-4" />
                Play Your First Match
              </button>
            ) : (
              <button
                onClick={resetFilters}
                className="px-5 py-2 rounded-xl bg-[#151B28] border border-gray-700 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          filteredMatches.map((match) => {
            const dateInfo = formatMatchDate(match.timestamp);
            const isWin = match.result === 'W';
            const isDraw = match.result === 'D';
            const isLoss = match.result === 'L';

            return (
              <div
                key={match.id}
                onClick={() => {
                  audio.playClick();
                  setSelectedMatch(match);
                }}
                className={`group bg-[#0F141F] border rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden ${
                  isWin
                    ? 'border-gray-800 hover:border-emerald-500/50 hover:bg-[#121927]'
                    : isDraw
                    ? 'border-gray-800 hover:border-cyan-500/50 hover:bg-[#121927]'
                    : 'border-gray-800 hover:border-rose-500/50 hover:bg-[#151319]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Result Badge + Date/Time info */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    {/* Outcome Badge */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-black text-xs tracking-wider shrink-0 shadow-md ${
                        isWin
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isDraw
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      <span className="text-sm font-mono font-black">
                        {match.result}
                      </span>
                      <span className="text-[8px] uppercase tracking-tighter">
                        {isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                      </span>
                    </div>

                    {/* Date, Time & Season info */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{dateInfo.relative}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {dateInfo.timeStr}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 uppercase font-mono">
                          Season {match.season}
                        </span>
                        <span>•</span>
                        <span className="text-gray-400">
                          {match.matchType === 'arcade' ? '🎮 Arcade' : '⚡ Quick Sim'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Matchup Teams & Scoreline */}
                  <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6 bg-[#0B0E17] border border-gray-800/80 rounded-2xl py-3 px-4">
                    {/* User Club */}
                    <div className="flex-1 text-right">
                      <span className="text-xs sm:text-sm font-black text-white block truncate">
                        {userProfile.clubName}
                      </span>
                      <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                        Home
                      </span>
                    </div>

                    {/* Scoreline */}
                    <div className="flex items-center gap-2 bg-[#151B28] px-4 py-1.5 rounded-xl border border-gray-700/60 shadow-inner">
                      <span className={`text-xl sm:text-2xl font-mono font-black ${
                        match.userScore > match.cpuScore ? 'text-emerald-400' : match.userScore < match.cpuScore ? 'text-gray-400' : 'text-cyan-300'
                      }`}>
                        {match.userScore}
                      </span>
                      <span className="text-gray-600 font-bold">-</span>
                      <span className={`text-xl sm:text-2xl font-mono font-black ${
                        match.cpuScore > match.userScore ? 'text-rose-400' : match.cpuScore < match.userScore ? 'text-gray-400' : 'text-cyan-300'
                      }`}>
                        {match.cpuScore}
                      </span>
                    </div>

                    {/* Opponent Club */}
                    <div className="flex-1 text-left flex items-center gap-2">
                      <span className="text-xl sm:text-2xl shrink-0" role="img" aria-label="crest">
                        {match.opponentBadge}
                      </span>
                      <div className="truncate">
                        <span className="text-xs sm:text-sm font-black text-white block truncate">
                          {match.opponentName}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                          Opponent
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Key Details & Rematch Action */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                    {/* MVP / Star player badge */}
                    <div className="hidden sm:block text-right">
                      <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-yellow-300">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="truncate max-w-[130px]">{match.topPerformer.playerName}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Rating: <span className="text-gray-300 font-bold">{match.topPerformer.matchRating}</span>
                        {match.topPerformer.goals > 0 && ` • ${match.topPerformer.goals}G`}
                      </div>
                    </div>

                    {/* Clean sheet badge if applicable */}
                    {match.cpuScore === 0 && (
                      <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[9px] font-black text-cyan-300 uppercase tracking-wider">
                        Clean Sheet
                      </span>
                    )}

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                      {onPlayRematch && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playClick();
                            onPlayRematch(match.opponentName);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#151B28] hover:bg-cyan-500 hover:text-neutral-950 text-gray-300 border border-gray-700 hover:border-cyan-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                          title={`Rematch against ${match.opponentName}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Rematch</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="View Full Match Breakdown"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0F141F] border border-cyan-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  selectedMatch.result === 'W'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : selectedMatch.result === 'D'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}>
                  {selectedMatch.result === 'W' ? 'VICTORY' : selectedMatch.result === 'D' ? 'DRAW' : 'DEFEAT'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  Season {selectedMatch.season} • {selectedMatch.matchType === 'arcade' ? 'Arcade' : 'Quick Sim'}
                </span>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  setSelectedMatch(null);
                }}
                className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Hero */}
            <div className="bg-[#0B0E17] border border-gray-800 rounded-2xl p-5 text-center space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <div className="text-sm font-black text-white truncate">
                    {userProfile.clubName}
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">
                    Your Club
                  </span>
                </div>

                <div className="px-5 py-2 rounded-2xl bg-[#151B28] border border-gray-700 shadow-inner">
                  <span className="text-3xl font-mono font-black text-white">
                    {selectedMatch.userScore} - {selectedMatch.cpuScore}
                  </span>
                </div>

                <div className="flex-1 text-center">
                  <div className="text-2xl mb-0.5">{selectedMatch.opponentBadge}</div>
                  <div className="text-sm font-black text-white truncate">
                    {selectedMatch.opponentName}
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">
                    Opponent
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{formatMatchDate(selectedMatch.timestamp).dateStr}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{formatMatchDate(selectedMatch.timestamp).timeStr}</span>
              </div>
            </div>

            {/* Tactical Match Statistics */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Match Statistics & Telemetry
              </h4>

              <div className="bg-[#151B28] border border-gray-800 rounded-2xl p-4 space-y-3 text-xs">
                {/* Possession Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-cyan-400">{selectedMatch.possessionPct}%</span>
                    <span className="text-gray-400 uppercase font-black tracking-wider">Ball Possession</span>
                    <span className="text-gray-400">{100 - selectedMatch.possessionPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden flex">
                    <div
                      className="bg-cyan-500 h-full transition-all"
                      style={{ width: `${selectedMatch.possessionPct}%` }}
                    />
                    <div
                      className="bg-gray-700 h-full transition-all"
                      style={{ width: `${100 - selectedMatch.possessionPct}%` }}
                    />
                  </div>
                </div>

                {/* Shots Comparison */}
                <div className="flex items-center justify-between py-1.5 border-t border-gray-800/80">
                  <span className="font-mono font-bold text-white">{selectedMatch.shots}</span>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Total Shots</span>
                  <span className="font-mono font-bold text-gray-400">
                    {Math.max(2, Math.round(selectedMatch.shots * 0.7))}
                  </span>
                </div>

                {/* Shots on Target */}
                <div className="flex items-center justify-between py-1.5 border-t border-gray-800/80">
                  <span className="font-mono font-bold text-cyan-400">{selectedMatch.shotsOnTarget}</span>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Shots On Target</span>
                  <span className="font-mono font-bold text-gray-400">
                    {Math.max(selectedMatch.cpuScore, Math.round(selectedMatch.shotsOnTarget * 0.6))}
                  </span>
                </div>

                {/* Team Rating */}
                <div className="flex items-center justify-between py-1.5 border-t border-gray-800/80">
                  <span className="font-mono font-bold text-yellow-400">⭐ {selectedMatch.teamPerformanceRating}</span>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Team Match Rating</span>
                  <span className="font-mono font-bold text-gray-400">
                    ⭐ {(selectedMatch.teamPerformanceRating - (selectedMatch.result === 'W' ? 0.9 : -0.5)).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Performer Card */}
            <div className="bg-[#151B28] border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-yellow-400/20 text-yellow-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                    Match MVP / Star Performer
                  </div>
                  <div className="text-sm font-black text-white">
                    {selectedMatch.topPerformer.playerName}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {selectedMatch.topPerformer.playerClub}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-mono font-black text-yellow-300">
                  {selectedMatch.topPerformer.matchRating}
                </div>
                <div className="text-[10px] text-gray-400 font-bold">
                  {selectedMatch.topPerformer.goals} Goal{selectedMatch.topPerformer.goals !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
              {onPlayRematch && (
                <button
                  onClick={() => {
                    const opp = selectedMatch.opponentName;
                    setSelectedMatch(null);
                    onPlayRematch(opp);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Challenge Again</span>
                </button>
              )}

              <button
                onClick={() => {
                  audio.playClick();
                  setSelectedMatch(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#151B28] hover:bg-[#1E273A] border border-gray-700 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
