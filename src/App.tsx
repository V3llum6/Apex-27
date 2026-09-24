import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Squad, PlayerCard, MarketListing, MarketOrder } from './types';
import { 
  loadUserProfile, saveUserProfile, loadInventory, saveInventory, 
  loadSquad, saveSquad, loadMarketListings, saveMarketListings,
  loadMarketOrders, saveMarketOrders, recordSaveTimestamp
} from './services/storageService';
import { getPlayerCardCurrentRating } from './data/playersDatabase';
import { Navbar } from './components/Navbar';
import { SquadManager } from './components/SquadManager';
import { TransferMarket } from './components/TransferMarket';
import { MatchEngine } from './components/MatchEngine';
import { PacksStore } from './components/PacksStore';
import { CardExchange } from './components/CardExchange';
import { DraftTournament } from './components/DraftTournament';
import { DailyObjectives } from './components/DailyObjectives';
import { SaveManagerModal } from './components/SaveManagerModal';
import { Target, Sparkles, X } from 'lucide-react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [inventory, setInventory] = useState<PlayerCard[]>(() => loadInventory());
  const [squad, setSquad] = useState<Squad>(() => loadSquad(inventory));
  const [marketListings, setMarketListings] = useState<MarketListing[]>(() => loadMarketListings());
  const [marketOrders, setMarketOrders] = useState<MarketOrder[]>(() => loadMarketOrders());

  const [currentTab, setCurrentTab] = useState<'match' | 'draft' | 'squad' | 'market' | 'store' | 'exchange' | 'objectives'>('match');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [globalObjectiveToast, setGlobalObjectiveToast] = useState<{ title: string; desc: string } | null>(null);

  // Global listener for objective progress events
  useEffect(() => {
    const handleObjectiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newlyCompleted = customEvent.detail?.newlyCompleted;
      if (Array.isArray(newlyCompleted) && newlyCompleted.length > 0) {
        const first = newlyCompleted[0];
        setGlobalObjectiveToast({
          title: `🎯 Objective Completed: ${first.title}!`,
          desc: 'Head to the Objectives tab to claim your rewards!',
        });
        setTimeout(() => setGlobalObjectiveToast(null), 5000);
      }
    };

    window.addEventListener('apex_objective_update', handleObjectiveEvent);
    return () => window.removeEventListener('apex_objective_update', handleObjectiveEvent);
  }, []);

  // Sync state to storage with timestamp record
  const handleUpdateProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    saveUserProfile(updated);
    recordSaveTimestamp();
  };

  const handleUpdateInventory = (updated: PlayerCard[]) => {
    setInventory(updated);
    saveInventory(updated);
    recordSaveTimestamp();
  };

  const handleUpdateSquad = (updated: Squad) => {
    setSquad(updated);
    saveSquad(updated);
    recordSaveTimestamp();
  };

  const handleUpdateListings = (updated: MarketListing[]) => {
    setMarketListings(updated);
    saveMarketListings(updated);
    recordSaveTimestamp();
  };

  const handleUpdateOrders = (updated: MarketOrder[]) => {
    setMarketOrders(updated);
    saveMarketOrders(updated);
    recordSaveTimestamp();
  };

  // Reload all game state when a save is loaded or restored from file
  const handleReloadAllState = () => {
    const freshProfile = loadUserProfile();
    const freshInv = loadInventory();
    const freshSquad = loadSquad(freshInv);
    const freshListings = loadMarketListings();
    const freshOrders = loadMarketOrders();

    setUserProfile(freshProfile);
    setInventory(freshInv);
    setSquad(freshSquad);
    setMarketListings(freshListings);
    setMarketOrders(freshOrders);
    setReloadKey(prev => prev + 1);
  };

  // Squad OVR
  const squadOvr = useMemo(() => {
    const starters = Object.values(squad.slots).filter(Boolean) as PlayerCard[];
    if (starters.length === 0) return 85;
    return Math.round(starters.reduce((acc, c) => acc + getPlayerCardCurrentRating(c), 0) / starters.length);
  }, [squad]);

  // Set of card IDs in active squad
  const activeSquadCardIds = useMemo(() => {
    const activeCards = Object.values(squad.slots).filter(Boolean) as PlayerCard[];
    return new Set(activeCards.map(c => c.id));
  }, [squad]);

  return (
    <div 
      className="min-h-screen bg-[#05070A] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-white"
      style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, #1a2a44 0%, #05070A 70%)' }}
    >
      {/* Top Bar */}
      <Navbar
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        userProfile={userProfile}
        squadOvr={squadOvr}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'match' && (
          <MatchEngine
            key={reloadKey}
            userSquad={squad}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentTab === 'draft' && (
          <DraftTournament
            userProfile={userProfile}
            inventory={inventory}
            onUpdateProfile={handleUpdateProfile}
            onUpdateInventory={handleUpdateInventory}
          />
        )}

        {currentTab === 'squad' && (
          <SquadManager
            squad={squad}
            inventory={inventory}
            userProfile={userProfile}
            onUpdateSquad={handleUpdateSquad}
            onUpdateInventory={handleUpdateInventory}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentTab === 'market' && (
          <TransferMarket
            userProfile={userProfile}
            inventory={inventory}
            listings={marketListings}
            orders={marketOrders}
            onUpdateProfile={handleUpdateProfile}
            onUpdateInventory={handleUpdateInventory}
            onUpdateListings={handleUpdateListings}
            onUpdateOrders={handleUpdateOrders}
            activeSquadCardIds={activeSquadCardIds}
          />
        )}

        {currentTab === 'store' && (
          <PacksStore
            userProfile={userProfile}
            inventory={inventory}
            onUpdateProfile={handleUpdateProfile}
            onUpdateInventory={handleUpdateInventory}
          />
        )}

        {currentTab === 'exchange' && (
          <CardExchange
            userProfile={userProfile}
            inventory={inventory}
            onUpdateProfile={handleUpdateProfile}
            onUpdateInventory={handleUpdateInventory}
            activeSquadCardIds={activeSquadCardIds}
          />
        )}

        {currentTab === 'objectives' && (
          <DailyObjectives
            userProfile={userProfile}
            inventory={inventory}
            onUpdateProfile={handleUpdateProfile}
            onUpdateInventory={handleUpdateInventory}
            onChangeTab={setCurrentTab}
          />
        )}
      </main>

      {/* Global In-Game Objective Completion Toast */}
      {globalObjectiveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F141F]/95 border-2 border-yellow-400 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 max-w-sm">
          <div className="p-2 rounded-xl bg-yellow-400 text-black shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-black text-yellow-300 uppercase tracking-wider">
              {globalObjectiveToast.title}
            </div>
            <div className="text-[11px] text-gray-300">
              {globalObjectiveToast.desc}
            </div>
            <button
              onClick={() => {
                setCurrentTab('objectives');
                setGlobalObjectiveToast(null);
              }}
              className="mt-1.5 text-[10px] font-black uppercase text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Open Objectives Tab →
            </button>
          </div>
          <button
            onClick={() => setGlobalObjectiveToast(null)}
            className="text-gray-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Save Manager Modal */}
      <SaveManagerModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onStateRestored={handleReloadAllState}
      />

      {/* Bento Grid Broadcast Footer */}
      <footer className="mt-auto border-t border-gray-800/80 bg-[#05070A]/80 py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <span>Server Status: <span className="text-emerald-400 font-mono">● Online</span></span>
            <span>Region: <span className="text-gray-400">Europe North</span></span>
            <span className="hidden sm:inline">Top 5 European Leagues Active</span>
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer transition-colors"
            >
              Save / Load Manager
            </button>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-white/30 font-mono">APEX Engine 2.7</span>
            <span className="text-white/30 font-mono">Arcade Pitch Sim</span>
            <span className="text-cyan-400">© 2027 APEX 27</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
