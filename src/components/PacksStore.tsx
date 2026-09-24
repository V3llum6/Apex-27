import React, { useState, useEffect } from 'react';
import { PlayerCard, UserProfile, PackDefinition, MysteryBoxDefinition, MysteryBoxRewardItem } from '../types';
import { BASE_PLAYERS, BasePlayer, instantiatePlayerCard } from '../data/playersDatabase';
import { PlayerCardView } from './PlayerCardView';
import { audio } from '../services/audioService';
import { 
  trackMilestoneProgress, isStoreItemOpenedToday, recordStoreItemOpenedToday, 
  getTimeUntilNextDailyReset, loadDailyStoreClaims 
} from '../services/objectiveService';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Gift, Flame, Trophy, Coins, Lock, Unlock, 
  CheckCircle2, ChevronRight, Package, Zap, Shield, Star, Award,
  Info, Percent, HelpCircle, X, AlertCircle, TrendingDown, Clock
} from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  inventory: PlayerCard[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateInventory: (updated: PlayerCard[]) => void;
}

/**
 * Realistically pulls a player from a pool, heavily biased towards the lowest available ratings.
 * Players with the lowest OVR for that pack get ~85-92% of pulls, while higher ratings drop off exponentially.
 */
export function pullWeightedPlayerFromPool(pool: BasePlayer[], minRating: number = 75): BasePlayer {
  if (!pool || pool.length === 0) return BASE_PLAYERS[0];

  const poolMinRating = Math.min(...pool.map(p => p.rating));
  const effectiveMin = Math.max(minRating, poolMinRating);

  const weighted = pool.map(player => {
    const diff = Math.max(0, player.rating - effectiveMin);
    let weight = 1000;
    if (diff === 0) {
      weight = 1000; // Base lowest rating: massive probability (~75%)
    } else if (diff === 1) {
      weight = 320;  // 1 OVR above min (~18%)
    } else if (diff === 2) {
      weight = 80;   // 2 OVR above min (~5%)
    } else if (diff === 3) {
      weight = 20;   // 3 OVR above min (~1.2%)
    } else if (diff === 4) {
      weight = 5;    // 4 OVR above min (~0.3%)
    } else if (diff === 5) {
      weight = 1.2;  // 5 OVR above min (~0.07%)
    } else if (diff === 6) {
      weight = 0.3;  // 6 OVR above min (~0.018%)
    } else if (diff === 7) {
      weight = 0.07; // 7 OVR above min (~0.004%)
    } else if (diff === 8) {
      weight = 0.015;// 8 OVR above min
    } else {
      weight = Math.max(0.00005, 0.003 * Math.pow(0.18, diff - 8));
    }

    // Extreme rarity for Icons when present in non-icon specific pools
    if (player.league === 'Icons & Legends') {
      weight *= 0.02;
    }

    return { player, weight };
  });

  const totalWeight = weighted.reduce((acc, curr) => acc + curr.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const item of weighted) {
    if (rand <= item.weight) {
      return item.player;
    }
    rand -= item.weight;
  }

  return weighted[0]?.player || pool[0];
}

const MYSTERY_BOXES: MysteryBoxDefinition[] = [
  {
    id: 'box_daily_free',
    name: 'Daily Free Mystery Box',
    category: 'daily',
    description: 'Complimentary daily club mystery box. Contains modest starter coins and a 75+ scout player (94%+ chance of 75-76 common player).',
    badgeText: 'FREE DAILY BOX',
    themeColor: 'from-emerald-500 via-teal-600 to-slate-900',
    boxGlowColor: 'rgba(16, 185, 129, 0.6)',
    isFree: true,
    guaranteeText: '10k - 25k Coins + 1x 75+ Common Card',
    potentialRewards: ['10,000 - 25,000 Coins (Low Weighted)', '1x 75-76 Common Player (94% Rate)', '80+ Star (0.4% Jackpot Chance)'],
    cardsCount: 1,
    minCardRating: 75,
    coinRewardRange: [10000, 25000],
    tokenRewardRange: [0, 0],
    iconChancePct: 0.05,
  },
  {
    id: 'box_lucky_gem',
    name: 'Lucky High-Voltage Mystery Crate',
    category: 'lucky',
    description: 'Mystery crate offering tactical coin caches and an 81+ card (heavily weighted to 81-82 low gold cards).',
    badgeText: 'LUCKY CRATE',
    themeColor: 'from-cyan-500 via-blue-600 to-indigo-950',
    boxGlowColor: 'rgba(6, 182, 212, 0.6)',
    costCoins: 450000,
    guaranteeText: '50k - 180k Coins + 1x 81+ Card',
    potentialRewards: ['50,000 - 180,000 Coins', '1x 81-82 Gold Player (89% Rate)', '87+ Walkout (0.2% Lottery Chance)'],
    cardsCount: 1,
    minCardRating: 81,
    coinRewardRange: [50000, 180000],
    tokenRewardRange: [0, 1],
    iconChancePct: 0.1,
  },
  {
    id: 'box_mascherano_tokens',
    name: 'Mascherano Universal Rank Box',
    category: 'champions',
    description: 'Rare tactical training crate containing 1 to 2 Universal Rank-Up Tokens and an 80+ bench player (heavily weighted to 80-81 OVR).',
    badgeText: 'MASCHERANO BOX',
    themeColor: 'from-green-500 via-emerald-600 to-teal-950',
    boxGlowColor: 'rgba(16, 185, 129, 0.7)',
    costCoins: 1200000,
    guaranteeText: '1x - 2x Universal Rank Tokens + 1x 80+ Card',
    potentialRewards: ['1x to 2x Mascherano Tokens', '1x 80-81 OVR Player (90% Rate)', '25,000 - 60,000 Coins'],
    cardsCount: 1,
    minCardRating: 80,
    coinRewardRange: [25000, 60000],
    tokenRewardRange: [1, 2],
    iconChancePct: 0.1,
  },
  {
    id: 'box_wonderkids',
    name: 'Future Stars Wonderkids Box',
    category: 'event',
    description: 'Scouted wonderkids crate featuring emerging young talents. Heavily weighted to 82 OVR base prospects.',
    badgeText: 'FUTURE STARS 82+',
    themeColor: 'from-fuchsia-500 via-purple-600 to-violet-950',
    boxGlowColor: 'rgba(217, 70, 239, 0.6)',
    costCoins: 1500000,
    guaranteeText: '1x 82+ Wonderkid + 60k - 150k Coins',
    potentialRewards: ['1x 82 OVR Base Wonderkid (85% Rate)', '83-84 OVR Prospect (13% Rate)', '87+ Elite Prodigy (0.2% Rare)'],
    cardsCount: 1,
    minCardRating: 82,
    coinRewardRange: [60000, 150000],
    tokenRewardRange: [0, 1],
    iconChancePct: 0.2,
  },
  {
    id: 'box_champions_division',
    name: 'Division Rivals Champions Box',
    category: 'champions',
    description: 'Prestigious tournament reward crate with UCL competitors, tactical coins, and tokens. Heavily weighted to lowest 85-86 UCL cards.',
    badgeText: 'CHAMPIONS 85+',
    themeColor: 'from-amber-400 via-orange-500 to-red-950',
    boxGlowColor: 'rgba(245, 158, 11, 0.7)',
    costCoins: 2800000,
    guaranteeText: '1x 85+ UCL Card + 150k - 350k Coins',
    potentialRewards: ['1x 85-86 UCL Player (88% Rate)', '87-88 UCL Contender (10% Rate)', '90+ Master Walkout (0.3% Chance)'],
    cardsCount: 1,
    minCardRating: 85,
    coinRewardRange: [150000, 350000],
    tokenRewardRange: [1, 1],
    iconChancePct: 0.4,
  },
  {
    id: 'box_prime_icons',
    name: 'Ballon d\'Or & Prime Legends Box',
    category: 'icon',
    description: 'Supreme elite mystery box featuring all-time football legends. Heavily weighted to 90-91 lowest icon tier.',
    badgeText: 'BALLON D\'OR 90+',
    themeColor: 'from-yellow-300 via-amber-500 to-yellow-950',
    boxGlowColor: 'rgba(250, 204, 21, 0.9)',
    costCoins: 6500000,
    guaranteeText: '1x 90+ Prime Legend + 400k - 800k Coins',
    potentialRewards: ['1x 90-91 Veteran Legend (86% Rate)', '92-93 Icon Maestro (12% Rate)', '95+ Pelé/Maradona/R9 (0.2% Miracle)'],
    cardsCount: 1,
    minCardRating: 90,
    coinRewardRange: [400000, 800000],
    tokenRewardRange: [1, 2],
    iconChancePct: 100,
  },
];

const PACKS: PackDefinition[] = [
  {
    id: 'free_daily',
    name: 'Daily Free Top 5 Leagues Pack',
    description: 'Top 5 European leagues. Heavily weighted to lowest 75-76 OVR common squad players (>93% chance). Ultra-low chance of higher cards.',
    isFree: true,
    badgeText: 'FREE DAILY (75+)',
    themeColor: 'from-emerald-600 to-teal-800',
    guarantee: '1x 75+ OVR (93%+ 75-76 Common Gold)',
    cardCount: 1,
    minRating: 75,
    tradableGuaranteed: false,
  },
  {
    id: 'gold_standard',
    name: 'Premier Gold Players Pack',
    description: '2 Players with 80+ OVR. Heavily weighted to lowest 80-81 OVR cards (~89% rate). High tier stars are authentic lottery rarities.',
    costCoins: 350000,
    badgeText: 'GOLD PACK (80+)',
    themeColor: 'from-amber-500 to-yellow-700',
    guarantee: '2x 80+ OVR (80-81 OVR Heavily Weighted)',
    cardCount: 2,
    minRating: 80,
    tradableGuaranteed: true,
  },
  {
    id: 'wonderkids_pack',
    name: 'Golden Generation Wonderkids Pack',
    description: 'Young phenoms taking the world by storm. Heavily weighted to lowest 82 OVR base wonderkids (~85% rate).',
    costCoins: 850000,
    badgeText: 'WONDERKIDS (82+)',
    themeColor: 'from-fuchsia-600 via-pink-600 to-indigo-900',
    guarantee: '1x 82+ OVR (82 OVR Heavily Weighted)',
    cardCount: 1,
    minRating: 82,
    tradableGuaranteed: true,
    filterCategory: 'wonderkids',
  },
  {
    id: 'elite_master',
    name: 'European Giants Elite Pack',
    description: '2 Elite players from UCL clubs. Heavily weighted to 85-86 OVR squad players (~88% rate). Very low chance of 90+ superstar.',
    costCoins: 1800000,
    badgeText: 'ELITE (85+)',
    themeColor: 'from-cyan-600 to-blue-900',
    guarantee: '2x 85+ OVR (85-86 OVR Heavily Weighted)',
    cardCount: 2,
    minRating: 85,
    tradableGuaranteed: true,
  },
  {
    id: 'icon_legend',
    name: 'APEX 27 Golden Era Legends Pack',
    description: 'Guaranteed 89+ Master or Prime Icon. Heavily weighted to lowest 89-90 icons (~86% rate).',
    costCoins: 4200000,
    badgeText: 'PRIME ICONS (89+)',
    themeColor: 'from-yellow-400 via-amber-600 to-purple-900',
    guarantee: '1x 89+ OVR (89-90 OVR Heavily Weighted)',
    cardCount: 1,
    minRating: 89,
    tradableGuaranteed: true,
  },
  {
    id: 'world_cup_legends',
    name: 'World Cup All-Time Gods & Legends Pack',
    description: '100% Guaranteed Prime Icon. Heavily weighted to 91 OVR icons (~85% rate). Pelé, Maradona, R9, Zidane are 0.2% lottery odds.',
    costCoins: 7500000,
    badgeText: 'ALL-TIME GODS (91+)',
    themeColor: 'from-amber-300 via-yellow-500 to-amber-700',
    guarantee: '1x 91+ OVR (91 OVR Heavily Weighted)',
    cardCount: 1,
    minRating: 91,
    tradableGuaranteed: true,
    iconOnly: true,
  },
];

export const PacksStore: React.FC<Props> = ({
  userProfile,
  inventory,
  onUpdateProfile,
  onUpdateInventory,
}) => {
  const [storeTab, setStoreTab] = useState<'boxes' | 'packs'>('boxes');

  // Daily Store Item Limits (1 opening per box/pack per day)
  const [openedItemIds, setOpenedItemIds] = useState<string[]>(() => loadDailyStoreClaims().openedIds);
  const [countdown, setCountdown] = useState(getTimeUntilNextDailyReset().formatted);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextDailyReset().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStoreUpdate = () => {
      setOpenedItemIds(loadDailyStoreClaims().openedIds);
    };
    window.addEventListener('apex_store_claim_update', handleStoreUpdate);
    return () => window.removeEventListener('apex_store_claim_update', handleStoreUpdate);
  }, []);

  // Standard Pack Opening State
  const [openingPack, setOpeningPack] = useState<PackDefinition | null>(null);
  const [revealedCards, setRevealedCards] = useState<PlayerCard[] | null>(null);
  const [revealStep, setRevealStep] = useState<'suspense' | 'walkout' | 'reveal_all'>('suspense');
  const [walkoutIndex, setWalkoutIndex] = useState<number>(0);

  // Mystery Box Opening State
  const [openingBox, setOpeningBox] = useState<MysteryBoxDefinition | null>(null);
  const [boxStep, setBoxStep] = useState<'locked' | 'burst' | 'revealed'>('locked');
  const [boxRewards, setBoxRewards] = useState<{
    coins: number;
    tokens: number;
    cards: PlayerCard[];
  } | null>(null);

  // Drop Rates & Probabilities Modal State
  const [oddsModalItem, setOddsModalItem] = useState<{
    name: string;
    minRating: number;
    type: 'pack' | 'box';
    isIconOnly?: boolean;
    description: string;
  } | null>(null);

  // ==================== MYSTERY BOX LOGIC ====================
  const handleOpenBox = (box: MysteryBoxDefinition) => {
    // Check daily limit (1 per day)
    if (openedItemIds.includes(box.id)) {
      audio.playClick();
      alert(`Daily Limit Reached! "${box.name}" can only be opened once per day. It will reset at midnight.`);
      return;
    }

    // Check cost
    if (!box.isFree && box.costCoins && userProfile.coins < box.costCoins) {
      audio.playClick();
      alert(`Insufficient Coins! You need ${box.costCoins.toLocaleString()} coins.`);
      return;
    }

    audio.playPackReveal();

    // Deduct cost
    if (!box.isFree && box.costCoins) {
      onUpdateProfile({
        ...userProfile,
        coins: userProfile.coins - box.costCoins,
      });
    }

    // Record daily limit
    recordStoreItemOpenedToday(box.id);
    setOpenedItemIds(prev => [...prev, box.id]);

    // Generate box loot:
    // 1. Coins: heavily biased towards the lower coin threshold
    const coinMin = box.coinRewardRange[0];
    const coinMax = box.coinRewardRange[1];
    const coinFactor = Math.pow(Math.random(), 2.2);
    const rawCoins = coinMin + coinFactor * (coinMax - coinMin);
    const coinsReward = Math.max(coinMin, Math.round(rawCoins / 5000) * 5000);

    // 2. Tokens: usually lower token amount
    const tokenMin = box.tokenRewardRange[0];
    const tokenMax = box.tokenRewardRange[1];
    const tokenFactor = Math.pow(Math.random(), 2);
    const tokensReward = Math.floor(tokenMin + tokenFactor * (tokenMax - tokenMin + 1));

    // 3. Player Cards: heavily weighted to lowest possible OVR
    const minRating = box.minCardRating || 75;
    let pool = BASE_PLAYERS.filter(p => p.rating >= minRating);
    if (box.category === 'icon' || Math.random() * 100 < box.iconChancePct) {
      const iconPool = BASE_PLAYERS.filter(p => p.league === 'Icons & Legends' && p.rating >= minRating);
      if (iconPool.length > 0) pool = iconPool;
    }

    const pulledCards: PlayerCard[] = [];
    for (let i = 0; i < box.cardsCount; i++) {
      const randomBase = pullWeightedPlayerFromPool(pool, minRating);
      pulledCards.push(instantiatePlayerCard(randomBase, true));
    }
    pulledCards.sort((a, b) => b.rating - a.rating);

    setOpeningBox(box);
    setBoxRewards({
      coins: coinsReward,
      tokens: tokensReward,
      cards: pulledCards,
    });
    setBoxStep('locked');
    trackMilestoneProgress('open_pack', 1);
  };

  const handleUnlockBox = () => {
    audio.playWhistle();
    setBoxStep('burst');

    const topCard = boxRewards?.cards[0];
    const isJackpot = topCard && topCard.rating >= 86;

    if (isJackpot) {
      confetti({ particleCount: 140, spread: 90 });
    }

    setTimeout(() => {
      if (isJackpot) {
        audio.playCrowdCheer();
      } else {
        audio.playClick();
      }
      setBoxStep('revealed');
    }, 1400);
  };

  const handleClaimBoxRewards = () => {
    if (!boxRewards) return;
    audio.playCrowdCheer();

    // Credit coins & tokens
    onUpdateProfile({
      ...userProfile,
      coins: userProfile.coins + boxRewards.coins,
      rankTokens: userProfile.rankTokens + boxRewards.tokens,
    });

    // Credit cards
    onUpdateInventory([...inventory, ...boxRewards.cards]);

    setOpeningBox(null);
    setBoxRewards(null);
    setBoxStep('locked');
  };

  // ==================== STANDARD PACK LOGIC ====================
  const handleOpenPack = (pack: PackDefinition) => {
    // Check daily limit (1 per day)
    if (openedItemIds.includes(pack.id)) {
      audio.playClick();
      alert(`Daily Limit Reached! "${pack.name}" can only be opened once per day. It will reset at midnight.`);
      return;
    }

    if (!pack.isFree && pack.costCoins && userProfile.coins < pack.costCoins) {
      audio.playClick();
      alert(`Insufficient Coins! You need ${pack.costCoins.toLocaleString()} coins.`);
      return;
    }

    audio.playPackReveal();

    if (!pack.isFree && pack.costCoins) {
      onUpdateProfile({
        ...userProfile,
        coins: userProfile.coins - pack.costCoins,
      });
    }

    // Record daily limit
    recordStoreItemOpenedToday(pack.id);
    setOpenedItemIds(prev => [...prev, pack.id]);

    const minRating = pack.minRating || 75;
    let pool = BASE_PLAYERS.filter(p => p.rating >= minRating);
    if (pack.iconOnly) {
      pool = BASE_PLAYERS.filter(p => p.league === 'Icons & Legends' && p.rating >= minRating);
    } else if (pack.filterCategory === 'wonderkids') {
      const wkPool = BASE_PLAYERS.filter(p => (p.rating >= 82 && p.rating <= 88));
      if (wkPool.length > 0) pool = wkPool;
    }

    const pulledCards: PlayerCard[] = [];
    for (let i = 0; i < pack.cardCount; i++) {
      const randomBase = pullWeightedPlayerFromPool(pool, minRating);
      const isTradable = pack.tradableGuaranteed ? true : (i === 0 ? false : Math.random() > 0.5);
      pulledCards.push(instantiatePlayerCard(randomBase, isTradable));
    }

    pulledCards.sort((a, b) => b.rating - a.rating);

    setOpeningPack(pack);
    setRevealedCards(pulledCards);
    setRevealStep('suspense');
    setWalkoutIndex(0);
    trackMilestoneProgress('open_pack', 1);

    const topCard = pulledCards[0];
    const isWalkout = topCard && topCard.rating >= 86;
    const isBoard = topCard && topCard.rating >= 82 && topCard.rating < 86;

    setTimeout(() => {
      setRevealStep('walkout');
      if (isWalkout) {
        audio.playCrowdCheer();
        confetti({ particleCount: 120, spread: 90 });
      } else if (isBoard) {
        audio.playWhistle();
      } else {
        audio.playClick();
      }
    }, 1500);
  };

  const handleClaimPack = () => {
    if (!revealedCards) return;
    audio.playCrowdCheer();
    onUpdateInventory([...inventory, ...revealedCards]);
    setOpeningPack(null);
    setRevealedCards(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bento Box */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              Player Recruitment & Crates
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              1x Daily Limit Per Box & Pack • Resets in: <span className="text-yellow-300 font-bold">{countdown}</span>
            </span>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
            <Gift className="w-6 h-6 text-cyan-400" />
            Packs & Promo Boxes Store
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Authentic drop rates: packs heavily yield the lowest eligible ratings (common squad recruits). Every box & pack can be opened once per day!
          </p>
        </div>

        {/* Store Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 bg-[#151B28] p-1.5 rounded-2xl border border-gray-800">
          <button
            onClick={() => { audio.playClick(); setStoreTab('boxes'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              storeTab === 'boxes'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mystery Boxes (6)</span>
          </button>

          <button
            onClick={() => { audio.playClick(); setStoreTab('packs'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              storeTab === 'packs'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-lg shadow-yellow-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Standard Packs (6)</span>
          </button>
        </div>
      </div>

      {/* ================= SECTION: MYSTERY BOXES ================= */}
      {storeTab === 'boxes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Featured APEX Promo Boxes
            </h3>
            <span className="text-xs text-gray-400 font-medium">Bundled rewards: Coins + Rank Tokens + Players • 1 Opening Daily</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MYSTERY_BOXES.map(box => {
              const isOpenedToday = openedItemIds.includes(box.id);

              return (
                <div
                  key={box.id}
                  className={`bg-[#0F141F] border rounded-3xl p-5 flex flex-col justify-between hover:shadow-2xl transition-all group ${
                    isOpenedToday 
                      ? 'border-gray-800/60 opacity-85' 
                      : 'border-gray-800 hover:border-cyan-500/50'
                  }`}
                >
                  <div>
                    {/* 3D Box Header Artwork */}
                    <div
                      className={`w-full h-40 rounded-2xl bg-gradient-to-br ${box.themeColor} p-4 flex flex-col justify-between shadow-inner relative overflow-hidden group-hover:scale-[1.02] transition-transform`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-black/60 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                            {box.badgeText}
                          </span>
                          {isOpenedToday ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/80 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-sm flex items-center gap-1 shadow">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                              Opened Today
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                              Daily 1x
                            </span>
                          )}
                        </div>
                        <Package className="w-6 h-6 text-white drop-shadow animate-bounce shrink-0" />
                      </div>

                      <div>
                        <h4 className="font-black italic uppercase text-lg text-white drop-shadow leading-tight">
                          {box.name}
                        </h4>
                        <span className="text-[11px] text-gray-200 font-bold drop-shadow block mt-0.5">
                          {box.guaranteeText}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                      {box.description}
                    </p>

                    {/* Potential Loot Pills */}
                    <div className="mt-3 space-y-1.5">
                      {box.potentialRewards.map((reward, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-gray-300">
                          <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{reward}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => {
                          audio.playClick();
                          setOddsModalItem({
                            name: box.name,
                            minRating: box.minCardRating || 75,
                            type: 'box',
                            description: box.description,
                          });
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Percent className="w-3 h-3" />
                        View Drop Odds
                      </button>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        Lowest OVR Drop: ~92%
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        {box.isFree ? (
                          <span className="font-mono text-lg font-black text-emerald-400">FREE</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Price</span>
                            <span className="font-mono text-base font-black text-yellow-400">
                              {box.costCoins?.toLocaleString()} COINS
                            </span>
                          </div>
                        )}
                      </div>

                      {isOpenedToday ? (
                        <button
                          disabled
                          className="px-4 py-2.5 rounded-2xl bg-gray-800/80 border border-gray-700/60 text-gray-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-not-allowed"
                          title="Daily limit reached. Resets at midnight UTC."
                        >
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Opened Today
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenBox(box)}
                          className="px-5 py-2.5 rounded-2xl bg-white hover:bg-cyan-400 text-neutral-950 font-black uppercase italic text-xs tracking-wider transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Open Box
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SECTION: STANDARD PACKS ================= */}
      {storeTab === 'packs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Gift className="w-4 h-4 text-yellow-400" />
              Standard Player Card Packs
            </h3>
            <span className="text-xs text-gray-400">Classic foil pack wrappers • 1 Opening Daily</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PACKS.map(pack => {
              const isOpenedToday = openedItemIds.includes(pack.id);

              return (
                <div
                  key={pack.id}
                  className={`bg-[#0F141F] border rounded-3xl p-5 flex flex-col justify-between hover:shadow-2xl transition-all group ${
                    isOpenedToday 
                      ? 'border-gray-800/60 opacity-85' 
                      : 'border-gray-800 hover:border-yellow-500/50'
                  }`}
                >
                  <div>
                    <div className={`w-full h-36 rounded-2xl bg-gradient-to-br ${pack.themeColor} p-4 flex flex-col justify-between shadow-inner relative overflow-hidden group-hover:scale-[1.02] transition-transform`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-black/60 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                            {pack.badgeText}
                          </span>
                          {isOpenedToday ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/80 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-sm flex items-center gap-1 shadow">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                              Opened Today
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-yellow-500/30 text-yellow-200 border border-yellow-400/40 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                              Daily 1x
                            </span>
                          )}
                        </div>
                        <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse shrink-0" />
                      </div>
                      <div>
                        <h4 className="font-black italic uppercase text-base text-white drop-shadow">{pack.name}</h4>
                        <span className="text-[11px] text-gray-100 font-semibold drop-shadow">{pack.guarantee}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => {
                          audio.playClick();
                          setOddsModalItem({
                            name: pack.name,
                            minRating: pack.minRating || 75,
                            type: 'pack',
                            isIconOnly: pack.iconOnly,
                            description: pack.description,
                          });
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Percent className="w-3 h-3" />
                        View Drop Odds
                      </button>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        Lowest OVR Drop: ~92%
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs">
                        {pack.isFree ? (
                          <span className="font-mono text-lg font-bold text-emerald-400">FREE</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Price</span>
                            <span className="font-mono text-base font-bold text-yellow-400">
                              {pack.costCoins?.toLocaleString()} COINS
                            </span>
                          </div>
                        )}
                      </div>

                      {isOpenedToday ? (
                        <button
                          disabled
                          className="px-4 py-2.5 rounded-2xl bg-gray-800/80 border border-gray-700/60 text-gray-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-not-allowed"
                          title="Daily limit reached. Resets at midnight UTC."
                        >
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Opened Today
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenPack(pack)}
                          className="px-5 py-2.5 rounded-2xl bg-white hover:bg-yellow-400 text-neutral-950 font-black uppercase italic text-xs tracking-wider transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          Unwrap Pack
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= DROP ODDS & PROBABILITIES MODAL ================= */}
      {oddsModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="max-w-lg w-full bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
                  Official Drop Probabilities
                </span>
                <h3 className="text-xl font-black italic uppercase text-white mt-1">
                  {oddsModalItem.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Guaranteed minimum rating: <strong className="text-white">{oddsModalItem.minRating} OVR</strong>
                </p>
              </div>
              <button
                onClick={() => setOddsModalItem(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#151B28] rounded-2xl p-4 border border-gray-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-800">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Rating Tier</span>
                <span className="font-bold text-gray-400 uppercase text-[10px]">Drop Chance (%)</span>
              </div>

              {/* Tier 1: Lowest OVR (The common pull) */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-gray-200 font-bold">
                    {oddsModalItem.minRating} - {oddsModalItem.minRating + 1} OVR (Lowest Common)
                  </span>
                </div>
                <span className="font-mono font-black text-amber-400 text-sm">93.6%</span>
              </div>

              {/* Tier 2: Low-Mid */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-gray-200 font-semibold">
                    {oddsModalItem.minRating + 2} - {oddsModalItem.minRating + 3} OVR (Squad Depth)
                  </span>
                </div>
                <span className="font-mono font-bold text-gray-300">5.8%</span>
              </div>

              {/* Tier 3: Mid */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-gray-200 font-semibold">
                    {oddsModalItem.minRating + 4} - {oddsModalItem.minRating + 5} OVR (Above Average)
                  </span>
                </div>
                <span className="font-mono font-bold text-gray-400">0.55%</span>
              </div>

              {/* Tier 4: Walkout Tier */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-gray-200 font-semibold">
                    {oddsModalItem.minRating + 6} - {oddsModalItem.minRating + 8} OVR (Rare Star)
                  </span>
                </div>
                <span className="font-mono font-bold text-cyan-400">0.08%</span>
              </div>

              {/* Tier 5: God Tier / Icon */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-gray-200 font-semibold">
                    {oddsModalItem.minRating + 9}+ OVR / Top Icons (Lottery Miracle)
                  </span>
                </div>
                <span className="font-mono font-black text-purple-400">&lt; 0.02%</span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-200/90 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Heavily Weighted Drop System:</strong> Boxes and packs realistically grant the lowest eligible cards 90%+ of the time. High OVR walkouts and icons are extraordinarily rare.
              </span>
            </div>

            <button
              onClick={() => setOddsModalItem(null)}
              className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-black uppercase italic text-xs tracking-wider transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ================= MYSTERY BOX OPENING MODAL ================= */}
      {openingBox && boxRewards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in">
          <div className="max-w-2xl w-full text-center space-y-6">
            {boxStep === 'locked' && (
              <div className="py-12 space-y-6 animate-in zoom-in-95">
                <div
                  className="w-36 h-36 rounded-3xl mx-auto flex flex-col items-center justify-center relative cursor-pointer group shadow-2xl transition-transform hover:scale-105"
                  style={{ 
                    background: `radial-gradient(circle, ${openingBox.themeColor.includes('yellow') ? '#f59e0b' : '#06b6d4'} 0%, #0F141F 80%)`,
                    boxShadow: `0 0 60px ${openingBox.boxGlowColor}`
                  }}
                  onClick={handleUnlockBox}
                >
                  <Package className="w-16 h-16 text-white drop-shadow-md group-hover:rotate-6 transition-transform" />
                  <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-yellow-400 text-neutral-950 font-black text-[10px] tracking-widest uppercase shadow-md flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    TAP TO UNLOCK
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-scoreboard text-3xl font-black uppercase text-white drop-shadow">
                    {openingBox.name}
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {openingBox.guaranteeText}
                  </p>
                </div>

                <button
                  onClick={handleUnlockBox}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 font-black uppercase italic text-xs tracking-wider shadow-xl shadow-yellow-500/30 cursor-pointer hover:scale-105 transition-transform inline-flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock Crate Now
                </button>
              </div>
            )}

            {boxStep === 'burst' && (
              <div className="py-16 space-y-4 animate-bounce">
                <div className="w-28 h-28 rounded-3xl bg-yellow-400 mx-auto flex items-center justify-center shadow-[0_0_80px_rgba(250,204,21,0.8)]">
                  <Sparkles className="w-16 h-16 text-neutral-950 animate-spin" />
                </div>
                <h3 className="font-scoreboard text-4xl font-black text-yellow-300">
                  CRATE UNLOCKED!
                </h3>
              </div>
            )}

            {boxStep === 'revealed' && (
              <div className="space-y-6 animate-in zoom-in-90">
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-black uppercase tracking-widest">
                    ★ CRATE LOOT CLAIMED ★
                  </span>
                  <h2 className="text-2xl font-black uppercase text-white">
                    {openingBox.name} Rewards
                  </h2>
                </div>

                {/* Items Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                  {/* Coins Tile */}
                  <div className="bg-[#151B28] border border-yellow-500/40 rounded-2xl p-4 flex items-center gap-4 text-left shadow-lg">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400">Coins Jackpot</span>
                      <div className="font-scoreboard text-xl font-black text-yellow-400">
                        +{boxRewards.coins.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Tokens Tile */}
                  <div className="bg-[#151B28] border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-4 text-left shadow-lg">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400">Universal Tokens</span>
                      <div className="font-scoreboard text-xl font-black text-emerald-400">
                        +{boxRewards.tokens} MASCHERANO
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pulled Cards Display */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                      Player Card Unlocked ({boxRewards.cards.length})
                    </span>
                    {boxRewards.cards[0] && boxRewards.cards[0].rating <= (openingBox.minCardRating || 75) + 1 ? (
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-[9px] font-bold text-gray-400 border border-gray-700">
                        Common Drop Rate Pull
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[9px] font-black text-amber-300 border border-amber-500/40">
                        ★ Rare Above-Minimum Pull!
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                    {boxRewards.cards.map(card => (
                      <PlayerCardView key={card.id} card={card} size="md" />
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleClaimBoxRewards}
                    className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-neutral-950 font-black uppercase italic text-xs tracking-wider shadow-xl shadow-emerald-500/30 inline-flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Collect All Box Rewards
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STANDARD PACK OPENING MODAL ================= */}
      {openingPack && revealedCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
          <div className="max-w-xl w-full text-center space-y-6">
            {revealStep === 'suspense' && (
              <div className="py-16 space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.6)] animate-bounce">
                  <Sparkles className="w-12 h-12 text-neutral-950" />
                </div>
                <h3 className="font-scoreboard text-3xl font-black text-amber-400 animate-pulse">
                  OPENING {openingPack.badgeText}...
                </h3>
                <p className="text-xs text-neutral-400">Scanning European player database...</p>
              </div>
            )}

            {revealStep === 'walkout' && (
              <div className="space-y-6 animate-in zoom-in-90">
                {/* Dynamic Banner according to rating */}
                {revealedCards[walkoutIndex].rating >= 86 ? (
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black tracking-widest uppercase animate-pulse">
                      ★ 0.1% RARE WALKOUT JACKPOT! ★
                    </span>
                    <h2 className="text-3xl font-black text-white drop-shadow-md">
                      {revealedCards[walkoutIndex].name}
                    </h2>
                    <p className="text-[11px] text-amber-300/80 font-bold">
                      Incredible luck! You beat the drop rate odds for a top-tier card.
                    </p>
                  </div>
                ) : revealedCards[walkoutIndex].rating >= 82 ? (
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black tracking-widest uppercase">
                      ★ BOARD REVEAL (MID-TIER DROP) ★
                    </span>
                    <h2 className="text-2xl font-black text-white drop-shadow-md">
                      {revealedCards[walkoutIndex].name}
                    </h2>
                    <p className="text-[11px] text-cyan-300/80">
                      Solid pull above base minimum rating.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700 text-xs font-black tracking-widest uppercase">
                      ★ STANDARD SQUAD RECRUIT ★
                    </span>
                    <h2 className="text-2xl font-black text-white drop-shadow-md">
                      {revealedCards[walkoutIndex].name}
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      Common base pack drop ({revealedCards[walkoutIndex].rating} OVR • ~94% typical frequency)
                    </p>
                  </div>
                )}

                <div className="flex justify-center py-4">
                  <PlayerCardView card={revealedCards[walkoutIndex]} size="lg" />
                </div>

                <div className="flex justify-center gap-4">
                  {revealedCards.length > 1 && walkoutIndex < revealedCards.length - 1 ? (
                    <button
                      onClick={() => setWalkoutIndex(prev => prev + 1)}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer"
                    >
                      Next Card ({walkoutIndex + 1}/{revealedCards.length})
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleClaimPack}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Add All to Club Inventory
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
