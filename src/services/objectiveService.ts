import { 
  DailyObjectivesState, ObjectiveItem, ObjectiveRewardPack, 
  PlayerCard, MilestoneAction, LoginStreakDayReward, LoginStreakState,
  DailyStoreClaimsState
} from '../types';
import { BASE_PLAYERS, instantiatePlayerCard } from '../data/playersDatabase';

const STORAGE_KEY = 'apex27_daily_objectives';
const LOGIN_STREAK_KEY = 'apex27_login_streak';
const DAILY_STORE_CLAIMS_KEY = 'apex27_daily_store_claims';

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeUntilNextDailyReset(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = tomorrow.getTime() - now.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return { hours, minutes, seconds, formatted };
}

export const DAILY_BONUS_REWARD = {
  coins: 25000,
  rankTokens: 2,
  xp: 250,
  pack: {
    id: 'pack_apex_daily_master',
    name: 'Apex Daily Master Jumbo Pack',
    badgeText: 'DAILY MASTER (3 CARDS)',
    themeColor: 'from-amber-400 via-yellow-500 to-amber-700',
    description: 'Special Daily Completionist reward containing 3 Elite 84+ players with high Walkout potential.',
    cardCount: 3,
    minRating: 84,
    guarantee: '3x 84+ Elite Players (Tradable)',
    tradableGuaranteed: true,
  } as ObjectiveRewardPack,
};

function createInitialDailyObjectives(): ObjectiveItem[] {
  return [
    {
      id: 'daily_win_match',
      title: 'First Victory',
      description: 'Win 1 match in Season League, Draft Tournament, or Arcade Match',
      type: 'daily',
      actionType: 'win_match',
      category: 'matches',
      currentProgress: 0,
      targetProgress: 1,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 8000,
        xp: 150,
      },
      icon: 'trophy',
      shortcutTab: 'match',
    },
    {
      id: 'daily_list_market',
      title: 'Market Speculator',
      description: 'List 1 tradable player on the live Transfer Market',
      type: 'daily',
      actionType: 'list_market',
      category: 'market',
      currentProgress: 0,
      targetProgress: 1,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 6000,
        xp: 100,
        pack: {
          id: 'pack_gold_duo',
          name: 'Gold Squad Duo Pack',
          badgeText: '2 PLAYERS',
          themeColor: 'from-yellow-500 via-amber-600 to-stone-900',
          description: 'Contains 2 Gold squad players (80+ OVR) to bolster your depth.',
          cardCount: 2,
          minRating: 80,
          guarantee: '2 Gold Players (80+ OVR)',
          tradableGuaranteed: true,
        },
      },
      icon: 'arrow',
      shortcutTab: 'market',
    },
    {
      id: 'daily_score_goals',
      title: 'Goal Rush',
      description: 'Score 3 goals across any matches',
      type: 'daily',
      actionType: 'score_goals',
      category: 'matches',
      currentProgress: 0,
      targetProgress: 3,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 7500,
        rankTokens: 1,
        xp: 120,
      },
      icon: 'flame',
      shortcutTab: 'match',
    },
    {
      id: 'daily_open_pack',
      title: 'Pack Ripper',
      description: 'Open any Pack or Mystery Box in the Store',
      type: 'daily',
      actionType: 'open_pack',
      category: 'store',
      currentProgress: 0,
      targetProgress: 1,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 5000,
        xp: 100,
        pack: {
          id: 'pack_wonderkid_scout',
          name: 'Wonderkids Scout Pack',
          badgeText: 'PRODIGY',
          themeColor: 'from-cyan-500 via-blue-600 to-indigo-950',
          description: 'Includes 1 top wonderkid prospect card.',
          cardCount: 1,
          minRating: 82,
          guarantee: '1 Wonderkid Card (82+ OVR)',
          tradableGuaranteed: true,
        },
      },
      icon: 'gift',
      shortcutTab: 'store',
    },
    {
      id: 'daily_squad_activity',
      title: 'Club Builder',
      description: 'Complete a Card Exchange (SBC) or Train / Rank up a player',
      type: 'daily',
      actionType: 'complete_exchange',
      category: 'club',
      currentProgress: 0,
      targetProgress: 1,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 6500,
        rankTokens: 1,
        xp: 100,
      },
      icon: 'shield',
      shortcutTab: 'exchange',
    },
  ];
}

function createInitialMilestones(): ObjectiveItem[] {
  return [
    {
      id: 'milestone_wins_5',
      title: 'Champion In The Making',
      description: 'Win 5 matches across any competitive modes',
      type: 'milestone',
      actionType: 'win_match',
      category: 'matches',
      currentProgress: 0,
      targetProgress: 5,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 22000,
        xp: 300,
        pack: {
          id: 'pack_elite_85',
          name: 'Elite 85+ Standout Pack',
          badgeText: '85+ OVR',
          themeColor: 'from-fuchsia-600 via-purple-700 to-slate-900',
          description: 'Guarantees at least 1 high-tier 85+ rating European star.',
          cardCount: 1,
          minRating: 85,
          guarantee: '1x 85+ Elite Star',
          tradableGuaranteed: true,
        },
      },
      icon: 'trophy',
      shortcutTab: 'match',
    },
    {
      id: 'milestone_market_5',
      title: 'Transfer Tycoon',
      description: 'List 5 players on the Transfer Market',
      type: 'milestone',
      actionType: 'list_market',
      category: 'market',
      currentProgress: 0,
      targetProgress: 5,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 25000,
        rankTokens: 2,
        xp: 250,
      },
      icon: 'arrow',
      shortcutTab: 'market',
    },
    {
      id: 'milestone_goals_12',
      title: 'Apex Marksman',
      description: 'Score 12 goals across your career matches',
      type: 'milestone',
      actionType: 'score_goals',
      category: 'matches',
      currentProgress: 0,
      targetProgress: 12,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 20000,
        rankTokens: 1,
        xp: 250,
        pack: {
          id: 'pack_wonderkid_duo',
          name: 'Wonderkids Showcase Pack',
          badgeText: '2 WONDERKIDS',
          themeColor: 'from-cyan-500 via-teal-600 to-slate-900',
          description: 'Contains 2 top young talents with massive potential.',
          cardCount: 2,
          minRating: 82,
          guarantee: '2x Wonderkid Cards (82+ OVR)',
          tradableGuaranteed: true,
        },
      },
      icon: 'flame',
      shortcutTab: 'match',
    },
    {
      id: 'milestone_clean_sheets_2',
      title: 'Iron Fortress',
      description: 'Keep 2 clean sheets in matches',
      type: 'milestone',
      actionType: 'clean_sheet',
      category: 'matches',
      currentProgress: 0,
      targetProgress: 2,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 18000,
        rankTokens: 2,
        xp: 200,
      },
      icon: 'shield',
      shortcutTab: 'match',
    },
    {
      id: 'milestone_packs_5',
      title: 'Master Collector',
      description: 'Open 5 Packs or Mystery Boxes',
      type: 'milestone',
      actionType: 'open_pack',
      category: 'store',
      currentProgress: 0,
      targetProgress: 5,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 30000,
        xp: 400,
        pack: {
          id: 'pack_icons_legend',
          name: 'Icons & Legends Prime Pack',
          badgeText: 'GUARANTEED ICON',
          themeColor: 'from-yellow-400 via-amber-500 to-yellow-700',
          description: 'Guarantees 1 legendary Prime Icon from football history!',
          cardCount: 1,
          minRating: 88,
          guarantee: '1x Prime Icon Card (88+ OVR)',
          iconOnly: true,
          tradableGuaranteed: true,
        },
      },
      icon: 'star',
      shortcutTab: 'store',
    },
    {
      id: 'milestone_draft_2',
      title: 'Draft Arena Contender',
      description: 'Play 2 Draft Tournament matches',
      type: 'milestone',
      actionType: 'draft_match',
      category: 'club',
      currentProgress: 0,
      targetProgress: 2,
      isCompleted: false,
      isClaimed: false,
      reward: {
        coins: 20000,
        rankTokens: 1,
        xp: 200,
        pack: {
          id: 'pack_jumbo_rare',
          name: 'Jumbo Rare Players Pack',
          badgeText: '3 PLAYERS',
          themeColor: 'from-blue-600 via-indigo-700 to-slate-900',
          description: 'A 3-card bundle featuring top tier club recruits.',
          cardCount: 3,
          minRating: 81,
          guarantee: '3x Gold Rare Players (81+ OVR)',
          tradableGuaranteed: true,
        },
      },
      icon: 'trophy',
      shortcutTab: 'draft',
    },
  ];
}

export function loadObjectivesState(): DailyObjectivesState {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyObjectivesState;
      // Check if day rollover is required
      if (parsed.dateKey !== todayKey) {
        // Retain cumulative milestones, reset daily objectives!
        const refreshed: DailyObjectivesState = {
          dateKey: todayKey,
          lastResetTimestamp: Date.now(),
          dailyBonusClaimed: false,
          objectives: createInitialDailyObjectives(),
          milestones: parsed.milestones && parsed.milestones.length > 0 ? parsed.milestones : createInitialMilestones(),
          totalCompletedCount: parsed.totalCompletedCount || 0,
          totalClaimedRewardsCount: parsed.totalClaimedRewardsCount || 0,
        };
        saveObjectivesState(refreshed);
        return refreshed;
      }

      // Ensure all milestone definitions exist (in case new ones were added)
      const baseMilestones = createInitialMilestones();
      const mergedMilestones = baseMilestones.map(bm => {
        const existing = parsed.milestones?.find(m => m.id === bm.id);
        return existing || bm;
      });

      return {
        ...parsed,
        milestones: mergedMilestones,
      };
    }
  } catch (e) {
    console.error('Error loading objectives state:', e);
  }

  const initial: DailyObjectivesState = {
    dateKey: todayKey,
    lastResetTimestamp: Date.now(),
    dailyBonusClaimed: false,
    objectives: createInitialDailyObjectives(),
    milestones: createInitialMilestones(),
    totalCompletedCount: 0,
    totalClaimedRewardsCount: 0,
  };
  saveObjectivesState(initial);
  return initial;
}

export function saveObjectivesState(state: DailyObjectivesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving objectives state:', e);
  }
}

/**
 * Global progress tracker. Called whenever relevant in-game actions occur.
 * Automatically saves state and dispatches custom event for reactive UI updates.
 */
export function trackMilestoneProgress(action: MilestoneAction, amount: number = 1): {
  state: DailyObjectivesState;
  newlyCompleted: ObjectiveItem[];
} {
  const state = loadObjectivesState();
  const newlyCompleted: ObjectiveItem[] = [];

  const updateList = (list: ObjectiveItem[]) => {
    return list.map(item => {
      // Check for direct match or dual triggers (e.g. train_player counts for daily_squad_activity)
      const isMatch = 
        item.actionType === action || 
        (item.id === 'daily_squad_activity' && (action === 'complete_exchange' || action === 'train_player'));

      if (isMatch && !item.isCompleted) {
        const nextProgress = Math.min(item.targetProgress, item.currentProgress + amount);
        const willComplete = nextProgress >= item.targetProgress;
        if (willComplete) {
          newlyCompleted.push({ ...item, currentProgress: nextProgress, isCompleted: true });
        }
        return {
          ...item,
          currentProgress: nextProgress,
          isCompleted: willComplete,
        };
      }
      return item;
    });
  };

  const updatedDaily = updateList(state.objectives);
  const updatedMilestones = updateList(state.milestones);

  const updatedState: DailyObjectivesState = {
    ...state,
    objectives: updatedDaily,
    milestones: updatedMilestones,
    totalCompletedCount: state.totalCompletedCount + newlyCompleted.length,
  };

  saveObjectivesState(updatedState);

  // Dispatch custom event for real-time reactive notifications
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('apex_objective_update', {
        detail: {
          action,
          amount,
          newlyCompleted,
          unclaimedCount: getUnclaimedObjectivesCount(updatedState),
        },
      })
    );
  }

  return { state: updatedState, newlyCompleted };
}

/**
 * Returns count of completed objectives and group bonus ready to be claimed
 */
export function getUnclaimedObjectivesCount(state: DailyObjectivesState): number {
  let count = 0;
  state.objectives.forEach(o => {
    if (o.isCompleted && !o.isClaimed) count++;
  });
  state.milestones.forEach(m => {
    if (m.isCompleted && !m.isClaimed) count++;
  });

  const allDailyDone = state.objectives.every(o => o.isCompleted);
  if (allDailyDone && !state.dailyBonusClaimed) {
    count++;
  }

  // Include login streak if unclaimed today
  const streak = loadLoginStreakState();
  if (streak.lastClaimDate !== getTodayDateKey()) {
    count++;
  }

  return count;
}

/**
 * Claims a specific completed objective reward
 */
export function claimObjectiveReward(objectiveId: string): {
  success: boolean;
  reward?: ObjectiveItem['reward'];
  updatedState: DailyObjectivesState;
} {
  const state = loadObjectivesState();
  let foundReward: ObjectiveItem['reward'] | undefined;

  const markClaimed = (list: ObjectiveItem[]) => {
    return list.map(item => {
      if (item.id === objectiveId && item.isCompleted && !item.isClaimed) {
        foundReward = item.reward;
        return { ...item, isClaimed: true };
      }
      return item;
    });
  };

  const updatedDaily = markClaimed(state.objectives);
  const updatedMilestones = markClaimed(state.milestones);

  if (!foundReward) {
    return { success: false, updatedState: state };
  }

  const updatedState: DailyObjectivesState = {
    ...state,
    objectives: updatedDaily,
    milestones: updatedMilestones,
    totalClaimedRewardsCount: state.totalClaimedRewardsCount + 1,
  };

  saveObjectivesState(updatedState);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('apex_objective_update', {
        detail: {
          claimedId: objectiveId,
          unclaimedCount: getUnclaimedObjectivesCount(updatedState),
        },
      })
    );
  }

  return { success: true, reward: foundReward, updatedState };
}

/**
 * Claims the 5/5 Daily Objectives Group Bonus
 */
export function claimDailyGroupBonus(): {
  success: boolean;
  reward?: typeof DAILY_BONUS_REWARD;
  updatedState: DailyObjectivesState;
} {
  const state = loadObjectivesState();
  const allDailyDone = state.objectives.every(o => o.isCompleted);

  if (!allDailyDone || state.dailyBonusClaimed) {
    return { success: false, updatedState: state };
  }

  const updatedState: DailyObjectivesState = {
    ...state,
    dailyBonusClaimed: true,
    totalClaimedRewardsCount: state.totalClaimedRewardsCount + 1,
  };

  saveObjectivesState(updatedState);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('apex_objective_update', {
        detail: {
          claimedDailyBonus: true,
          unclaimedCount: getUnclaimedObjectivesCount(updatedState),
        },
      })
    );
  }

  return { success: true, reward: DAILY_BONUS_REWARD, updatedState };
}

/**
 * Unpacks an objective reward pack into genuine PlayerCard instances from the database
 */
export function openObjectivePack(pack: ObjectiveRewardPack): PlayerCard[] {
  let pool = [...BASE_PLAYERS];

  if (pack.iconOnly) {
    pool = pool.filter(p => p.league === 'Icons & Legends');
  } else if (pack.id.includes('wonderkid')) {
    pool = pool.filter(p => p.rating >= 81 && p.rating <= 88);
  }

  // Filter pool by min rating if available
  const ratingFiltered = pool.filter(p => p.rating >= pack.minRating);
  const candidates = ratingFiltered.length >= pack.cardCount ? ratingFiltered : pool;

  // Weighted draw favoring realistic rating distributions (80-83 common, 85-88 rare, 89+ jackpot)
  const drawWeightedCard = (available: typeof BASE_PLAYERS): typeof BASE_PLAYERS[0] => {
    const weighted = available.map(player => {
      let weight = 100;
      if (player.rating >= 91) weight = 2;
      else if (player.rating >= 88) weight = 8;
      else if (player.rating >= 86) weight = 20;
      else if (player.rating >= 84) weight = 45;
      else if (player.rating >= 82) weight = 80;
      return { player, weight };
    });

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of weighted) {
      if (rand <= item.weight) return item.player;
      rand -= item.weight;
    }
    return weighted[0]?.player || available[0];
  };

  const pulledCards: PlayerCard[] = [];
  const chosenIds = new Set<string>();

  for (let i = 0; i < pack.cardCount; i++) {
    const remaining = candidates.filter(p => !chosenIds.has(p.id));
    const selected = drawWeightedCard(remaining.length > 0 ? remaining : candidates);
    chosenIds.add(selected.id);

    const isTradable = pack.tradableGuaranteed ?? true;
    const cardInstance = instantiatePlayerCard(selected, isTradable, 0);
    pulledCards.push(cardInstance);
  }

  return pulledCards;
}

// ==================== APEX 27 LOGIN STREAK SYSTEM ====================

export const LOGIN_STREAK_REWARDS: LoginStreakDayReward[] = [
  {
    day: 1,
    title: 'Kickoff Boost',
    coins: 15000,
    xp: 100,
    badge: 'DAY 1',
    description: 'Initial login boost to jumpstart today\'s squad operations.',
  },
  {
    day: 2,
    title: 'Momentum Builder',
    coins: 25000,
    xp: 150,
    badge: 'DAY 2',
    description: 'Consecutive entry bonus with escalating club funds.',
  },
  {
    day: 3,
    title: 'Tactical Edge',
    coins: 40000,
    xp: 150,
    rankTokens: 1,
    badge: 'DAY 3 • RANK TOKEN',
    description: 'Universal Mascherano Rank Token + 40,000 Coins!',
  },
  {
    day: 4,
    title: 'Midweek Surge',
    coins: 60000,
    xp: 200,
    badge: 'DAY 4',
    description: 'Significant treasury boost for transfer market power.',
  },
  {
    day: 5,
    title: 'Squad Reinforcement',
    coins: 85000,
    xp: 200,
    pack: {
      id: 'pack_streak_duo',
      name: 'Streak Elite Duo Pack',
      badgeText: '2 PLAYERS (81+)',
      themeColor: 'from-amber-500 via-orange-600 to-stone-900',
      description: 'Contains 2 Gold squad players (81+ OVR) to bolster your depth.',
      cardCount: 2,
      minRating: 81,
      guarantee: '2x 81+ Gold Players (Tradable)',
      tradableGuaranteed: true,
    },
    badge: 'DAY 5 • PACK',
    description: '85,000 Coins + Streak Elite Duo Pack (2x 81+ Players)!',
  },
  {
    day: 6,
    title: 'Penultimate Stride',
    coins: 120000,
    xp: 250,
    rankTokens: 2,
    badge: 'DAY 6 • 2 TOKENS',
    description: 'Major reward package: 120,000 Coins + 2 Mascherano Rank Tokens!',
  },
  {
    day: 7,
    title: 'Grand Champion Vault',
    coins: 200000,
    xp: 500,
    rankTokens: 3,
    pack: {
      id: 'pack_streak_grand_master',
      name: '7-Day Grand Master Jumbo Pack',
      badgeText: '3 ELITES (85+)',
      themeColor: 'from-yellow-400 via-amber-500 to-yellow-800',
      description: 'Grand 7-day milestone jackpot pack containing 3 top tier 85+ players!',
      cardCount: 3,
      minRating: 85,
      guarantee: '3x 85+ Elite Stars (Tradable)',
      tradableGuaranteed: true,
    },
    badge: 'DAY 7 • GRAND PRIZE',
    isGrandPrize: true,
    description: '200,000 Coins + 3 Rank Tokens + 7-Day Grand Master Jumbo Pack!',
  },
];

export function getDayDifference(dateKey1: string, dateKey2: string): number {
  const d1 = new Date(dateKey1 + 'T00:00:00Z').getTime();
  const d2 = new Date(dateKey2 + 'T00:00:00Z').getTime();
  const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function loadLoginStreakState(): LoginStreakState {
  try {
    const raw = localStorage.getItem(LOGIN_STREAK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading login streak:', e);
  }
  return {
    currentStreak: 0,
    highestStreak: 0,
    lastClaimDate: null,
    claimedDaysHistory: [],
    totalLogins: 0,
  };
}

export function saveLoginStreakState(state: LoginStreakState): void {
  try {
    localStorage.setItem(LOGIN_STREAK_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving login streak:', e);
  }
}

export interface LoginStreakStatus {
  currentStreak: number;
  highestStreak: number;
  activeDayNumber: number; // 1 - 7
  canClaimToday: boolean;
  hasClaimedToday: boolean;
  claimedDaysInCurrentCycle: number[];
  todayReward: LoginStreakDayReward;
  state: LoginStreakState;
}

export function getLoginStreakStatus(): LoginStreakStatus {
  const state = loadLoginStreakState();
  const todayKey = getTodayDateKey();

  if (!state.lastClaimDate) {
    // First time player
    return {
      currentStreak: 0,
      highestStreak: state.highestStreak,
      activeDayNumber: 1,
      canClaimToday: true,
      hasClaimedToday: false,
      claimedDaysInCurrentCycle: [],
      todayReward: LOGIN_STREAK_REWARDS[0],
      state,
    };
  }

  const diffDays = getDayDifference(state.lastClaimDate, todayKey);

  if (diffDays === 0) {
    // Already claimed today
    const cycleDay = ((state.currentStreak - 1) % 7) + 1;
    const claimedDays = Array.from({ length: cycleDay }, (_, i) => i + 1);
    return {
      currentStreak: state.currentStreak,
      highestStreak: state.highestStreak,
      activeDayNumber: cycleDay,
      canClaimToday: false,
      hasClaimedToday: true,
      claimedDaysInCurrentCycle: claimedDays,
      todayReward: LOGIN_STREAK_REWARDS[cycleDay - 1] || LOGIN_STREAK_REWARDS[0],
      state,
    };
  }

  if (diffDays === 1) {
    // Consecutive login! Eligible to claim next day in streak
    const nextCycleDay = (state.currentStreak % 7) + 1;
    const previousDaysClaimed = state.currentStreak % 7 === 0 ? [] : Array.from({ length: state.currentStreak % 7 }, (_, i) => i + 1);
    return {
      currentStreak: state.currentStreak,
      highestStreak: state.highestStreak,
      activeDayNumber: nextCycleDay,
      canClaimToday: true,
      hasClaimedToday: false,
      claimedDaysInCurrentCycle: previousDaysClaimed,
      todayReward: LOGIN_STREAK_REWARDS[nextCycleDay - 1] || LOGIN_STREAK_REWARDS[0],
      state,
    };
  }

  // Broken streak (diffDays > 1) - resets to Day 1
  return {
    currentStreak: 0,
    highestStreak: state.highestStreak,
    activeDayNumber: 1,
    canClaimToday: true,
    hasClaimedToday: false,
    claimedDaysInCurrentCycle: [],
    todayReward: LOGIN_STREAK_REWARDS[0],
    state,
  };
}

export function claimTodayLoginReward(): {
  success: boolean;
  reward?: LoginStreakDayReward;
  state: LoginStreakState;
} {
  const todayKey = getTodayDateKey();
  const current = loadLoginStreakState();

  if (current.lastClaimDate === todayKey) {
    return { success: false, state: current };
  }

  let nextStreak = 1;
  if (current.lastClaimDate) {
    const diff = getDayDifference(current.lastClaimDate, todayKey);
    if (diff === 1) {
      nextStreak = current.currentStreak + 1;
    } else {
      nextStreak = 1;
    }
  }

  const cycleDay = ((nextStreak - 1) % 7) + 1;
  const reward = LOGIN_STREAK_REWARDS.find(r => r.day === cycleDay) || LOGIN_STREAK_REWARDS[0];

  const updatedState: LoginStreakState = {
    currentStreak: nextStreak,
    highestStreak: Math.max(current.highestStreak, nextStreak),
    lastClaimDate: todayKey,
    claimedDaysHistory: [...current.claimedDaysHistory, todayKey],
    totalLogins: current.totalLogins + 1,
  };

  saveLoginStreakState(updatedState);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('apex_login_streak_update', {
        detail: {
          reward,
          state: updatedState,
        },
      })
    );
  }

  return { success: true, reward, state: updatedState };
}

// ==================== DAILY STORE BOX & PACK LIMITS ====================

export function loadDailyStoreClaims(): DailyStoreClaimsState {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(DAILY_STORE_CLAIMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyStoreClaimsState;
      if (parsed.dateKey === todayKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading daily store claims:', e);
  }
  const initial: DailyStoreClaimsState = {
    dateKey: todayKey,
    openedIds: [],
  };
  saveDailyStoreClaims(initial);
  return initial;
}

export function saveDailyStoreClaims(state: DailyStoreClaimsState): void {
  try {
    localStorage.setItem(DAILY_STORE_CLAIMS_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving daily store claims:', e);
  }
}

export function isStoreItemOpenedToday(itemId: string): boolean {
  const state = loadDailyStoreClaims();
  return state.openedIds.includes(itemId);
}

export function recordStoreItemOpenedToday(itemId: string): void {
  const state = loadDailyStoreClaims();
  if (!state.openedIds.includes(itemId)) {
    const updated: DailyStoreClaimsState = {
      ...state,
      openedIds: [...state.openedIds, itemId],
    };
    saveDailyStoreClaims(updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('apex_store_claim_update', {
          detail: { itemId, openedIds: updated.openedIds },
        })
      );
    }
  }
}
