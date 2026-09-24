import React, { useState, useMemo, useEffect } from 'react';
import { Formation } from '../types';
import { FORMATION_CONFIGS, FORMATION_METAS, FormationMeta } from '../data/formations';
import { X, Search, Check, Sparkles, Shield, Compass, ChevronRight } from 'lucide-react';
import { audio } from '../services/audioService';

interface Props {
  currentFormation: Formation;
  isOpen: boolean;
  onClose: () => void;
  onSelectFormation: (formation: Formation) => void;
}

export const FormationModal: React.FC<Props> = ({
  currentFormation,
  isOpen,
  onClose,
  onSelectFormation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'POPULAR' | '4-Back' | '3-Back' | '5-Back'>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredFormations = useMemo(() => {
    return FORMATION_METAS.filter(meta => {
      // Category filter
      if (selectedCategory === 'POPULAR' && !meta.isPopular) return false;
      if (selectedCategory === '4-Back' && meta.category !== '4-Back') return false;
      if (selectedCategory === '3-Back' && meta.category !== '3-Back') return false;
      if (selectedCategory === '5-Back' && meta.category !== '5-Back') return false;

      // Style filter
      if (selectedStyle !== 'ALL' && meta.style !== selectedStyle) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = meta.displayName.toLowerCase().includes(q) || meta.id.toLowerCase().includes(q);
        const matchSummary = meta.shortSummary.toLowerCase().includes(q);
        const matchDesc = meta.tacticalDescription.toLowerCase().includes(q);
        const matchStrengths = meta.keyStrengths.some(s => s.toLowerCase().includes(q));
        if (!matchName && !matchSummary && !matchDesc && !matchStrengths) return false;
      }

      return true;
    });
  }, [selectedCategory, selectedStyle, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0B0F19] border border-gray-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-[#0E1422]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic tracking-wide uppercase flex items-center gap-2.5">
                Tactical Formations & Variations
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold not-italic">
                  21 Formations
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Select your team's tactical blueprint. Starters automatically transition into matching positions.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-800/80 bg-[#0E1422]/60 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#151B28] p-1.5 rounded-2xl border border-gray-800 text-xs font-bold">
            <button
              onClick={() => {
                audio.playClick();
                setSelectedCategory('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Formations ({FORMATION_METAS.length})
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setSelectedCategory('POPULAR');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'POPULAR'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-amber-400/90 hover:text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Meta / Popular (8)
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setSelectedCategory('4-Back');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedCategory === '4-Back'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              4 at the Back (14)
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setSelectedCategory('3-Back');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedCategory === '3-Back'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              3 at the Back (4)
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setSelectedCategory('5-Back');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedCategory === '5-Back'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              5 at the Back (3)
            </button>
          </div>

          {/* Search Box & Style Filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search variations (e.g. Diamond, False 9, 3-5-2)..."
                className="w-full bg-[#151B28] border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="bg-[#151B28] border border-gray-800 text-gray-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Styles</option>
              <option value="Attacking">Attacking</option>
              <option value="Balanced">Balanced</option>
              <option value="Defensive">Defensive</option>
              <option value="Counter">Counter</option>
            </select>
          </div>
        </div>

        {/* Formations Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[65vh]">
          {filteredFormations.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Shield className="w-10 h-10 mx-auto text-gray-600 mb-2" />
              <div className="text-sm font-bold text-gray-300">No formations found</div>
              <div className="text-xs text-gray-500 mt-1">Try adjusting your category or search query</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFormations.map((meta) => {
                const isCurrent = currentFormation === meta.id;
                const slots = FORMATION_CONFIGS[meta.id] || [];

                return (
                  <div
                    key={meta.id}
                    onClick={() => {
                      audio.playWhistle();
                      onSelectFormation(meta.id);
                      onClose();
                    }}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-[#121724] border-gray-800 hover:border-cyan-500/60 hover:bg-[#161D2E]'
                    }`}
                  >
                    {/* Top Row: Title & Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white tracking-wide">
                              {meta.displayName}
                            </h3>
                            {meta.isPopular && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[9px] font-bold">
                                ★ META
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400/90 font-bold mt-0.5">
                            {meta.slotsSummary}
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="px-2 py-1 rounded-xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-gray-400 text-[10px] font-mono font-bold uppercase shrink-0">
                            {meta.style}
                          </span>
                        )}
                      </div>

                      {/* Tactical Description */}
                      <p className="text-xs text-gray-300 leading-relaxed mb-3 line-clamp-2">
                        {meta.shortSummary}
                      </p>

                      {/* Mini Tactical Pitch Preview */}
                      <div 
                        className="relative w-full h-36 rounded-xl border border-white/15 overflow-hidden shadow-inner mb-3"
                        style={{
                          background: 'linear-gradient(to bottom, #15803d 0%, #166534 50%, #14532d 100%)',
                          backgroundImage: `
                            repeating-linear-gradient(
                              0deg,
                              rgba(255, 255, 255, 0.04),
                              rgba(255, 255, 255, 0.04) 18px,
                              rgba(0, 0, 0, 0.05) 18px,
                              rgba(0, 0, 0, 0.05) 36px
                            )
                          `,
                        }}
                      >
                        {/* Mini Pitch Markings */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20 pointer-events-none" />
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 pointer-events-none" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-8 border-b border-l border-r border-white/20 pointer-events-none" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-8 border-t border-l border-r border-white/20 pointer-events-none" />

                        {/* Player Dots */}
                        {slots.map(slot => (
                          <div
                            key={slot.id}
                            style={{
                              position: 'absolute',
                              top: `${slot.top}%`,
                              left: `${slot.left}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className="flex flex-col items-center pointer-events-none"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-white text-black font-black text-[7px] flex items-center justify-center shadow-md border border-black/40">
                              {slot.label[0]}
                            </div>
                            <span className="text-[7px] font-mono font-bold text-white leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                              {slot.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Key Strength Pills */}
                      <div className="flex flex-wrap items-center gap-1 mb-3">
                        {meta.keyStrengths.map((str, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#182030] text-gray-300 text-[10px] font-medium border border-gray-800"
                          >
                            {str}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">
                        {meta.category} • {meta.style}
                      </span>
                      <button
                        className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          isCurrent
                            ? 'text-cyan-400'
                            : 'text-gray-400 group-hover:text-cyan-300'
                        }`}
                      >
                        {isCurrent ? 'Current Setup' : 'Apply Formation'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0E1422] flex items-center justify-between text-xs text-gray-400">
          <div>
            Active: <strong className="text-cyan-400 font-mono">{currentFormation}</strong>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
