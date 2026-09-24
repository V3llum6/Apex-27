import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PlayerCard, UserProfile, Formation, Position, 
  DraftSession, DraftPlayerPick, DraftMatchOpponent 
} from '../types';
import { BASE_PLAYERS, BasePlayer, instantiatePlayerCard, getPlayerCardCurrentRating } from '../data/playersDatabase';
import { PlayerCardView } from './PlayerCardView';
import { audio } from '../services/audioService';
import { loadDraftSession, saveDraftSession, clearDraftSession } from '../services/storageService';
import { trackMilestoneProgress } from '../services/objectiveService';
import confetti from 'canvas-confetti';
import { 
  Trophy, Shield, Play, FastForward, CheckCircle2, Sparkles, 
  RefreshCw, ChevronRight, Award, Flame, Coins, Zap, 
  ArrowLeft, Star, Users, Check, RotateCcw, Swords,
  ArrowLeftRight, ArrowUpDown, X, UserCheck, CheckCheck, SlidersHorizontal, AlertCircle
} from 'lucide-react';

interface Props {
  userProfile: UserProfile;
  inventory: PlayerCard[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateInventory: (updated: PlayerCard[]) => void;
}

// Available draft formations
const DRAFT_FORMATIONS: Array<{
  formation: Formation;
  title: string;
  desc: string;
  slots: Array<{ id: string; label: string; pos: Position; top: number; left: number }>;
}> = [
  {
    formation: '4-3-3',
    title: '4-3-3 Attack',
    desc: 'Dynamic wing play, CAM playmaker, and lethal striker spearhead.',
    slots: [
      { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
      { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
      { id: 'cb1', label: 'CB', pos: 'CB', top: 75, left: 38 },
      { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 62 },
      { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
      { id: 'cm1', label: 'CM', pos: 'CM', top: 52, left: 30 },
      { id: 'cdm', label: 'CAM', pos: 'CAM', top: 40, left: 50 },
      { id: 'cm2', label: 'CM', pos: 'CM', top: 52, left: 70 },
      { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
      { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
      { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
    ],
  },
  {
    formation: '4-2-3-1',
    title: '4-2-3-1 Narrow',
    desc: 'Dual defensive pivots protecting the backline with 3 creative AMs.',
    slots: [
      { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
      { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
      { id: 'cb1', label: 'CB', pos: 'CB', top: 75, left: 38 },
      { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 62 },
      { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
      { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 58, left: 36 },
      { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 58, left: 64 },
      { id: 'lam', label: 'LAM', pos: 'CAM', top: 36, left: 24 },
      { id: 'cam', label: 'CAM', pos: 'CAM', top: 34, left: 50 },
      { id: 'ram', label: 'RAM', pos: 'CAM', top: 36, left: 76 },
      { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    ],
  },
  {
    formation: '3-5-2',
    title: '3-5-2 Total Dominance',
    desc: '3 Solid Centerbacks, packed midfield with wingbacks and twin strikers.',
    slots: [
      { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
      { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 26 },
      { id: 'cb2', label: 'CB', pos: 'CB', top: 76, left: 50 },
      { id: 'cb3', label: 'CB', pos: 'CB', top: 74, left: 74 },
      { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 56, left: 36 },
      { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 56, left: 64 },
      { id: 'lm', label: 'LM', pos: 'LM', top: 46, left: 14 },
      { id: 'cam', label: 'CAM', pos: 'CAM', top: 36, left: 50 },
      { id: 'rm', label: 'RM', pos: 'RM', top: 46, left: 86 },
      { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
      { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
    ],
  },
  {
    formation: '4-4-2',
    title: '4-4-2 Classic Flat',
    desc: 'Balanced double bank of four with natural wide width and strike partnership.',
    slots: [
      { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
      { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
      { id: 'cb1', label: 'CB', pos: 'CB', top: 75, left: 38 },
      { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 62 },
      { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
      { id: 'lm', label: 'LM', pos: 'LM', top: 48, left: 16 },
      { id: 'cm1', label: 'CM', pos: 'CM', top: 50, left: 38 },
      { id: 'cm2', label: 'CM', pos: 'CM', top: 50, left: 62 },
      { id: 'rm', label: 'RM', pos: 'RM', top: 48, left: 84 },
      { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
      { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
    ],
  },
];

// 5 Bench slots positions
const BENCH_CONFIG: Array<{ slotId: string; label: string; position: Position }> = [
  { slotId: 'b_fwd', label: 'SUB ATT', position: 'ST' },
  { slotId: 'b_mid1', label: 'SUB MID', position: 'CM' },
  { slotId: 'b_mid2', label: 'SUB WIDE', position: 'LW' },
  { slotId: 'b_def', label: 'SUB DEF', position: 'CB' },
  { slotId: 'b_gk', label: 'SUB GK', position: 'GK' },
];

// Tournament opponents
const TOURNAMENT_OPPONENTS: DraftMatchOpponent[] = [
  {
    id: 'opp_round_1',
    name: 'Borussia Dortmund',
    shortName: 'BVB',
    badge: '🟡',
    rating: 85,
    difficulty: 'Quarter-Final',
    keyStars: ['Kobel', 'Brandt', 'Guirassy', 'Adeyemi'],
  },
  {
    id: 'opp_round_2',
    name: 'Inter Milan',
    shortName: 'INT',
    badge: '🔵',
    rating: 87,
    difficulty: 'Semi-Final',
    keyStars: ['Lautaro', 'Barella', 'Bastoni', 'Dimarco'],
  },
  {
    id: 'opp_round_3',
    name: 'Real Madrid',
    shortName: 'RMA',
    badge: '👑',
    rating: 89,
    difficulty: 'Grand Final',
    keyStars: ['Mbappé', 'Vini Jr', 'Bellingham', 'Rüdiger'],
  },
  {
    id: 'opp_round_4',
    name: 'Classic World All-Stars',
    shortName: 'ALL-STARS',
    badge: '🌟',
    rating: 93,
    difficulty: 'Champions Clash',
    keyStars: ['R9 Ronaldo', 'Zidane', 'Maldini', 'Yashin'],
  },
];

const ROUND_REWARDS = [
  { round: 1, name: 'Quarter-Final', coins: 15000, tokens: 0, desc: '15,000 Coins' },
  { round: 2, name: 'Semi-Final', coins: 35000, tokens: 0, desc: '35,000 Coins' },
  { round: 3, name: 'Grand Final', coins: 70000, tokens: 1, desc: '70,000 Coins + 1x Mascherano Token' },
  { round: 4, name: 'Champions Trophy', coins: 150000, tokens: 2, desc: '150,000 Coins + 2x Mascherano Tokens + 90+ Draft Master Player!' },
];

export const DraftTournament: React.FC<Props> = ({
  userProfile,
  inventory,
  onUpdateProfile,
  onUpdateInventory,
}) => {
  const [session, setSession] = useState<DraftSession | null>(() => loadDraftSession());
  const [activeCandidateModal, setActiveCandidateModal] = useState<{
    pick: DraftPlayerPick;
    isBench: boolean;
    pickIndex: number;
  } | null>(null);

  // Match Simulation State
  const [simState, setSimState] = useState<{
    isPlaying: boolean;
    minute: number;
    userGoals: number;
    cpuGoals: number;
    events: Array<{ minute: number; text: string; isGoal?: boolean; isUser?: boolean }>;
    isFinished: boolean;
  } | null>(null);

  // Substitution & Squad Management State
  const [pendingSwap, setPendingSwap] = useState<{
    isBench: boolean;
    index: number;
    pick: DraftPlayerPick;
    card: PlayerCard;
  } | null>(null);

  // Tournament view tab ('bracket' | 'squad')
  const [tournamentTab, setTournamentTab] = useState<'bracket' | 'squad'>('bracket');

  // Interactive substitution notification toast
  const [subToast, setSubToast] = useState<{ message: string; type?: 'success' | 'info' } | null>(null);

  // In-Match tactical substitution modal state
  const [inMatchSubModalOpen, setInMatchSubModalOpen] = useState(false);
  const [inMatchSubsRemaining, setInMatchSubsRemaining] = useState(5);
  const [selectedSubOutSlotId, setSelectedSubOutSlotId] = useState<string | null>(null);
  const [selectedSubInSlotId, setSelectedSubInSlotId] = useState<string | null>(null);

  // Dedicated Draft Substitution Modal State (Direct & Guided Subbing)
  const [draftSubModal, setDraftSubModal] = useState<{
    sourcePick: DraftPlayerPick;
    isBench: boolean;
    index: number;
  } | null>(null);

  // Simulation interval and active attackers ref
  const simIntervalRef = useRef<any>(null);
  const simActiveAttackersRef = useRef<PlayerCard[]>([]);

  // Keyboard shortcut: Escape cancels swap mode or open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingSwap) {
          setPendingSwap(null);
          showSubToast('Substitution cancelled', 'info');
        }
        if (inMatchSubModalOpen) {
          setInMatchSubModalOpen(false);
        }
        if (draftSubModal) {
          setDraftSubModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingSwap, inMatchSubModalOpen, draftSubModal]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  // Helper: show brief notification toast
  const showSubToast = (message: string, type: 'success' | 'info' = 'success') => {
    setSubToast({ message, type });
    setTimeout(() => {
      setSubToast(prev => prev?.message === message ? null : prev);
    }, 3200);
  };

  // Helper to compute projected OVR and Chemistry impact when contemplating a swap
  const simulateSwapMetrics = (
    source: { isBench: boolean; index: number },
    target: { isBench: boolean; index: number }
  ) => {
    if (!session) return { ovr: 0, chemistry: 0, ovrDiff: 0, chemDiff: 0 };
    const tempStarters = session.starterPicks.map(p => ({ ...p }));
    const tempBench = session.benchPicks.map(p => ({ ...p }));

    const sPick = source.isBench ? tempBench[source.index] : tempStarters[source.index];
    const tPick = target.isBench ? tempBench[target.index] : tempStarters[target.index];

    const sCard = sPick.selectedCard;
    const tCard = tPick.selectedCard;

    sPick.selectedCard = tCard;
    tPick.selectedCard = sCard;

    const newMetrics = calculateDraftMetrics(tempStarters);
    return {
      ovr: newMetrics.ovr,
      chemistry: newMetrics.chemistry,
      ovrDiff: newMetrics.ovr - session.draftOvr,
      chemDiff: newMetrics.chemistry - session.draftChemistry,
    };
  };

  // Save session changes
  useEffect(() => {
    saveDraftSession(session);
  }, [session]);

  // Helper: Generate candidate cards for a position
  const generateCandidatesForPosition = (pos: Position, count: number = 5): PlayerCard[] => {
    // Look for players that can play this position
    let pool = BASE_PLAYERS.filter(p => p.position === pos || (p.secondaryPositions && p.secondaryPositions.includes(pos)));
    if (pool.length < count) {
      pool = BASE_PLAYERS;
    }

    // Shuffle and pick 5 distinct players with realistic tier distribution
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    // Randomize ranks (rank 0 to 2) and tradable status
    return selected.map(base => {
      const rank = Math.random() > 0.6 ? 1 : 0;
      return instantiatePlayerCard(base, true, rank);
    });
  };

  // Helper: Generate 5 superstar captains (90+ rating icons / masters)
  const generateCaptainChoices = (): PlayerCard[] => {
    const elitePool = BASE_PLAYERS.filter(p => p.rating >= 92 || p.league === 'Icons & Legends');
    const shuffled = [...elitePool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5).map(base => instantiatePlayerCard(base, true, 1));
  };

  // Calculate Chemistry & OVR for a drafted team
  const calculateDraftMetrics = (starters: DraftPlayerPick[]): { ovr: number; chemistry: number } => {
    const selectedCards = starters.map(p => p.selectedCard).filter(Boolean) as PlayerCard[];
    if (selectedCards.length === 0) return { ovr: 0, chemistry: 0 };

    // OVR is average rating
    const avgRating = Math.round(selectedCards.reduce((acc, c) => acc + getPlayerCardCurrentRating(c), 0) / selectedCards.length);

    // Chemistry calculation based on shared Club, League, and Nation links
    let chemPoints = 0;
    for (let i = 0; i < selectedCards.length; i++) {
      const c1 = selectedCards[i];
      let playerLinks = 0;

      // Icons get automatic full links
      if (c1.league === 'Icons & Legends') {
        playerLinks += 9;
      } else {
        selectedCards.forEach((c2, j) => {
          if (i === j) return;
          if (c1.club === c2.club) playerLinks += 3;
          else if (c1.league === c2.league) playerLinks += 2;
          if (c1.nationality === c2.nationality) playerLinks += 2;
        });
      }
      chemPoints += Math.min(10, playerLinks);
    }

    const totalChemistry = Math.min(100, Math.round((chemPoints / (selectedCards.length * 8)) * 100));

    return {
      ovr: avgRating || 85,
      chemistry: totalChemistry || 60,
    };
  };

  // Start a new draft session
  const handleStartNewDraft = () => {
    audio.playClick();
    const newSession: DraftSession = {
      id: `draft_${Date.now()}`,
      isActive: true,
      phase: 'formation_select',
      formation: '4-3-3',
      captain: null,
      starterPicks: [],
      benchPicks: [],
      currentPickIndex: 0,
      draftOvr: 0,
      draftChemistry: 0,
      currentRound: 1,
      totalRounds: 4,
      roundHistory: [],
      isChampion: false,
      isEliminated: false,
      rewardsClaimed: false,
    };
    setSession(newSession);
  };

  // Select formation
  const handleSelectFormation = (f: Formation) => {
    if (!session) return;
    audio.playWhistle();

    const config = DRAFT_FORMATIONS.find(df => df.formation === f) || DRAFT_FORMATIONS[0];
    
    // Generate starter slots
    const starterPicks: DraftPlayerPick[] = config.slots.map(s => ({
      slotId: s.id,
      position: s.pos,
      label: s.label,
      selectedCard: null,
      candidateCards: generateCandidatesForPosition(s.pos),
      isBench: false,
    }));

    // Generate bench slots
    const benchPicks: DraftPlayerPick[] = BENCH_CONFIG.map(b => ({
      slotId: b.slotId,
      position: b.position,
      label: b.label,
      selectedCard: null,
      candidateCards: generateCandidatesForPosition(b.position),
      isBench: true,
    }));

    // Generate captain candidates
    const captainCandidates = generateCaptainChoices();

    setSession({
      ...session,
      formation: f,
      phase: 'captain_pick',
      starterPicks,
      benchPicks,
      starterPicksFirstCandidates: captainCandidates, // Temporary for captain choice
    } as any);
  };

  // Select Captain
  const handleSelectCaptain = (captainCard: PlayerCard) => {
    if (!session) return;
    audio.playCrowdCheer();
    confetti({ particleCount: 70, spread: 80 });

    // Place captain in suitable starter pick or first pick
    const updatedStarters = [...session.starterPicks];
    const matchingSlot = updatedStarters.find(p => p.position === captainCard.position && !p.selectedCard) || updatedStarters[0];
    matchingSlot.selectedCard = captainCard;

    const metrics = calculateDraftMetrics(updatedStarters);

    setSession({
      ...session,
      phase: 'drafting',
      captain: captainCard,
      starterPicks: updatedStarters,
      draftOvr: metrics.ovr,
      draftChemistry: metrics.chemistry,
    });
  };

  // Open pick modal for a slot
  const handleOpenPickModal = (pick: DraftPlayerPick, isBench: boolean, index: number) => {
    audio.playClick();
    // If candidates haven't been generated, generate them
    if (!pick.candidateCards || pick.candidateCards.length === 0) {
      pick.candidateCards = generateCandidatesForPosition(pick.position);
    }
    setActiveCandidateModal({ pick, isBench, pickIndex: index });
  };

  // Choose a card for the active pick slot
  const handleChoosePlayer = (chosenCard: PlayerCard) => {
    if (!session || !activeCandidateModal) return;
    audio.playPackReveal();

    const { isBench, pickIndex } = activeCandidateModal;
    let updatedStarters = [...session.starterPicks];
    let updatedBench = [...session.benchPicks];

    if (isBench) {
      updatedBench[pickIndex].selectedCard = chosenCard;
    } else {
      updatedStarters[pickIndex].selectedCard = chosenCard;
    }

    const metrics = calculateDraftMetrics(updatedStarters);

    // Check if draft is fully picked (all starters & bench have selections)
    const allStartersFilled = updatedStarters.every(p => p.selectedCard !== null);
    const allBenchFilled = updatedBench.every(p => p.selectedCard !== null);
    const isComplete = allStartersFilled && allBenchFilled;

    if (isComplete) {
      audio.playCrowdCheer();
      confetti({ particleCount: 120, spread: 100 });
    }

    setSession({
      ...session,
      phase: isComplete ? 'tournament' : 'drafting',
      starterPicks: updatedStarters,
      benchPicks: updatedBench,
      draftOvr: metrics.ovr,
      draftChemistry: metrics.chemistry,
    });

    setActiveCandidateModal(null);
  };

  // ================= UNIVERSAL DRAFT SUBSTITUTION & SWAP CONTROLLER =================
  const handleSlotClick = (pick: DraftPlayerPick, isBench: boolean, index: number) => {
    // If no card is drafted yet in this slot:
    if (!pick.selectedCard) {
      // If a pending swap is active, move the player to this empty slot!
      if (pendingSwap) {
        handleExecuteSwap(pendingSwap, { isBench, index, pick, card: null });
        return;
      }
      // Otherwise, open the candidate selection modal
      handleOpenPickModal(pick, isBench, index);
      return;
    }

    // A card is already drafted in this slot:
    // Case 1: If pending swap active and user clicked the same slot -> cancel
    if (pendingSwap && pendingSwap.isBench === isBench && pendingSwap.index === index) {
      audio.playClick();
      setPendingSwap(null);
      showSubToast('Substitution cancelled', 'info');
      return;
    }

    // Case 2: If pending swap active and user clicked a different slot -> EXECUTE SWAP
    if (pendingSwap) {
      handleExecuteSwap(pendingSwap, { isBench, index, pick, card: pick.selectedCard });
      return;
    }

    // Case 3: No pending swap active -> open the interactive Substitution Modal!
    audio.playClick();
    setDraftSubModal({ sourcePick: pick, isBench, index });
  };

  // Execute swap between two slots (Pitch <-> Pitch, Pitch <-> Bench, or Bench <-> Bench)
  const handleExecuteSwap = (
    source: { isBench: boolean; index: number; pick: DraftPlayerPick; card: PlayerCard },
    target: { isBench: boolean; index: number; pick: DraftPlayerPick; card: PlayerCard | null }
  ) => {
    if (!session) return;
    audio.playKick();

    const updatedStarters = session.starterPicks.map(p => ({ ...p }));
    const updatedBench = session.benchPicks.map(p => ({ ...p }));

    const sourcePick = source.isBench ? updatedBench[source.index] : updatedStarters[source.index];
    const targetPick = target.isBench ? updatedBench[target.index] : updatedStarters[target.index];

    const sourceCard = sourcePick.selectedCard;
    const targetCard = targetPick.selectedCard;

    sourcePick.selectedCard = targetCard;
    targetPick.selectedCard = sourceCard;

    const metrics = calculateDraftMetrics(updatedStarters);

    // Keep captain reference valid
    let updatedCaptain = session.captain;
    if (session.captain) {
      const allCards = [...updatedStarters, ...updatedBench].map(p => p.selectedCard).filter(Boolean) as PlayerCard[];
      if (!allCards.some(c => c.id === session.captain?.id)) {
        updatedCaptain = allCards[0] || null;
      }
    }

    // Check if entire draft is complete
    const allStartersFilled = updatedStarters.every(p => p.selectedCard !== null);
    const allBenchFilled = updatedBench.every(p => p.selectedCard !== null);
    const isComplete = allStartersFilled && allBenchFilled;

    setSession({
      ...session,
      phase: isComplete ? (session.phase === 'drafting' ? 'tournament' : session.phase) : session.phase,
      starterPicks: updatedStarters,
      benchPicks: updatedBench,
      captain: updatedCaptain,
      draftOvr: metrics.ovr,
      draftChemistry: metrics.chemistry,
    });

    setPendingSwap(null);

    const sName = sourceCard?.shortName || sourceCard?.name || 'Player';
    const tName = targetCard?.shortName || targetCard?.name || 'Empty Slot';

    if (metrics.chemistry > session.draftChemistry || metrics.ovr > session.draftOvr) {
      audio.playCrowdCheer();
      confetti({ particleCount: 50, spread: 60 });
    }

    showSubToast(
      `Substituted: ${sName} ⇄ ${tName}! Team OVR: ${metrics.ovr}, Chemistry: ${metrics.chemistry}%`,
      'success'
    );
  };

  // Auto-Optimize Starting XI from all 16 drafted cards to maximize OVR & Chemistry
  const handleAutoOptimizeLineup = () => {
    if (!session) return;
    audio.playSkillMove();

    const allCards = [...session.starterPicks, ...session.benchPicks]
      .map(p => p.selectedCard)
      .filter(Boolean) as PlayerCard[];

    if (allCards.length < 11) {
      showSubToast('Draft more players first to optimize your lineup!', 'info');
      return;
    }

    let bestStarters = session.starterPicks.map(p => ({ ...p }));
    let bestBench = session.benchPicks.map(p => ({ ...p }));
    let bestMetrics = calculateDraftMetrics(bestStarters);
    let bestScore = bestMetrics.ovr * 10 + bestMetrics.chemistry;

    let improved = true;
    let passes = 0;
    while (improved && passes < 12) {
      improved = false;
      passes++;

      for (let sIdx = 0; sIdx < bestStarters.length; sIdx++) {
        for (let bIdx = 0; bIdx < bestBench.length; bIdx++) {
          if (!bestBench[bIdx].selectedCard) continue;

          const tempS = bestStarters[sIdx].selectedCard;
          const tempB = bestBench[bIdx].selectedCard;
          bestStarters[sIdx].selectedCard = tempB;
          bestBench[bIdx].selectedCard = tempS;

          const testMetrics = calculateDraftMetrics(bestStarters);
          const testScore = testMetrics.ovr * 10 + testMetrics.chemistry;

          if (testScore > bestScore) {
            bestScore = testScore;
            bestMetrics = testMetrics;
            improved = true;
          } else {
            bestStarters[sIdx].selectedCard = tempS;
            bestBench[bIdx].selectedCard = tempB;
          }
        }
      }
    }

    setSession({
      ...session,
      starterPicks: bestStarters,
      benchPicks: bestBench,
      draftOvr: bestMetrics.ovr,
      draftChemistry: bestMetrics.chemistry,
    });

    audio.playCrowdCheer();
    confetti({ particleCount: 70, spread: 80 });
    showSubToast(`Lineup Optimized! Team OVR: ${bestMetrics.ovr}, Chemistry: ${bestMetrics.chemistry}%`, 'success');
  };

  // In-Match Tactical Substitution
  const handleInMatchSub = (starterSlotId: string, benchSlotId: string) => {
    if (!session || !simState || inMatchSubsRemaining <= 0) return;

    const starterPick = session.starterPicks.find(p => p.slotId === starterSlotId);
    const benchPick = session.benchPicks.find(p => p.slotId === benchSlotId);

    if (!starterPick?.selectedCard || !benchPick?.selectedCard) return;

    const subOut = starterPick.selectedCard;
    const subIn = benchPick.selectedCard;

    // Swap in state
    const updatedStarters = session.starterPicks.map(p => 
      p.slotId === starterSlotId ? { ...p, selectedCard: subIn } : { ...p }
    );
    const updatedBench = session.benchPicks.map(p => 
      p.slotId === benchSlotId ? { ...p, selectedCard: subOut } : { ...p }
    );

    const metrics = calculateDraftMetrics(updatedStarters);

    setSession({
      ...session,
      starterPicks: updatedStarters,
      benchPicks: updatedBench,
      draftOvr: metrics.ovr,
      draftChemistry: metrics.chemistry,
    });

    // Update active scorers pool
    simActiveAttackersRef.current = updatedStarters
      .map(p => p.selectedCard)
      .filter(c => c && ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'].includes(c.position)) as PlayerCard[];

    // Add match event
    const subEvent = {
      minute: simState.minute,
      text: `🔄 ${simState.minute}' TACTICAL SUB: ${subIn.shortName || subIn.name} (${subIn.position}) replaces ${subOut.shortName || subOut.name}! Fresh energy on the pitch.`,
      isGoal: false,
    };

    setSimState(prev => prev ? {
      ...prev,
      events: [subEvent, ...prev.events],
    } : null);

    setInMatchSubsRemaining(prev => Math.max(0, prev - 1));
    setSelectedSubOutSlotId(null);
    setSelectedSubInSlotId(null);
    setInMatchSubModalOpen(false);

    audio.playWhistle();
    audio.playCrowdCheer();
    showSubToast(`Substituted: ${subIn.shortName} ON ⇄ ${subOut.shortName} OFF!`, 'success');
  };

  // Start Match Simulation
  const handleStartSimMatch = () => {
    if (!session) return;
    audio.playWhistle();

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }

    setInMatchSubsRemaining(5);
    setSelectedSubOutSlotId(null);
    setSelectedSubInSlotId(null);

    const opp = TOURNAMENT_OPPONENTS[session.currentRound - 1] || TOURNAMENT_OPPONENTS[0];
    const userRating = session.draftOvr;
    const oppRating = opp.rating;

    // Collect drafted attackers & midfielders for realistic goal scoring
    const attackingStars = session.starterPicks
      .map(p => p.selectedCard)
      .filter(c => c && ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'].includes(c.position)) as PlayerCard[];

    simActiveAttackersRef.current = attackingStars;
    const captainName = session.captain?.shortName || session.captain?.name || 'Your Star';

    setSimState({
      isPlaying: true,
      minute: 0,
      userGoals: 0,
      cpuGoals: 0,
      events: [
        { minute: 1, text: `Kickoff! ${userProfile.clubName} face ${opp.name} in the ${opp.difficulty}!` }
      ],
      isFinished: false,
    });

    // Run simulation tick
    let curMin = 0;
    let uGoals = 0;
    let cGoals = 0;
    const eventsList: Array<{ minute: number; text: string; isGoal?: boolean; isUser?: boolean }> = [
      { minute: 1, text: `Referee whistles kickoff! Atmosphere is electric.` }
    ];

    simIntervalRef.current = setInterval(() => {
      curMin += Math.floor(Math.random() * 12) + 8;
      if (curMin > 90) curMin = 90;

      // Event chance with authentic difficulty scaling
      const eventRoll = Math.random();
      const userAdvantage = (userRating - oppRating) * 0.015;
      const diffFactor = userProfile.difficultySetting === 'legendary' ? -0.05 : userProfile.difficultySetting === 'world_class' ? -0.025 : 0;

      if (eventRoll < 0.20 + userAdvantage + diffFactor) {
        // User scores!
        uGoals += 1;
        const currentPool = simActiveAttackersRef.current.length > 0 ? simActiveAttackersRef.current : attackingStars;
        const scorer = currentPool[Math.floor(Math.random() * currentPool.length)]?.shortName || captainName;
        eventsList.unshift({
          minute: curMin,
          text: `⚽ GOAL! ${scorer} finishes with clinical precision into the top corner! (${uGoals} - ${cGoals})`,
          isGoal: true,
          isUser: true,
        });
        audio.playCrowdCheer();
      } else if (eventRoll > 0.68 - userAdvantage - diffFactor) {
        // Opponent scores!
        cGoals += 1;
        const oppScorer = opp.keyStars[Math.floor(Math.random() * opp.keyStars.length)] || 'Opponent Forward';
        eventsList.unshift({
          minute: curMin,
          text: `⚡ GOAL! ${oppScorer} strikes for ${opp.shortName}! (${uGoals} - ${cGoals})`,
          isGoal: true,
          isUser: false,
        });
      } else {
        // Tactical event
        const flavorTexts = [
          `Great block by your defense to shut down ${opp.shortName}'s counter!`,
          `Fierce tackle in midfield wins back possession!`,
          `Shot hits the side netting! So close to scoring!`,
          `Goalkeeper pulls off a reflex save to deny a certain goal!`
        ];
        eventsList.unshift({
          minute: curMin,
          text: flavorTexts[Math.floor(Math.random() * flavorTexts.length)],
        });
      }

      setSimState({
        isPlaying: curMin < 90,
        minute: curMin,
        userGoals: uGoals,
        cpuGoals: cGoals,
        events: [...eventsList],
        isFinished: curMin >= 90,
      });

      if (curMin >= 90) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        audio.playWhistle();

        // Handle match outcome
        setTimeout(() => {
          handleMatchFinished(uGoals, cGoals, opp);
        }, 1200);
      }
    }, 450);
  };

  // Instant finish sim
  const handleInstantFinishSim = () => {
    if (!simState || !session) return;
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    const opp = TOURNAMENT_OPPONENTS[session.currentRound - 1] || TOURNAMENT_OPPONENTS[0];
    const userRating = session.draftOvr;
    const oppRating = opp.rating;

    // Simulate final scores
    const userBias = userRating >= oppRating ? 1 : 0;
    const uGoals = Math.max(0, Math.floor(Math.random() * 3) + userBias);
    const cGoals = Math.max(0, Math.floor(Math.random() * 2));

    // Ensure decisive result (extra time / penalties if draw)
    const finalU = uGoals === cGoals ? uGoals + 1 : uGoals;
    const finalC = cGoals;

    setSimState({
      isPlaying: false,
      minute: 90,
      userGoals: finalU,
      cpuGoals: finalC,
      events: [
        { minute: 90, text: `Full Time! Match concluded ${finalU} - ${finalC}.`, isGoal: true },
        ...simState.events,
      ],
      isFinished: true,
    });

    handleMatchFinished(finalU, finalC, opp);
  };

  // Handle Match Finished logic
  const handleMatchFinished = (uGoals: number, cGoals: number, opp: DraftMatchOpponent) => {
    if (!session) return;
    const isWin = uGoals > cGoals;

    // Track Daily Objectives & Milestones
    trackMilestoneProgress('play_match', 1);
    trackMilestoneProgress('draft_match', 1);
    if (isWin) {
      trackMilestoneProgress('win_match', 1);
    }
    if (uGoals > 0) {
      trackMilestoneProgress('score_goals', uGoals);
    }
    if (cGoals === 0) {
      trackMilestoneProgress('clean_sheet', 1);
    }

    const roundInfo = ROUND_REWARDS[session.currentRound - 1];

    if (isWin) {
      audio.playCrowdCheer();
      confetti({ particleCount: 100, spread: 80 });

      const isFinalRound = session.currentRound === session.totalRounds;

      if (isFinalRound) {
        // Champion!
        setSession({
          ...session,
          phase: 'ended',
          isChampion: true,
          isEliminated: false,
          roundHistory: [
            ...session.roundHistory,
            {
              round: session.currentRound,
              roundName: roundInfo.name,
              opponent: opp,
              userScore: uGoals,
              cpuScore: cGoals,
              result: 'W',
            }
          ]
        });
      } else {
        // Advance to next round!
        setSession({
          ...session,
          currentRound: session.currentRound + 1,
          roundHistory: [
            ...session.roundHistory,
            {
              round: session.currentRound,
              roundName: roundInfo.name,
              opponent: opp,
              userScore: uGoals,
              cpuScore: cGoals,
              result: 'W',
            }
          ]
        });
      }
    } else {
      // Eliminated
      setSession({
        ...session,
        phase: 'ended',
        isChampion: false,
        isEliminated: true,
        roundHistory: [
          ...session.roundHistory,
          {
            round: session.currentRound,
            roundName: roundInfo.name,
            opponent: opp,
            userScore: uGoals,
            cpuScore: cGoals,
            result: 'L',
          }
        ]
      });
    }
  };

  // Claim Draft Rewards
  const handleClaimDraftRewards = () => {
    if (!session) return;
    audio.playCrowdCheer();
    confetti({ particleCount: 150, spread: 110 });

    const maxRoundReached = session.isChampion ? 4 : Math.max(1, session.currentRound - (session.isEliminated ? 1 : 0));
    const rewardData = ROUND_REWARDS[maxRoundReached - 1] || ROUND_REWARDS[0];

    // Profile Coins and Tokens
    const updatedProfile: UserProfile = {
      ...userProfile,
      coins: userProfile.coins + rewardData.coins,
      rankTokens: userProfile.rankTokens + rewardData.tokens,
    };
    onUpdateProfile(updatedProfile);

    // If champion, also award a high-tier untradable Draft Master card to inventory!
    if (session.isChampion) {
      const candidates = BASE_PLAYERS.filter(p => p.rating >= 89 && p.rating <= 91);
      const rewardBase = candidates[Math.floor(Math.random() * candidates.length)] || BASE_PLAYERS[0];
      const championCard = instantiatePlayerCard(rewardBase, false, 1);
      onUpdateInventory([...inventory, championCard]);
    }

    setSession({
      ...session,
      rewardsClaimed: true,
    });
  };

  // Reset / Discard current draft
  const handleDiscardDraft = () => {
    audio.playClick();
    clearDraftSession();
    setSession(null);
    setSimState(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bento Box */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-0.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>APEX Draft Championship</span>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
            <Swords className="w-6 h-6 text-yellow-400" />
            Champions Draft Tournament
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Build your dream team pick-by-pick, optimize chemistry links, and battle through the 4-round tournament ladder for huge coin jackpots and prime cards!
          </p>
        </div>

        {session && session.phase !== 'ended' && (
          <div className="flex items-center gap-4 bg-[#151B28] px-5 py-3 rounded-2xl border border-gray-800 shadow-inner">
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-gray-400">Team OVR</span>
              <div className="font-scoreboard text-2xl font-black text-cyan-400 leading-none">
                {session.draftOvr || '--'}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-gray-400">Chemistry</span>
              <div className="font-scoreboard text-2xl font-black text-emerald-400 leading-none">
                {session.draftChemistry}%
              </div>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <button
              onClick={handleDiscardDraft}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-rose-900/60 text-gray-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Quit / Reset Draft"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Interactive Toast Notification */}
      {subToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            subToast.type === 'info'
              ? 'bg-[#151B28]/95 border-cyan-500/50 text-cyan-200'
              : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              subToast.type === 'info' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {subToast.type === 'info' ? <ArrowLeftRight className="w-4 h-4" /> : <CheckCheck className="w-4 h-4" />}
            </div>
            <div className="text-xs font-bold">{subToast.message}</div>
            <button
              onClick={() => setSubToast(null)}
              className="ml-2 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Persistent Swap Mode Banner (When a player is selected to substitute) */}
      {pendingSwap && (
        <div className="bg-gradient-to-r from-cyan-950 via-cyan-900/60 to-indigo-950 border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5 text-cyan-300 animate-spin-slow" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                Substitution Mode Active
              </div>
              <div className="text-sm font-black text-white">
                Selected: {pendingSwap.card.shortName || pendingSwap.card.name} ({pendingSwap.pick.label} • {pendingSwap.isBench ? 'Bench' : 'Starting XI'})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs text-cyan-200 font-semibold hidden md:inline">
              👉 Click any starter on pitch or bench substitute to swap positions
            </span>
            <button
              onClick={() => {
                setPendingSwap(null);
                showSubToast('Substitution cancelled', 'info');
              }}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow"
            >
              <X className="w-3.5 h-3.5" />
              Cancel (ESC)
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE: NO ACTIVE DRAFT (LOBBY) ================= */}
      {!session && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Draft Entry Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950/70 via-[#0F141F] to-[#0A0D14] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black tracking-widest uppercase inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                OFFICIAL FC DRAFT PASS
              </span>

              <h3 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white leading-tight">
                Draft A World-Class Squad & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-200">
                  Conquer The Champions Ladder
                </span>
              </h3>

              <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
                Choose your formation, select an iconic captain (Pelé, R9, Zidane, Cruyff, or Maradona), and hand-pick 16 superstars to maximize your chemistry and squad rating!
              </p>

              {/* Tournament Steps Graphic */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                {ROUND_REWARDS.map((r, i) => (
                  <div key={r.round} className="bg-[#151B28]/90 border border-gray-800 rounded-2xl p-3 text-center">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Round {r.round}</div>
                    <div className="font-black text-sm text-white mt-0.5">{r.name}</div>
                    <div className="text-[10px] font-bold text-yellow-400 mt-1">{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-bold uppercase">Entry Fee:</span>
                <span className="font-mono text-lg font-black text-emerald-400">FREE STARTER ENTRY</span>
              </div>

              <button
                onClick={handleStartNewDraft}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-neutral-950 font-black uppercase italic text-sm tracking-wider transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-neutral-950" />
                Enter Draft Tournament
              </button>
            </div>
          </div>

          {/* Draft Hall of Fame & Rules Bento */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">APEX Draft Rules</div>
              <h4 className="text-lg font-black uppercase text-white">How Draft Works</h4>
              
              <ul className="space-y-3 text-xs text-gray-300">
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</div>
                  <span><strong>Choose Formation:</strong> Pick your tactical setup to suit wingers, central play, or twin strikers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</div>
                  <span><strong>Select Captain:</strong> Choose 1 of 5 elite 94-98 prime icons to anchor your chemistry.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</div>
                  <span><strong>Pick by Pick:</strong> Click any slot to choose from 5 randomized stars for that specific position.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</div>
                  <span><strong>Play & Win:</strong> Advance through 4 rounds to claim up to 2.5M coins and prime icons!</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#151B28] rounded-2xl p-4 border border-gray-800">
              <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">Max Chemistry Tip</div>
              <div className="text-xs text-gray-200 mt-1">
                Link players with the same <strong>Club (+3)</strong>, <strong>League (+2)</strong>, or <strong>Nation (+2)</strong>. Icons have universal chemistry!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PHASE 1: FORMATION SELECTION ================= */}
      {session && session.phase === 'formation_select' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
              Step 1 of 3: Formation Choice
            </span>
            <h3 className="text-2xl font-black uppercase text-white">Select Your Tactical Formation</h3>
            <p className="text-xs text-gray-400">Every formation provides a unique positional grid for your draft picks.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DRAFT_FORMATIONS.map(df => (
              <div
                key={df.formation}
                onClick={() => handleSelectFormation(df.formation)}
                className="bg-[#0F141F] border border-gray-800 hover:border-cyan-400 rounded-3xl p-5 flex flex-col justify-between hover:shadow-2xl hover:shadow-cyan-950/40 transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-scoreboard text-2xl font-black text-cyan-400 group-hover:text-cyan-300">
                      {df.formation}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-gray-500">Classic Tactics</span>
                  </div>
                  <h4 className="text-base font-black text-white">{df.title}</h4>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">{df.desc}</p>
                </div>

                {/* Mini pitch visualizer */}
                <div className="h-28 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 mt-4 relative overflow-hidden flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border border-white/20 absolute" />
                  <div className="w-full h-px bg-white/20 absolute" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 z-10">
                    11 Starting Positions
                  </span>
                </div>

                <button className="mt-4 w-full py-2.5 rounded-2xl bg-white group-hover:bg-cyan-400 text-neutral-950 font-black uppercase italic text-xs tracking-wider transition-colors">
                  Select {df.formation}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= PHASE 2: CAPTAIN SELECTION ================= */}
      {session && session.phase === 'captain_pick' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-black uppercase tracking-wider">
              Step 2 of 3: Captain Pick
            </span>
            <h3 className="text-2xl font-black uppercase text-white">Choose Your Icon Captain</h3>
            <p className="text-xs text-gray-400">Select one world legend to lead your team. Captains provide wildcard chemistry!</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {((session as any).starterPicksFirstCandidates || generateCaptainChoices()).map((card: PlayerCard) => (
              <div
                key={card.id}
                onClick={() => handleSelectCaptain(card)}
                className="bg-[#0F141F] border border-yellow-500/40 hover:border-yellow-400 rounded-3xl p-4 flex flex-col items-center justify-between hover:shadow-2xl hover:shadow-yellow-500/20 transition-all cursor-pointer group transform hover:scale-[1.03]"
              >
                <div className="text-[9px] font-black uppercase tracking-wider text-yellow-400 mb-2 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  CAPTAIN OPTION
                </div>

                <div className="my-2">
                  <PlayerCardView card={card} size="md" />
                </div>

                <button className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 font-black uppercase italic text-[11px] tracking-wider transition-opacity shadow-md">
                  Choose Captain
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= PHASE 3: INTERACTIVE PITCH DRAFTING ================= */}
      {session && session.phase === 'drafting' && (
        <div className="space-y-6">
          {/* Active Formation Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0F141F] border border-gray-800 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-scoreboard text-xl font-bold text-cyan-400">{session.formation}</span>
              <span className="text-xs text-gray-400 font-semibold">
                Click any slot to draft or click existing cards to substitute & swap positions
              </span>
            </div>
            <div className="flex items-center gap-3">
              {session.starterPicks.some(p => p.selectedCard) && (
                <button
                  onClick={handleAutoOptimizeLineup}
                  className="px-3 py-1.5 rounded-xl bg-[#151B28] hover:bg-[#1C2436] border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Automatically arrange your best drafted players for maximum OVR and Chemistry"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Auto-Optimize Lineup
                </button>
              )}
              {session.captain && (
                <div className="flex items-center gap-2 bg-[#151B28] px-3 py-1.5 rounded-xl border border-gray-800">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold text-white">Captain: {session.captain.shortName}</span>
                  <span className="text-[10px] font-black text-yellow-400 font-scoreboard">({getPlayerCardCurrentRating(session.captain)})</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* The Tactical Football Pitch */}
            <div className="lg:col-span-2 bg-[#0A241A] border-2 border-emerald-600/40 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden min-h-[560px] flex flex-col justify-between">
              {/* Pitch markings */}
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="w-full h-full border-2 border-white/50 rounded-2xl m-2" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-2 border-white/50" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-white/50" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-white/50" />
              </div>

              {/* Pitch Slots */}
              <div className="relative w-full h-[520px]">
                {session.starterPicks.map((pick, idx) => {
                  const formConfig = DRAFT_FORMATIONS.find(df => df.formation === session.formation) || DRAFT_FORMATIONS[0];
                  const slotPos = formConfig.slots[idx] || { top: 50, left: 50 };
                  const isSelectedForSwap = pendingSwap && !pendingSwap.isBench && pendingSwap.index === idx;
                  const isPotentialTarget = pendingSwap && (!isSelectedForSwap);

                  return (
                    <div
                      key={pick.slotId}
                      style={{ top: `${slotPos.top}%`, left: `${slotPos.left}%` }}
                      onClick={() => handleSlotClick(pick, false, idx)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-transform ${
                        isSelectedForSwap ? 'scale-110 z-30' : isPotentialTarget ? 'hover:scale-105 z-20' : 'hover:scale-105 z-10'
                      }`}
                    >
                      {pick.selectedCard ? (
                        <div className="flex flex-col items-center relative">
                          {/* Swap active ring */}
                          {isSelectedForSwap && (
                            <div className="absolute -inset-2 rounded-2xl border-2 border-yellow-400 bg-yellow-400/20 animate-pulse pointer-events-none z-10" />
                          )}
                          {isPotentialTarget && (
                            <div className="absolute -inset-1 rounded-2xl border border-cyan-400/60 bg-cyan-400/10 pointer-events-none group-hover:border-cyan-300 z-10" />
                          )}

                          <PlayerCardView card={pick.selectedCard} size="sm" />

                          <div className="flex items-center gap-1 mt-1 z-20">
                            <span className="px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-black uppercase text-cyan-300 backdrop-blur-sm">
                              {pick.label}
                            </span>
                            {/* Explicit Sub Trigger */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDraftSubModal({ sourcePick: pick, isBench: false, index: idx });
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-[8px] font-black uppercase flex items-center gap-0.5 shadow cursor-pointer transition-transform hover:scale-105"
                              title="Substitute this player"
                            >
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              Sub
                            </button>
                            {/* Re-pick mini trigger */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPickModal(pick, false, idx);
                              }}
                              className="px-1.5 py-0.5 rounded bg-gray-900/90 hover:bg-gray-700 text-[8px] font-bold text-gray-300 transition-colors cursor-pointer"
                              title="Pick a different player"
                            >
                              Pick
                            </button>
                          </div>

                          {/* Swap Hover Badge */}
                          <div className={`absolute -top-3 px-1.5 py-0.5 rounded-full ${isSelectedForSwap ? 'bg-yellow-400 text-neutral-950 font-black' : 'bg-cyan-500 text-black font-black'} text-[7px] uppercase tracking-wider transition-opacity shadow pointer-events-none flex items-center gap-0.5 ${isSelectedForSwap ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <ArrowLeftRight className="w-2.5 h-2.5" />
                            {pendingSwap ? (isSelectedForSwap ? 'Subbing Out' : 'Swap Here') : 'Sub'}
                          </div>
                        </div>
                      ) : (
                        <div className={`w-16 h-20 rounded-2xl bg-black/60 border-2 ${
                          pendingSwap ? 'border-cyan-400 bg-cyan-950/40 animate-bounce' : 'border-dashed border-cyan-400/80 animate-pulse'
                        } hover:border-cyan-300 flex flex-col items-center justify-center p-2 shadow-lg backdrop-blur-sm transition-all group-hover:scale-110`}>
                          <span className="text-[10px] font-black uppercase text-cyan-300">{pick.label}</span>
                          <span className="text-[8px] font-bold uppercase text-gray-400 mt-1">
                            {pendingSwap ? 'Place' : 'Pick'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bench Slots & Status */}
            <div className="space-y-4">
              <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Substitutes & Bench (5)
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400">
                    {session.benchPicks.filter(b => b.selectedCard !== null).length}/5 Picked
                  </span>
                </div>

                <div className="space-y-2.5">
                  {session.benchPicks.map((benchPick, bIdx) => {
                    const isSelectedForSwap = pendingSwap && pendingSwap.isBench && pendingSwap.index === bIdx;
                    const isPotentialTarget = pendingSwap && !isSelectedForSwap;

                    return (
                      <div
                        key={benchPick.slotId}
                        onClick={() => handleSlotClick(benchPick, true, bIdx)}
                        className={`border rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer ${
                          isSelectedForSwap 
                            ? 'bg-yellow-500/20 border-yellow-400 shadow-lg shadow-yellow-500/20'
                            : isPotentialTarget
                              ? 'bg-[#151B28] hover:bg-[#1C2436] border-cyan-500/60 hover:border-cyan-300'
                              : 'bg-[#151B28] hover:bg-[#1C2436] border-gray-800 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded bg-black/40 text-[9px] font-black text-cyan-400">
                            {benchPick.label}
                          </span>
                          {benchPick.selectedCard ? (
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {benchPick.selectedCard.name}
                                {isSelectedForSwap && (
                                  <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-neutral-950 text-[8px] font-black uppercase">
                                    Subbing
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {benchPick.selectedCard.club} • {benchPick.selectedCard.position}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 italic">Click to pick player...</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {benchPick.selectedCard ? (
                            <>
                              <span className="font-scoreboard font-black text-sm text-yellow-400">
                                {getPlayerCardCurrentRating(benchPick.selectedCard)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraftSubModal({ sourcePick: benchPick, isBench: true, index: bIdx });
                                }}
                                className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-[10px] font-black uppercase flex items-center gap-1 shadow cursor-pointer transition-transform hover:scale-105"
                                title="Substitute into Starting XI"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                Sub In
                              </button>
                            </>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Substitution info banner */}
              <div className="bg-gradient-to-br from-cyan-950/30 to-[#0F141F] border border-cyan-500/20 rounded-3xl p-5 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-300" />
                  Free Position Substitutions
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Tap any drafted player on the pitch or bench to initiate a swap. Sub your high-rated bench stars onto the pitch anytime to optimize your squad chemistry!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PHASE 4: TOURNAMENT LADDER & MATCHES ================= */}
      {session && (session.phase === 'tournament' || session.phase === 'ended') && (
        <div className="space-y-6">
          {/* Tournament Header Status */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-[#0F141F] to-[#0A0D14] border border-yellow-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-black tracking-widest uppercase inline-flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {session.isChampion ? 'CHAMPION OF THE WORLD!' : session.isEliminated ? 'TOURNAMENT OVER' : `ROUND ${session.currentRound} OF 4`}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mt-1">
                {session.isChampion 
                  ? 'Congratulations, Champion!' 
                  : session.isEliminated 
                    ? 'Knocked Out in Round ' + session.currentRound 
                    : `Round ${session.currentRound}: ${TOURNAMENT_OPPONENTS[session.currentRound - 1]?.difficulty}`}
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                {session.isChampion 
                  ? 'You swept all 4 rounds! Claim your grand championship rewards below.' 
                  : session.isEliminated 
                    ? 'Tough loss! Claim your consolation stage rewards and enter a new draft.' 
                    : 'Manage your starting XI substitutions and defeat your opponent to advance to the final!'}
              </p>
            </div>

            {/* Current Draft OVR & Chem summary badge & Tab Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Tab Selector */}
              <div className="flex items-center bg-[#151B28] p-1 rounded-2xl border border-gray-800">
                <button
                  onClick={() => {
                    audio.playClick();
                    setTournamentTab('bracket');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    tournamentTab === 'bracket'
                      ? 'bg-yellow-400 text-neutral-950 shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Ladder
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setTournamentTab('squad');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    tournamentTab === 'squad'
                      ? 'bg-cyan-400 text-neutral-950 shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Squad & Subs
                </button>
              </div>

              <div className="flex items-center gap-4 bg-[#151B28] px-4 py-2.5 rounded-2xl border border-gray-800">
                <div className="text-center">
                  <span className="text-[8px] uppercase font-bold text-gray-400">Team OVR</span>
                  <div className="font-scoreboard text-xl font-black text-cyan-400">{session.draftOvr}</div>
                </div>
                <div className="h-6 w-px bg-gray-700" />
                <div className="text-center">
                  <span className="text-[8px] uppercase font-bold text-gray-400">Chemistry</span>
                  <div className="font-scoreboard text-xl font-black text-emerald-400">{session.draftChemistry}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SQUAD MANAGEMENT & SUBSTITUTIONS VIEW ================= */}
          {tournamentTab === 'squad' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Squad Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0F141F] border border-cyan-500/30 rounded-2xl px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-scoreboard text-lg font-bold text-cyan-400 mr-2">{session.formation}</span>
                    <span className="text-xs text-gray-300 font-semibold">
                      Tournament Lineup & Substitutions
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAutoOptimizeLineup}
                    className="px-3.5 py-2 rounded-xl bg-[#151B28] hover:bg-[#1C2436] border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    Auto-Optimize Best XI
                  </button>

                  {!session.isChampion && !session.isEliminated && !simState && (
                    <button
                      onClick={handleStartSimMatch}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-950 font-black uppercase text-xs tracking-wider flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-neutral-950" />
                      Play Round {session.currentRound}
                    </button>
                  )}
                </div>
              </div>

              {/* Pitch and Bench Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* The Tactical Football Pitch */}
                <div className="lg:col-span-2 bg-[#0A241A] border-2 border-emerald-600/40 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden min-h-[560px] flex flex-col justify-between">
                  {/* Pitch markings */}
                  <div className="absolute inset-0 pointer-events-none opacity-30">
                    <div className="w-full h-full border-2 border-white/50 rounded-2xl m-2" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-2 border-white/50" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-white/50" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-white/50" />
                  </div>

                  {/* Pitch Slots */}
                  <div className="relative w-full h-[520px]">
                    {session.starterPicks.map((pick, idx) => {
                      const formConfig = DRAFT_FORMATIONS.find(df => df.formation === session.formation) || DRAFT_FORMATIONS[0];
                      const slotPos = formConfig.slots[idx] || { top: 50, left: 50 };
                      const isSelectedForSwap = pendingSwap && !pendingSwap.isBench && pendingSwap.index === idx;
                      const isPotentialTarget = pendingSwap && !isSelectedForSwap;

                      return (
                        <div
                          key={pick.slotId}
                          style={{ top: `${slotPos.top}%`, left: `${slotPos.left}%` }}
                          onClick={() => handleSlotClick(pick, false, idx)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-transform ${
                            isSelectedForSwap ? 'scale-110 z-30' : isPotentialTarget ? 'hover:scale-105 z-20' : 'hover:scale-105 z-10'
                          }`}
                        >
                          {pick.selectedCard ? (
                            <div className="flex flex-col items-center relative">
                              {/* Selection halo */}
                              {isSelectedForSwap && (
                                <div className="absolute -inset-2 rounded-2xl border-2 border-yellow-400 bg-yellow-400/20 animate-pulse pointer-events-none z-10" />
                              )}
                              {isPotentialTarget && (
                                <div className="absolute -inset-1 rounded-2xl border border-cyan-400/60 bg-cyan-400/10 pointer-events-none group-hover:border-cyan-300 z-10" />
                              )}

                              <PlayerCardView card={pick.selectedCard} size="sm" />

                              <div className="flex items-center gap-1 mt-1 z-20">
                                <span className="px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-black uppercase text-cyan-300 backdrop-blur-sm">
                                  {pick.label}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDraftSubModal({ sourcePick: pick, isBench: false, index: idx });
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-[8px] font-black uppercase flex items-center gap-0.5 shadow cursor-pointer transition-transform hover:scale-105"
                                  title="Substitute this player"
                                >
                                  <ArrowLeftRight className="w-2.5 h-2.5" />
                                  Sub
                                </button>
                              </div>

                              {/* Swap Hover Badge */}
                              <div className={`absolute -top-3 px-1.5 py-0.5 rounded-full ${isSelectedForSwap ? 'bg-yellow-400 text-neutral-950 font-black' : 'bg-cyan-500 text-black font-black'} text-[7px] uppercase tracking-wider transition-opacity shadow pointer-events-none flex items-center gap-0.5 ${isSelectedForSwap ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <ArrowLeftRight className="w-2.5 h-2.5" />
                                {pendingSwap ? (isSelectedForSwap ? 'Subbing Out' : 'Swap Here') : 'Sub'}
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-20 rounded-2xl bg-black/60 border-2 border-dashed border-cyan-400/80 flex flex-col items-center justify-center p-2">
                              <span className="text-[10px] font-black uppercase text-cyan-300">{pick.label}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bench Substitutes Area */}
                <div className="space-y-4">
                  <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        Available Substitutes (5)
                      </h4>
                      <span className="text-[10px] font-bold text-gray-400">
                        Click to Swap With Pitch
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {session.benchPicks.map((benchPick, bIdx) => {
                        const isSelectedForSwap = pendingSwap && pendingSwap.isBench && pendingSwap.index === bIdx;
                        const isPotentialTarget = pendingSwap && !isSelectedForSwap;

                        return (
                          <div
                            key={benchPick.slotId}
                            onClick={() => handleSlotClick(benchPick, true, bIdx)}
                            className={`border rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer ${
                              isSelectedForSwap 
                                ? 'bg-yellow-500/20 border-yellow-400 shadow-lg shadow-yellow-500/20'
                                : isPotentialTarget
                                  ? 'bg-[#151B28] hover:bg-[#1C2436] border-cyan-500/60 hover:border-cyan-300'
                                  : 'bg-[#151B28] hover:bg-[#1C2436] border-gray-800 hover:border-cyan-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded bg-black/40 text-[9px] font-black text-cyan-400">
                                {benchPick.label}
                              </span>
                              {benchPick.selectedCard ? (
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    {benchPick.selectedCard.name}
                                    {isSelectedForSwap && (
                                      <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-neutral-950 text-[8px] font-black uppercase">
                                        Subbing
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    {benchPick.selectedCard.club} • {benchPick.selectedCard.position}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500 italic">Empty bench slot</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {benchPick.selectedCard && (
                                <>
                                  <span className="font-scoreboard font-black text-sm text-yellow-400">
                                    {getPlayerCardCurrentRating(benchPick.selectedCard)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDraftSubModal({ sourcePick: benchPick, isBench: true, index: bIdx });
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-[10px] font-black uppercase flex items-center gap-1 shadow cursor-pointer transition-transform hover:scale-105"
                                    title="Substitute into Starting XI"
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                    Sub In
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Substitution Instructions & Chemistry Tip */}
                  <div className="bg-gradient-to-br from-cyan-950/30 to-[#0F141F] border border-cyan-500/20 rounded-3xl p-5 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-300" />
                      Tactical Depth & Impact
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Substitutions directly affect your match simulation! Fresh high-rated forwards and midfielders increase scoring frequency and help you overcome higher-rated tournament opponents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TOURNAMENT LADDER & FIXTURES VIEW ================= */}
          {tournamentTab === 'bracket' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Tournament Bracket / Ladder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOURNAMENT_OPPONENTS.map((opp, idx) => {
                  const roundNum = idx + 1;
                  const isCurrent = session.currentRound === roundNum && !session.isChampion && !session.isEliminated;
                  const isPast = session.roundHistory.some(r => r.round === roundNum);
                  const historyItem = session.roundHistory.find(r => r.round === roundNum);

                  return (
                    <div
                      key={opp.id}
                      className={`bg-[#0F141F] border rounded-3xl p-5 flex flex-col justify-between transition-all ${
                        isCurrent 
                          ? 'border-yellow-400 shadow-xl shadow-yellow-500/20 bg-gradient-to-b from-[#151B28] to-[#0F141F]' 
                          : isPast && historyItem?.result === 'W'
                            ? 'border-emerald-500/50'
                            : isPast && historyItem?.result === 'L'
                              ? 'border-rose-500/50'
                              : 'border-gray-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            {opp.difficulty}
                          </span>
                          {isPast && historyItem?.result === 'W' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              WON {historyItem.userScore}-{historyItem.cpuScore}
                            </span>
                          )}
                          {isPast && historyItem?.result === 'L' && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                              LOST {historyItem.userScore}-{historyItem.cpuScore}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded bg-yellow-400 text-black text-[10px] font-black uppercase animate-pulse">
                              UP NEXT
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{opp.badge}</div>
                          <div>
                            <h4 className="font-black text-base text-white">{opp.name}</h4>
                            <span className="text-xs text-gray-400 font-scoreboard font-bold">{opp.rating} OVR Squad</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 border-t border-gray-800 pt-2">
                          Stars: {opp.keyStars.join(', ')}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 font-bold">Reward:</span>
                        <span className="font-bold text-yellow-400">{ROUND_REWARDS[idx].desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Match Section (If in tournament and not ended) */}
              {!session.isChampion && !session.isEliminated && !simState && (
                <>
                  <div className="bg-[#0F141F] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-1">
                        Ready to Kickoff Round {session.currentRound}
                      </div>
                      <h3 className="text-2xl font-black uppercase text-white">
                        {userProfile.clubName} vs {TOURNAMENT_OPPONENTS[session.currentRound - 1]?.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 max-w-lg">
                        Launch the live simulation match. Your drafted team will execute tactical plays, shots, and set pieces based on their stats and chemistry rating!
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setTournamentTab('squad')}
                        className="px-5 py-3.5 rounded-2xl bg-[#151B28] hover:bg-[#1C2436] border border-gray-700 text-gray-200 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Users className="w-4 h-4 text-cyan-400" />
                        Manage Squad & Subs
                      </button>

                      <button
                        onClick={handleStartSimMatch}
                        className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-neutral-950 font-black uppercase italic text-sm tracking-wider shadow-lg shadow-yellow-500/25 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                      >
                        <Play className="w-4 h-4 fill-neutral-950" />
                        Simulate Match
                      </button>
                    </div>
                  </div>

                  {/* Quick Lineup Substitutes Strip */}
                  <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          Lineup Substitutes & Bench (5)
                        </h4>
                        <span className="text-[10px] text-gray-400 hidden sm:inline">
                          Click any substitute to bring them on before kickoff
                        </span>
                      </div>
                      <button
                        onClick={() => setTournamentTab('squad')}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        Full Tactical Pitch <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {session.benchPicks.map((bPick, bIdx) => (
                        <div
                          key={bPick.slotId}
                          onClick={() => {
                            if (bPick.selectedCard) {
                              setDraftSubModal({ sourcePick: bPick, isBench: true, index: bIdx });
                            }
                          }}
                          className="bg-[#151B28] hover:bg-[#1C2436] border border-gray-800 hover:border-cyan-500 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition-all group"
                        >
                          <div className="truncate mr-2">
                            <span className="text-[9px] font-black text-cyan-400 mr-1">{bPick.label}</span>
                            <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                              {bPick.selectedCard ? (bPick.selectedCard.shortName || bPick.selectedCard.name) : 'Empty'}
                            </span>
                            {bPick.selectedCard && (
                              <div className="text-[9px] text-gray-400">{bPick.selectedCard.position}</div>
                            )}
                          </div>
                          {bPick.selectedCard && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-scoreboard font-black text-yellow-400">
                                {getPlayerCardCurrentRating(bPick.selectedCard)}
                              </span>
                              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                                <ArrowLeftRight className="w-3 h-3" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Live Match Simulator View */}
          {simState && (
            <div className="bg-[#0F141F] border border-cyan-500/40 rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
              {/* Scoreboard */}
              <div className="bg-[#151B28] rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
                <div className="text-left w-1/3">
                  <div className="text-xs text-gray-400 font-bold uppercase">{userProfile.clubName}</div>
                  <div className="text-sm font-black text-cyan-400">{session.draftOvr} OVR</div>
                </div>

                <div className="text-center w-1/3">
                  <div className="font-scoreboard text-4xl font-black text-white">
                    {simState.userGoals} - {simState.cpuGoals}
                  </div>
                  <div className="text-xs font-mono font-bold text-yellow-400 mt-1">
                    {simState.minute}' MIN
                  </div>
                </div>

                <div className="text-right w-1/3">
                  <div className="text-xs text-gray-400 font-bold uppercase">
                    {TOURNAMENT_OPPONENTS[session.currentRound - 1]?.name}
                  </div>
                  <div className="text-sm font-black text-rose-400">
                    {TOURNAMENT_OPPONENTS[session.currentRound - 1]?.rating} OVR
                  </div>
                </div>
              </div>

              {/* In-Match Tactical Controls */}
              {simState.isPlaying && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151B28]/60 p-3 rounded-2xl border border-gray-800">
                  <button
                    onClick={() => setInMatchSubModalOpen(true)}
                    disabled={inMatchSubsRemaining <= 0}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                      inMatchSubsRemaining > 0 
                        ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 hover:scale-105' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                    Tactical Sub ({inMatchSubsRemaining} Left)
                  </button>

                  <button
                    onClick={handleInstantFinishSim}
                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    Instant Result
                  </button>
                </div>
              )}

              {/* Event Feed */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {simState.events.map((evt, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs flex items-center gap-3 ${
                      evt.isGoal && evt.isUser
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold'
                        : evt.isGoal && !evt.isUser
                          ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold'
                          : evt.text.includes('TACTICAL SUB')
                            ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold'
                            : 'bg-[#151B28]/60 text-gray-300'
                    }`}
                  >
                    <span className="font-mono font-black text-[11px] text-gray-400 shrink-0">{evt.minute}'</span>
                    <span>{evt.text}</span>
                  </div>
                ))}
              </div>

              {/* Match Finished Actions */}
              {simState.isFinished && (
                <div className="pt-4 border-t border-gray-800 flex justify-center">
                  <button
                    onClick={() => setSimState(null)}
                    className="px-8 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-black uppercase text-xs tracking-wider cursor-pointer"
                  >
                    Continue Tournament
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tournament Ended Claim Screen */}
          {session.phase === 'ended' && (
            <div className="bg-gradient-to-b from-[#151B28] to-[#0F141F] border border-yellow-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
              <div className="w-20 h-20 rounded-3xl bg-yellow-500/20 border border-yellow-500/40 mx-auto flex items-center justify-center">
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>

              <div>
                <h3 className="text-3xl font-black uppercase text-white">
                  {session.isChampion ? 'CHAMPIONSHIP VICTORY!' : 'DRAFT RUN COMPLETE'}
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  {session.isChampion
                    ? 'You defeated all 4 European and World giants! Collect your coins, rank tokens, and championship card.'
                    : `You reached Round ${session.currentRound}! Claim your tournament earnings below.`}
                </p>
              </div>

              {!session.rewardsClaimed ? (
                <button
                  onClick={handleClaimDraftRewards}
                  className="px-10 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-neutral-950 font-black uppercase italic text-sm tracking-wider shadow-xl shadow-yellow-500/30 cursor-pointer transform hover:scale-105 transition-all inline-flex items-center gap-2"
                >
                  <Award className="w-5 h-5" />
                  Claim All Tournament Rewards
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Rewards Added to Club Balance & Inventory!
                  </div>
                  <div>
                    <button
                      onClick={handleDiscardDraft}
                      className="px-8 py-3 rounded-2xl bg-white text-neutral-950 font-black uppercase text-xs tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                    >
                      Start New Draft Tournament
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= IN-MATCH TACTICAL SUBSTITUTION MODAL ================= */}
      {inMatchSubModalOpen && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="max-w-3xl w-full bg-[#0F141F] border border-cyan-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black tracking-widest uppercase">
                    Tactical Substitution
                  </span>
                  <span className="text-xs font-bold text-yellow-400">
                    {inMatchSubsRemaining} of 5 Subs Available
                  </span>
                </div>
                <h3 className="text-2xl font-black uppercase text-white mt-1 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                  Make Match Substitution
                </h3>
              </div>

              <button
                onClick={() => {
                  setInMatchSubModalOpen(false);
                  setSelectedSubOutSlotId(null);
                  setSelectedSubInSlotId(null);
                }}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1: Sub Out (Starting XI) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    1. Sub Out (Pitch)
                  </span>
                  <span className="text-[10px] text-gray-400">Select player to leave</span>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {session.starterPicks.map(starter => {
                    const isSelected = selectedSubOutSlotId === starter.slotId;
                    return (
                      <div
                        key={starter.slotId}
                        onClick={() => setSelectedSubOutSlotId(starter.slotId)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-950/50 border-rose-500 shadow-md shadow-rose-500/20'
                            : 'bg-[#151B28] hover:bg-[#1C2436] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-black text-rose-400">
                            {starter.label}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">
                              {starter.selectedCard?.name}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {starter.selectedCard?.club}
                            </div>
                          </div>
                        </div>
                        <div className="font-scoreboard font-black text-xs text-yellow-400">
                          {starter.selectedCard ? getPlayerCardCurrentRating(starter.selectedCard) : '--'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Sub In (Bench) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    2. Sub In (Bench)
                  </span>
                  <span className="text-[10px] text-gray-400">Select fresh substitute</span>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {session.benchPicks.map(bench => {
                    const isSelected = selectedSubInSlotId === bench.slotId;
                    return (
                      <div
                        key={bench.slotId}
                        onClick={() => setSelectedSubInSlotId(bench.slotId)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-[#151B28] hover:bg-[#1C2436] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-black text-emerald-400">
                            {bench.label}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">
                              {bench.selectedCard?.name}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {bench.selectedCard?.club}
                            </div>
                          </div>
                        </div>
                        <div className="font-scoreboard font-black text-xs text-yellow-400">
                          {bench.selectedCard ? getPlayerCardCurrentRating(bench.selectedCard) : '--'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Substitution Execution Footer */}
            <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-300">
                {selectedSubOutSlotId && selectedSubInSlotId ? (
                  <span className="text-emerald-400 font-bold">
                    Ready: Subbing out {session.starterPicks.find(p => p.slotId === selectedSubOutSlotId)?.selectedCard?.shortName || session.starterPicks.find(p => p.slotId === selectedSubOutSlotId)?.selectedCard?.name} for {session.benchPicks.find(p => p.slotId === selectedSubInSlotId)?.selectedCard?.shortName || session.benchPicks.find(p => p.slotId === selectedSubInSlotId)?.selectedCard?.name}
                  </span>
                ) : (
                  <span className="text-gray-400">
                    Select one player to sub out and one substitute to bring on
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setInMatchSubModalOpen(false);
                    setSelectedSubOutSlotId(null);
                    setSelectedSubInSlotId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  disabled={!selectedSubOutSlotId || !selectedSubInSlotId}
                  onClick={() => {
                    if (selectedSubOutSlotId && selectedSubInSlotId) {
                      handleInMatchSub(selectedSubOutSlotId, selectedSubInSlotId);
                    }
                  }}
                  className={`px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer ${
                    selectedSubOutSlotId && selectedSubInSlotId
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-neutral-950 shadow-lg shadow-emerald-500/20 hover:scale-105'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Execute Substitution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANDIDATE SELECTION MODAL ================= */}
      {activeCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="max-w-4xl w-full bg-[#0F141F] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                  Select Player for Slot
                </span>
                <h3 className="text-2xl font-black uppercase text-white">
                  {activeCandidateModal.pick.label} Position Choice
                </h3>
              </div>

              <button
                onClick={() => setActiveCandidateModal(null)}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 5 Card Candidates Grid */}
            {activeCandidateModal.pick.selectedCard && (
              <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Currently drafted in this slot:</span>
                  <span className="text-xs font-black text-cyan-300">
                    {activeCandidateModal.pick.selectedCard.name} ({getPlayerCardCurrentRating(activeCandidateModal.pick.selectedCard)} OVR • {activeCandidateModal.pick.selectedCard.position})
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Picking below will replace this slot
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {activeCandidateModal.pick.candidateCards.map(candidate => (
                <div
                  key={candidate.id}
                  onClick={() => handleChoosePlayer(candidate)}
                  className="bg-[#151B28] hover:bg-[#1C2436] border border-gray-800 hover:border-cyan-400 rounded-2xl p-3 flex flex-col items-center justify-between transition-all cursor-pointer group transform hover:scale-[1.03]"
                >
                  <div className="my-2">
                    <PlayerCardView card={candidate} size="sm" />
                  </div>

                  <div className="text-center w-full mt-2 pt-2 border-t border-gray-800">
                    <div className="text-[10px] font-bold text-gray-300 truncate">{candidate.club}</div>
                    <div className="text-[9px] text-gray-400">{candidate.league}</div>
                  </div>

                  <button className="mt-3 w-full py-1.5 rounded-xl bg-white group-hover:bg-cyan-400 text-neutral-950 font-black uppercase italic text-[10px] tracking-wider transition-colors cursor-pointer">
                    Pick
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= DEDICATED DRAFT SUBSTITUTION MODAL ================= */}
      {draftSubModal && draftSubModal.sourcePick.selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="max-w-3xl w-full bg-[#0F141F] border border-cyan-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                  Draft Substitution Manager
                </span>
                <h3 className="text-2xl font-black uppercase text-white">
                  Substitute {draftSubModal.sourcePick.selectedCard.shortName || draftSubModal.sourcePick.selectedCard.name}
                </h3>
              </div>

              <button
                onClick={() => setDraftSubModal(null)}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Player Card Preview & Quick Stats */}
            <div className="bg-[#151B28] border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <PlayerCardView card={draftSubModal.sourcePick.selectedCard} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase">
                      {draftSubModal.isBench ? `Bench (${draftSubModal.sourcePick.label})` : `Starting XI (${draftSubModal.sourcePick.label})`}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      {draftSubModal.sourcePick.selectedCard.position}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">
                    {draftSubModal.sourcePick.selectedCard.name}
                  </h4>
                  <div className="text-xs text-gray-400">
                    {draftSubModal.sourcePick.selectedCard.club} • {draftSubModal.sourcePick.selectedCard.nation}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const src = draftSubModal;
                    setDraftSubModal(null);
                    setPendingSwap({
                      isBench: src.isBench,
                      index: src.index,
                      pick: src.sourcePick,
                      card: src.sourcePick.selectedCard,
                    });
                    showSubToast(
                      `Swap mode active: Click any player on the pitch or bench to complete substitution!`,
                      'info'
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Click directly on pitch or bench"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Tap On Pitch To Swap
                </button>
              </div>
            </div>

            {/* Substitution Targets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {draftSubModal.isBench ? 'Choose Starting XI Slot To Sub Into:' : 'Choose Bench Substitute To Bring In:'}
                </h5>
                <span className="text-[10px] text-gray-400">
                  Shows projected Team OVR & Chemistry impact
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(draftSubModal.isBench ? session.starterPicks : session.benchPicks).map((targetPick, tIdx) => {
                  const targetIsBench = !draftSubModal.isBench;
                  if (!targetPick.selectedCard) {
                    return (
                      <div
                        key={targetPick.slotId}
                        onClick={() => {
                          const src = {
                            isBench: draftSubModal.isBench,
                            index: draftSubModal.index,
                            pick: draftSubModal.sourcePick,
                            card: draftSubModal.sourcePick.selectedCard,
                          };
                          const tgt = {
                            isBench: targetIsBench,
                            index: tIdx,
                            pick: targetPick,
                            card: null,
                          };
                          setDraftSubModal(null);
                          handleExecuteSwap(src, tgt);
                        }}
                        className="bg-[#151B28]/60 border border-dashed border-gray-700 hover:border-cyan-400 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all hover:bg-[#1C2436]"
                      >
                        <span className="text-xs text-gray-400 font-bold">
                          Empty {targetPick.label} slot (Move player here)
                        </span>
                        <ChevronRight className="w-4 h-4 text-cyan-400" />
                      </div>
                    );
                  }

                  const simulated = simulateSwapMetrics(
                    { isBench: draftSubModal.isBench, index: draftSubModal.index },
                    { isBench: targetIsBench, index: tIdx }
                  );

                  return (
                    <div
                      key={targetPick.slotId}
                      onClick={() => {
                        const src = {
                          isBench: draftSubModal.isBench,
                          index: draftSubModal.index,
                          pick: draftSubModal.sourcePick,
                          card: draftSubModal.sourcePick.selectedCard,
                        };
                        const tgt = {
                          isBench: targetIsBench,
                          index: tIdx,
                          pick: targetPick,
                          card: targetPick.selectedCard,
                        };
                        setDraftSubModal(null);
                        handleExecuteSwap(src, tgt);
                      }}
                      className="bg-[#151B28] hover:bg-[#1C2436] border border-gray-800 hover:border-cyan-400 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-black/40 text-[9px] font-black text-cyan-400">
                          {targetPick.label}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {targetPick.selectedCard.shortName || targetPick.selectedCard.name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {targetPick.selectedCard.club} • {targetPick.selectedCard.position}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Metrics Impact */}
                        <div className="text-right">
                          <div className="text-xs font-scoreboard font-black text-yellow-400">
                            {getPlayerCardCurrentRating(targetPick.selectedCard)} OVR
                          </div>
                          <div className="text-[9px] font-bold">
                            <span className={simulated.chemDiff > 0 ? 'text-emerald-400' : simulated.chemDiff < 0 ? 'text-rose-400' : 'text-gray-400'}>
                              {simulated.chemDiff > 0 ? `+${simulated.chemDiff}% Chem` : simulated.chemDiff < 0 ? `${simulated.chemDiff}% Chem` : '0% Chem'}
                            </span>
                          </div>
                        </div>

                        <button className="px-3 py-1.5 rounded-xl bg-cyan-500 group-hover:bg-cyan-400 text-neutral-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow cursor-pointer">
                          <ArrowLeftRight className="w-3 h-3" />
                          Sub
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Also allow swapping with other starters if user selected a starter */}
              {!draftSubModal.isBench && (
                <div className="pt-4 border-t border-gray-800/80 space-y-3">
                  <h6 className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    Or Swap Pitch Position with Another Starter:
                  </h6>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {session.starterPicks.map((starterPick, sIdx) => {
                      if (sIdx === draftSubModal.index || !starterPick.selectedCard) return null;
                      return (
                        <button
                          key={starterPick.slotId}
                          onClick={() => {
                            const src = {
                              isBench: false,
                              index: draftSubModal.index,
                              pick: draftSubModal.sourcePick,
                              card: draftSubModal.sourcePick.selectedCard,
                            };
                            const tgt = {
                              isBench: false,
                              index: sIdx,
                              pick: starterPick,
                              card: starterPick.selectedCard,
                            };
                            setDraftSubModal(null);
                            handleExecuteSwap(src, tgt);
                          }}
                          className="bg-gray-900/80 hover:bg-[#1C2436] border border-gray-800 hover:border-cyan-500 rounded-xl p-2 text-left flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="truncate">
                            <span className="text-[9px] font-black text-cyan-400 mr-1">{starterPick.label}</span>
                            <span className="text-[10px] font-bold text-gray-200">{starterPick.selectedCard.shortName || starterPick.selectedCard.name}</span>
                          </div>
                          <ArrowLeftRight className="w-3 h-3 text-gray-500 flex-shrink-0 ml-1" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
