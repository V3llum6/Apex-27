import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MatchCommentaryEvent, CommentaryEventType } from '../types';
import { 
  Radio, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  Volume2, 
  VolumeX, 
  ArrowDownCircle, 
  Copy, 
  Check, 
  Flame, 
  Filter,
  Layers
} from 'lucide-react';
import { audio } from '../services/audioService';

interface MatchCommentaryBoxProps {
  events: MatchCommentaryEvent[];
  currentMinute: number;
  userTeamName: string;
  opponentTeamName: string;
  opponentBadge: string;
  userScore: number;
  cpuScore: number;
  isPaused?: boolean;
}

export const MatchCommentaryBox: React.FC<MatchCommentaryBoxProps> = ({
  events,
  currentMinute,
  userTeamName,
  opponentTeamName,
  opponentBadge,
  userScore,
  cpuScore,
  isPaused = false,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'goal' | 'cards' | 'save' | 'plays'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to top (newest first) or bottom
  useEffect(() => {
    if (autoScroll && feedContainerRef.current) {
      feedContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [events, autoScroll]);

  // Counts for filters
  const counts = useMemo(() => {
    let goals = 0;
    let cards = 0;
    let saves = 0;
    let plays = 0;

    events.forEach(e => {
      if (e.type === 'goal') goals++;
      else if (e.type === 'card_yellow' || e.type === 'card_red') cards++;
      else if (e.type === 'save') saves++;
      else if (['tackle', 'skill', 'woodwork', 'chance'].includes(e.type)) plays++;
    });

    return {
      all: events.length,
      goals,
      cards,
      saves,
      plays,
    };
  }, [events]);

  // Filtered commentary list
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Type filter
      if (selectedFilter === 'goal' && e.type !== 'goal') return false;
      if (selectedFilter === 'cards' && e.type !== 'card_yellow' && e.type !== 'card_red') return false;
      if (selectedFilter === 'save' && e.type !== 'save') return false;
      if (selectedFilter === 'plays' && !['tackle', 'skill', 'woodwork', 'chance'].includes(e.type)) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesHeadline = e.headline.toLowerCase().includes(q);
        const matchesDetail = e.detail.toLowerCase().includes(q);
        const matchesPlayer = e.playerName ? e.playerName.toLowerCase().includes(q) : false;
        if (!matchesHeadline && !matchesDetail && !matchesPlayer) return false;
      }

      return true;
    });
  }, [events, selectedFilter, searchQuery]);

  // Latest high-impact event for marquee ticker
  const latestEvent = events[0];

  const handleCopyLog = () => {
    audio.playClick();
    const textLog = events
      .map(e => `[${e.minute}'] ${e.headline} - ${e.detail}`)
      .reverse()
      .join('\n');

    navigator.clipboard.writeText(textLog).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Visual helper per event type
  const getEventStyle = (type: CommentaryEventType) => {
    switch (type) {
      case 'goal':
        return {
          border: 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-amber-950/20 to-neutral-900/60',
          badgeBg: 'bg-emerald-500 text-black font-black',
          tagText: 'text-emerald-400',
          icon: '⚽',
          glow: 'shadow-emerald-500/20 shadow-lg',
        };
      case 'card_yellow':
        return {
          border: 'border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900/60',
          badgeBg: 'bg-amber-400 text-black font-black',
          tagText: 'text-amber-300',
          icon: '🟨',
          glow: 'shadow-amber-500/20 shadow-md',
        };
      case 'card_red':
        return {
          border: 'border-rose-600/70 bg-gradient-to-r from-rose-950/50 via-neutral-900 to-neutral-900/60',
          badgeBg: 'bg-rose-600 text-white font-black',
          tagText: 'text-rose-400',
          icon: '🟥',
          glow: 'shadow-rose-500/30 shadow-lg',
        };
      case 'save':
        return {
          border: 'border-cyan-500/50 bg-gradient-to-r from-cyan-950/30 via-neutral-900 to-neutral-900/60',
          badgeBg: 'bg-cyan-500 text-black font-bold',
          tagText: 'text-cyan-300',
          icon: '🧤',
          glow: 'shadow-cyan-500/20 shadow-md',
        };
      case 'woodwork':
        return {
          border: 'border-orange-500/50 bg-neutral-900/80',
          badgeBg: 'bg-orange-500 text-black font-bold',
          tagText: 'text-orange-400',
          icon: '💥',
          glow: 'shadow-orange-500/10 shadow-md',
        };
      case 'skill':
        return {
          border: 'border-purple-500/50 bg-neutral-900/80',
          badgeBg: 'bg-purple-500 text-white font-bold',
          tagText: 'text-purple-300',
          icon: '⚡',
          glow: 'shadow-purple-500/10 shadow-md',
        };
      case 'tackle':
        return {
          border: 'border-blue-500/40 bg-neutral-900/70',
          badgeBg: 'bg-blue-500/30 text-blue-300 border border-blue-400/40 font-bold',
          tagText: 'text-blue-300',
          icon: '🛡️',
          glow: '',
        };
      case 'tactics':
        return {
          border: 'border-indigo-500/40 bg-neutral-900/70',
          badgeBg: 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 font-bold',
          tagText: 'text-indigo-300',
          icon: '📋',
          glow: '',
        };
      default:
        return {
          border: 'border-gray-800 bg-neutral-900/60',
          badgeBg: 'bg-gray-800 text-gray-300 font-bold',
          tagText: 'text-gray-300',
          icon: '⏱️',
          glow: '',
        };
    }
  };

  return (
    <div className="bg-[#0B0F19] border border-gray-800/90 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 blur-[120px] pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider font-mono">
              {isPaused ? 'PAUSED' : 'LIVE BROADCAST'}
            </span>
          </div>

          <div>
            <h3 className="font-black italic uppercase text-base text-white tracking-wide flex items-center gap-2">
              <span>Match Commentary & Event Feed</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {userTeamName} <span className="text-cyan-400 font-bold">{userScore}</span> : <span className="text-rose-400 font-bold">{cpuScore}</span> {opponentTeamName} · <span className="text-yellow-400 font-bold">{currentMinute}' MIN</span>
            </span>
          </div>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player or event..."
              className="bg-[#131926] border border-gray-800 text-xs text-gray-200 placeholder-gray-500 pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-cyan-500/50 transition-colors w-36 sm:w-44 font-mono"
            />
          </div>

          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setAutoScroll(prev => !prev)}
            title={autoScroll ? "Auto-scroll ON (locks to latest)" : "Auto-scroll OFF"}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoScroll 
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' 
                : 'bg-[#131926] border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span className="hidden md:inline">Auto-Scroll</span>
          </button>

          {/* Copy Log */}
          <button
            onClick={handleCopyLog}
            title="Copy match commentary log"
            className="p-1.5 rounded-xl bg-[#131926] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between gap-2 pt-3 pb-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            onClick={() => { audio.playClick(); setSelectedFilter('all'); }}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm shadow-cyan-500/30'
                : 'bg-[#131926] border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>All Events</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFilter === 'all' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'}`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => { audio.playClick(); setSelectedFilter('goal'); }}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
              selectedFilter === 'goal'
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm shadow-emerald-500/30'
                : 'bg-[#131926] border-gray-800 text-gray-400 hover:text-emerald-300'
            }`}
          >
            <span>⚽ Goals</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFilter === 'goal' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'}`}>
              {counts.goals}
            </span>
          </button>

          <button
            onClick={() => { audio.playClick(); setSelectedFilter('cards'); }}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
              selectedFilter === 'cards'
                ? 'bg-amber-400 text-black border-amber-300 shadow-sm shadow-amber-400/30'
                : 'bg-[#131926] border-gray-800 text-gray-400 hover:text-amber-300'
            }`}
          >
            <span>🟨 Cards</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFilter === 'cards' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'}`}>
              {counts.cards}
            </span>
          </button>

          <button
            onClick={() => { audio.playClick(); setSelectedFilter('save'); }}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
              selectedFilter === 'save'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm shadow-cyan-500/30'
                : 'bg-[#131926] border-gray-800 text-gray-400 hover:text-cyan-300'
            }`}
          >
            <span>🧤 Saves</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFilter === 'save' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'}`}>
              {counts.saves}
            </span>
          </button>

          <button
            onClick={() => { audio.playClick(); setSelectedFilter('plays'); }}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
              selectedFilter === 'plays'
                ? 'bg-purple-500 text-white border-purple-400 shadow-sm shadow-purple-500/30'
                : 'bg-[#131926] border-gray-800 text-gray-400 hover:text-purple-300'
            }`}
          >
            <span>⚡ Key Plays</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFilter === 'plays' ? 'bg-black/20 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {counts.plays}
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-gray-400">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Showing {filteredEvents.length} of {events.length}</span>
        </div>
      </div>

      {/* Latest Event Flash / TV Lower-Third Strip */}
      {latestEvent && (
        <div className="my-2 p-2.5 rounded-2xl bg-gradient-to-r from-[#111728] via-[#161f36] to-[#111728] border border-cyan-500/30 shadow-md flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500 text-neutral-950 font-mono font-black text-[10px] tracking-wider uppercase">
              LATEST
            </span>
            <span className="font-mono text-yellow-400 text-xs font-bold shrink-0">
              {latestEvent.minute}'
            </span>
            <div className="truncate text-xs font-bold text-gray-200">
              <span className="text-white">{latestEvent.headline}</span>
              <span className="text-gray-400 ml-1.5 font-normal hidden sm:inline">— {latestEvent.detail}</span>
            </div>
          </div>

          {latestEvent.score && (
            <span className="px-2 py-0.5 rounded-md bg-gray-900 border border-gray-700 text-white font-mono text-xs font-bold shrink-0">
              {latestEvent.score}
            </span>
          )}
        </div>
      )}

      {/* Dynamic Commentary Feed List */}
      <div 
        ref={feedContainerRef}
        className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent select-text"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-gray-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#131926] border border-gray-800 flex items-center justify-center mx-auto text-xl">
              🎙️
            </div>
            <p className="font-mono text-xs text-gray-400 font-bold">
              {searchQuery ? 'No match events matching your search.' : 'Commentary feed active. Live events will appear as action unfolds...'}
            </p>
            <p className="text-[11px] text-gray-600 max-w-sm mx-auto">
              Shots, goalkeeper saves, tactical tackles, referee bookings, and goals will be dynamically broadcasted in real time.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const style = getEventStyle(evt.type);
            const isUser = evt.team === 'user';
            const isCpu = evt.team === 'cpu';

            return (
              <div
                key={evt.id}
                className={`p-3 rounded-2xl border transition-all hover:bg-neutral-900/90 ${style.border} ${style.glow}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Minute Badge */}
                    <div className="flex flex-col items-center justify-center min-w-[38px] pt-0.5">
                      <span className="font-mono font-black text-sm text-yellow-400">
                        {evt.minute}'
                      </span>
                      <span className="text-[9px] uppercase font-mono text-gray-500">
                        MIN
                      </span>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event Type Icon & Tag */}
                        <span className="text-base">{style.icon}</span>

                        <span className={`font-black text-sm tracking-wide ${style.tagText}`}>
                          {evt.headline}
                        </span>

                        {/* Player Tag */}
                        {evt.playerName && (
                          <span className="px-2 py-0.5 rounded-lg bg-gray-800/90 border border-gray-700/60 text-white font-mono text-xs font-bold">
                            {evt.playerName}
                          </span>
                        )}

                        {/* Team Indicator */}
                        {isUser && (
                          <span className="px-1.5 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[10px] font-mono font-bold">
                            {userTeamName}
                          </span>
                        )}
                        {isCpu && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <span>{opponentBadge}</span>
                            <span>{opponentTeamName}</span>
                          </span>
                        )}
                      </div>

                      {/* Vivid Commentary Detail */}
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">
                        {evt.detail}
                      </p>
                    </div>
                  </div>

                  {/* Score or Accent Tag */}
                  {evt.score && (
                    <div className="shrink-0 px-2.5 py-1 rounded-xl bg-black/60 border border-gray-700/80 text-white font-mono text-xs font-black shadow-inner">
                      {evt.score}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] font-mono text-gray-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Simulation Engine v27.4 · Authoritative Physics & Event Telemetry</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{counts.goals} Goals</span>
          <span>·</span>
          <span>{counts.saves} Saves</span>
          <span>·</span>
          <span>{counts.cards} Bookings</span>
        </div>
      </div>
    </div>
  );
};
