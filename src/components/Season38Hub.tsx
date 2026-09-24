import React, { useState, useMemo, useEffect } from 'react';
import { 
  SeasonCampaign, LeagueFixture, LeagueStanding, SeasonTopScorer, 
  Squad, UserProfile, TeamProfile, PlayerCard, SeasonRewardsSummary 
} from '../types';
import { 
  playUserMatchInSeason, simulateCurrentMatchday, 
  simulateRemainingSeason, startNew38Season,
  calculateSeasonRewards, claimSeasonEndRewards 
} from '../services/seasonService';
import { saveGameToSlot, getCurrentActiveSlotIndex } from '../services/storageService';
import { TOP_TEAMS } from '../data/teamsDatabase';
import { audio } from '../services/audioService';
import confetti from 'canvas-confetti';
import { 
  Trophy, Calendar, BarChart3, FastForward, Gamepad2, Award, 
  CheckCircle2, Flame, Shield, ArrowRight, RefreshCw, Star, 
  TrendingUp, Users, Zap, Clock, ChevronRight, AlertCircle, Sparkles, Save
} from 'lucide-react';

interface Season38HubProps {
  campaign: SeasonCampaign;
  onUpdateCampaign: (updated: SeasonCampaign) => void;
  userSquad: Squad;
  userProfile: UserProfile;
  userOvr: number;
  onUpdateProfile: (updated: UserProfile) => void;
  onLaunchArcadeMatch: (opponent: TeamProfile, isHome: boolean) => void;
}

export const Season38Hub: React.FC<Season38HubProps> = ({
  campaign,
  onUpdateCampaign,
  userSquad,
  userProfile,
  userOvr,
  onUpdateProfile,
  onLaunchArcadeMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings' | 'stats'>('fixtures');
  const [fixtureFilter, setFixtureFilter] = useState<'all' | 'played' | 'upcoming' | 'home' | 'away'>('all');
  const [selectedMatchdayView, setSelectedMatchdayView] = useState<number | null>(null);
  const [lastSimResult, setLastSimResult] = useState<{ match: LeagueFixture; message: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleQuickSaveSeason = () => {
    audio.playClick();
    const activeSlot = getCurrentActiveSlotIndex();
    saveGameToSlot(activeSlot);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // User standing
  const userStanding = useMemo(() => {
    return campaign.standings.find(s => s.isUser) || campaign.standings[0];
  }, [campaign.standings]);

  const userRank = useMemo(() => {
    return campaign.standings.findIndex(s => s.isUser) + 1;
  }, [campaign.standings]);

  // Current matchday user fixture
  const currentMatchday = campaign.currentMatchday;
  const currentFixture = useMemo(() => {
    return campaign.fixtures.find(f => f.matchday === currentMatchday && f.isUserMatch);
  }, [campaign.fixtures, currentMatchday]);

  // Opponent team profile for current matchday
  const currentOpponent = useMemo(() => {
    if (!currentFixture) return TOP_TEAMS[0];
    const oppId = currentFixture.homeTeamId === 'user_squad' 
      ? currentFixture.awayTeamId 
      : currentFixture.homeTeamId;
    return TOP_TEAMS.find(t => t.id === oppId) || TOP_TEAMS[0];
  }, [currentFixture]);

  const isUserHome = useMemo(() => {
    return currentFixture ? currentFixture.homeTeamId === 'user_squad' : true;
  }, [currentFixture]);

  // Played count
  const playedCount = useMemo(() => {
    return campaign.fixtures.filter(f => f.isUserMatch && f.isPlayed).length;
  }, [campaign.fixtures]);

  // End-of-Season rewards & golden boot bonus calculation
  const seasonRewards: SeasonRewardsSummary = useMemo(() => {
    return campaign.rewardsSummary || calculateSeasonRewards(campaign);
  }, [campaign]);

  // Trigger celebration if season just finished
  useEffect(() => {
    if (campaign.isCompleted && !showCelebration && playedCount === 38) {
      setShowCelebration(true);
      try {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [campaign.isCompleted, playedCount, showCelebration]);

  // Handle claiming all end-of-season rewards and Golden Boot bonus
  const handleClaimSeasonRewards = () => {
    if (!campaign.isCompleted || campaign.rewardsClaimed) return;
    audio.playCrowdCheer();
    try {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.55 }
      });
    } catch (e) {
      console.error(e);
    }
    const claimRes = claimSeasonEndRewards(campaign, userProfile);
    onUpdateProfile(claimRes.updatedProfile);
    onUpdateCampaign(claimRes.updatedCampaign);
  };

  // Starting squad cards from user squad for realistic team goalscorer distribution
  const userSquadCards = useMemo(() => {
    return Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];
  }, [userSquad]);

  // Striker name from user squad
  const userStrikerName = useMemo(() => {
    const st = userSquad.slots['st'] || userSquad.slots['rw'] || userSquad.slots['lw'] || userSquad.slots['cm1'];
    return st ? st.shortName : 'Apex Striker';
  }, [userSquad]);

  // Quick Sim Current Matchday
  const handleSimulateCurrentMatchday = () => {
    audio.playKick();
    try {
      const { campaign: updated, userMatch } = simulateCurrentMatchday(
        campaign, 
        userOvr, 
        userSquadCards.length > 0 ? userSquadCards : userStrikerName
      );

      // Reward coins and XP scaled to economic balance
      const diffMultiplier = userProfile.difficultySetting === 'legendary' ? 1.25 : userProfile.difficultySetting === 'world_class' ? 1.1 : 1.0;
      const isWin = userMatch.result === 'W';
      const isDraw = userMatch.result === 'D';
      const baseCoins = isWin ? 30000 : isDraw ? 10000 : 4000;
      const coinsEarned = Math.round(baseCoins * diffMultiplier);
      const xpEarned = isWin ? 140 : isDraw ? 60 : 25;
      const rankTokensEarned = 0;

      const updatedProfile: UserProfile = {
        ...userProfile,
        coins: userProfile.coins + coinsEarned,
        rankTokens: userProfile.rankTokens + rankTokensEarned,
        stats: {
          ...userProfile.stats,
          matchesPlayed: userProfile.stats.matchesPlayed + 1,
          wins: userProfile.stats.wins + (isWin ? 1 : 0),
          draws: userProfile.stats.draws + (isDraw ? 1 : 0),
          losses: userProfile.stats.losses + (!isWin && !isDraw ? 1 : 0),
          goalsScored: userProfile.stats.goalsScored + (userMatch.homeTeamId === 'user_squad' ? (userMatch.homeScore || 0) : (userMatch.awayScore || 0)),
          goalsConceded: userProfile.stats.goalsConceded + (userMatch.homeTeamId === 'user_squad' ? (userMatch.awayScore || 0) : (userMatch.homeScore || 0)),
        },
      };

      onUpdateProfile(updatedProfile);
      onUpdateCampaign(updated);

      const userGoals = userMatch.homeTeamId === 'user_squad' ? userMatch.homeScore : userMatch.awayScore;
      const oppGoals = userMatch.homeTeamId === 'user_squad' ? userMatch.awayScore : userMatch.homeScore;

      setLastSimResult({
        match: userMatch,
        message: `${isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}: ${userSquad.name} ${userGoals} - ${oppGoals} ${currentOpponent.name} (+${coinsEarned.toLocaleString()} Coins)`,
      });

      if (isWin) {
        audio.playGoalHorn();
      }

      if (updated.isCompleted && !updated.rewardsClaimed) {
        setShowCelebration(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate Next 5 Matchdays
  const handleSimulate5Matchdays = () => {
    audio.playKick();
    let curr = { ...campaign };
    let matchesSimmed = 0;
    let totalCoins = 0;

    for (let i = 0; i < 5; i++) {
      if (curr.isCompleted || curr.currentMatchday > 38) break;
      const res = simulateCurrentMatchday(curr, userOvr, userSquadCards.length > 0 ? userSquadCards : userStrikerName);
      curr = res.campaign;
      matchesSimmed++;
      const isWin = res.userMatch.result === 'W';
      const baseCoins = isWin ? 30000 : res.userMatch.result === 'D' ? 10000 : 4000;
      totalCoins += baseCoins;
    }

    if (matchesSimmed > 0) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        coins: userProfile.coins + totalCoins,
      };
      onUpdateProfile(updatedProfile);
      onUpdateCampaign(curr);
      setLastSimResult({
        match: curr.fixtures.filter(f => f.isUserMatch && f.isPlayed).slice(-1)[0],
        message: `Simulated ${matchesSimmed} Matchdays! Earned +${totalCoins.toLocaleString()} Coins across matches.`,
      });

      if (curr.isCompleted && !curr.rewardsClaimed) {
        setShowCelebration(true);
      }
    }
  };

  // Simulate All Remaining Matches
  const handleSimulateRestOfSeason = () => {
    audio.playKick();
    const updated = simulateRemainingSeason(campaign, userOvr, userSquadCards.length > 0 ? userSquadCards : userStrikerName);
    onUpdateCampaign(updated);
    setShowCelebration(true);
    setLastSimResult({
      match: updated.fixtures.filter(f => f.isUserMatch).slice(-1)[0],
      message: `Full 38-Match Season Completed! Final League Rank: #${updated.userFinalRank}`,
    });
  };

  // Start New Season (Safeguard uncollected rewards)
  const handleStartNewSeason = () => {
    audio.playClick();
    let currentCamp = campaign;
    if (campaign.isCompleted && !campaign.rewardsClaimed) {
      const claimRes = claimSeasonEndRewards(campaign, userProfile);
      currentCamp = claimRes.updatedCampaign;
      onUpdateProfile(claimRes.updatedProfile);
    }
    const fresh = startNew38Season(currentCamp, userSquad.name, userOvr);
    onUpdateCampaign(fresh);
    setShowCelebration(false);
    setLastSimResult(null);
  };

  // Filter fixtures for the calendar
  const filteredFixtures = useMemo(() => {
    const userMatches = campaign.fixtures.filter(f => f.isUserMatch);
    if (fixtureFilter === 'played') return userMatches.filter(f => f.isPlayed);
    if (fixtureFilter === 'upcoming') return userMatches.filter(f => !f.isPlayed);
    if (fixtureFilter === 'home') return userMatches.filter(f => f.homeTeamId === 'user_squad');
    if (fixtureFilter === 'away') return userMatches.filter(f => f.awayTeamId === 'user_squad');
    return userMatches;
  }, [campaign.fixtures, fixtureFilter]);

  // Selected Matchday Fixture Details
  const selectedMatchdayAllFixtures = useMemo(() => {
    if (!selectedMatchdayView) return [];
    return campaign.fixtures.filter(f => f.matchday === selectedMatchdayView);
  }, [campaign.fixtures, selectedMatchdayView]);

  return (
    <div className="space-y-6">
      {/* ================= HERO SEASON BANNER ================= */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-800 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold mb-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Full 38-Match League Season • Season {campaign.seasonNumber}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
              <span>{campaign.leagueName}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Compete across a grueling 38-match European campaign where every single match is played. Face 19 elite clubs home and away!
            </p>
          </div>

          {/* Quick Season Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleQuickSaveSeason}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                saveSuccess
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              }`}
              title="Save current season standings and squad state"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Season Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Save Season</span>
                </>
              )}
            </button>

            <button
              onClick={handleStartNewSeason}
              className="px-3.5 py-2 rounded-xl bg-[#151B28] hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              title="Reset campaign or start new 38-match title defense"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{campaign.isCompleted ? 'Next Season' : 'Reset Season'}</span>
            </button>
            {campaign.isCompleted && (
              <button
                onClick={() => setShowCelebration(true)}
                className="px-4 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-yellow-950/40"
              >
                <Award className="w-4 h-4 text-yellow-400" />
                <span>Trophy Ceremony</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= SEASON FINALE REWARDS BANNER ================= */}
        {campaign.isCompleted && (
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-emerald-500/20 border-2 border-yellow-400/60 shadow-xl relative overflow-hidden z-10 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">🏆</span>
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-400 font-mono">
                    Season {campaign.seasonNumber} Complete • End of Season Purse
                  </span>
                  {campaign.rewardsClaimed ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                      ✓ REWARDS CLAIMED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/50 text-[10px] font-black animate-pulse">
                      ★ UNCLAIMED BONUSES
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black italic uppercase text-white">
                  {campaign.trophyAwarded || `Final Standing: #${campaign.userFinalRank}`}
                </h3>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-300">
                  <span>
                    Placement Prize: <strong className="text-yellow-400 font-mono">+{seasonRewards.rankCoins.toLocaleString()} Coins</strong>
                    {seasonRewards.rankTokens > 0 && <span className="text-emerald-400 font-mono"> • +{seasonRewards.rankTokens} Tokens</span>}
                  </span>
                  {seasonRewards.goldenBootWon ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <span>👟 Golden Boot Bonus:</span>
                      <strong className="text-yellow-300 font-mono">+{seasonRewards.goldenBootBonus.toLocaleString()} Coins</strong>
                      <span className="text-[11px] text-amber-200/80 font-normal">({seasonRewards.goldenBootScorerName} • {seasonRewards.goldenBootGoals}G)</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[11px]">
                      👟 Golden Boot: {campaign.topScorers[0]?.playerName || 'League Striker'} ({campaign.topScorers[0]?.goals || 0}G) - Not won (+0)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {!campaign.rewardsClaimed ? (
                  <button
                    onClick={handleClaimSeasonRewards}
                    className="py-3 px-5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 font-black italic uppercase text-xs tracking-wider shadow-lg shadow-yellow-500/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 fill-neutral-950" />
                    <span>Claim +{seasonRewards.totalCoins.toLocaleString()} Coins</span>
                  </button>
                ) : (
                  <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>+{seasonRewards.totalCoins.toLocaleString()} Coins Credited</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Season Progress & Key Stats Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 relative z-10">
          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Matchday
            </span>
            <div className="text-2xl font-mono font-bold text-cyan-400 mt-0.5">
              {campaign.isCompleted ? '38 / 38' : `${currentMatchday} / 38`}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {campaign.isCompleted ? 'Season Concluded' : `${38 - playedCount} Fixtures Remaining`}
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              League Table Position
            </span>
            <div className="text-2xl font-mono font-bold text-yellow-400 mt-0.5 flex items-baseline gap-1">
              <span>#{userRank}</span>
              <span className="text-xs font-normal text-gray-400 font-sans">of 20</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {userRank === 1 ? '🥇 Title Leader' : userRank <= 4 ? '🥈 UCL Zone' : userRank <= 6 ? '🥉 Europa Zone' : 'Midtable'}
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Season Points
            </span>
            <div className="text-2xl font-mono font-bold text-white mt-0.5">
              {userStanding.points} <span className="text-xs text-gray-400 font-normal">PTS</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {userStanding.won}W • {userStanding.drawn}D • {userStanding.lost}L
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Goal Difference
            </span>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">
              {userStanding.goalDifference >= 0 ? `+${userStanding.goalDifference}` : userStanding.goalDifference}
            </div>
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {userStanding.goalsFor} GF / {userStanding.goalsAgainst} GA
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Recent Form
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              {userStanding.form.length === 0 ? (
                <span className="text-xs text-gray-500 font-mono">Season Opener</span>
              ) : (
                userStanding.form.map((res, i) => (
                  <span
                    key={i}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                      res === 'W'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : res === 'D'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {res}
                  </span>
                ))
              )}
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">
              Last 5 League Games
            </span>
          </div>

          <div className="bg-[#151B28] p-4 rounded-2xl border border-gray-800/90 shadow-inner">
            <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold block">
              Season Progress
            </span>
            <div className="text-2xl font-mono font-bold text-purple-400 mt-0.5">
              {Math.round((playedCount / 38) * 100)}%
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(playedCount / 38) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Notification pill if match was just simulated */}
        {lastSimResult && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between gap-3 text-xs text-cyan-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-semibold">{lastSimResult.message}</span>
            </div>
            <button
              onClick={() => setLastSimResult(null)}
              className="text-gray-400 hover:text-white text-[10px] font-mono uppercase cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ================= CURRENT MATCHDAY ARENA / ACTIVE FIXTURE ================= */}
      {!campaign.isCompleted && currentFixture && (
        <div className="bg-[#0F141F] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-yellow-400" />
                <span>Active Fixture • Matchday {currentMatchday} of 38</span>
              </div>
              <h3 className="text-xl font-black italic uppercase text-white mt-0.5">
                {isUserHome ? 'Home Fixture' : 'Away Fixture'} vs {currentOpponent.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-[#151B28] px-3.5 py-1.5 rounded-xl border border-gray-800 text-yellow-400">
              <span>Match Stakes: 3 League Points</span>
            </div>
          </div>

          {/* Versus Display */}
          <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 py-5">
            {/* Home Team */}
            <div className={`md:col-span-5 p-5 rounded-2xl border ${isUserHome ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-[#151B28] border-gray-800'} flex items-center justify-between shadow-lg`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-3xl shadow-inner">
                  {isUserHome ? '🦁' : currentOpponent.badge}
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-cyan-400">
                    {isUserHome ? 'Home (Your Club)' : 'Home Venue'}
                  </span>
                  <h4 className="text-lg font-black italic uppercase text-white truncate max-w-[200px]">
                    {isUserHome ? userSquad.name : currentOpponent.name}
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    {isUserHome ? `${userSquad.formation} • Apex Stadium` : currentOpponent.league}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black italic tracking-tighter text-white">
                  {isUserHome ? userOvr : currentOpponent.rating}
                </span>
                <span className="block text-[9px] text-gray-400 font-bold uppercase">OVR</span>
              </div>
            </div>

            {/* VS Badge */}
            <div className="md:col-span-1 text-center font-black italic text-xl text-yellow-400 tracking-tighter">
              VS
            </div>

            {/* Away Team */}
            <div className={`md:col-span-5 p-5 rounded-2xl border ${!isUserHome ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-[#151B28] border-gray-800'} flex items-center justify-between shadow-lg`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-3xl shadow-inner">
                  {!isUserHome ? '🦁' : currentOpponent.badge}
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-rose-400">
                    {!isUserHome ? 'Away (Your Club)' : 'Away Opponent'}
                  </span>
                  <h4 className="text-lg font-black italic uppercase text-white truncate max-w-[200px]">
                    {!isUserHome ? userSquad.name : currentOpponent.name}
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    {!isUserHome ? `${userSquad.formation}` : currentOpponent.keyPlayers.slice(0, 3).join(', ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black italic tracking-tighter text-white">
                  {!isUserHome ? userOvr : currentOpponent.rating}
                </span>
                <span className="block text-[9px] text-gray-400 font-bold uppercase">OVR</span>
              </div>
            </div>
          </div>

          {/* Action Launch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => onLaunchArcadeMatch(currentOpponent, isUserHome)}
              className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 font-black italic uppercase text-xs tracking-wider text-white shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Play Match (Arcade Pitch)</span>
            </button>

            <button
              onClick={handleSimulateCurrentMatchday}
              className="py-3.5 px-4 rounded-xl bg-white hover:bg-cyan-400 font-black italic uppercase text-xs tracking-wider text-black shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <FastForward className="w-4 h-4 fill-black" />
              <span>Simulate Matchday {currentMatchday}</span>
            </button>

            <button
              onClick={handleSimulate5Matchdays}
              className="py-3.5 px-4 rounded-xl bg-[#151B28] hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Quickly simulate next 5 matches"
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Simulate 5 Matchdays</span>
            </button>

            <button
              onClick={handleSimulateRestOfSeason}
              className="py-3.5 px-4 rounded-xl bg-[#151B28] hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Simulate all remaining fixtures in the 38-match calendar"
            >
              <Trophy className="w-4 h-4 text-purple-400" />
              <span>Simulate Rest of Season</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SEASON COMPLETED BANNER ================= */}
      {campaign.isCompleted && (
        <div className="bg-gradient-to-br from-yellow-500/10 via-[#0F141F] to-[#0F141F] border-2 border-yellow-400/60 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-4xl shadow-inner">
                🏆
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-yellow-400 tracking-widest">
                  Season {campaign.seasonNumber} Complete (38/38 Matches Played)
                </span>
                <h3 className="text-2xl font-black italic uppercase text-white">
                  {campaign.trophyAwarded || `Final Rank: #${campaign.userFinalRank}`}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  All 38 matches have been played. Final Points: {userStanding.points} • {userStanding.won} Wins • {userStanding.goalsFor} Goals Scored.
                </p>
              </div>
            </div>

            <button
              onClick={handleStartNewSeason}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 font-black italic uppercase text-xs tracking-wider text-black shadow-xl shadow-yellow-500/20 flex items-center gap-2.5 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Begin Season {campaign.seasonNumber + 1} Campaign</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB NAVIGATION: FIXTURES, STANDINGS, STATS ================= */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { audio.playClick(); setActiveTab('fixtures'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'fixtures'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>38-Match Fixtures ({playedCount}/38)</span>
          </button>

          <button
            onClick={() => { audio.playClick(); setActiveTab('standings'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'standings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>20-Team League Table</span>
          </button>

          <button
            onClick={() => { audio.playClick(); setActiveTab('stats'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Golden Boot & Leaders</span>
          </button>
        </div>

        {activeTab === 'fixtures' && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'played', 'upcoming', 'home', 'away'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFixtureFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  fixtureFilter === f
                    ? 'bg-cyan-400 text-black'
                    : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= TAB 1: 38-MATCH FIXTURE SCHEDULE ================= */}
      {activeTab === 'fixtures' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredFixtures.map(fix => {
              const isHome = fix.homeTeamId === 'user_squad';
              const oppName = isHome ? fix.awayTeamName : fix.homeTeamName;
              const oppBadge = isHome ? fix.awayTeamBadge : fix.homeTeamBadge;
              const oppRating = isHome ? fix.awayTeamRating : fix.homeTeamRating;
              const isCurrent = fix.matchday === currentMatchday && !campaign.isCompleted;

              const userScore = isHome ? fix.homeScore : fix.awayScore;
              const oppScore = isHome ? fix.awayScore : fix.homeScore;

              return (
                <div
                  key={fix.id}
                  onClick={() => setSelectedMatchdayView(fix.matchday)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isCurrent
                      ? 'bg-cyan-950/30 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-950/50'
                      : fix.isPlayed
                      ? 'bg-[#121722] border-gray-800/80 hover:border-gray-700'
                      : 'bg-[#0E121B] border-gray-800/50 opacity-80 hover:opacity-100 hover:border-gray-700'
                  }`}
                >
                  {/* Top Row: Matchday & Venue */}
                  <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                    <span className="font-bold text-gray-400">
                      MATCHDAY {fix.matchday}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isHome 
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' 
                        : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                    }`}>
                      {isHome ? 'Home' : 'Away'}
                    </span>
                  </div>

                  {/* Opponent & Result */}
                  <div className="flex items-center justify-between gap-2 py-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{oppBadge}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white truncate max-w-[130px]">
                          {oppName}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {oppRating} OVR
                        </span>
                      </div>
                    </div>

                    {/* Status / Score */}
                    {fix.isPlayed ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            fix.result === 'W'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : fix.result === 'D'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}>
                            {fix.result}
                          </span>
                          <span className="text-white font-scoreboard">{userScore} - {oppScore}</span>
                        </div>
                        {fix.topScorer && (
                          <span className="text-[9px] text-gray-500 truncate max-w-[100px] block mt-0.5">
                            {fix.topScorer}
                          </span>
                        )}
                      </div>
                    ) : isCurrent ? (
                      <div className="text-right">
                        <span className="px-2 py-1 rounded-md bg-cyan-400 text-black text-[10px] font-black uppercase tracking-wider animate-pulse">
                          PLAY NOW
                        </span>
                      </div>
                    ) : (
                      <div className="text-right text-[10px] text-gray-500 font-mono">
                        Upcoming
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: 20-TEAM LEAGUE STANDINGS TABLE ================= */}
      {activeTab === 'standings' && (
        <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-gray-800">
            <div>
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span>Apex Premier Championship Table (20 Clubs)</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Top 4 qualify for UEFA Champions League • 5th qualifies for Europa League • Bottom 3 relegated
              </p>
            </div>
            <div className="text-xs font-mono text-gray-400">
              Season {campaign.seasonNumber} • Round-Robin Double Leg (38 Matches)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">Pos</th>
                  <th className="py-3 px-3">Club</th>
                  <th className="py-3 px-2 text-center">MP</th>
                  <th className="py-3 px-2 text-center">W</th>
                  <th className="py-3 px-2 text-center">D</th>
                  <th className="py-3 px-2 text-center">L</th>
                  <th className="py-3 px-2 text-center hidden sm:table-cell">GF</th>
                  <th className="py-3 px-2 text-center hidden sm:table-cell">GA</th>
                  <th className="py-3 px-2 text-center">GD</th>
                  <th className="py-3 px-3 text-center font-bold text-white">PTS</th>
                  <th className="py-3 px-3 text-center hidden md:table-cell">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {campaign.standings.map((team, idx) => {
                  const pos = idx + 1;
                  const isTop4 = pos <= 4;
                  const isEuropa = pos === 5;
                  const isRelegation = pos >= 18;

                  return (
                    <tr
                      key={team.teamId}
                      className={`transition-colors ${
                        team.isUser
                          ? 'bg-cyan-500/10 font-bold text-white'
                          : 'hover:bg-gray-800/30 text-gray-300'
                      }`}
                    >
                      {/* Position */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={`inline-block w-6 h-6 rounded-md text-[11px] font-bold leading-6 ${
                          pos === 1
                            ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                            : isTop4
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : isEuropa
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isRelegation
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'text-gray-400'
                        }`}>
                          {pos}
                        </span>
                      </td>

                      {/* Club */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{team.badge}</span>
                          <div>
                            <span className="font-bold flex items-center gap-1.5">
                              {team.teamName}
                              {team.isUser && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-black text-[9px] font-black uppercase tracking-wider">
                                  YOU
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              {team.rating} OVR
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* MP */}
                      <td className="py-3 px-2 text-center font-mono text-gray-400">{team.played}</td>
                      <td className="py-3 px-2 text-center font-mono text-emerald-400 font-bold">{team.won}</td>
                      <td className="py-3 px-2 text-center font-mono text-yellow-400">{team.drawn}</td>
                      <td className="py-3 px-2 text-center font-mono text-rose-400">{team.lost}</td>
                      <td className="py-3 px-2 text-center font-mono text-gray-400 hidden sm:table-cell">{team.goalsFor}</td>
                      <td className="py-3 px-2 text-center font-mono text-gray-400 hidden sm:table-cell">{team.goalsAgainst}</td>
                      <td className="py-3 px-2 text-center font-mono font-bold">
                        <span className={team.goalDifference > 0 ? 'text-emerald-400' : team.goalDifference < 0 ? 'text-rose-400' : 'text-gray-400'}>
                          {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                        </span>
                      </td>

                      {/* PTS */}
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-cyan-300">
                        {team.points}
                      </td>

                      {/* Form */}
                      <td className="py-3 px-3 text-center hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {team.form.length === 0 ? (
                            <span className="text-[10px] text-gray-500 font-mono">-</span>
                          ) : (
                            team.form.map((res, i) => (
                              <span
                                key={i}
                                className={`w-4 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center ${
                                  res === 'W'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : res === 'D'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {res}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Legend */}
          <div className="flex items-center flex-wrap gap-4 pt-3 border-t border-gray-800 text-[10px] text-gray-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
              <span>1-4: UEFA Champions League</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span>5: UEFA Europa League</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
              <span>18-20: Relegation Zone</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: GOLDEN BOOT & SEASON STATS ================= */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Golden Boot Leaderboard */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <span>Golden Boot Race (Top Scorers)</span>
              </h3>
              <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">Season {campaign.seasonNumber}</span>
            </div>

            <div className="space-y-2">
              {campaign.topScorers.slice(0, 10).map((scorer, idx) => (
                <div
                  key={scorer.playerName}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    scorer.isUserPlayer
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-[#151B28] border-gray-800/80 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center ${
                      idx === 0
                        ? 'bg-yellow-400 text-black'
                        : idx === 1
                        ? 'bg-gray-300 text-black'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        {scorer.playerName}
                        {scorer.isUserPlayer && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-black text-[9px] font-black uppercase tracking-wider">
                            YOUR SQUAD
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        {scorer.teamBadge} {scorer.teamName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-black text-yellow-400 leading-none">
                      {scorer.goals}
                    </span>
                    <span className="block text-[9px] text-gray-500 uppercase font-bold">GOALS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* League Milestone Breakdown */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span>38-Match Season Milestones</span>
              </h3>
              <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">Rewards</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#151B28] border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">🥇 1st Place - Premier League Champion</span>
                  <span className="text-gray-400 text-[10px]">Crown of European supremacy & Premier Shield</span>
                </div>
                <strong className="text-yellow-400 font-mono text-sm">+5,000,000 Coins • 3 Tokens</strong>
              </div>

              <div className="p-3.5 rounded-xl bg-[#151B28] border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">🥈 2nd - 4th Place - Champions League Berth</span>
                  <span className="text-gray-400 text-[10px]">Elite tier qualification into continental giants</span>
                </div>
                <strong className="text-cyan-400 font-mono text-sm">+2,500,000 Coins • 2 Tokens</strong>
              </div>

              <div className="p-3.5 rounded-xl bg-[#151B28] border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">🥉 5th Place - Europa League Cup</span>
                  <span className="text-gray-400 text-[10px]">Continental competition ticket</span>
                </div>
                <strong className="text-emerald-400 font-mono text-sm">+1,500,000 Coins • 1 Token</strong>
              </div>

              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                seasonRewards.goldenBootWon 
                  ? 'bg-amber-500/15 border-amber-400/50' 
                  : 'bg-[#151B28] border-gray-800'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white block">👟 Season Golden Boot Winner</span>
                    {seasonRewards.goldenBootWon && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-black uppercase">
                        {campaign.isCompleted ? 'WON!' : 'LEADING!'}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-[10px] block mt-0.5">
                    {campaign.isCompleted ? (
                      seasonRewards.goldenBootWon ? (
                        <span className="text-amber-300 font-semibold">
                          🏆 Awarded to {seasonRewards.goldenBootScorerName} ({seasonRewards.goldenBootGoals} Goals) • +1,000,000 Coins Bonus
                        </span>
                      ) : (
                        <span>
                          Top scorer: {campaign.topScorers[0]?.playerName || 'League Striker'} ({campaign.topScorers[0]?.goals || 0}G) - Not won by your squad (+0)
                        </span>
                      )
                    ) : (
                      campaign.topScorers[0]?.isUserPlayer ? (
                        <span className="text-cyan-300 font-semibold">
                          ⭐ {campaign.topScorers[0]?.playerName} leads the league ({campaign.topScorers[0]?.goals}G)! Keep the lead for +1,000,000 Coins.
                        </span>
                      ) : (
                        <span>Top scorer prize awarded to league master finisher (+1,000,000 Coins bonus)</span>
                      )
                    )}
                  </span>
                </div>
                <strong className={`font-mono text-sm ${seasonRewards.goldenBootWon ? 'text-amber-300 font-black' : 'text-amber-400'}`}>
                  +1,000,000 Coins • Golden Trophy
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SELECTED MATCHDAY DETAILS ================= */}
      {selectedMatchdayView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-black italic uppercase text-white">
                  Matchday {selectedMatchdayView} Fixture Results
                </h3>
                <span className="text-[10px] text-gray-400 font-mono">
                  All 10 League Matches on Matchday {selectedMatchdayView}
                </span>
              </div>
              <button
                onClick={() => setSelectedMatchdayView(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {selectedMatchdayAllFixtures.map(f => (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    f.isUserMatch
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                      : 'bg-[#151B28] border-gray-800/80 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 w-5/12 justify-end text-right truncate">
                      <span className="font-bold truncate">{f.homeTeamName}</span>
                      <span className="text-base">{f.homeTeamBadge}</span>
                    </div>

                    <div className="px-3 font-mono font-bold text-center">
                      {f.isPlayed ? (
                        <span className="text-white text-sm">
                          {f.homeScore} - {f.awayScore}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">vs</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-5/12 truncate">
                      <span className="text-base">{f.awayTeamBadge}</span>
                      <span className="font-bold truncate">{f.awayTeamName}</span>
                    </div>
                  </div>
                  {f.isPlayed && f.topScorer && (
                    <div className="text-[10px] text-cyan-400/90 font-mono px-3 py-1 bg-black/40 rounded-lg border border-gray-800/60 text-center truncate">
                      ⚽ {f.topScorer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedMatchdayView(null)}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              Close Matchday
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: SEASON FINALE CELEBRATION ================= */}
      {showCelebration && campaign.isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F141F] border-2 border-yellow-400/80 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center mx-auto text-4xl shadow-xl shadow-yellow-400/30">
              🏆
            </div>

            <div>
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest font-mono">
                Season {campaign.seasonNumber} Complete
              </span>
              <h3 className="text-3xl font-black italic uppercase text-white mt-1">
                {campaign.trophyAwarded || `Final Rank: #${campaign.userFinalRank}`}
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Congratulations on surviving all 38 matches of the championship campaign!
              </p>
            </div>

            {/* Final Stats Bento */}
            <div className="grid grid-cols-3 gap-3 bg-[#151B28] p-4 rounded-2xl border border-gray-800">
              <div>
                <span className="text-[9px] uppercase font-mono text-gray-400 block">Final Rank</span>
                <strong className="text-xl font-mono text-yellow-400 font-bold">#{campaign.userFinalRank}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-gray-400 block">Total Points</span>
                <strong className="text-xl font-mono text-white font-bold">{userStanding.points} PTS</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-gray-400 block">Record</span>
                <strong className="text-xs font-mono text-emerald-400 font-bold block mt-1">
                  {userStanding.won}W-{userStanding.drawn}D-{userStanding.lost}L
                </strong>
              </div>
            </div>

            {/* Prize Rewards Detailed Breakdown */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 text-left space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 font-mono block border-b border-yellow-500/20 pb-1">
                Season Campaign Prize Purse & Bonuses:
              </span>
              <div className="flex items-center justify-between font-bold text-white">
                <span>League Finish ({seasonRewards.rankTitle}):</span>
                <span className="text-yellow-400 font-mono text-sm">+{seasonRewards.rankCoins.toLocaleString()} Coins</span>
              </div>
              {seasonRewards.rankTokens > 0 && (
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Universal Rank Tokens:</span>
                  <span className="text-emerald-400 font-mono text-sm">+{seasonRewards.rankTokens} Mascherano 💎</span>
                </div>
              )}

              {/* Golden Boot Scorer Award */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                seasonRewards.goldenBootWon 
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-300' 
                  : 'bg-black/30 border-gray-800 text-gray-400'
              }`}>
                <div>
                  <span className="font-black text-white flex items-center gap-1.5">
                    <span>👟 Golden Boot Top Scorer Award</span>
                    {seasonRewards.goldenBootWon && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-black uppercase">
                        WON!
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] block mt-0.5">
                    {seasonRewards.goldenBootWon
                      ? `${seasonRewards.goldenBootScorerName} led the league with ${seasonRewards.goldenBootGoals} goals!`
                      : `Top scorer: ${campaign.topScorers[0]?.playerName || 'League Striker'} (${campaign.topScorers[0]?.goals || 0}G)`}
                  </span>
                </div>
                <strong className={`font-mono text-sm font-black ${seasonRewards.goldenBootWon ? 'text-amber-300' : 'text-gray-500'}`}>
                  {seasonRewards.goldenBootWon ? `+${seasonRewards.goldenBootBonus.toLocaleString()} Coins` : '+0 Coins'}
                </strong>
              </div>

              {/* Total Payout */}
              <div className="pt-2 border-t border-yellow-500/30 flex items-center justify-between text-white font-black text-sm">
                <span>Total Season Payout:</span>
                <span className="text-yellow-400 font-mono text-base">+{seasonRewards.totalCoins.toLocaleString()} Coins</span>
              </div>
            </div>

            {/* Action Claim / Status */}
            <div>
              {!campaign.rewardsClaimed ? (
                <button
                  onClick={handleClaimSeasonRewards}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-neutral-950 font-black italic uppercase text-sm tracking-wider shadow-xl shadow-yellow-500/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 fill-neutral-950" />
                  <span>Claim All Bonuses (+{seasonRewards.totalCoins.toLocaleString()} Coins)</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>All Bonuses Claimed: +{seasonRewards.totalCoins.toLocaleString()} Coins Deposited!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowCelebration(false)}
                className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Review Table & Stats
              </button>
              <button
                onClick={handleStartNewSeason}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-black italic uppercase text-xs tracking-wider text-neutral-950 shadow-lg shadow-cyan-500/30 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Start Season {campaign.seasonNumber + 1}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
