import React, { useState } from 'react';
import { PlayerCard, UserProfile } from '../types';
import { BASE_PLAYERS, instantiatePlayerCard } from '../data/playersDatabase';
import { pullWeightedPlayerFromPool } from './PacksStore';
import { PlayerCardView } from './PlayerCardView';
import { audio } from '../services/audioService';
import { trackMilestoneProgress } from '../services/objectiveService';
import confetti from 'canvas-confetti';
import { ArrowLeftRight, Coins, Sparkles, CheckCircle2, Lock, Unlock, ShieldAlert } from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  inventory: PlayerCard[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateInventory: (updated: PlayerCard[]) => void;
  activeSquadCardIds: Set<string>;
}

export const CardExchange: React.FC<Props> = ({
  userProfile,
  inventory,
  onUpdateProfile,
  onUpdateInventory,
  activeSquadCardIds,
}) => {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [exchangeType, setExchangeType] = useState<'tradable_elite' | 'coin_rush' | 'rank_tokens'>('tradable_elite');

  // Untradable cards available for exchange (not in active squad)
  const untradableCards = inventory.filter(c => !c.isTradable && !activeSquadCardIds.has(c.id));

  const toggleSelectCard = (id: string) => {
    audio.playClick();
    if (selectedCards.includes(id)) {
      setSelectedCards(selectedCards.filter(c => c !== id));
    } else {
      setSelectedCards([...selectedCards, id]);
    }
  };

  const handleExecuteExchange = () => {
    if (exchangeType === 'tradable_elite') {
      if (selectedCards.length < 3) return;
      audio.playCrowdCheer();
      confetti({ particleCount: 90, spread: 80 });

      // Remove selected cards
      const updatedInv = inventory.filter(c => !selectedCards.includes(c.id));

      // Give 1 Guaranteed Tradable 83+ Player (weighted to 83-84 OVR)
      const elitePool = BASE_PLAYERS.filter(p => p.rating >= 83);
      const randomElite = pullWeightedPlayerFromPool(elitePool, 83);
      const rewardCard = instantiatePlayerCard(randomElite, true);

      onUpdateInventory([...updatedInv, rewardCard]);
      setSelectedCards([]);
      alert(`🎉 Exchange Complete! Received Tradable ${rewardCard.name} (${rewardCard.rating} OVR)!`);
    } else if (exchangeType === 'coin_rush') {
      if (selectedCards.length < 3) return;
      audio.playGoalHorn();
      confetti({ particleCount: 90, spread: 80 });

      const updatedInv = inventory.filter(c => !selectedCards.includes(c.id));
      onUpdateInventory(updatedInv);

      onUpdateProfile({
        ...userProfile,
        coins: userProfile.coins + 75000,
      });
      setSelectedCards([]);
      alert(`💰 Exchange Complete! Credited +75,000 Coins into your transfer budget!`);
    } else if (exchangeType === 'rank_tokens') {
      if (selectedCards.length < 3) return;
      audio.playPackReveal();
      confetti({ particleCount: 90, spread: 80 });

      const updatedInv = inventory.filter(c => !selectedCards.includes(c.id));
      onUpdateInventory(updatedInv);

      onUpdateProfile({
        ...userProfile,
        rankTokens: userProfile.rankTokens + 1,
      });
      setSelectedCards([]);
      alert(`💎 Exchange Complete! Credited +1 Mascherano Universal Rank Token!`);
    }

    trackMilestoneProgress('complete_exchange', 1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Club Liquidity & Crafting</div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
            <ArrowLeftRight className="w-6 h-6 text-cyan-400" />
            Card Exchange & SBC Protocol
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Turn your untradable reward cards into high-value tradable superstars, transfer coins, or rank upgrade tokens!
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#151B28] border border-gray-800 px-4 py-2 rounded-2xl text-yellow-400 text-xs font-mono font-bold">
          <Lock className="w-3.5 h-3.5 text-yellow-400" />
          {untradableCards.length} Untradable Cards Available
        </div>
      </div>

      {/* Exchange Recipes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => { audio.playClick(); setExchangeType('tradable_elite'); setSelectedCards([]); }}
          className={`p-6 rounded-3xl border text-left transition-all cursor-pointer ${
            exchangeType === 'tradable_elite'
              ? 'border-cyan-400 bg-cyan-950/30 shadow-2xl shadow-cyan-950/40 ring-1 ring-cyan-400/50'
              : 'border-gray-800 bg-[#0F141F] hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase font-mono">
              Tradable Upgrade
            </span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="font-black italic uppercase text-base text-white">Elite Tradable Pack</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Submit 3 Untradable cards to receive 1 Guaranteed 83+ Tradable Player!</p>
          <div className="mt-4 text-xs font-mono font-bold text-cyan-400">Requirement: 3 Cards</div>
        </button>

        <button
          onClick={() => { audio.playClick(); setExchangeType('coin_rush'); setSelectedCards([]); }}
          className={`p-6 rounded-3xl border text-left transition-all cursor-pointer ${
            exchangeType === 'coin_rush'
              ? 'border-yellow-400 bg-yellow-950/30 shadow-2xl shadow-yellow-950/40 ring-1 ring-yellow-400/50'
              : 'border-gray-800 bg-[#0F141F] hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-black uppercase font-mono">
              Coin Harvest
            </span>
            <Coins className="w-4 h-4 text-yellow-400" />
          </div>
          <h3 className="font-black italic uppercase text-base text-white">75,000 Coin Liquidity</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Exchange 3 Untradable cards to boost your market transfer coin balance.</p>
          <div className="mt-4 text-xs font-mono font-bold text-yellow-400">Requirement: 3 Cards</div>
        </button>

        <button
          onClick={() => { audio.playClick(); setExchangeType('rank_tokens'); setSelectedCards([]); }}
          className={`p-6 rounded-3xl border text-left transition-all cursor-pointer ${
            exchangeType === 'rank_tokens'
              ? 'border-purple-400 bg-purple-950/30 shadow-2xl shadow-purple-950/40 ring-1 ring-purple-400/50'
              : 'border-gray-800 bg-[#0F141F] hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase font-mono">
              Rank Tokens
            </span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-black italic uppercase text-base text-white">1x Mascherano Token</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Exchange 3 Untradable cards for 1 Universal Rank-Up Token.</p>
          <div className="mt-4 text-xs font-mono font-bold text-purple-400">Requirement: 3 Cards</div>
        </button>
      </div>

      {/* Select Cards from Untradable Inventory */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white text-xs uppercase tracking-wider">
            Select Cards to Submit ({selectedCards.length} Selected)
          </h3>
          <button
            onClick={handleExecuteExchange}
            disabled={selectedCards.length < 3}
            className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              selectedCards.length >= 3
                ? 'bg-white hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Exchange
          </button>
        </div>

        {untradableCards.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs">
            No eligible untradable cards in your club reserve. Open free daily packs to collect untradable players!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[440px] overflow-y-auto p-1">
            {untradableCards.map(card => {
              const isSelected = selectedCards.includes(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelectCard(card.id)}
                  className={`p-2 rounded-2xl border cursor-pointer transition-all flex flex-col items-center ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  }`}
                >
                  <PlayerCardView card={card} size="xs" />
                  <div className="mt-2 text-[10px] font-bold text-center">
                    {isSelected ? (
                      <span className="text-emerald-400 flex items-center gap-1">✓ Selected</span>
                    ) : (
                      <span className="text-neutral-400">+ Select</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
