export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'LWB'
  | 'RWB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST'
  | 'CF';

export type League =
  | 'Premier League'
  | 'La Liga'
  | 'Serie A'
  | 'Bundesliga'
  | 'Ligue 1'
  | 'Icons & Legends';

export type CardTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'elite'
  | 'master'
  | 'icon'
  | 'totw'
  | 'toty'
  | 'flashback'
  | 'hero'
  | 'wonderkid';

export interface PlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PlayerCard {
  id: string; // unique card instance id
  basePlayerId: string;
  name: string;
  shortName: string;
  rating: number; // base OVR
  rank: number; // 0 to 5 (green, blue, purple, red, orange)
  level: number; // 0 to 30 training level
  position: Position;
  secondaryPositions?: Position[];
  preferredFoot: 'Right' | 'Left';
  skillMoves: number; // 1-5
  weakFoot: number; // 1-5
  league: League;
  club: string;
  clubBadge?: string;
  nationality: string;
  nationFlag?: string;
  stats: PlayerStats;
  tier: CardTier;
  isTradable: boolean; // KEY REQUIREMENT: tradable vs untradable
  marketValue: number;
  cardArt?: string;
  specialTrait?: string;
  acquiredDate?: number;
}

export interface MarketListing {
  id: string;
  cardId: string;
  player: PlayerCard;
  price: number;
  priceMin: number;
  priceMax: number;
  sellerId: 'user' | 'market_bot';
  listedAt: number;
  expiresAt: number;
  purchaseOrdersCount: number;
  sellOrdersCount: number;
  lastSalePrice: number;
  priceTrend: 'up' | 'down' | 'neutral';
}

export interface MarketOrder {
  id: string;
  type: 'buy' | 'sell';
  player: PlayerCard;
  price: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: number;
  claimableCoins?: number;
  claimablePlayer?: PlayerCard;
}

export type Formation =
  | '4-3-3' // Classic Holding / default alias
  | '4-3-3 (Attack)'
  | '4-3-3 (Holding)'
  | '4-3-3 (Defend)'
  | '4-3-3 (False 9)'
  | '4-3-3 (Flat)'
  | '4-4-2' // Classic Flat / default alias
  | '4-4-2 (Flat)'
  | '4-1-2-1-2 (Narrow)'
  | '4-1-2-1-2 (Wide)'
  | '4-2-3-1' // Classic Narrow / default alias
  | '4-2-3-1 (Narrow)'
  | '4-2-3-1 (Wide)'
  | '4-3-2-1'
  | '4-2-4'
  | '4-1-4-1'
  | '4-5-1 (Attack)'
  | '3-5-2'
  | '3-4-3 (Flat)'
  | '3-4-2-1'
  | '3-1-4-2'
  | '5-3-2'
  | '5-2-1-2'
  | '5-4-1 (Flat)';

export interface SquadSlot {
  slotId: string;
  position: Position;
  label: string;
  top: number; // percentage on pitch (0-100)
  left: number; // percentage on pitch (0-100)
}

export interface Squad {
  id: string;
  name: string;
  formation: Formation;
  slots: Record<string, PlayerCard | null>; // slotId -> card
  bench: (PlayerCard | null)[];
}

export interface TeamProfile {
  id: string;
  name: string;
  shortName: string;
  league: League;
  rating: number;
  att: number;
  mid: number;
  def: number;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  badge: string;
  keyPlayers: string[];
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'shot' | 'save' | 'foul' | 'card' | 'whistle';
  player: string;
  team: 'home' | 'away';
  description: string;
}

export interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  passes: [number, number];
  passAccuracy: [number, number];
  tackles: [number, number];
  fouls: [number, number];
  corners: [number, number];
}

export interface UserProfile {
  username: string;
  clubName: string;
  coins: number;
  gems: number;
  level: number;
  xp: number;
  rankTokens: number; // Universal rank up tokens (Mascherano)
  difficultySetting?: 'pro' | 'world_class' | 'legendary';
  stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    trophies: number;
  };
}

export interface PackDefinition {
  id: string;
  name: string;
  description: string;
  costCoins?: number;
  costGems?: number;
  isFree?: boolean;
  freeCooldownMs?: number;
  badgeText: string;
  themeColor: string;
  guarantee: string;
  cardCount: number;
  minRating: number;
  tradableGuaranteed: boolean;
  iconOnly?: boolean;
  filterCategory?: 'wonderkids' | 'icons' | 'all';
}

export interface CareerMatchRecord {
  id: string;
  timestamp: number;
  season: number;
  opponentName: string;
  opponentBadge: string;
  userScore: number;
  cpuScore: number;
  result: 'W' | 'D' | 'L';
  matchType: 'arcade' | 'quick_sim';
  competition?: 'season_38' | 'exhibition' | 'draft';
  topPerformer: {
    playerName: string;
    playerClub: string;
    matchRating: number;
    goals: number;
    assists: number;
  };
  possessionPct: number;
  shots: number;
  shotsOnTarget: number;
  teamPerformanceRating: number;
}

export interface SeasonRecord {
  seasonNumber: number;
  seasonName: string;
  divisionTier: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  winRatePct: number;
  points: number;
  avgMatchRating: number;
  topScorer: string;
  trophyAwarded?: string;
}

export interface PlayerCareerTrendPoint {
  matchIndex: number;
  matchLabel: string;
  result: 'W' | 'D' | 'L';
  userGoals: number;
  cpuGoals: number;
  teamRating: number;
  mvpName: string;
  mvpRating: number;
  possession: number;
}

export interface LeagueFixture {
  id: string;
  matchday: number; // 1 to 38
  homeTeamId: string;
  homeTeamName: string;
  homeTeamShortName: string;
  homeTeamBadge: string;
  homeTeamRating: number;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamShortName: string;
  awayTeamBadge: string;
  awayTeamRating: number;
  isUserMatch: boolean;
  isPlayed: boolean;
  homeScore?: number;
  awayScore?: number;
  result?: 'W' | 'D' | 'L'; // from user's perspective
  topScorer?: string;
  scorersList?: string[];
  scorers?: { player: string; team: 'home' | 'away'; minute?: number }[];
  playedAt?: number;
}

export interface LeagueStanding {
  teamId: string;
  teamName: string;
  shortName: string;
  badge: string;
  isUser: boolean;
  rating: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface SeasonTopScorer {
  playerName: string;
  teamName: string;
  teamBadge: string;
  goals: number;
  isUserPlayer?: boolean;
}

export interface SeasonRewardsSummary {
  userRank: number;
  rankTitle: string;
  rankCoins: number;
  rankTokens: number;
  goldenBootWon: boolean;
  goldenBootScorerName?: string;
  goldenBootGoals?: number;
  goldenBootBonus: number; // 1,000,000 coins bonus
  totalCoins: number; // rankCoins + goldenBootBonus
  totalTokens: number;
  trophyAwarded: string;
  claimedAt?: number;
}

export interface SeasonCampaign {
  seasonNumber: number;
  leagueName: string;
  currentMatchday: number; // 1 to 38 (39 when finished)
  totalMatchdays: number; // 38
  fixtures: LeagueFixture[]; // 38 matchdays * 10 matches = 380 matches
  standings: LeagueStanding[]; // 20 teams
  topScorers: SeasonTopScorer[];
  isCompleted: boolean;
  userFinalRank?: number;
  trophyAwarded?: string;
  lastUpdated?: number;
  rewardsClaimed?: boolean;
  rewardsSummary?: SeasonRewardsSummary;
}

export interface GameSaveSnapshot {
  id: string;
  slotIndex: number;
  slotName: string;
  timestamp: number;
  version: string;
  clubName: string;
  managerName: string;
  squadOvr: number;
  userProfile: UserProfile;
  inventory: PlayerCard[];
  squad: Squad;
  marketListings: MarketListing[];
  marketOrders: MarketOrder[];
  careerHistory: CareerMatchRecord[];
  seasonCampaign?: SeasonCampaign;
  objectivesState?: DailyObjectivesState;
  totalCardsCount: number;
  currentSeasonMatchday?: number;
}

export interface SaveSlotMetadata {
  slotIndex: number;
  isOccupied: boolean;
  slotName: string;
  clubName?: string;
  managerName?: string;
  squadOvr?: number;
  coins?: number;
  rankTokens?: number;
  currentMatchday?: number;
  totalMatchesPlayed?: number;
  totalCards?: number;
  timestamp?: number;
}

// ==================== APEX 27 DRAFT SYSTEM TYPES ====================
export interface DraftPlayerPick {
  slotId: string;
  position: Position;
  label: string;
  selectedCard: PlayerCard | null;
  candidateCards: PlayerCard[];
  isBench?: boolean;
}

export interface DraftMatchOpponent {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  rating: number;
  difficulty: string;
  keyStars: string[];
}

export interface DraftSession {
  id: string;
  isActive: boolean;
  phase: 'formation_select' | 'captain_pick' | 'drafting' | 'ready' | 'tournament' | 'ended';
  formation: Formation;
  captain: PlayerCard | null;
  starterPicks: DraftPlayerPick[];
  benchPicks: DraftPlayerPick[];
  currentPickIndex: number; // 0 to 15 (11 starters + 5 bench)
  draftOvr: number;
  draftChemistry: number;
  currentRound: number; // 1: Quarter-Final, 2: Semi-Final, 3: Final, 4: Champions Clash
  totalRounds: number; // 4
  roundHistory: {
    round: number;
    roundName: string;
    opponent: DraftMatchOpponent;
    userScore: number;
    cpuScore: number;
    result: 'W' | 'L';
    scorers?: string[];
  }[];
  isChampion: boolean;
  isEliminated: boolean;
  rewardsClaimed: boolean;
  claimedRewards?: {
    coins: number;
    rankTokens: number;
    cardReward?: PlayerCard;
  };
}

// ==================== APEX 27 MYSTERY BOXES TYPES ====================
export interface MysteryBoxRewardItem {
  id: string;
  type: 'coins' | 'gems' | 'tokens' | 'player';
  title: string;
  amount?: number;
  card?: PlayerCard;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface MysteryBoxDefinition {
  id: string;
  name: string;
  category: 'daily' | 'event' | 'champions' | 'icon' | 'lucky';
  description: string;
  badgeText: string;
  themeColor: string;
  boxGlowColor: string;
  costCoins?: number;
  costGems?: number;
  isFree?: boolean;
  cooldownHours?: number;
  guaranteeText: string;
  potentialRewards: string[];
  minCardRating?: number;
  cardsCount: number;
  coinRewardRange: [number, number];
  tokenRewardRange: [number, number];
  iconChancePct: number;
}

// ==================== APEX 27 DAILY OBJECTIVES & MILESTONES ====================
export interface ObjectiveRewardPack {
  id: string;
  name: string;
  badgeText: string;
  themeColor: string;
  description: string;
  cardCount: number;
  minRating: number;
  guarantee: string;
  iconOnly?: boolean;
  tradableGuaranteed?: boolean;
}

export interface ObjectiveReward {
  coins?: number;
  gems?: number;
  rankTokens?: number;
  xp?: number;
  pack?: ObjectiveRewardPack;
}

export type MilestoneAction =
  | 'win_match'
  | 'list_market'
  | 'score_goals'
  | 'play_match'
  | 'clean_sheet'
  | 'open_pack'
  | 'complete_exchange'
  | 'train_player'
  | 'buy_market'
  | 'draft_match';

export interface ObjectiveItem {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'milestone';
  actionType: MilestoneAction;
  category: 'matches' | 'market' | 'club' | 'store';
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  reward: ObjectiveReward;
  icon: string; // 'trophy' | 'arrow' | 'gift' | 'flame' | 'shield' | 'target' | 'star'
  shortcutTab?: 'match' | 'draft' | 'squad' | 'market' | 'store' | 'exchange';
}

export interface DailyObjectivesState {
  dateKey: string; // e.g. "2026-09-21"
  lastResetTimestamp: number;
  dailyBonusClaimed: boolean;
  objectives: ObjectiveItem[];
  milestones: ObjectiveItem[];
  totalCompletedCount: number;
  totalClaimedRewardsCount: number;
}

// ==================== APEX 27 LOGIN STREAK CALENDAR ====================
export interface LoginStreakDayReward {
  day: number;
  title: string;
  description?: string;
  specialNote?: string;
  coins: number;
  xp: number;
  rankTokens?: number;
  pack?: ObjectiveRewardPack;
  badge?: string;
  isGrandPrize?: boolean;
}

export interface LoginStreakState {
  currentStreak: number;
  highestStreak: number;
  lastClaimDate: string | null;
  claimedDaysHistory: string[];
  totalLogins: number;
}

export interface DailyStoreClaimsState {
  dateKey: string;
  openedIds: string[];
}

// ==================== MATCH ENGINE TYPES ====================
export interface PitchPlayer {
  id: string;
  name: string;
  number: number;
  team: 'user' | 'cpu';
  x: number; // 0 to 1000
  y: number; // 0 to 600
  vx: number;
  vy: number;
  speed: number;
  stamina: number;
  position: string;
  isGoalkeeper?: boolean;
}

export interface MatchBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number; // height for lob/shot
  vz: number;
  possessionPlayerId: string | null;
}

export type CommentaryEventType =
  | 'goal'
  | 'card_yellow'
  | 'card_red'
  | 'save'
  | 'woodwork'
  | 'tackle'
  | 'skill'
  | 'chance'
  | 'whistle'
  | 'foul'
  | 'tactics';

export interface MatchCommentaryEvent {
  id: string;
  minute: number;
  type: CommentaryEventType;
  headline: string;
  detail: string;
  team?: 'user' | 'cpu';
  playerName?: string;
  score?: string;
  timestamp: number;
}


