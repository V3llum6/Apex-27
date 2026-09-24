import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { audio } from '../services/audioService';
import { loadObjectivesState, getUnclaimedObjectivesCount, getLoginStreakStatus } from '../services/objectiveService';
import { 
  Gamepad2, Users, ArrowLeftRight, Gift, Coins, Gem, 
  Volume2, VolumeX, Shield, Sparkles, Repeat, Save, Trophy, Target
} from 'lucide-react';

interface Props {
  currentTab: 'match' | 'draft' | 'squad' | 'market' | 'store' | 'exchange' | 'objectives';
  onChangeTab: (tab: 'match' | 'draft' | 'squad' | 'market' | 'store' | 'exchange' | 'objectives') => void;
  userProfile: UserProfile;
  squadOvr: number;
  onOpenSaveModal: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onChangeTab,
  userProfile,
  squadOvr,
  onOpenSaveModal,
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [unclaimedObjectives, setUnclaimedObjectives] = useState(() => {
    return getUnclaimedObjectivesCount(loadObjectivesState());
  });
  const [streakCanClaim, setStreakCanClaim] = useState(() => {
    return getLoginStreakStatus().canClaimToday;
  });

  useEffect(() => {
    const handleUpdate = () => {
      setUnclaimedObjectives(getUnclaimedObjectivesCount(loadObjectivesState()));
    };
    const handleStreakUpdate = () => {
      setStreakCanClaim(getLoginStreakStatus().canClaimToday);
    };

    window.addEventListener('apex_objective_update', handleUpdate);
    window.addEventListener('apex_login_streak_update', handleStreakUpdate);
    return () => {
      window.removeEventListener('apex_objective_update', handleUpdate);
      window.removeEventListener('apex_login_streak_update', handleStreakUpdate);
    };
  }, []);

  const toggleSound = () => {
    const newState = !soundOn;
    setSoundOn(newState);
    audio.setSoundEnabled(newState);
    if (newState) audio.playClick();
  };

  const navItems = [
    { id: 'match', label: 'Match Pitch', icon: Gamepad2, badge: '38-Match Season' },
    { id: 'draft', label: 'Draft Mode', icon: Trophy, badge: 'Tournament' },
    { id: 'squad', label: 'My Squad', icon: Users, badge: `${squadOvr} OVR` },
    { id: 'market', label: 'Transfer Market', icon: ArrowLeftRight, badge: 'Live Market' },
    { id: 'store', label: 'Packs & Boxes', icon: Gift, badge: '1x Daily Limit' },
    { id: 'exchange', label: 'Card Exchange', icon: Repeat, badge: 'SBC' },
    { 
      id: 'objectives', 
      label: 'Objectives', 
      icon: Target, 
      badge: unclaimedObjectives > 0 
        ? `${unclaimedObjectives} Ready!` 
        : streakCanClaim 
        ? 'Streak Ready!' 
        : 'Daily & XP',
      hasAlert: unclaimedObjectives > 0 || streakCanClaim
    },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-[#05070A]/95 border-b border-gray-800/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-3.5">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Club identity */}
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-600 px-3 py-1.5 rounded-xl font-black italic text-lg sm:text-xl tracking-tighter text-white shadow-[0_0_15px_rgba(34,211,238,0.25)] flex items-center gap-1.5">
              <span>APEX</span>
              <span className="text-yellow-300">27</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  {userProfile.clubName}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                  Bento Pro
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                <span>Tactical Football 27</span>
                <span>•</span>
                <span>{squadOvr} OVR Squad</span>
              </div>
            </div>
          </div>

          {/* Currencies & Profile Pills */}
          <div className="flex items-center gap-3">
            {/* Coins Bento Pill */}
            <div className="flex items-center gap-2.5 bg-[#151B28] px-4 py-2 rounded-full border border-gray-800 shadow-inner">
              <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)] shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-mono font-bold text-yellow-400">
                  {userProfile.coins.toLocaleString()}
                </span>
                <span className="text-[9px] text-gray-500 font-bold uppercase hidden sm:inline">COINS</span>
              </div>
            </div>

            {/* Rank Tokens Bento Pill */}
            <div className="flex items-center gap-2.5 bg-[#151B28] px-4 py-2 rounded-full border border-gray-800 shadow-inner">
              <div className="w-3.5 h-3.5 bg-emerald-400 rotate-45 shadow-[0_0_8px_rgba(52,211,153,0.5)] shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                  {userProfile.rankTokens}
                </span>
                <span className="text-[9px] text-gray-500 font-bold uppercase hidden sm:inline">TOKENS</span>
              </div>
            </div>

            {/* Level Avatar Badge */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-800 to-gray-600 border-2 border-cyan-400 overflow-hidden flex items-center justify-center text-[10px] font-black italic text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.25)]">
              LVL {userProfile.level}
            </div>

            {/* Save Progress Button */}
            <button
              onClick={() => {
                audio.playClick();
                onOpenSaveModal();
              }}
              title="Save Progress, Slots & Backups"
              className="flex items-center gap-2 bg-[#151B28] hover:bg-[#1C2538] border border-cyan-500/40 hover:border-cyan-400 px-3.5 py-2 rounded-full text-xs font-bold text-cyan-300 transition-all shadow-sm cursor-pointer group"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Save</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={soundOn ? 'Mute Stadium Audio' : 'Unmute Stadium Audio'}
              className="p-2 rounded-full bg-[#151B28] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Bento Grid Navigation) */}
        <nav className="flex items-center gap-6 sm:gap-8 overflow-x-auto pt-3 mt-1 scrollbar-none text-xs font-bold uppercase tracking-widest text-gray-400 border-t border-gray-800/40">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  audio.playClick();
                  onChangeTab(item.id);
                }}
                className={`flex items-center gap-2 pb-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-cyan-400 border-cyan-400 font-black'
                    : 'border-transparent hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  'hasAlert' in item && item.hasAlert
                    ? 'bg-yellow-400 text-black border border-yellow-300 font-black animate-pulse'
                    : isActive 
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' 
                    : 'bg-[#151B28] text-gray-500'
                }`}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
