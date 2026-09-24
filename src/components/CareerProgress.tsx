import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell 
} from 'recharts';
import { 
  Trophy, TrendingUp, Award, Shield, Target, Flame, 
  Calendar, CheckCircle2, ChevronRight, BarChart3, Activity, Users, Star
} from 'lucide-react';
import { CareerMatchRecord, SeasonRecord, UserProfile } from '../types';
import { computeSeasonalRecords } from '../services/storageService';

interface CareerProgressProps {
  careerHistory: CareerMatchRecord[];
  userProfile: UserProfile;
}

export const CareerProgress: React.FC<CareerProgressProps> = ({ careerHistory, userProfile }) => {
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [activeChartTab, setActiveChartTab] = useState<'win_loss' | 'ratings' | 'goals'>('win_loss');

  // Compute seasonal summaries
  const seasonalRecords = useMemo(() => {
    return computeSeasonalRecords(careerHistory);
  }, [careerHistory]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    if (selectedSeason === 'all') return careerHistory;
    return careerHistory.filter(m => m.season === selectedSeason);
  }, [careerHistory, selectedSeason]);

  // All-time aggregated stats
  const aggregateStats = useMemo(() => {
    const totalMatches = careerHistory.length;
    const wins = careerHistory.filter(m => m.result === 'W').length;
    const draws = careerHistory.filter(m => m.result === 'D').length;
    const losses = careerHistory.filter(m => m.result === 'L').length;
    const goalsFor = careerHistory.reduce((acc, m) => acc + m.userScore, 0);
    const goalsAgainst = careerHistory.reduce((acc, m) => acc + m.cpuScore, 0);
    const cleanSheets = careerHistory.filter(m => m.cpuScore === 0).length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    const avgRating = totalMatches > 0
      ? Number((careerHistory.reduce((acc, m) => acc + m.teamPerformanceRating, 0) / totalMatches).toFixed(1))
      : 0;
    const totalPoints = wins * 3 + draws * 1;

    return {
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      cleanSheets,
      winRate,
      avgRating,
      totalPoints,
    };
  }, [careerHistory]);

  // Seasonal Chart Data
  const seasonalChartData = useMemo(() => {
    return seasonalRecords.map(s => ({
      name: `S${s.seasonNumber}`,
      fullName: s.seasonName,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      points: s.points,
      winRate: s.winRatePct,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      avgRating: s.avgMatchRating,
    }));
  }, [seasonalRecords]);

  // Match Performance Trend Data
  const performanceTrendData = useMemo(() => {
    return filteredMatches.map((m, idx) => ({
      matchNumber: idx + 1,
      label: `M${idx + 1}`,
      opponent: m.opponentName,
      userScore: m.userScore,
      cpuScore: m.cpuScore,
      result: m.result,
      teamRating: m.teamPerformanceRating,
      mvpRating: m.topPerformer?.matchRating || m.teamPerformanceRating,
      mvpName: m.topPerformer?.playerName || 'Player',
      goalsScored: m.userScore,
      goalsConceded: m.cpuScore,
      possession: m.possessionPct,
      season: m.season,
    }));
  }, [filteredMatches]);

  // Top player performers across matches
  const topPerformers = useMemo(() => {
    const map = new Map<string, {
      name: string;
      club: string;
      goals: number;
      assists: number;
      mvpCount: number;
      ratingsSum: number;
      matchesCount: number;
    }>();

    careerHistory.forEach(m => {
      if (m.topPerformer?.playerName) {
        const key = m.topPerformer.playerName;
        const curr = map.get(key) || {
          name: key,
          club: m.topPerformer.playerClub,
          goals: 0,
          assists: 0,
          mvpCount: 0,
          ratingsSum: 0,
          matchesCount: 0,
        };
        curr.goals += m.topPerformer.goals;
        curr.assists += m.topPerformer.assists || 0;
        curr.mvpCount += 1;
        curr.ratingsSum += m.topPerformer.matchRating;
        curr.matchesCount += 1;
        map.set(key, curr);
      }
    });

    return Array.from(map.values())
      .map(p => ({
        ...p,
        avgRating: Number((p.ratingsSum / p.matchesCount).toFixed(1)),
      }))
      .sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating)
      .slice(0, 5);
  }, [careerHistory]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview Card */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Career Analytics & Seasonal Records</span>
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Manager Career Progress
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Track seasonal win-loss dynamics, goal trajectories, and squad performance ratings across all campaigns.
            </p>
          </div>

          {/* Season Filter Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                selectedSeason === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                  : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              All Seasons
            </button>
            {seasonalRecords.map(s => (
              <button
                key={s.seasonNumber}
                onClick={() => setSelectedSeason(s.seasonNumber)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  selectedSeason === s.seasonNumber
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                    : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Season {s.seasonNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6">
          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Win Rate
            </span>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">
              {aggregateStats.winRate}%
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {aggregateStats.wins}W - {aggregateStats.draws}D - {aggregateStats.losses}L
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Total Matches
            </span>
            <div className="text-2xl font-mono font-bold text-white mt-0.5">
              {aggregateStats.totalMatches}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Across {seasonalRecords.length} Seasons
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Goal Differential
            </span>
            <div className="text-2xl font-mono font-bold text-cyan-400 mt-0.5">
              +{aggregateStats.goalDifference}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {aggregateStats.goalsFor} For / {aggregateStats.goalsAgainst} Agst
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Clean Sheets
            </span>
            <div className="text-2xl font-mono font-bold text-purple-400 mt-0.5">
              {aggregateStats.cleanSheets}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Shutout Defense
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Avg Squad Rating
            </span>
            <div className="text-2xl font-mono font-bold text-yellow-400 mt-0.5">
              {aggregateStats.avgRating}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Performance Index
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Trophies Won
            </span>
            <div className="text-2xl font-mono font-bold text-amber-400 mt-0.5">
              {userProfile.stats.trophies} 🏆
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              Championship Silver
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Section: Seasonal Win-Loss & Performance Trends */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Chart View Selector Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-black italic uppercase text-base text-white">
              {activeChartTab === 'win_loss' && 'Seasonal Win-Loss-Draw Breakdown'}
              {activeChartTab === 'ratings' && 'Player & Squad Rating Trajectory Over Time'}
              {activeChartTab === 'goals' && 'Goals Scored vs Conceded Dynamics'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 bg-[#151B28] p-1 rounded-2xl border border-gray-800">
            <button
              onClick={() => setActiveChartTab('win_loss')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeChartTab === 'win_loss'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Win / Loss Record
            </button>
            <button
              onClick={() => setActiveChartTab('ratings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeChartTab === 'ratings'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Player Form & Ratings
            </button>
            <button
              onClick={() => setActiveChartTab('goals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeChartTab === 'goals'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Goal Trends
            </button>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="h-72 w-full pt-2">
          {activeChartTab === 'win_loss' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalChartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12} 
                  fontWeight="bold"
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0F141F] border border-gray-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5">
                          <div className="font-black text-white text-sm border-b border-gray-800 pb-1">
                            {data.fullName}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                            <span>Wins:</span>
                            <span className="font-mono font-bold text-sm">{data.wins}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-cyan-400 font-bold">
                            <span>Draws:</span>
                            <span className="font-mono font-bold text-sm">{data.draws}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-rose-400 font-bold">
                            <span>Losses:</span>
                            <span className="font-mono font-bold text-sm">{data.losses}</span>
                          </div>
                          <div className="pt-1.5 border-t border-gray-800 flex items-center justify-between text-yellow-400 font-bold">
                            <span>Points / Win Rate:</span>
                            <span className="font-mono">{data.points} pts ({data.winRate}%)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 12, fontSize: 11, fontWeight: 'bold' }} 
                />
                <Bar dataKey="wins" name="Wins (3 Pts)" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="draws" name="Draws (1 Pt)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="losses" name="Losses (0 Pts)" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'ratings' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <defs>
                  <linearGradient id="teamRatingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="mvpRatingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  domain={[6.5, 10]} 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  tickCount={6} 
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0F141F] border border-gray-700 p-3 rounded-2xl shadow-2xl text-xs space-y-1">
                          <div className="font-black text-white flex items-center justify-between gap-3">
                            <span>vs {data.opponent}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              data.result === 'W' ? 'bg-emerald-500/20 text-emerald-300' :
                              data.result === 'D' ? 'bg-cyan-500/20 text-cyan-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {data.userScore} - {data.cpuScore} ({data.result})
                            </span>
                          </div>
                          <div className="text-cyan-400 font-mono font-bold flex justify-between gap-4">
                            <span>Squad Performance:</span>
                            <span>{data.teamRating} / 10</span>
                          </div>
                          <div className="text-yellow-400 font-mono font-bold flex justify-between gap-4">
                            <span>MVP ({data.mvpName}):</span>
                            <span>{data.mvpRating} ★</span>
                          </div>
                          <div className="text-gray-400 text-[10px] flex justify-between pt-1 border-t border-gray-800">
                            <span>Possession:</span>
                            <span>{data.possession}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11, fontWeight: 'bold' }} />
                <Area 
                  type="monotone" 
                  dataKey="teamRating" 
                  name="Squad Match Rating" 
                  stroke="#06b6d4" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#teamRatingGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="mvpRating" 
                  name="Star Performer Rating" 
                  stroke="#fbbf24" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#mvpRatingGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'goals' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0F141F] border border-gray-700 p-3 rounded-2xl shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-white">Match vs {data.opponent}</div>
                          <div className="text-emerald-400 font-mono font-bold flex justify-between gap-4">
                            <span>Goals Scored:</span>
                            <span>{data.goalsScored} ⚽</span>
                          </div>
                          <div className="text-rose-400 font-mono font-bold flex justify-between gap-4">
                            <span>Goals Conceded:</span>
                            <span>{data.goalsConceded}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11, fontWeight: 'bold' }} />
                <Line 
                  type="monotone" 
                  dataKey="goalsScored" 
                  name="Goals Scored" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981' }} 
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="goalsConceded" 
                  name="Goals Conceded" 
                  stroke="#f43f5e" 
                  strokeWidth={2.5} 
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f43f5e' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two Columns: Seasonal Trophies Ledger & Top Squad Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Seasonal History Bento Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black italic uppercase text-base text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Campaign Progression Ledger
            </h3>
            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
              {seasonalRecords.length} Campaigns Recorded
            </span>
          </div>

          <div className="space-y-3">
            {seasonalRecords.map(season => (
              <div
                key={season.seasonNumber}
                onClick={() => setSelectedSeason(season.seasonNumber)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  selectedSeason === season.seasonNumber
                    ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
                    : 'border-gray-800 bg-[#151B28] hover:border-gray-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">{season.seasonName}</span>
                    {season.trophyAwarded && (
                      <span className="px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 text-[10px] font-mono font-bold">
                        {season.trophyAwarded}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-3 font-mono">
                    <span>{season.divisionTier}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">Top Scorer: {season.topScorer}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs font-mono font-bold text-white">
                      <span className="text-emerald-400">{season.wins}W</span> -{' '}
                      <span className="text-cyan-400">{season.draws}D</span> -{' '}
                      <span className="text-rose-400">{season.losses}L</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {season.goalsFor}GF : {season.goalsAgainst}GA (+{season.goalsFor - season.goalsAgainst})
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-black/40 border border-gray-800 text-center min-w-[64px]">
                    <span className="block text-sm font-mono font-bold text-yellow-400 leading-none">
                      {season.points}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-gray-500">PTS</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers Leaderboard (5 cols) */}
        <div className="lg:col-span-5 bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black italic uppercase text-base text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Squad Star Performers
            </h3>
            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
              Form Index
            </span>
          </div>

          <div className="space-y-2.5">
            {topPerformers.map((player, idx) => (
              <div 
                key={player.name}
                className="p-3 rounded-2xl bg-[#151B28] border border-gray-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-black/50 border border-gray-700 flex items-center justify-center font-mono font-bold text-sm text-yellow-400">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{player.name}</div>
                    <div className="text-[10px] text-gray-400">{player.club}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {player.goals} Goals
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {player.assists} Ast • {player.mvpCount} MVPs
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono font-bold text-xs">
                    {player.avgRating} ★
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Career Insight Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-[#151B28] border border-cyan-500/30 text-xs space-y-1 mt-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
              <TrendingUp className="w-3.5 h-3.5" />
              Tactical Performance Insight
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Your squad maintains a stellar <strong className="text-white">{aggregateStats.winRate}%</strong> win conversion rate. Lionel Messi and Vinícius Jr. lead individual impact with an average match rating exceeding 9.3!
            </p>
          </div>
        </div>
      </div>

      {/* Match History Log */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black italic uppercase text-base text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Recent Match Ledger ({filteredMatches.length} Matches)
          </h3>
          <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
            Sorted by Most Recent
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredMatches.slice().reverse().map(match => (
            <div 
              key={match.id}
              className="p-3.5 rounded-2xl bg-[#151B28] border border-gray-800 flex items-center justify-between gap-3 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{match.opponentBadge}</span>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-2">
                    <span>vs {match.opponentName}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-gray-400">
                      S{match.season}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2 font-mono">
                    <span>MVP: {match.topPerformer.playerName} ({match.topPerformer.matchRating}★)</span>
                    <span>•</span>
                    <span className="capitalize">{match.matchType === 'arcade' ? 'Interactive' : 'Simulation'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right font-mono font-bold text-sm">
                  <span className="text-white">{match.userScore}</span>
                  <span className="text-gray-500 mx-1">-</span>
                  <span className="text-gray-400">{match.cpuScore}</span>
                </div>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                  match.result === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  match.result === 'D' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {match.result}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
