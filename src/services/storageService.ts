import { 
  UserProfile, Squad, PlayerCard, MarketListing, MarketOrder, 
  CareerMatchRecord, SeasonRecord, GameSaveSnapshot, SaveSlotMetadata, SeasonCampaign,
  DraftSession
} from '../types';
import { BASE_PLAYERS, instantiatePlayerCard, getPlayerCardCurrentRating } from '../data/playersDatabase';

const STORAGE_KEYS = {
  PROFILE: 'apex27_profile',
  INVENTORY: 'apex27_inventory',
  SQUAD: 'apex27_squad',
  MARKET_LISTINGS: 'apex27_market_listings',
  MARKET_ORDERS: 'apex27_market_orders',
  CAREER_HISTORY: 'apex27_career_history',
  SEASON_38: 'apex_season_campaign_38',
  DRAFT_SESSION: 'apex27_draft_session',
  SAVE_SLOT_PREFIX: 'apex27_save_slot_',
  ACTIVE_SLOT: 'apex27_active_slot',
  LAST_SAVED: 'apex27_last_saved',
};

function getStoredValue(key: string): string | null {
  try {
    const current = localStorage.getItem(key);
    if (current) return current;
    const legacyKey = key.replace('apex27_', 'apex17_');
    if (legacyKey !== key) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        localStorage.setItem(key, legacy);
        return legacy;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function loadDraftSession(): DraftSession | null {
  try {
    const raw = getStoredValue(STORAGE_KEYS.DRAFT_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading draft session:', e);
    return null;
  }
}

export function saveDraftSession(session: DraftSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.DRAFT_SESSION, JSON.stringify(session));
    }
  } catch (e) {
    console.error('Error saving draft session:', e);
  }
}

export function clearDraftSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_SESSION);
  } catch (e) {
    console.error('Error clearing draft session:', e);
  }
}

export function getInitialSquad(inventory: PlayerCard[]): Squad {
  const slots: Record<string, PlayerCard | null> = {
    gk: inventory.find(p => p.position === 'GK') || null,
    lb: inventory.find(p => p.position === 'LB') || inventory.find(p => p.position === 'CB') || null,
    cb1: inventory.filter(p => p.position === 'CB')[0] || null,
    cb2: inventory.filter(p => p.position === 'CB')[1] || null,
    rb: inventory.find(p => p.position === 'RB') || null,
    cm1: inventory.filter(p => ['CM', 'CDM'].includes(p.position))[0] || null,
    cdm: inventory.find(p => p.position === 'CDM') || inventory.find(p => p.position === 'CM') || null,
    cm2: inventory.filter(p => ['CAM', 'CM'].includes(p.position))[1] || null,
    lw: inventory.find(p => ['LW', 'LM'].includes(p.position)) || null,
    st: inventory.find(p => ['ST', 'CF'].includes(p.position)) || null,
    rw: inventory.find(p => ['RW', 'RM'].includes(p.position)) || null,
  };

  const startingIds = new Set(Object.values(slots).filter(Boolean).map(c => c!.id));
  const bench = inventory.filter(c => !startingIds.has(c.id)).slice(0, 7);

  return {
    id: 'active_squad_1',
    name: 'Galacticos 27',
    formation: '4-3-3',
    slots,
    bench,
  };
}

export function generateInitialInventory(): PlayerCard[] {
  // Balanced authentic starter squad (OVR 82-84) - high-tier masters and prime icons must be earned!
  const starters: Array<{ baseId: string; isTradable: boolean; rank?: number }> = [
    { baseId: 'psg-donnarumma', isTradable: false, rank: 0 }, // 87 GK
    { baseId: 'acm-theo', isTradable: false, rank: 0 },       // 87 LB
    { baseId: 'bvb-schlotterbeck', isTradable: false, rank: 0 }, // 84 CB
    { baseId: 'int-bastoni', isTradable: false, rank: 0 },    // 87 CB
    { baseId: 'lev-frimpong', isTradable: false, rank: 0 },   // 84 RB
    { baseId: 'che-caicedo', isTradable: false, rank: 0 },    // 83 CDM
    { baseId: 'mun-mainoo', isTradable: false, rank: 0 },     // 83 CM
    { baseId: 'bar-yamal', isTradable: false, rank: 0 },      // 84 RW
    { baseId: 'ata-lookman', isTradable: false, rank: 0 },    // 83 LW
    { baseId: 'avl-watkins', isTradable: false, rank: 0 },    // 84 ST
    { baseId: 'che-palmer', isTradable: false, rank: 0 },     // 86 CAM/RW
    // Bench reserves
    { baseId: 'mun-rashford', isTradable: false, rank: 0 },   // 82 LW
    { baseId: 'psg-barcola', isTradable: false, rank: 0 },    // 82 LW
    { baseId: 'mun-garnacho', isTradable: false, rank: 0 },   // 83 RW
    { baseId: 'psg-zaire', isTradable: false, rank: 0 },      // 82 CM
  ];

  const cards: PlayerCard[] = [];
  starters.forEach(s => {
    const base = BASE_PLAYERS.find(p => p.id === s.baseId);
    if (base) {
      cards.push(instantiatePlayerCard(base, s.isTradable, s.rank || 0));
    }
  });

  return cards;
}

export function generateBotMarketListings(): MarketListing[] {
  const listings: MarketListing[] = [];
  // Populate realistic market style listings from the top 5 leagues
  BASE_PLAYERS.forEach(base => {
    // Generate 1-2 listings per player
    const minP = Math.round(base.marketBasePrice * 0.85);
    const maxP = Math.round(base.marketBasePrice * 1.15);
    const price = Math.round((minP + Math.random() * (maxP - minP)) / 10000) * 10000;
    
    // Virtual seller listing
    const card = instantiatePlayerCard(base, true);
    listings.push({
      id: `mkt_${base.id}_${Math.floor(Math.random() * 9999)}`,
      cardId: card.id,
      player: card,
      price,
      priceMin: minP,
      priceMax: maxP,
      sellerId: 'market_bot',
      listedAt: Date.now() - Math.floor(Math.random() * 3600000),
      expiresAt: Date.now() + 86400000,
      purchaseOrdersCount: Math.floor(Math.random() * 18) + 1,
      sellOrdersCount: Math.floor(Math.random() * 12) + 1,
      lastSalePrice: price,
      priceTrend: Math.random() > 0.5 ? 'up' : Math.random() > 0.25 ? 'down' : 'neutral',
    });
  });

  return listings;
}

export function loadUserProfile(): UserProfile {
  try {
    const saved = getStoredValue(STORAGE_KEYS.PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.difficultySetting) {
        parsed.difficultySetting = 'world_class';
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading profile', e);
  }

  const initial: UserProfile = {
    username: 'ApexManager',
    clubName: 'Apex FC',
    coins: 150000, // 150,000 starter transfer budget (hardcore realistic economy)
    gems: 300,
    level: 1,
    xp: 0,
    rankTokens: 0, // No free Mascherano tokens (must be earned through tournament triumph)
    difficultySetting: 'world_class',
    stats: {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      trophies: 0,
    },
  };
  saveUserProfile(initial);
  return initial;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile', e);
  }
}

export function loadInventory(): PlayerCard[] {
  try {
    const saved = getStoredValue(STORAGE_KEYS.INVENTORY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading inventory', e);
  }

  const initial = generateInitialInventory();
  saveInventory(initial);
  return initial;
}

export function saveInventory(cards: PlayerCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving inventory', e);
  }
}

export function loadSquad(inventory: PlayerCard[]): Squad {
  try {
    const saved = getStoredValue(STORAGE_KEYS.SQUAD);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading squad', e);
  }

  const initial = getInitialSquad(inventory);
  saveSquad(initial);
  return initial;
}

export function saveSquad(squad: Squad): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SQUAD, JSON.stringify(squad));
  } catch (e) {
    console.error('Error saving squad', e);
  }
}

export function loadMarketListings(): MarketListing[] {
  try {
    const saved = getStoredValue(STORAGE_KEYS.MARKET_LISTINGS);
    if (saved) {
      const parsed: MarketListing[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure new players in BASE_PLAYERS that aren't listed get added
        const listedBaseIds = new Set(parsed.map(l => l.player.basePlayerId));
        const missingBases = BASE_PLAYERS.filter(b => !listedBaseIds.has(b.id));

        if (missingBases.length > 0) {
          const newSupplListings: MarketListing[] = [];
          missingBases.forEach(base => {
            const minP = Math.round(base.marketBasePrice * 0.85);
            const maxP = Math.round(base.marketBasePrice * 1.15);
            const price = Math.round((minP + Math.random() * (maxP - minP)) / 10000) * 10000;
            const card = instantiatePlayerCard(base, true);
            newSupplListings.push({
              id: `mkt_${base.id}_${Math.floor(Math.random() * 9999)}`,
              cardId: card.id,
              player: card,
              price,
              priceMin: minP,
              priceMax: maxP,
              sellerId: 'market_bot',
              listedAt: Date.now() - Math.floor(Math.random() * 3600000),
              expiresAt: Date.now() + 86400000,
              purchaseOrdersCount: Math.floor(Math.random() * 18) + 1,
              sellOrdersCount: Math.floor(Math.random() * 12) + 1,
              lastSalePrice: price,
              priceTrend: Math.random() > 0.5 ? 'up' : Math.random() > 0.25 ? 'down' : 'neutral',
            });
          });
          const merged = [...parsed, ...newSupplListings];
          saveMarketListings(merged);
          return merged;
        }

        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading market listings', e);
  }

  const initial = generateBotMarketListings();
  saveMarketListings(initial);
  return initial;
}

export function saveMarketListings(listings: MarketListing[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MARKET_LISTINGS, JSON.stringify(listings));
  } catch (e) {
    console.error('Error saving market listings', e);
  }
}

export function loadMarketOrders(): MarketOrder[] {
  try {
    const saved = getStoredValue(STORAGE_KEYS.MARKET_ORDERS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading market orders', e);
  }
  return [];
}

export function saveMarketOrders(orders: MarketOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MARKET_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving market orders', e);
  }
}

export function generateInitialCareerHistory(): CareerMatchRecord[] {
  const baseHistory: Omit<CareerMatchRecord, 'id' | 'timestamp'>[] = [
    // Season 1: Foundation Division (3 matches, 2W 1D, 7 pts)
    {
      season: 1,
      opponentName: 'Bayer Leverkusen',
      opponentBadge: '🦁',
      userScore: 2,
      cpuScore: 1,
      result: 'W',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'L. Messi', playerClub: 'Barcelona Icons', matchRating: 8.9, goals: 2, assists: 0 },
      possessionPct: 56,
      shots: 9,
      shotsOnTarget: 6,
      teamPerformanceRating: 8.2,
    },
    {
      season: 1,
      opponentName: 'Borussia Dortmund',
      opponentBadge: '🐝',
      userScore: 2,
      cpuScore: 2,
      result: 'D',
      matchType: 'arcade',
      topPerformer: { playerName: 'K. De Bruyne', playerClub: 'Man City', matchRating: 8.4, goals: 1, assists: 1 },
      possessionPct: 52,
      shots: 8,
      shotsOnTarget: 4,
      teamPerformanceRating: 7.6,
    },
    {
      season: 1,
      opponentName: 'Aston Villa',
      opponentBadge: '🦁',
      userScore: 3,
      cpuScore: 0,
      result: 'W',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'Vinícius Jr.', playerClub: 'Real Madrid', matchRating: 9.3, goals: 2, assists: 1 },
      possessionPct: 61,
      shots: 12,
      shotsOnTarget: 7,
      teamPerformanceRating: 8.9,
    },

    // Season 2: Pro Division Trophy (4 matches, 3W 1L, 9 pts, Trophy won!)
    {
      season: 2,
      opponentName: 'Atlético Madrid',
      opponentBadge: '🐻',
      userScore: 3,
      cpuScore: 1,
      result: 'W',
      matchType: 'arcade',
      topPerformer: { playerName: 'L. Messi', playerClub: 'Barcelona Icons', matchRating: 9.5, goals: 2, assists: 1 },
      possessionPct: 58,
      shots: 11,
      shotsOnTarget: 7,
      teamPerformanceRating: 8.8,
    },
    {
      season: 2,
      opponentName: 'Inter Milan',
      opponentBadge: '🐍',
      userScore: 1,
      cpuScore: 2,
      result: 'L',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'V. van Dijk', playerClub: 'Liverpool', matchRating: 7.9, goals: 0, assists: 0 },
      possessionPct: 48,
      shots: 7,
      shotsOnTarget: 3,
      teamPerformanceRating: 7.1,
    },
    {
      season: 2,
      opponentName: 'Paris Saint-Germain',
      opponentBadge: '🗼',
      userScore: 4,
      cpuScore: 1,
      result: 'W',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'L. Yamal', playerClub: 'Barcelona', matchRating: 9.2, goals: 2, assists: 1 },
      possessionPct: 62,
      shots: 13,
      shotsOnTarget: 9,
      teamPerformanceRating: 9.0,
    },
    {
      season: 2,
      opponentName: 'AC Milan',
      opponentBadge: '🔴',
      userScore: 2,
      cpuScore: 0,
      result: 'W',
      matchType: 'arcade',
      topPerformer: { playerName: 'C. Palmer', playerClub: 'Chelsea', matchRating: 8.8, goals: 1, assists: 1 },
      possessionPct: 54,
      shots: 8,
      shotsOnTarget: 5,
      teamPerformanceRating: 8.4,
    },

    // Season 3: Premier League & Super Cup (4 matches, 3W 1D, 10 pts, Trophy won!)
    {
      season: 3,
      opponentName: 'Arsenal FC',
      opponentBadge: '🔴',
      userScore: 3,
      cpuScore: 1,
      result: 'W',
      matchType: 'arcade',
      topPerformer: { playerName: 'Vinícius Jr.', playerClub: 'Real Madrid', matchRating: 9.4, goals: 2, assists: 0 },
      possessionPct: 57,
      shots: 10,
      shotsOnTarget: 7,
      teamPerformanceRating: 8.9,
    },
    {
      season: 3,
      opponentName: 'Bayern Munich',
      opponentBadge: '⚪',
      userScore: 2,
      cpuScore: 2,
      result: 'D',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'D. Rice', playerClub: 'Arsenal', matchRating: 8.3, goals: 1, assists: 0 },
      possessionPct: 50,
      shots: 9,
      shotsOnTarget: 5,
      teamPerformanceRating: 7.8,
    },
    {
      season: 3,
      opponentName: 'Manchester City',
      opponentBadge: '👑',
      userScore: 4,
      cpuScore: 1,
      result: 'W',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'L. Messi', playerClub: 'Barcelona Icons', matchRating: 9.8, goals: 3, assists: 1 },
      possessionPct: 64,
      shots: 14,
      shotsOnTarget: 9,
      teamPerformanceRating: 9.4,
    },
    {
      season: 3,
      opponentName: 'Real Madrid',
      opponentBadge: '👑',
      userScore: 3,
      cpuScore: 0,
      result: 'W',
      matchType: 'arcade',
      topPerformer: { playerName: 'K. De Bruyne', playerClub: 'Man City', matchRating: 9.6, goals: 1, assists: 2 },
      possessionPct: 59,
      shots: 12,
      shotsOnTarget: 8,
      teamPerformanceRating: 9.1,
    },

    // Season 4: Champions League Elite (Current Season - 3 matches, 3W 0D 0L, 9 pts)
    {
      season: 4,
      opponentName: 'FC Barcelona',
      opponentBadge: '🔵',
      userScore: 3,
      cpuScore: 1,
      result: 'W',
      matchType: 'arcade',
      topPerformer: { playerName: 'Vinícius Jr.', playerClub: 'Real Madrid', matchRating: 9.1, goals: 2, assists: 0 },
      possessionPct: 55,
      shots: 10,
      shotsOnTarget: 6,
      teamPerformanceRating: 8.7,
    },
    {
      season: 4,
      opponentName: 'Juventus FC',
      opponentBadge: '🦓',
      userScore: 4,
      cpuScore: 0,
      result: 'W',
      matchType: 'quick_sim',
      topPerformer: { playerName: 'L. Messi', playerClub: 'Barcelona Icons', matchRating: 9.7, goals: 2, assists: 2 },
      possessionPct: 65,
      shots: 15,
      shotsOnTarget: 10,
      teamPerformanceRating: 9.5,
    },
    {
      season: 4,
      opponentName: 'APEX 27 Master XI',
      opponentBadge: '⭐',
      userScore: 2,
      cpuScore: 1,
      result: 'W',
      matchType: 'arcade',
      topPerformer: { playerName: 'K. De Bruyne', playerClub: 'Man City', matchRating: 9.3, goals: 1, assists: 1 },
      possessionPct: 53,
      shots: 8,
      shotsOnTarget: 5,
      teamPerformanceRating: 8.8,
    },
  ];

  const now = Date.now();
  return baseHistory.map((m, idx) => ({
    ...m,
    id: `cm_${idx + 1}_${Date.now() - (baseHistory.length - idx) * 86400000}`,
    timestamp: now - (baseHistory.length - idx) * 86400000,
  }));
}

export function loadCareerHistory(): CareerMatchRecord[] {
  try {
    const saved = getStoredValue(STORAGE_KEYS.CAREER_HISTORY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading career history', e);
  }

  const initial = generateInitialCareerHistory();
  saveCareerHistory(initial);
  return initial;
}

export function saveCareerHistory(history: CareerMatchRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CAREER_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving career history', e);
  }
}

export function computeSeasonalRecords(history: CareerMatchRecord[]): SeasonRecord[] {
  const seasonMap = new Map<number, CareerMatchRecord[]>();
  history.forEach(m => {
    const list = seasonMap.get(m.season) || [];
    list.push(m);
    seasonMap.set(m.season, list);
  });

  const seasonNames: Record<number, { name: string; tier: string; trophy?: string }> = {
    1: { name: 'Season 1: Foundation Cup', tier: 'Division 3 Challenger' },
    2: { name: 'Season 2: Continental Ascent', tier: 'Division 2 Champions', trophy: 'Europa Trophy 🏆' },
    3: { name: 'Season 3: European Super League', tier: 'Division 1 Masters', trophy: 'Master Silver Shield 🛡️' },
    4: { name: 'Season 4: Champions League (Current)', tier: 'Elite Champions Tier' },
  };

  const seasons: SeasonRecord[] = [];
  const sortedSeasonNums = Array.from(seasonMap.keys()).sort((a, b) => a - b);

  sortedSeasonNums.forEach(seasonNum => {
    const matches = seasonMap.get(seasonNum) || [];
    const wins = matches.filter(m => m.result === 'W').length;
    const draws = matches.filter(m => m.result === 'D').length;
    const losses = matches.filter(m => m.result === 'L').length;
    const goalsFor = matches.reduce((acc, m) => acc + m.userScore, 0);
    const goalsAgainst = matches.reduce((acc, m) => acc + m.cpuScore, 0);
    const cleanSheets = matches.filter(m => m.cpuScore === 0).length;
    const matchesPlayed = matches.length;
    const winRatePct = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
    const points = wins * 3 + draws * 1;
    const avgRating = matchesPlayed > 0
      ? Number((matches.reduce((acc, m) => acc + m.teamPerformanceRating, 0) / matchesPlayed).toFixed(2))
      : 0;

    // Determine top scorer for the season
    const scorerCounts: Record<string, number> = {};
    matches.forEach(m => {
      if (m.topPerformer?.playerName) {
        scorerCounts[m.topPerformer.playerName] = (scorerCounts[m.topPerformer.playerName] || 0) + m.topPerformer.goals;
      }
    });
    let topScorer = 'Squad Effort';
    let maxGoals = 0;
    Object.entries(scorerCounts).forEach(([name, g]) => {
      if (g > maxGoals) {
        maxGoals = g;
        topScorer = `${name} (${g}G)`;
      }
    });

    const info = seasonNames[seasonNum] || {
      name: `Season ${seasonNum}`,
      tier: 'Division Elite',
    };

    seasons.push({
      seasonNumber: seasonNum,
      seasonName: info.name,
      divisionTier: info.tier,
      matchesPlayed,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      cleanSheets,
      winRatePct,
      points,
      avgMatchRating: avgRating,
      topScorer,
      trophyAwarded: info.trophy,
    });
  });

  return seasons;
}

// ==========================================
// GAME PROGRESS & SAVE SLOTS SYSTEM
// ==========================================

export function getCurrentActiveSlotIndex(): number {
  try {
    const val = getStoredValue(STORAGE_KEYS.ACTIVE_SLOT);
    if (val) return parseInt(val, 10) || 1;
  } catch (e) {
    console.error('Failed to get active slot index', e);
  }
  return 1;
}

export function setActiveSlotIndex(slotIndex: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SLOT, slotIndex.toString());
  } catch (e) {
    console.error('Failed to set active slot index', e);
  }
}

export function getLastSavedTimestamp(): number {
  try {
    const val = getStoredValue(STORAGE_KEYS.LAST_SAVED);
    if (val) return parseInt(val, 10) || Date.now();
  } catch (e) {
    console.error('Failed to get last saved timestamp', e);
  }
  return Date.now();
}

export function recordSaveTimestamp(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, Date.now().toString());
  } catch (e) {
    console.error('Failed to record save timestamp', e);
  }
}

/**
 * Capture a complete snapshot of current in-game progress
 */
export function getCurrentGameSnapshot(slotIndex: number = 1, customName?: string): GameSaveSnapshot {
  const profile = loadUserProfile();
  const inventory = loadInventory();
  const squad = loadSquad(inventory);
  const marketListings = loadMarketListings();
  const marketOrders = loadMarketOrders();
  const careerHistory = loadCareerHistory();

  // Load Season 38 campaign if present
  let seasonCampaign: SeasonCampaign | undefined;
  try {
    const seasonRaw = localStorage.getItem(STORAGE_KEYS.SEASON_38);
    if (seasonRaw) {
      seasonCampaign = JSON.parse(seasonRaw);
    }
  } catch (e) {
    console.warn('No active season campaign found for snapshot', e);
  }

  // Calculate Squad OVR
  const starters = Object.values(squad.slots).filter(Boolean) as PlayerCard[];
  const squadOvr = starters.length > 0 
    ? Math.round(starters.reduce((acc, c) => acc + getPlayerCardCurrentRating(c), 0) / starters.length)
    : 85;

  const currentMatchday = seasonCampaign ? seasonCampaign.currentMatchday : 1;
  const defaultSlotName = customName || `Slot ${slotIndex}: ${profile.clubName} (MD ${currentMatchday}/38)`;

  return {
    id: `save_slot_${slotIndex}_${Date.now()}`,
    slotIndex,
    slotName: defaultSlotName,
    timestamp: Date.now(),
    version: '1.5.0',
    clubName: profile.clubName,
    managerName: profile.username,
    squadOvr,
    userProfile: profile,
    inventory,
    squad,
    marketListings,
    marketOrders,
    careerHistory,
    seasonCampaign,
    totalCardsCount: inventory.length,
    currentSeasonMatchday: currentMatchday,
  };
}

/**
 * Save game state into a specific slot (1, 2, 3)
 */
export function saveGameToSlot(slotIndex: number = 1, customName?: string): GameSaveSnapshot {
  const snapshot = getCurrentGameSnapshot(slotIndex, customName);
  try {
    localStorage.setItem(STORAGE_KEYS.SAVE_SLOT_PREFIX + slotIndex, JSON.stringify(snapshot));
    setActiveSlotIndex(slotIndex);
    recordSaveTimestamp();
  } catch (e) {
    console.error(`Failed to save progress into slot ${slotIndex}`, e);
    throw new Error(`Storage error: Failed to save to slot ${slotIndex}`);
  }
  return snapshot;
}

/**
 * Load a game save snapshot from a specific slot
 */
export function loadGameFromSlot(slotIndex: number): GameSaveSnapshot | null {
  try {
    const raw = getStoredValue(STORAGE_KEYS.SAVE_SLOT_PREFIX + slotIndex);
    if (raw) {
      const parsed: GameSaveSnapshot = JSON.parse(raw);
      if (parsed && parsed.userProfile && parsed.squad) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(`Failed to load save from slot ${slotIndex}`, e);
  }
  return null;
}

/**
 * Delete a specific save slot
 */
export function deleteSaveSlot(slotIndex: number): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SAVE_SLOT_PREFIX + slotIndex);
  } catch (e) {
    console.error(`Failed to delete save slot ${slotIndex}`, e);
  }
}

/**
 * Retrieve metadata for all 3 save slots
 */
export function getAllSaveSlotsMeta(): SaveSlotMetadata[] {
  const slots: SaveSlotMetadata[] = [];
  const maxSlots = 3;

  for (let i = 1; i <= maxSlots; i++) {
    const snapshot = loadGameFromSlot(i);
    if (snapshot) {
      slots.push({
        slotIndex: i,
        isOccupied: true,
        slotName: snapshot.slotName || `Slot ${i}`,
        clubName: snapshot.clubName,
        managerName: snapshot.managerName,
        squadOvr: snapshot.squadOvr,
        coins: snapshot.userProfile?.coins,
        rankTokens: snapshot.userProfile?.rankTokens,
        currentMatchday: snapshot.currentSeasonMatchday || snapshot.seasonCampaign?.currentMatchday || 1,
        totalMatchesPlayed: snapshot.careerHistory?.length || snapshot.userProfile?.stats?.matchesPlayed || 0,
        totalCards: snapshot.totalCardsCount || snapshot.inventory?.length || 0,
        timestamp: snapshot.timestamp,
      });
    } else {
      slots.push({
        slotIndex: i,
        isOccupied: false,
        slotName: `Slot ${i}: Empty Save Slot`,
      });
    }
  }

  return slots;
}

/**
 * Restore game state from a loaded or imported snapshot
 */
export function restoreGameState(snapshot: GameSaveSnapshot): void {
  try {
    if (!snapshot || !snapshot.userProfile || !snapshot.squad) {
      throw new Error('Invalid save game structure');
    }

    saveUserProfile(snapshot.userProfile);
    saveInventory(snapshot.inventory || []);
    saveSquad(snapshot.squad);
    saveMarketListings(snapshot.marketListings || []);
    saveMarketOrders(snapshot.marketOrders || []);
    saveCareerHistory(snapshot.careerHistory || []);

    if (snapshot.seasonCampaign) {
      localStorage.setItem(STORAGE_KEYS.SEASON_38, JSON.stringify(snapshot.seasonCampaign));
    }

    setActiveSlotIndex(snapshot.slotIndex || 1);
    recordSaveTimestamp();
  } catch (e) {
    console.error('Failed to restore game state from snapshot', e);
    throw e;
  }
}

/**
 * Export current or specified save game to a downloadable .json file
 */
export function exportGameSaveFile(snapshot?: GameSaveSnapshot): void {
  const snap = snapshot || getCurrentGameSnapshot(getCurrentActiveSlotIndex());
  const jsonString = JSON.stringify(snap, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanClubName = (snap.clubName || 'ApexFC').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date(snap.timestamp).toISOString().slice(0, 10);
  const fileName = `apex27_save_${cleanClubName}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse an imported JSON save file
 */
export function parseAndValidateSaveJson(jsonString: string): { success: boolean; data?: GameSaveSnapshot; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'File is not a valid JSON object' };
    }
    if (!parsed.userProfile || typeof parsed.userProfile !== 'object') {
      return { success: false, error: 'Missing user profile data in save file' };
    }
    if (!parsed.squad || typeof parsed.squad !== 'object') {
      return { success: false, error: 'Missing squad lineup data in save file' };
    }
    if (!Array.isArray(parsed.inventory)) {
      return { success: false, error: 'Missing player cards inventory in save file' };
    }

    return { success: true, data: parsed as GameSaveSnapshot };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse JSON file' };
  }
}

/**
 * Reset all game progress to clean starter state
 */
export function resetAllGameData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.SQUAD);
    localStorage.removeItem(STORAGE_KEYS.MARKET_LISTINGS);
    localStorage.removeItem(STORAGE_KEYS.MARKET_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CAREER_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.SEASON_38);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SLOT);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
    // Remove slots
    for (let i = 1; i <= 5; i++) {
      localStorage.removeItem(STORAGE_KEYS.SAVE_SLOT_PREFIX + i);
    }
  } catch (e) {
    console.error('Failed to reset game data', e);
  }
}
