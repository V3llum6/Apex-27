import React, { useState, useEffect } from 'react';
import { 
  UserProfile, PlayerCard, DailyObjectivesState, 
  ObjectiveItem, ObjectiveRewardPack, LoginStreakDayReward 
} from '../types';
import { 
  loadObjectivesState, claimObjectiveReward, claimDailyGroupBonus, 
  openObjectivePack, getTimeUntilNextDailyReset, DAILY_BONUS_REWARD,
  getLoginStreakStatus, claimTodayLoginReward, LOGIN_STREAK_REWARDS, LoginStreakStatus
} from '../services/objectiveService';
import { PlayerCardView } from './PlayerCardView';
import { audio } from '../services/audioService';
import confetti from 'canvas-confetti';
import { 
  Trophy, ArrowLeftRight, Flame, Gift, Shield, CheckCircle2, 
  ChevronRight, Clock, Star, Coins, Sparkles, X, 
  ExternalLink, PackageOpen, Award, Target, Zap, Calendar, Lock
} from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  inventory: PlayerCard[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateInventory: (updated: PlayerCard[]) => void;
  onChangeTab: (tab: 'match' | 'draft' | 'squad' | 'market' | 'store' | 'exchange') => void;
}

export const DailyObjectives: React.FC<Props> = ({
  userProfile,
  inventory,
  onUpdateProfile,
  onUpdateInventory,
  onChangeTab,
}) => {
  const [objectivesState, setObjectivesState] = useState<DailyObjectivesState>(() => loadObjectivesState());
  const [streakStatus, setStreakStatus] = useState<LoginStreakStatus>(() => getLoginStreakStatus());
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'milestones'>('daily');
  const [countdown, setCountdown] = useState(getTimeUntilNextDailyReset().formatted);

  // Pack reveal modal state
  const [revealedPack, setRevealedPack] = useState<{
    pack: ObjectiveRewardPack;
    cards: PlayerCard[];
    sourceTitle: string;
  } | null>(null);

  // Notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Timer countdown updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextDailyReset().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for objective and streak update events dispatched across the app
  useEffect(() => {
    const handleUpdate = () => {
      setObjectivesState(loadObjectivesState());
    };
    const handleStreakUpdate = () => {
      setStreakStatus(getLoginStreakStatus());
    };

    window.addEventListener('apex_objective_update', handleUpdate);
    window.addEventListener('apex_login_streak_update', handleStreakUpdate);
    return () => {
      window.removeEventListener('apex_objective_update', handleUpdate);
      window.removeEventListener('apex_login_streak_update', handleStreakUpdate);
    };
  }, []);

  // Calculate daily completion stats
  const completedDailyCount = objectivesState.objectives.filter(o => o.isCompleted).length;
  const totalDailyCount = objectivesState.objectives.length;
  const isDailyMasterReady = completedDailyCount === totalDailyCount;
  const isDailyMasterClaimed = objectivesState.dailyBonusClaimed;

  // Handle claiming single objective
  const handleClaimReward = (item: ObjectiveItem) => {
    if (!item.isCompleted || item.isClaimed) return;

    audio.playClick();
    const { success, reward, updatedState } = claimObjectiveReward(item.id);
    if (!success || !reward) return;

    setObjectivesState(updatedState);

    // Apply currency rewards
    let newCoins = userProfile.coins + (reward.coins || 0);
    let newGems = userProfile.gems + (reward.gems || 0);
    let newTokens = userProfile.rankTokens + (reward.rankTokens || 0);
    let newXp = userProfile.xp + (reward.xp || 0);
    let newLevel = userProfile.level;

    if (newXp >= 500) {
      newLevel += Math.floor(newXp / 500);
      newXp = newXp % 500;
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      coins: newCoins,
      gems: newGems,
      rankTokens: newTokens,
      xp: newXp,
      level: newLevel,
    };
    onUpdateProfile(updatedProfile);

    // If reward includes a pack, open it and show excitement modal!
    if (reward.pack) {
      const cards = openObjectivePack(reward.pack);
      const updatedInv = [...inventory, ...cards];
      onUpdateInventory(updatedInv);

      audio.playCrowdCheer();
      confetti({ particleCount: 90, spread: 80 });

      setRevealedPack({
        pack: reward.pack,
        cards,
        sourceTitle: item.title,
      });
      showToast(`Claimed ${item.title}: +${(reward.coins || 0).toLocaleString()} Coins & ${reward.pack.name}!`);
    } else {
      audio.playCrowdCheer();
      confetti({ particleCount: 60, spread: 60 });
      showToast(
        `Claimed ${item.title}: +${(reward.coins || 0).toLocaleString()} Coins${
          reward.rankTokens ? ` & +${reward.rankTokens} Rank Token` : ''
        }!`
      );
    }
  };

  // Handle claiming group bonus
  const handleClaimGroupBonus = () => {
    if (!isDailyMasterReady || isDailyMasterClaimed) return;

    audio.playClick();
    const { success, reward, updatedState } = claimDailyGroupBonus();
    if (!success || !reward) return;

    setObjectivesState(updatedState);

    const newCoins = userProfile.coins + reward.coins;
    const newTokens = userProfile.rankTokens + reward.rankTokens;
    let newXp = userProfile.xp + reward.xp;
    let newLevel = userProfile.level;

    if (newXp >= 500) {
      newLevel += Math.floor(newXp / 500);
      newXp = newXp % 500;
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      coins: newCoins,
      rankTokens: newTokens,
      xp: newXp,
      level: newLevel,
    };
    onUpdateProfile(updatedProfile);

    // Open group bonus pack
    const cards = openObjectivePack(reward.pack);
    const updatedInv = [...inventory, ...cards];
    onUpdateInventory(updatedInv);

    audio.playCrowdCheer();
    confetti({ particleCount: 150, spread: 100 });

    setRevealedPack({
      pack: reward.pack,
      cards,
      sourceTitle: 'Daily Completionist Master Bonus',
    });

    showToast(`Master Bonus Claimed! +${reward.coins.toLocaleString()} Coins, +${reward.rankTokens} Tokens & ${reward.pack.name}!`);
  };

  // Handle claiming daily login streak reward
  const handleClaimLoginStreak = () => {
    if (!streakStatus.canClaimToday) return;

    audio.playClick();
    const res = claimTodayLoginReward();
    if (!res.success || !res.reward) return;

    const reward = res.reward;
    const newCoins = userProfile.coins + reward.coins;
    const newTokens = userProfile.rankTokens + (reward.rankTokens || 0);
    let newXp = userProfile.xp + reward.xp;
    let newLevel = userProfile.level;

    if (newXp >= 500) {
      newLevel += Math.floor(newXp / 500);
      newXp = newXp % 500;
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      coins: newCoins,
      rankTokens: newTokens,
      xp: newXp,
      level: newLevel,
    };
    onUpdateProfile(updatedProfile);

    setStreakStatus(getLoginStreakStatus());

    if (reward.pack) {
      const cards = openObjectivePack(reward.pack);
      const updatedInv = [...inventory, ...cards];
      onUpdateInventory(updatedInv);

      audio.playCrowdCheer();
      confetti({ particleCount: 130, spread: 90 });

      setRevealedPack({
        pack: reward.pack,
        cards,
        sourceTitle: `Day ${reward.day} Login Streak Reward`,
      });
      showToast(`Claimed Day ${reward.day} Streak: +${reward.coins.toLocaleString()} Coins & ${reward.pack.name}!`);
    } else {
      audio.playCrowdCheer();
      confetti({ particleCount: 80, spread: 70 });
      showToast(
        `Day ${reward.day} Streak Claimed! +${reward.coins.toLocaleString()} Coins${
          reward.rankTokens ? ` & +${reward.rankTokens} Rank Token` : ''
        }!`
      );
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'trophy': return Trophy;
      case 'arrow': return ArrowLeftRight;
      case 'flame': return Flame;
      case 'gift': return Gift;
      case 'shield': return Shield;
      case 'star': return Star;
      default: return Target;
    }
  };

  const currentList = activeSubTab === 'daily' ? objectivesState.objectives : objectivesState.milestones;
  const unclaimedCount = currentList.filter(o => o.isCompleted && !o.isClaimed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-cyan-950/95 border border-cyan-400 text-cyan-200 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-cyan-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Rewards & Season XP
            </span>
            <span className="text-xs text-gray-400 font-semibold">•</span>
            <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" />
              Resets in: <span className="text-yellow-400 font-bold">{countdown}</span>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            Daily Objectives & Milestones
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Complete tactical in-game milestones across Season matches, the Transfer Market, Draft arena, and Squad building to claim coins, tokens, and player packs!
          </p>
        </div>

        {/* Global Stats Capsule */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="bg-[#151B28] border border-gray-800 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Completed</span>
            <div className="text-lg font-mono font-black text-cyan-400">
              {objectivesState.totalCompletedCount}
            </div>
          </div>
          <div className="bg-[#151B28] border border-gray-800 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Claimed</span>
            <div className="text-lg font-mono font-black text-yellow-400">
              {objectivesState.totalClaimedRewardsCount}
            </div>
          </div>
        </div>
      </div>

      {/* 7-DAY CONSECUTIVE LOGIN STREAK PROGRESS CALENDAR */}
      <div className="relative overflow-hidden bg-[#0F141F] border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="relative z-10 space-y-5">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  7-Day Progress Calendar
                </span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400 font-semibold">
                  Consecutive Daily Login Tracker
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide flex items-center gap-2.5">
                <Flame className="w-6 h-6 text-orange-400 fill-orange-400 animate-pulse" />
                Daily Login Streak
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Check in every day to collect escalating coin bonuses, rank tokens, and elite pack rewards. Missing a calendar day resets your streak back to Day 1!
              </p>
            </div>

            {/* Streak Metric Badges */}
            <div className="flex items-center gap-3">
              <div className="bg-[#151B28] border border-orange-500/40 rounded-2xl px-4 py-2 text-center min-w-[110px]">
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 fill-orange-400" />
                  Active Streak
                </span>
                <div className="text-xl font-mono font-black text-white">
                  {streakStatus.currentStreak} <span className="text-xs text-gray-400 font-sans font-bold">Days</span>
                </div>
              </div>

              <div className="bg-[#151B28] border border-yellow-500/30 rounded-2xl px-4 py-2 text-center min-w-[100px]">
                <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                  All-Time Best
                </span>
                <div className="text-xl font-mono font-black text-yellow-300">
                  {streakStatus.highestStreak} <span className="text-xs text-gray-400 font-sans font-bold">Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Calendar Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {LOGIN_STREAK_REWARDS.map((reward) => {
              const isClaimed = streakStatus.claimedDaysInCurrentCycle.includes(reward.day);
              const isTodayTarget = reward.day === streakStatus.activeDayNumber;
              const isReadyToClaim = isTodayTarget && streakStatus.canClaimToday;
              const isClaimedToday = isTodayTarget && streakStatus.hasClaimedToday;
              const isLocked = !isClaimed && !isTodayTarget;

              return (
                <div
                  key={reward.day}
                  className={`relative rounded-2xl p-3.5 flex flex-col justify-between transition-all ${
                    isReadyToClaim
                      ? 'bg-gradient-to-b from-[#1C283F] to-[#111A2B] border-2 border-yellow-400 shadow-xl shadow-yellow-500/20 scale-[1.03]'
                      : isClaimedToday
                      ? 'bg-[#121E2F] border border-cyan-400/60 shadow-lg'
                      : isClaimed
                      ? 'bg-[#0E1520] border border-emerald-500/40 opacity-90'
                      : 'bg-[#10141D] border border-gray-800 opacity-70'
                  }`}
                >
                  {/* Day Header Badge */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`text-[11px] font-black uppercase tracking-wider ${
                      isReadyToClaim ? 'text-yellow-400' : isClaimed ? 'text-emerald-400' : 'text-gray-400'
                    }`}>
                      Day {reward.day}
                    </span>

                    {isClaimed ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Done
                      </span>
                    ) : isReadyToClaim ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-yellow-400 text-neutral-950 text-[9px] font-black uppercase tracking-wider animate-pulse">
                        Ready!
                      </span>
                    ) : isLocked ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 text-[9px] font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Locked
                      </span>
                    ) : null}
                  </div>

                  {/* Reward Visual Content */}
                  <div className="my-2 space-y-1 text-center">
                    <div className="flex items-center justify-center">
                      {reward.day === 7 ? (
                        <Trophy className="w-8 h-8 text-yellow-400 drop-shadow" />
                      ) : reward.pack ? (
                        <Gift className="w-7 h-7 text-cyan-400" />
                      ) : reward.rankTokens ? (
                        <Award className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <Coins className="w-7 h-7 text-yellow-400" />
                      )}
                    </div>

                    <div className="text-sm font-mono font-black text-white">
                      +{reward.coins >= 1000 ? `${(reward.coins / 1000).toLocaleString()}k` : reward.coins}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Coins
                    </div>

                    {/* Bonus Items (Tokens or Packs) */}
                    {reward.specialNote && (
                      <div className="mt-1 pt-1 border-t border-gray-800/80">
                        <span className={`text-[9px] font-black uppercase block leading-tight ${
                          reward.day === 7 ? 'text-yellow-300 font-extrabold' : 'text-cyan-300'
                        }`}>
                          {reward.specialNote}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Status / Micro-action */}
                  <div className="mt-2 pt-2 border-t border-gray-800/60 text-center">
                    {isReadyToClaim ? (
                      <button
                        onClick={handleClaimLoginStreak}
                        className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950 font-black text-[10px] uppercase tracking-wider cursor-pointer shadow-md shadow-yellow-500/20 transition-all hover:scale-105"
                      >
                        Claim!
                      </button>
                    ) : isClaimed ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Claimed
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-medium">
                        {reward.day > streakStatus.activeDayNumber
                          ? `In ${reward.day - streakStatus.activeDayNumber}d`
                          : 'Upcoming'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Action & Feedback Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#131926] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-gray-300 font-medium">
                {streakStatus.hasClaimedToday ? (
                  <>
                    You claimed Day <span className="text-yellow-400 font-bold">{streakStatus.activeDayNumber}</span> streak reward today! Next check-in opens in <span className="font-mono text-cyan-400 font-bold">{countdown}</span>.
                  </>
                ) : (
                  <>
                    Day <span className="text-yellow-400 font-bold">{streakStatus.activeDayNumber}</span> reward is available right now! Claim before midnight to maintain your streak.
                  </>
                )}
              </span>
            </div>

            {streakStatus.canClaimToday && (
              <button
                onClick={handleClaimLoginStreak}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4 fill-neutral-950" />
                Claim Day {streakStatus.activeDayNumber} Streak (+{streakStatus.todayReward.coins.toLocaleString()} Coins)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Featured Daily Completionist Bonus Card (5/5 Group Reward) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121927] via-[#0F141F] to-[#0A0D14] border border-yellow-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-yellow-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-yellow-400" />
                Completionist Group Bonus
              </span>
              <span className="text-xs font-mono font-bold text-gray-400">
                {completedDailyCount}/{totalDailyCount} Daily Objectives Completed
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
              Apex Daily Master Bundle
            </h3>
            <p className="text-xs text-gray-300">
              Finish all {totalDailyCount} daily tasks today to unlock the ultimate club care package: a massive coin cache, 2 Mascherano rank tokens, and an exclusive Jumbo Elite Pack!
            </p>

            {/* Daily Progress Bar */}
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-[11px] font-bold mb-1.5">
                <span className="text-gray-400">Daily Milestone Progress</span>
                <span className="text-yellow-400 font-mono">
                  {Math.round((completedDailyCount / totalDailyCount) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 rounded-full"
                  style={{ width: `${(completedDailyCount / totalDailyCount) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reward Badges & Claim Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">
            {/* Rewards Overview Pill Group */}
            <div className="flex flex-wrap gap-2">
              <div className="bg-[#151B28] border border-yellow-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                <Coins className="w-3.5 h-3.5" />
                <span>+25,000 Coins</span>
              </div>
              <div className="bg-[#151B28] border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Award className="w-3.5 h-3.5" />
                <span>+2 Rank Tokens</span>
              </div>
              <div className="bg-[#151B28] border border-cyan-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Gift className="w-3.5 h-3.5" />
                <span>Jumbo Elite Pack</span>
              </div>
            </div>

            {/* Claim / Status Button */}
            {isDailyMasterClaimed ? (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                Claimed For Today
              </button>
            ) : isDailyMasterReady ? (
              <button
                onClick={handleClaimGroupBonus}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4 fill-neutral-950" />
                Claim Group Master Bonus!
              </button>
            ) : (
              <div className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gray-900/80 border border-gray-800 text-gray-400 text-xs font-bold text-center">
                Complete {totalDailyCount - completedDailyCount} more to unlock
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audio.playClick();
              setActiveSubTab('daily');
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'daily'
                ? 'bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/25'
                : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Daily Tasks ({objectivesState.objectives.length})
            {objectivesState.objectives.some(o => o.isCompleted && !o.isClaimed) && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveSubTab('milestones');
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'milestones'
                ? 'bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/25'
                : 'bg-[#151B28] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Lifetime Milestones ({objectivesState.milestones.length})
            {objectivesState.milestones.some(o => o.isCompleted && !o.isClaimed) && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            )}
          </button>
        </div>

        {unclaimedCount > 0 && (
          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-bold animate-pulse">
            {unclaimedCount} Reward{unclaimedCount > 1 ? 's' : ''} Ready To Claim!
          </span>
        )}
      </div>

      {/* Objectives Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentList.map(item => {
          const Icon = getIcon(item.icon);
          const pct = Math.min(100, Math.round((item.currentProgress / item.targetProgress) * 100));

          return (
            <div
              key={item.id}
              className={`bg-[#0F141F] border rounded-3xl p-5 flex flex-col justify-between transition-all ${
                item.isClaimed
                  ? 'border-gray-800 opacity-60'
                  : item.isCompleted
                  ? 'border-yellow-400 shadow-xl shadow-yellow-500/10 bg-gradient-to-br from-[#151B28] to-[#0F141F]'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row: Category Badge & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${
                      item.isCompleted ? 'bg-yellow-400/20 text-yellow-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        {item.category}
                      </span>
                      {activeSubTab === 'daily' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/50 uppercase font-black">
                          Once Daily
                        </span>
                      )}
                    </div>
                  </div>

                  {item.isClaimed ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {activeSubTab === 'daily' ? 'Claimed Today (1/1)' : 'Claimed'}
                    </span>
                  ) : item.isCompleted ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-wider animate-pulse">
                      Completed!
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold text-gray-400">
                      {item.currentProgress} / {item.targetProgress}
                    </span>
                  )}
                </div>

                {/* Title and Description */}
                <div>
                  <h4 className="text-base font-black text-white">{item.title}</h4>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        item.isCompleted 
                          ? 'bg-yellow-400' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Rewards Showcase */}
                <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    Rewards:
                  </span>
                  {item.reward.coins && (
                    <span className="px-2 py-0.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      +{item.reward.coins.toLocaleString()}
                    </span>
                  )}
                  {item.reward.rankTokens && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      +{item.reward.rankTokens} Token
                    </span>
                  )}
                  {item.reward.xp && (
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 text-[10px] font-mono font-bold">
                      +{item.reward.xp} XP
                    </span>
                  )}
                  {item.reward.pack && (
                    <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30 text-[10px] font-bold flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      {item.reward.pack.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button Row */}
              <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between">
                {item.isClaimed ? (
                  <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {activeSubTab === 'daily' ? 'Claimed for today • Resets at midnight' : 'Reward claimed & sent to inventory'}
                  </span>
                ) : item.isCompleted ? (
                  <button
                    onClick={() => handleClaimReward(item)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
                    Claim Reward
                  </button>
                ) : item.shortcutTab ? (
                  <button
                    onClick={() => {
                      audio.playClick();
                      onChangeTab(item.shortcutTab!);
                    }}
                    className="w-full py-2 rounded-xl bg-[#151B28] hover:bg-[#1C2538] border border-gray-700 hover:border-cyan-400 text-gray-300 hover:text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>Go To {item.shortcutTab.charAt(0).toUpperCase() + item.shortcutTab.slice(1)}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-500 font-bold">
                    In Progress ({pct}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= REVEALED PACK CELEBRATION MODAL ================= */}
      {revealedPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in">
          <div className="max-w-2xl w-full bg-[#0F141F] border border-cyan-500/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 text-center">
            {/* Header Badge */}
            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                <PackageOpen className="w-3.5 h-3.5 text-cyan-400" />
                Objective Reward Pack Opened!
              </span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mt-2">
                {revealedPack.pack.name}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Earned from: <span className="text-yellow-400 font-bold">{revealedPack.sourceTitle}</span>
              </p>
            </div>

            {/* Revealed Player Cards Grid */}
            <div className="flex flex-wrap items-center justify-center gap-5 py-4">
              {revealedPack.cards.map(card => (
                <div key={card.id} className="flex flex-col items-center group transform hover:scale-105 transition-transform">
                  <PlayerCardView card={card} size="md" />
                  <div className="mt-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      {card.isTradable ? 'Tradable' : 'Untradable'}
                    </span>
                    <div className="text-xs font-bold text-white mt-1">{card.name}</div>
                    <div className="text-[10px] text-gray-400">{card.club} • {card.position}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Confirmation Footer */}
            <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {revealedPack.cards.length} new player{revealedPack.cards.length > 1 ? 's' : ''} added to your Club Squad & Market storage!
              </span>

              <button
                onClick={() => {
                  audio.playClick();
                  setRevealedPack(null);
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 cursor-pointer transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
