import React from 'react';
import { PlayerCard, CardTier } from '../types';
import { getPlayerCardCurrentRating, getPlayerRankedStats } from '../data/playersDatabase';
import { Lock, Unlock, Zap, Shield, Sparkles } from 'lucide-react';

interface Props {
  card: PlayerCard;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'detail';
  onClick?: () => void;
  selected?: boolean;
  showActions?: boolean;
  onQuickAction?: (action: 'sell' | 'rankup' | 'sub') => void;
}

const TIER_STYLES: Record<CardTier, {
  bg: string;
  border: string;
  badgeBg: string;
  headerColor: string;
  ovrColor: string;
  glowClass: string;
}> = {
  bronze: {
    bg: 'from-amber-900/90 via-stone-800 to-amber-950',
    border: 'border-amber-700/60',
    badgeBg: 'bg-amber-900/80 text-amber-200',
    headerColor: 'text-amber-300',
    ovrColor: 'text-amber-200',
    glowClass: '',
  },
  silver: {
    bg: 'from-slate-600/90 via-slate-800 to-slate-900',
    border: 'border-slate-400/60',
    badgeBg: 'bg-slate-700/80 text-slate-200',
    headerColor: 'text-slate-200',
    ovrColor: 'text-slate-100',
    glowClass: '',
  },
  gold: {
    bg: 'from-amber-500/30 via-neutral-900 to-amber-950/80',
    border: 'border-amber-500/80',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    headerColor: 'text-amber-300',
    ovrColor: 'text-amber-400',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  },
  elite: {
    bg: 'from-amber-400/40 via-neutral-900 to-amber-950',
    border: 'border-amber-400',
    badgeBg: 'bg-amber-400/25 text-amber-200 border border-amber-400/60',
    headerColor: 'text-amber-200',
    ovrColor: 'text-amber-300',
    glowClass: 'shadow-[0_0_20px_rgba(251,191,36,0.35)]',
  },
  master: {
    bg: 'from-cyan-950/90 via-slate-900 to-emerald-950/90',
    border: 'border-cyan-400/90',
    badgeBg: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60',
    headerColor: 'text-cyan-300',
    ovrColor: 'text-cyan-300',
    glowClass: 'shadow-[0_0_25px_rgba(6,182,212,0.45)]',
  },
  icon: {
    bg: 'from-neutral-100/20 via-neutral-900 to-amber-950/90',
    border: 'border-yellow-300',
    badgeBg: 'bg-yellow-400/30 text-yellow-100 border border-yellow-300',
    headerColor: 'text-yellow-200',
    ovrColor: 'text-yellow-300',
    glowClass: 'shadow-[0_0_30px_rgba(253,224,71,0.5)] ring-1 ring-yellow-400/40',
  },
  totw: {
    bg: 'from-violet-950/90 via-neutral-900 to-fuchsia-950/90',
    border: 'border-fuchsia-500',
    badgeBg: 'bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-400',
    headerColor: 'text-fuchsia-300',
    ovrColor: 'text-fuchsia-300',
    glowClass: 'shadow-[0_0_25px_rgba(217,70,239,0.4)]',
  },
  toty: {
    bg: 'from-blue-950/95 via-[#0B1528] to-amber-950/90',
    border: 'border-cyan-300 ring-2 ring-yellow-400/70',
    badgeBg: 'bg-blue-600/40 text-cyan-200 border border-cyan-400',
    headerColor: 'text-cyan-200',
    ovrColor: 'text-yellow-300',
    glowClass: 'shadow-[0_0_35px_rgba(34,211,238,0.6)]',
  },
  flashback: {
    bg: 'from-pink-950/90 via-slate-900 to-purple-950/90',
    border: 'border-pink-500/90',
    badgeBg: 'bg-pink-600/30 text-pink-200 border border-pink-400',
    headerColor: 'text-pink-300',
    ovrColor: 'text-pink-300',
    glowClass: 'shadow-[0_0_25px_rgba(236,72,153,0.5)]',
  },
  hero: {
    bg: 'from-red-950/90 via-neutral-900 to-amber-950/90',
    border: 'border-amber-400',
    badgeBg: 'bg-red-600/30 text-amber-200 border border-amber-400',
    headerColor: 'text-amber-200',
    ovrColor: 'text-amber-300',
    glowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
  },
  wonderkid: {
    bg: 'from-fuchsia-950/90 via-indigo-950/90 to-cyan-950/90',
    border: 'border-cyan-400',
    badgeBg: 'bg-cyan-500/30 text-cyan-200 border border-cyan-400',
    headerColor: 'text-cyan-300',
    ovrColor: 'text-cyan-300',
    glowClass: 'shadow-[0_0_25px_rgba(34,211,238,0.5)]',
  }
};

const RANK_COLORS = [
  'bg-slate-700 text-slate-300', // Rank 0 (none)
  'bg-emerald-500 text-white shadow-emerald-500/50', // Rank 1 (green)
  'bg-blue-500 text-white shadow-blue-500/50',       // Rank 2 (blue)
  'bg-purple-600 text-white shadow-purple-600/50',   // Rank 3 (purple)
  'bg-rose-600 text-white shadow-rose-600/50',       // Rank 4 (red)
  'bg-amber-500 text-white shadow-amber-500/50',     // Rank 5 (gold/orange max)
];

export const PlayerCardView: React.FC<Props> = ({
  card,
  size = 'md',
  onClick,
  selected = false,
}) => {
  const currentOvr = getPlayerCardCurrentRating(card);
  const rankedStats = getPlayerRankedStats(card);
  const theme = TIER_STYLES[card.tier] || TIER_STYLES.gold;

  // XS Compact for Pitch Lineup
  if (size === 'xs') {
    return (
      <div
        onClick={onClick}
        className={`relative cursor-pointer transition-all duration-200 transform hover:scale-105 select-none rounded-lg p-1.5 flex flex-col items-center justify-between text-center bg-gradient-to-b ${theme.bg} border-2 ${theme.border} ${theme.glowClass} ${selected ? 'ring-2 ring-cyan-400 scale-105' : ''}`}
        style={{ width: '82px', height: '110px' }}
      >
        {/* Tradable indicator */}
        <div className="absolute -top-1.5 -right-1.5 z-10">
          {card.isTradable ? (
            <span className="flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-emerald-600/90 text-[8px] font-bold text-white shadow">
              <Unlock className="w-2.5 h-2.5" />
            </span>
          ) : (
            <span className="flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-amber-600/90 text-[8px] font-bold text-white shadow">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Top bar: Rating + Pos */}
        <div className="w-full flex items-center justify-between px-1">
          <div className="flex flex-col items-start leading-none">
            <span className={`text-base font-scoreboard font-black ${theme.ovrColor}`}>{currentOvr}</span>
            <span className="text-[9px] font-bold text-neutral-300">{card.position}</span>
          </div>
          <span className="text-xs">{card.nationFlag}</span>
        </div>

        {/* Player silhouette or initials */}
        <div className="my-0.5 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-neutral-800/80 border border-neutral-600 flex items-center justify-center font-bold text-xs text-neutral-200 shadow-inner">
            {card.shortName.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Name */}
        <div className="w-full">
          <div className="text-[10px] font-bold truncate text-white leading-tight">
            {card.shortName}
          </div>
          <div className="text-[8px] text-neutral-400 truncate leading-none">
            {card.club}
          </div>
        </div>

        {/* Rank Gem */}
        {card.rank > 0 && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black shadow ${RANK_COLORS[card.rank]}`}>
              ★ {card.rank}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Small for inventory lists & quick selection
  if (size === 'sm') {
    return (
      <div
        onClick={onClick}
        className={`relative cursor-pointer transition-all duration-200 transform hover:-translate-y-1 rounded-xl p-2.5 flex flex-col justify-between bg-gradient-to-b ${theme.bg} border-2 ${theme.border} ${theme.glowClass} ${selected ? 'ring-2 ring-cyan-400' : ''}`}
        style={{ width: '135px', height: '190px' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-2xl font-scoreboard font-black leading-none ${theme.ovrColor}`}>
              {currentOvr}
            </div>
            <div className="text-xs font-bold text-neutral-300 mt-0.5">{card.position}</div>
            <div className="text-sm mt-0.5">{card.nationFlag}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {card.isTradable ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-[9px] font-semibold text-emerald-300">
                <Unlock className="w-2.5 h-2.5" /> Tradable
              </span>
            ) : (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-[9px] font-semibold text-amber-300">
                <Lock className="w-2.5 h-2.5" /> Untradable
              </span>
            )}
            {card.rank > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow ${RANK_COLORS[card.rank]}`}>
                RANK {card.rank}
              </span>
            )}
          </div>
        </div>

        {/* Player Name & Club */}
        <div className="my-auto text-center">
          <div className="w-12 h-12 mx-auto mb-1 rounded-full bg-neutral-800/90 border border-neutral-600 flex items-center justify-center font-scoreboard text-lg text-neutral-100 shadow">
            {card.shortName.substring(0, 2).toUpperCase()}
          </div>
          <div className="font-bold text-xs truncate text-white">{card.name}</div>
          <div className="text-[10px] text-neutral-400 truncate">{card.club}</div>
        </div>

        {/* Mini stats preview */}
        <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-neutral-700/60 text-[9px] font-tech text-center">
          <div><span className="text-neutral-400">PAC</span> <span className="font-bold text-white">{rankedStats.pace}</span></div>
          <div><span className="text-neutral-400">SHO</span> <span className="font-bold text-white">{rankedStats.shooting}</span></div>
          <div><span className="text-neutral-400">PAS</span> <span className="font-bold text-white">{rankedStats.passing}</span></div>
        </div>
      </div>
    );
  }

  // Medium (Default Standard Card)
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-200 transform hover:-translate-y-1.5 rounded-2xl p-4 flex flex-col justify-between bg-gradient-to-b ${theme.bg} border-2 ${theme.border} ${theme.glowClass} ${selected ? 'ring-2 ring-cyan-400 scale-[1.02]' : ''}`}
      style={{ width: size === 'lg' ? '240px' : '190px', minHeight: size === 'lg' ? '330px' : '280px' }}
    >
      {/* Top Banner with OVR, Position, Country and Tradable Status */}
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-4xl font-scoreboard font-black leading-none tracking-tight ${theme.ovrColor}`}>
            {currentOvr}
          </div>
          <div className="text-sm font-bold text-neutral-200 uppercase tracking-wide mt-0.5">
            {card.position}
          </div>
          <div className="text-base mt-1" title={card.nationality}>
            {card.nationFlag}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* TRADABLE / UNTRADABLE BADGE */}
          {card.isTradable ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-bold text-emerald-300 uppercase tracking-wider shadow">
              <Unlock className="w-3 h-3 text-emerald-400" />
              Tradable
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-bold text-amber-300 uppercase tracking-wider shadow">
              <Lock className="w-3 h-3 text-amber-400" />
              Untradable
            </span>
          )}

          {/* Rank Badge */}
          {card.rank > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md ${RANK_COLORS[card.rank]}`}>
              Rank {card.rank}
            </span>
          )}
          
          <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            {card.tier}
          </span>
        </div>
      </div>

      {/* Center Crest / Avatar */}
      <div className="my-2 flex flex-col items-center text-center">
        <div className="relative w-16 h-16 rounded-full bg-neutral-900/90 border-2 border-neutral-700/80 flex items-center justify-center shadow-lg group-hover:border-amber-400 transition-colors">
          <span className="font-scoreboard text-2xl font-black text-neutral-200">
            {card.shortName.substring(0, 2).toUpperCase()}
          </span>
          {card.tier === 'icon' && (
            <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
          )}
        </div>
        <div className="mt-2 text-sm font-black truncate w-full text-white tracking-wide">
          {card.name}
        </div>
        <div className="text-xs text-neutral-300 font-medium truncate w-full">
          {card.club}
        </div>
        {card.specialTrait && (
          <div className="text-[9px] text-amber-300/90 font-semibold italic mt-0.5 truncate w-full">
            ★ {card.specialTrait}
          </div>
        )}
      </div>

      {/* Stats Hex/Grid (APEX 27 classic attributes) */}
      <div className="pt-2 border-t border-neutral-700/80 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-tech">
        <div className="flex justify-between">
          <span className="text-neutral-400 font-medium">PAC</span>
          <span className="font-bold text-white">{rankedStats.pace}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 font-medium">DRI</span>
          <span className="font-bold text-white">{rankedStats.dribbling}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 font-medium">SHO</span>
          <span className="font-bold text-white">{rankedStats.shooting}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 font-medium">DEF</span>
          <span className="font-bold text-white">{rankedStats.defending}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 font-medium">PAS</span>
          <span className="font-bold text-white">{rankedStats.passing}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 font-medium">PHY</span>
          <span className="font-bold text-white">{rankedStats.physical}</span>
        </div>
      </div>

      {/* Market Value Footer */}
      <div className="mt-2 pt-1 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
        <span className="text-neutral-400">Est. Value:</span>
        <span className="font-mono font-bold text-amber-400">
          {card.marketValue.toLocaleString()} Coins
        </span>
      </div>
    </div>
  );
};
