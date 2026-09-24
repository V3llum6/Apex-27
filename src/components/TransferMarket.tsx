import React, { useState, useMemo } from 'react';
import { PlayerCard, MarketListing, MarketOrder, League, Position, UserProfile } from '../types';
import { PlayerCardView } from './PlayerCardView';
import { BASE_PLAYERS, instantiatePlayerCard } from '../data/playersDatabase';
import { audio } from '../services/audioService';
import { trackMilestoneProgress } from '../services/objectiveService';
import { 
  Search, ArrowUpDown, Filter, DollarSign, TrendingUp, TrendingDown, 
  Minus, Lock, Unlock, CheckCircle2, AlertTriangle, RefreshCw, X, ShoppingCart, Tag
} from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  inventory: PlayerCard[];
  listings: MarketListing[];
  orders: MarketOrder[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateInventory: (updated: PlayerCard[]) => void;
  onUpdateListings: (updated: MarketListing[]) => void;
  onUpdateOrders: (updated: MarketOrder[]) => void;
  activeSquadCardIds: Set<string>;
}

export const TransferMarket: React.FC<Props> = ({
  userProfile,
  inventory,
  listings,
  orders,
  onUpdateProfile,
  onUpdateInventory,
  onUpdateListings,
  onUpdateOrders,
  activeSquadCardIds,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'sell' | 'my_orders'>('search');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<League | 'ALL'>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<number>(75);
  const [maxRating, setMaxRating] = useState<number>(99);
  const [sortBy, setSortBy] = useState<'rating_desc' | 'price_asc' | 'price_desc'>('rating_desc');

  // Selected player for Buy/Sell Modal
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [selectedInventoryCard, setSelectedInventoryCard] = useState<PlayerCard | null>(null);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const showNotification = (msg: string, isError: boolean = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setTimeout(() => setActionErrorMsg(null), 4000);
    } else {
      setActionSuccessMsg(msg);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // Filtered market listings
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const p = item.player;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q) || p.club.toLowerCase().includes(q);
        if (!matchName) return false;
      }
      if (selectedLeague !== 'ALL' && p.league !== selectedLeague) return false;
      if (selectedPosition !== 'ALL') {
        if (selectedPosition === 'DEF' && !['CB', 'LB', 'RB'].includes(p.position)) return false;
        if (selectedPosition === 'MID' && !['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(p.position)) return false;
        if (selectedPosition === 'ATT' && !['ST', 'CF', 'RW', 'LW'].includes(p.position)) return false;
        if (selectedPosition === 'GK' && p.position !== 'GK') return false;
        if (!['DEF', 'MID', 'ATT', 'GK'].includes(selectedPosition) && p.position !== selectedPosition) return false;
      }
      if (p.rating < minRating || p.rating > maxRating) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating_desc') return b.player.rating - a.player.rating;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return 0;
    });
  }, [listings, searchQuery, selectedLeague, selectedPosition, minRating, maxRating, sortBy]);

  // Inventory Cards for Sell tab
  const sellableInventory = useMemo(() => {
    return inventory.map(card => ({
      card,
      isInSquad: activeSquadCardIds.has(card.id),
    }));
  }, [inventory, activeSquadCardIds]);

  // Handle Buy Player
  const handleConfirmPurchase = (listing: MarketListing) => {
    const cost = customPrice || listing.price;
    if (userProfile.coins < cost) {
      audio.playClick();
      showNotification(`Insufficient Coins! You need ${cost.toLocaleString()} coins.`, true);
      return;
    }

    audio.playKick();
    // Deduct coins
    const updatedProfile = {
      ...userProfile,
      coins: userProfile.coins - cost,
    };
    onUpdateProfile(updatedProfile);

    // Create bought card instance for inventory
    const newCard: PlayerCard = {
      ...listing.player,
      id: `bought_${listing.player.basePlayerId}_${Date.now()}`,
      isTradable: true, // Bought cards are tradable!
      acquiredDate: Date.now(),
    };

    const updatedInv = [...inventory, newCard];
    onUpdateInventory(updatedInv);

    // Log completed order
    const completedOrder: MarketOrder = {
      id: `ord_${Date.now()}`,
      type: 'buy',
      player: newCard,
      price: cost,
      status: 'completed',
      createdAt: Date.now(),
    };
    onUpdateOrders([completedOrder, ...orders]);

    // Close modal
    setSelectedListing(null);
    showNotification(`Successfully purchased ${newCard.name} for ${cost.toLocaleString()} Coins!`);
    trackMilestoneProgress('buy_market', 1);
  };

  // Handle List Card for Sale
  const handleConfirmListing = (card: PlayerCard) => {
    if (!card.isTradable) {
      showNotification('Cannot list untradable cards on the transfer market!', true);
      return;
    }
    if (activeSquadCardIds.has(card.id)) {
      showNotification('Remove this player from your starting squad first!', true);
      return;
    }

    const price = customPrice || card.marketValue;
    const minP = Math.round(card.marketValue * 0.85);
    const maxP = Math.round(card.marketValue * 1.15);

    if (price < minP || price > maxP) {
      showNotification(`Price must be between ${minP.toLocaleString()} and ${maxP.toLocaleString()} coins!`, true);
      return;
    }

    audio.playClick();

    // Remove from user inventory
    const updatedInv = inventory.filter(c => c.id !== card.id);
    onUpdateInventory(updatedInv);

    // Create user sell order (will sell automatically after 10-25 seconds simulated market buyer)
    const newOrder: MarketOrder = {
      id: `sell_ord_${card.id}_${Date.now()}`,
      type: 'sell',
      player: card,
      price,
      status: 'pending',
      createdAt: Date.now(),
    };
    onUpdateOrders([newOrder, ...orders]);

    // Add to market listings
    const newListing: MarketListing = {
      id: `mkt_user_${card.id}`,
      cardId: card.id,
      player: card,
      price,
      priceMin: minP,
      priceMax: maxP,
      sellerId: 'user',
      listedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      purchaseOrdersCount: 2,
      sellOrdersCount: 1,
      lastSalePrice: price,
      priceTrend: 'neutral',
    };
    onUpdateListings([newListing, ...listings]);

    setSelectedInventoryCard(null);
    showNotification(`Listed ${card.name} on the Transfer Market for ${price.toLocaleString()} Coins!`);
    trackMilestoneProgress('list_market', 1);

    // Simulate instant market bot buyer after 8 seconds so user gets to claim coins!
    setTimeout(() => {
      onUpdateOrders(prev => prev.map(o => {
        if (o.id === newOrder.id && o.status === 'pending') {
          const tax = Math.round(o.price * 0.10);
          return {
            ...o,
            status: 'completed',
            claimableCoins: o.price - tax,
          };
        }
        return o;
      }));
    }, 8000);
  };

  // Claim Sold Coins (10% market tax)
  const handleClaimCoins = (order: MarketOrder) => {
    const amount = order.claimableCoins || Math.round(order.price * 0.90);
    audio.playGoalHorn();
    const updatedProfile = {
      ...userProfile,
      coins: userProfile.coins + amount,
    };
    onUpdateProfile(updatedProfile);

    // Update order status
    onUpdateOrders(orders.map(o => o.id === order.id ? { ...o, claimableCoins: 0, status: 'completed' } : o));
    showNotification(`Claimed +${amount.toLocaleString()} Coins from transfer! (10% Market Tax deducted)`);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notifications */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-900/90 border border-emerald-500 text-emerald-100 rounded-xl shadow-2xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-rose-900/90 border border-rose-500 text-rose-100 rounded-xl shadow-2xl animate-in slide-in-from-top-4">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm font-semibold">{actionErrorMsg}</span>
        </div>
      )}

      {/* Bento Grid Market Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Bento Card 1: Live Market Ticker */}
        <div className="md:col-span-7 bg-[#0F141F] rounded-3xl border border-gray-800 p-5 flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              Live Transfer Market
            </h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 font-bold font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {listings.length} Active Listings
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-900/80 border border-cyan-500/40 flex items-center justify-center text-[11px] font-black text-cyan-200">
                91
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">E. HAALAND</div>
                <div className="text-[9px] text-gray-400">Tradable • Man City</div>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-900/80 border border-purple-500/40 flex items-center justify-center text-[11px] font-black text-purple-200">
                90
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">K. MBAPPÉ</div>
                <div className="text-[9px] text-gray-400">Tradable • Real Madrid</div>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/80 border border-blue-500/40 flex items-center justify-center text-[11px] font-black text-blue-200">
                88
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">J. BELLINGHAM</div>
                <div className="text-[9px] text-gray-400">Tradable • Real Madrid</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-white font-mono font-bold">10% Market Tax</span>
              <span>•</span>
              <span className="text-emerald-400">Instant Coin Payout</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400">
              APEX Market Standard
            </div>
          </div>
        </div>

        {/* Bento Card 2: Market Trends Visualizer */}
        <div className="md:col-span-5 bg-[#0F141F] rounded-3xl border border-gray-800 p-5 flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Market Trends</h3>
            <div className="text-[10px] font-bold font-mono bg-white/5 px-2 py-0.5 rounded text-gray-300">Last 24h</div>
          </div>

          {/* Bar chart from Bento Design */}
          <div className="h-16 w-full flex items-end gap-1.5 px-1 py-1">
            <div className="flex-1 bg-gray-800 rounded-t-sm h-[40%]" />
            <div className="flex-1 bg-gray-800 rounded-t-sm h-[55%]" />
            <div className="flex-1 bg-gray-800 rounded-t-sm h-[45%]" />
            <div className="flex-1 bg-cyan-700 rounded-t-sm h-[75%]" />
            <div className="flex-1 bg-cyan-500 rounded-t-sm h-[65%]" />
            <div className="flex-1 bg-cyan-400 rounded-t-sm shadow-[0_0_12px_rgba(34,211,238,0.5)] h-[95%]" />
            <div className="flex-1 bg-cyan-600 rounded-t-sm h-[80%]" />
            <div className="flex-1 bg-gray-800 rounded-t-sm h-[60%]" />
            <div className="flex-1 bg-gray-800 rounded-t-sm h-[50%]" />
          </div>

          <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between items-center text-[10px]">
            <div className="font-bold text-gray-300">
              MARKET INDEX <span className="text-emerald-400 font-mono font-bold">+4.2%</span>
            </div>
            <div className="text-gray-500 font-mono">Next Update in 04:12</div>
          </div>
        </div>
      </div>

      {/* Header Tabs with Bento styling */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F141F] p-2.5 rounded-3xl border border-gray-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { audio.playClick(); setActiveTab('search'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/25 font-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Market Search
          </button>
          <button
            onClick={() => { audio.playClick(); setActiveTab('sell'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'sell'
                ? 'bg-gradient-to-r from-yellow-400 to-amber-600 text-black shadow-lg shadow-yellow-500/25 font-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Sell Players
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/40 font-mono">
              {inventory.filter(c => c.isTradable).length} Tradable
            </span>
          </button>
          <button
            onClick={() => { audio.playClick(); setActiveTab('my_orders'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'my_orders'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 font-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            My Orders
            {orders.filter(o => (o.claimableCoins ?? 0) > 0).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* APEX Transfer Tax & Market Rules Info */}
        <div className="flex items-center gap-2.5 text-xs text-gray-400 pr-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151B28] border border-gray-800 text-[11px]">
            <Unlock className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-bold">Tradable</span>
            <span className="mx-1 text-gray-700">|</span>
            <Lock className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-300 font-bold">Untradable</span>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: MARKET SEARCH ================= */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search player, club, or nationality..."
                  className="w-full bg-[#151B28] border border-gray-800 text-white rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-cyan-400 placeholder-gray-500 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* League filter */}
              <div>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value as League | 'ALL')}
                  className="w-full bg-[#151B28] border border-gray-800 text-gray-200 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                >
                  <option value="ALL">All Leagues (Top 5 + Icons)</option>
                  <option value="Premier League">Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿</option>
                  <option value="La Liga">La Liga 🇪🇸</option>
                  <option value="Serie A">Serie A 🇮🇹</option>
                  <option value="Bundesliga">Bundesliga 🇩🇪</option>
                  <option value="Ligue 1">Ligue 1 🇫🇷</option>
                  <option value="Icons & Legends">Icons & Legends 🏆</option>
                </select>
              </div>

              {/* Position filter */}
              <div>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full bg-[#151B28] border border-gray-800 text-gray-200 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                >
                  <option value="ALL">All Positions</option>
                  <option value="ATT">Attackers (ST, CF, RW, LW)</option>
                  <option value="MID">Midfielders (CAM, CM, CDM)</option>
                  <option value="DEF">Defenders (CB, LB, RB)</option>
                  <option value="GK">Goalkeepers (GK)</option>
                  <option value="ST">ST / Striker</option>
                  <option value="LW">LW / Left Wing</option>
                  <option value="RW">RW / Right Wing</option>
                  <option value="CAM">CAM / Playmaker</option>
                  <option value="CM">CM / Central Mid</option>
                  <option value="CB">CB / Center Back</option>
                </select>
              </div>
            </div>

            {/* Sub filter bar: OVR Range & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Rating Range:</span>
                <span className="font-mono text-xs font-bold text-yellow-400 bg-[#151B28] px-2 py-0.5 rounded-lg border border-gray-800">{minRating} - {maxRating} OVR</span>
                <input
                  type="range"
                  min="75"
                  max="99"
                  value={minRating}
                  onChange={(e) => setMinRating(parseInt(e.target.value))}
                  className="w-28 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rating_desc' | 'price_asc' | 'price_desc')}
                  className="bg-[#151B28] border border-gray-800 text-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-400"
                >
                  <option value="rating_desc">Highest Rating</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredListings.map(item => (
              <div
                key={item.id}
                className="bg-[#0F141F] border border-gray-800 hover:border-cyan-500/50 rounded-3xl p-4 flex flex-col justify-between transition-all hover:shadow-2xl hover:shadow-cyan-950/20 group"
              >
                <div className="flex justify-center mb-3">
                  <PlayerCardView
                    card={item.player}
                    size="sm"
                    onClick={() => {
                      audio.playClick();
                      setSelectedListing(item);
                      setCustomPrice(item.price);
                    }}
                  />
                </div>

                <div className="space-y-2.5 pt-3 border-t border-gray-800/80">
                  {/* Price info - Bento Monospace Yellow */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">BIN Price:</span>
                    <span className="font-mono text-base font-bold text-yellow-400 leading-none">
                      {item.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Market Supply / Demand tags */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <div className="flex items-center gap-1">
                      {item.priceTrend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-rose-400" />}
                      {item.priceTrend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
                      {item.priceTrend === 'neutral' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="font-mono">{item.purchaseOrdersCount} buyers</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-semibold">
                      {item.sellOrdersCount} in stock
                    </span>
                  </div>

                  {/* Action Buy Button */}
                  <button
                    onClick={() => {
                      audio.playClick();
                      setSelectedListing(item);
                      setCustomPrice(item.price);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Buy Player
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredListings.length === 0 && (
            <div className="text-center py-16 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
              <Search className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-300 font-bold">No players found matching your criteria</p>
              <p className="text-neutral-500 text-xs mt-1">Try broadening your search filters or rating threshold</p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: SELL PLAYERS ================= */}
      {activeTab === 'sell' && (
        <div className="space-y-4">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Your Club Players ({inventory.length})</h3>
              <p className="text-xs text-neutral-400">
                Only <strong className="text-emerald-400">Tradable Cards</strong> can be listed on the transfer market. <strong className="text-amber-400">Untradable Cards</strong> can be upgraded or used in SBC Card Exchanges.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                Tradable: {inventory.filter(c => c.isTradable).length}
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                Untradable: {inventory.filter(c => !c.isTradable).length}
              </span>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sellableInventory.map(({ card, isInSquad }) => (
              <div
                key={card.id}
                className={`bg-neutral-900/80 border rounded-2xl p-3 flex flex-col justify-between transition-all ${
                  card.isTradable
                    ? 'border-neutral-800 hover:border-amber-500/60'
                    : 'border-amber-900/30 opacity-90'
                }`}
              >
                <div className="flex justify-center mb-3">
                  <PlayerCardView
                    card={card}
                    size="sm"
                    onClick={() => {
                      if (card.isTradable && !isInSquad) {
                        audio.playClick();
                        setSelectedInventoryCard(card);
                        setCustomPrice(card.marketValue);
                      }
                    }}
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Est. Value:</span>
                    <span className="font-scoreboard text-base font-bold text-amber-400">
                      {card.marketValue.toLocaleString()} Coins
                    </span>
                  </div>

                  {/* Status Badges & Action */}
                  {card.isTradable ? (
                    isInSquad ? (
                      <div className="py-2 px-3 rounded-xl bg-neutral-800 text-neutral-400 text-center font-bold text-xs">
                        In Starting Lineup
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          audio.playClick();
                          setSelectedInventoryCard(card);
                          setCustomPrice(card.marketValue);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 font-bold text-xs text-neutral-950 shadow-md shadow-amber-900/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        List On Market
                      </button>
                    )
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center font-semibold text-xs flex items-center justify-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      Untradable (Cannot Sell)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: MY ORDERS ================= */}
      {activeTab === 'my_orders' && (
        <div className="space-y-4">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
            <h3 className="font-bold text-base text-white">Active Listings & Order History</h3>
            <p className="text-xs text-neutral-400">
              Transfer orders take a short time to match in the global network. When completed, click <strong className="text-emerald-400">Claim Coins</strong> to collect your transfer profit.
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
              <ShoppingCart className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-300 font-bold">No active market orders</p>
              <p className="text-neutral-500 text-xs mt-1">List cards from your club or place bids in the market search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const isClaimable = (order.claimableCoins ?? 0) > 0;
                return (
                  <div
                    key={order.id}
                    className={`bg-neutral-900/80 border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                      isClaimable ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 rounded-lg bg-neutral-800 border border-neutral-700 flex flex-col items-center justify-center text-center p-1">
                        <span className="text-xs font-scoreboard font-black text-amber-400 leading-none">
                          {order.player.rating}
                        </span>
                        <span className="text-[9px] text-neutral-300 font-bold">{order.player.position}</span>
                        <span className="text-[10px]">{order.player.nationFlag}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{order.player.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.type === 'sell' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {order.type === 'sell' ? 'Selling Order' : 'Buy Order'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {order.player.club} • Listed for: <strong className="text-amber-400 font-mono">{order.price.toLocaleString()} Coins</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {isClaimable ? (
                        <button
                          onClick={() => handleClaimCoins(order)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-xs text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 animate-pulse"
                        >
                          <DollarSign className="w-4 h-4" />
                          Claim {order.claimableCoins?.toLocaleString()} Coins
                        </button>
                      ) : order.status === 'pending' ? (
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span>Matching Buyers on Global Market...</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-neutral-500">
                          Completed & Claimed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: BUY CONFIRMATION ================= */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                Transfer Market Order
              </h3>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center">
              <PlayerCardView card={selectedListing.player} size="md" />
            </div>

            {/* Price Selection */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Your Coin Balance:</span>
                <span className="font-scoreboard text-base font-black text-amber-400">
                  {userProfile.coins.toLocaleString()} Coins
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Market Price:</span>
                <span className="font-scoreboard text-xl font-black text-emerald-400">
                  {selectedListing.price.toLocaleString()} Coins
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-2 border-t border-neutral-800">
                <span>Card Status upon purchase:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> TRADABLE
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-bold text-xs text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmPurchase(selectedListing)}
                disabled={userProfile.coins < selectedListing.price}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  userProfile.coins >= selectedListing.price
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SELL CONFIRMATION ================= */}
      {selectedInventoryCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                List Player On Market
              </h3>
              <button
                onClick={() => setSelectedInventoryCard(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center">
              <PlayerCardView card={selectedInventoryCard} size="md" />
            </div>

            {/* Price configuration */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Base Market Price:</span>
                <span className="font-mono font-bold text-neutral-200">
                  {selectedInventoryCard.marketValue.toLocaleString()} Coins
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Market Price Limit:</span>
                <span className="text-neutral-300 font-medium">
                  {Math.round(selectedInventoryCard.marketValue * 0.85).toLocaleString()} - {Math.round(selectedInventoryCard.marketValue * 1.15).toLocaleString()}
                </span>
              </div>

              {/* Set custom listing price */}
              <div className="pt-2 border-t border-neutral-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-semibold">Your Listing Price:</span>
                  <span className="font-scoreboard text-xl font-black text-amber-400">
                    {customPrice.toLocaleString()} Coins
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.round(selectedInventoryCard.marketValue * 0.85)}
                  max={Math.round(selectedInventoryCard.marketValue * 1.15)}
                  step={10000}
                  value={customPrice}
                  onChange={(e) => setCustomPrice(parseInt(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Tax estimation */}
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Estimated Receipt (after 10% tax):</span>
                <span className="font-scoreboard text-base font-bold text-emerald-400">
                  {Math.round(customPrice * 0.90).toLocaleString()} Coins
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedInventoryCard(null)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-bold text-xs text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmListing(selectedInventoryCard)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 font-bold text-xs text-neutral-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                Confirm Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
