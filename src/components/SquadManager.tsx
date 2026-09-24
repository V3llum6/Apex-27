import React, { useState, useMemo, useEffect } from 'react';
import { Squad, PlayerCard, Formation, UserProfile } from '../types';
import { PlayerCardView } from './PlayerCardView';
import { getPlayerCardCurrentRating, getPlayerRankedStats } from '../data/playersDatabase';
import { FORMATION_CONFIGS, smartTransitionSquadSlots } from '../data/formations';
import { FormationModal } from './FormationModal';
import { audio } from '../services/audioService';
import { trackMilestoneProgress } from '../services/objectiveService';
import { 
  Users, Sparkles, Shield, ArrowLeftRight, Zap, Trophy, 
  Lock, Unlock, ChevronDown, CheckCircle2, Award, X,
  Search, ArrowDownUp, CornerDownRight, AlertTriangle, Trash2,
  Check, Plus, ArrowRight, RotateCcw, Compass
} from 'lucide-react';

interface Props {
  squad: Squad;
  inventory: PlayerCard[];
  userProfile: UserProfile;
  onUpdateSquad: (updated: Squad) => void;
  onUpdateInventory: (updated: PlayerCard[]) => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

export interface PendingSwap {
  source: 'pitch' | 'bench' | 'reserve';
  slotId?: string; // For pitch slot, e.g. 'st', 'cm1'
  benchIndex?: number; // 0 to 6
  card: PlayerCard;
}

export const SquadManager: React.FC<Props> = ({
  squad,
  inventory,
  userProfile,
  onUpdateSquad,
  onUpdateInventory,
  onUpdateProfile,
}) => {
  // Pending player swap state (source can be pitch, bench, or reserve)
  const [pendingSwap, setPendingSwap] = useState<PendingSwap | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterPos, setActiveFilterPos] = useState<string>('ALL');
  const [inspectedCard, setInspectedCard] = useState<PlayerCard | null>(null);
  const [isFormationModalOpen, setIsFormationModalOpen] = useState<boolean>(false);

  const currentSlots = FORMATION_CONFIGS[squad.formation] || FORMATION_CONFIGS['4-3-3'];

  // Guaranteed 7-slot bench array (Tournament standard)
  const activeBench = useMemo(() => {
    const b = squad.bench || [];
    const normalized: (PlayerCard | null)[] = [...b];
    while (normalized.length < 7) {
      normalized.push(null);
    }
    return normalized.slice(0, 7);
  }, [squad.bench]);

  // Set of player IDs in starting XI
  const startingCardIds = useMemo(() => {
    const starters = Object.values(squad.slots).filter(Boolean) as PlayerCard[];
    return new Set(starters.map(c => c.id));
  }, [squad.slots]);

  // Set of player IDs on bench
  const benchCardIds = useMemo(() => {
    return new Set(activeBench.filter(Boolean).map(c => c!.id));
  }, [activeBench]);

  // Club reserves (inventory cards neither in starting XI nor on active bench)
  const clubReserves = useMemo(() => {
    return inventory
      .filter(c => !startingCardIds.has(c.id) && !benchCardIds.has(c.id))
      .sort((a, b) => getPlayerCardCurrentRating(b) - getPlayerCardCurrentRating(a));
  }, [inventory, startingCardIds, benchCardIds]);

  // Keyboard shortcut: Escape cancels swap mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingSwap) {
        setPendingSwap(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingSwap]);

  // Helper to show brief feedback toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(prev => prev === message ? null : prev);
    }, 2800);
  };

  // Position compatibility evaluator
  const getPositionMatchQuality = (slotPos: string, player: PlayerCard): 'natural' | 'compatible' | 'out' => {
    if (player.position === slotPos) return 'natural';
    if (player.secondaryPositions && player.secondaryPositions.includes(slotPos as any)) return 'compatible';
    
    // Group checks
    const defenders = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
    const midfielders = ['CM', 'CDM', 'CAM', 'LM', 'RM'];
    const attackers = ['ST', 'CF', 'RW', 'LW'];
    
    if (defenders.includes(slotPos) && defenders.includes(player.position)) return 'compatible';
    if (midfielders.includes(slotPos) && midfielders.includes(player.position)) return 'compatible';
    if (attackers.includes(slotPos) && attackers.includes(player.position)) return 'compatible';
    
    return 'out';
  };

  // Calculate Team OVR
  const teamStats = useMemo(() => {
    const starters = currentSlots.map(s => squad.slots[s.id]).filter(Boolean) as PlayerCard[];
    if (starters.length === 0) return { ovr: 0, chemistry: 0, att: 0, mid: 0, def: 0 };

    const totalOvr = starters.reduce((acc, c) => acc + getPlayerCardCurrentRating(c), 0);
    const avgOvr = Math.round(totalOvr / starters.length);

    // Chemistry calculation (matching leagues/clubs/nations)
    let chemPoints = 0;
    const clubs: Record<string, number> = {};
    const nations: Record<string, number> = {};
    const leagues: Record<string, number> = {};

    starters.forEach(c => {
      clubs[c.club] = (clubs[c.club] || 0) + 1;
      nations[c.nationality] = (nations[c.nationality] || 0) + 1;
      leagues[c.league] = (leagues[c.league] || 0) + 1;
    });

    Object.values(clubs).forEach(count => { if (count >= 2) chemPoints += count * 5; });
    Object.values(nations).forEach(count => { if (count >= 2) chemPoints += count * 4; });
    Object.values(leagues).forEach(count => { if (count >= 2) chemPoints += count * 3; });

    const chemPercent = Math.min(100, 30 + chemPoints);

    // Position groups
    const attCards = starters.filter(c => ['ST', 'CF', 'RW', 'LW'].includes(c.position));
    const midCards = starters.filter(c => ['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(c.position));
    const defCards = starters.filter(c => ['CB', 'LB', 'RB', 'GK', 'LWB', 'RWB'].includes(c.position));

    const att = attCards.length > 0 ? Math.round(attCards.reduce((a, c) => a + getPlayerCardCurrentRating(c), 0) / attCards.length) : avgOvr;
    const mid = midCards.length > 0 ? Math.round(midCards.reduce((a, c) => a + getPlayerCardCurrentRating(c), 0) / midCards.length) : avgOvr;
    const def = defCards.length > 0 ? Math.round(defCards.reduce((a, c) => a + getPlayerCardCurrentRating(c), 0) / defCards.length) : avgOvr;

    return {
      ovr: avgOvr,
      chemistry: chemPercent,
      att,
      mid,
      def,
    };
  }, [squad, currentSlots]);

  // ================= UNIVERSAL SWAP CONTROLLER =================
  const handlePitchSlotClick = (slotId: string) => {
    const currentStarter = squad.slots[slotId];

    // Case 1: No pending swap active -> select this starter to begin swap
    if (!pendingSwap) {
      if (currentStarter) {
        audio.playClick();
        setPendingSwap({ source: 'pitch', slotId, card: currentStarter });
      }
      return;
    }

    // Case 2: Clicked the same slot -> deselect / cancel
    if (pendingSwap.source === 'pitch' && pendingSwap.slotId === slotId) {
      audio.playClick();
      setPendingSwap(null);
      return;
    }

    audio.playKick();

    // Case 3: Source was another Pitch slot (Pitch <-> Pitch swap)
    if (pendingSwap.source === 'pitch' && pendingSwap.slotId) {
      const sourceCard = squad.slots[pendingSwap.slotId];
      const targetCard = currentStarter;

      const newSlots = {
        ...squad.slots,
        [pendingSwap.slotId]: targetCard,
        [slotId]: sourceCard,
      };

      onUpdateSquad({
        ...squad,
        slots: newSlots,
      });

      showToast(`Swapped ${sourceCard?.shortName || 'Player'} ⇄ ${targetCard?.shortName || 'Slot'}`);
      setPendingSwap(null);
      return;
    }

    // Case 4: Source was Bench (Bench <-> Pitch swap / substitution)
    if (pendingSwap.source === 'bench' && pendingSwap.benchIndex !== undefined) {
      const benchCard = pendingSwap.card;
      const targetStarter = currentStarter;

      const newSlots = {
        ...squad.slots,
        [slotId]: benchCard,
      };

      const newBench = [...activeBench];
      newBench[pendingSwap.benchIndex] = targetStarter;

      onUpdateSquad({
        ...squad,
        slots: newSlots,
        bench: newBench,
      });

      showToast(`Substituted ${benchCard.shortName} in for ${targetStarter?.shortName || 'starter'}`);
      setPendingSwap(null);
      return;
    }

    // Case 5: Source was Club Reserves (Reserve -> Pitch)
    if (pendingSwap.source === 'reserve') {
      const reserveCard = pendingSwap.card;
      const targetStarter = currentStarter;

      const newSlots = {
        ...squad.slots,
        [slotId]: reserveCard,
      };

      // If target starter existed, place it on the bench if there's an open slot
      let newBench = [...activeBench];
      if (targetStarter) {
        const firstEmptyBenchIdx = newBench.findIndex(b => b === null);
        if (firstEmptyBenchIdx !== -1) {
          newBench[firstEmptyBenchIdx] = targetStarter;
        }
      }

      onUpdateSquad({
        ...squad,
        slots: newSlots,
        bench: newBench,
      });

      showToast(`Placed ${reserveCard.shortName} into Starting XI`);
      setPendingSwap(null);
      return;
    }
  };

  const handleBenchSlotClick = (benchIndex: number) => {
    const currentBenchCard = activeBench[benchIndex];

    // Case 1: No pending swap active -> select this bench player to begin swap
    if (!pendingSwap) {
      if (currentBenchCard) {
        audio.playClick();
        setPendingSwap({ source: 'bench', benchIndex, card: currentBenchCard });
      }
      return;
    }

    // Case 2: Clicked the same bench slot -> cancel
    if (pendingSwap.source === 'bench' && pendingSwap.benchIndex === benchIndex) {
      audio.playClick();
      setPendingSwap(null);
      return;
    }

    audio.playKick();

    // Case 3: Source was Pitch (Pitch -> Bench swap)
    if (pendingSwap.source === 'pitch' && pendingSwap.slotId) {
      const starterCard = squad.slots[pendingSwap.slotId];
      const targetBenchCard = currentBenchCard;

      const newSlots = {
        ...squad.slots,
        [pendingSwap.slotId]: targetBenchCard,
      };

      const newBench = [...activeBench];
      newBench[benchIndex] = starterCard;

      onUpdateSquad({
        ...squad,
        slots: newSlots,
        bench: newBench,
      });

      showToast(`Moved ${starterCard?.shortName || 'Starter'} to Bench ⇄ ${targetBenchCard?.shortName || 'Empty'}`);
      setPendingSwap(null);
      return;
    }

    // Case 4: Source was Bench (Bench <-> Bench swap / reorder)
    if (pendingSwap.source === 'bench' && pendingSwap.benchIndex !== undefined) {
      const newBench = [...activeBench];
      const sourceCard = newBench[pendingSwap.benchIndex];
      const targetCard = newBench[benchIndex];

      newBench[benchIndex] = sourceCard;
      newBench[pendingSwap.benchIndex] = targetCard;

      onUpdateSquad({
        ...squad,
        bench: newBench,
      });

      showToast(`Bench order updated`);
      setPendingSwap(null);
      return;
    }

    // Case 5: Source was Club Reserves (Reserve -> Bench)
    if (pendingSwap.source === 'reserve') {
      const newBench = [...activeBench];
      newBench[benchIndex] = pendingSwap.card;

      onUpdateSquad({
        ...squad,
        bench: newBench,
      });

      showToast(`Assigned ${pendingSwap.card.shortName} to Substitutes Bench`);
      setPendingSwap(null);
      return;
    }
  };

  // Direct helper: Quick send starter to first available bench slot
  const handleSendStarterToBench = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const starterCard = squad.slots[slotId];
    if (!starterCard) return;

    audio.playKick();
    const newBench = [...activeBench];
    const emptyIdx = newBench.findIndex(b => b === null);

    if (emptyIdx !== -1) {
      newBench[emptyIdx] = starterCard;
      const newSlots = { ...squad.slots, [slotId]: null };
      onUpdateSquad({ ...squad, slots: newSlots, bench: newBench });
      showToast(`Moved ${starterCard.shortName} to Bench (Sub ${emptyIdx + 1})`);
    } else {
      // Bench is full: swap with the lowest OVR bench player
      let lowestIdx = 0;
      let lowestOvr = 999;
      newBench.forEach((b, idx) => {
        if (b && getPlayerCardCurrentRating(b) < lowestOvr) {
          lowestOvr = getPlayerCardCurrentRating(b);
          lowestIdx = idx;
        }
      });
      const subInCard = newBench[lowestIdx];
      newBench[lowestIdx] = starterCard;
      const newSlots = { ...squad.slots, [slotId]: subInCard };
      onUpdateSquad({ ...squad, slots: newSlots, bench: newBench });
      showToast(`Swapped ${starterCard.shortName} with Bench Sub ${subInCard?.shortName}`);
    }

    if (pendingSwap?.slotId === slotId) setPendingSwap(null);
  };

  // Direct helper: Remove player from bench back to general reserves
  const handleRemoveFromBench = (benchIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const card = activeBench[benchIndex];
    if (!card) return;

    audio.playClick();
    const newBench = [...activeBench];
    newBench[benchIndex] = null;
    onUpdateSquad({ ...squad, bench: newBench });
    showToast(`Removed ${card.shortName} from Bench to Club Reserves`);

    if (pendingSwap?.benchIndex === benchIndex) setPendingSwap(null);
  };

  // Direct helper: Auto fill empty bench slots with highest rated reserves
  const handleAutoFillBench = () => {
    audio.playWhistle();
    const newBench = [...activeBench];
    const openIndices: number[] = [];
    newBench.forEach((b, idx) => {
      if (!b) openIndices.push(idx);
    });

    if (openIndices.length === 0) {
      showToast('Bench is already full (7/7 subs)!');
      return;
    }

    let addedCount = 0;
    openIndices.forEach((benchIdx, i) => {
      if (clubReserves[i]) {
        newBench[benchIdx] = clubReserves[i];
        addedCount++;
      }
    });

    onUpdateSquad({ ...squad, bench: newBench });
    showToast(`Filled ${addedCount} bench slot${addedCount === 1 ? '' : 's'} with top reserves!`);
  };

  // Direct helper: Clear all bench slots
  const handleClearBench = () => {
    audio.playClick();
    onUpdateSquad({
      ...squad,
      bench: [null, null, null, null, null, null, null],
    });
    showToast('Substitutes bench cleared to reserves');
  };

  // Direct helper: Quick sub reserve into starting XI (best position or selected)
  const handleQuickSubReserve = (card: PlayerCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audio.playKick();

    // If a pitch slot is currently selected/pending, swap into it
    if (pendingSwap?.source === 'pitch' && pendingSwap.slotId) {
      handlePitchSlotClick(pendingSwap.slotId);
      return;
    }

    // Otherwise, find the best matching pitch slot for this player's position
    let targetSlot = currentSlots.find(s => s.pos === card.position);
    if (!targetSlot) {
      targetSlot = currentSlots.find(s => card.secondaryPositions?.includes(s.pos as any));
    }
    if (!targetSlot) {
      // Find empty slot or fallback
      targetSlot = currentSlots.find(s => !squad.slots[s.id]) || currentSlots[0];
    }

    if (targetSlot) {
      const oldStarter = squad.slots[targetSlot.id];
      const newSlots = { ...squad.slots, [targetSlot.id]: card };
      const newBench = [...activeBench];

      // Move old starter to bench if open slot exists
      if (oldStarter) {
        const emptyBenchIdx = newBench.findIndex(b => b === null);
        if (emptyBenchIdx !== -1) {
          newBench[emptyBenchIdx] = oldStarter;
        }
      }

      onUpdateSquad({ ...squad, slots: newSlots, bench: newBench });
      showToast(`Substituted ${card.shortName} into [${targetSlot.label}]`);
    }

    setPendingSwap(null);
  };

  // Direct helper: Add reserve card to first open bench slot
  const handleAddReserveToBench = (card: PlayerCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audio.playClick();

    const newBench = [...activeBench];
    const emptyIdx = newBench.findIndex(b => b === null);

    if (emptyIdx !== -1) {
      newBench[emptyIdx] = card;
      onUpdateSquad({ ...squad, bench: newBench });
      showToast(`Added ${card.shortName} to Bench (Sub ${emptyIdx + 1})`);
    } else {
      showToast('Bench is full (7/7)! Click a bench player to swap or clear a slot.');
    }
  };

  // ================= DRAG AND DROP HANDLERS =================
  const handleDragStart = (e: React.DragEvent, source: 'pitch' | 'bench' | 'reserve', id: string, card: PlayerCard) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ source, id, cardId: card.id }));
    setPendingSwap({ source, slotId: source === 'pitch' ? id : undefined, benchIndex: source === 'bench' ? Number(id) : undefined, card });
  };

  const handleDropOnPitch = (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.source === 'pitch') {
        if (data.id === slotId) return;
        const sourceCard = squad.slots[data.id];
        const targetCard = squad.slots[slotId];
        const newSlots = { ...squad.slots, [data.id]: targetCard, [slotId]: sourceCard };
        onUpdateSquad({ ...squad, slots: newSlots });
        showToast(`Swapped ${sourceCard?.shortName} ⇄ ${targetCard?.shortName}`);
      } else if (data.source === 'bench') {
        const benchIdx = Number(data.id);
        const subCard = activeBench[benchIdx];
        const targetStarter = squad.slots[slotId];
        const newSlots = { ...squad.slots, [slotId]: subCard };
        const newBench = [...activeBench];
        newBench[benchIdx] = targetStarter;
        onUpdateSquad({ ...squad, slots: newSlots, bench: newBench });
        showToast(`Substituted ${subCard?.shortName} in for ${targetStarter?.shortName}`);
      } else if (data.source === 'reserve') {
        const reserveCard = inventory.find(c => c.id === data.cardId);
        if (reserveCard) {
          const oldStarter = squad.slots[slotId];
          const newSlots = { ...squad.slots, [slotId]: reserveCard };
          const newBench = [...activeBench];
          if (oldStarter) {
            const emptyIdx = newBench.findIndex(b => b === null);
            if (emptyIdx !== -1) newBench[emptyIdx] = oldStarter;
          }
          onUpdateSquad({ ...squad, slots: newSlots, bench: newBench });
          showToast(`Placed ${reserveCard.shortName} into Starting XI`);
        }
      }
      audio.playKick();
      setPendingSwap(null);
    } catch {
      // fallback
    }
  };

  const handleDropOnBench = (benchIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.source === 'pitch') {
        const starterCard = squad.slots[data.id];
        const targetBenchCard = activeBench[benchIndex];
        const newSlots = { ...squad.slots, [data.id]: targetBenchCard };
        const newBench = [...activeBench];
        newBench[benchIndex] = starterCard;
        onUpdateSquad({ ...squad, slots: newSlots, bench: newBench });
        showToast(`Moved ${starterCard?.shortName} to Bench ⇄ ${targetBenchCard?.shortName || 'Empty'}`);
      } else if (data.source === 'bench') {
        const sourceBenchIdx = Number(data.id);
        if (sourceBenchIdx === benchIndex) return;
        const newBench = [...activeBench];
        const temp = newBench[sourceBenchIdx];
        newBench[sourceBenchIdx] = newBench[benchIndex];
        newBench[benchIndex] = temp;
        onUpdateSquad({ ...squad, bench: newBench });
      } else if (data.source === 'reserve') {
        const reserveCard = inventory.find(c => c.id === data.cardId);
        if (reserveCard) {
          const newBench = [...activeBench];
          newBench[benchIndex] = reserveCard;
          onUpdateSquad({ ...squad, bench: newBench });
          showToast(`Assigned ${reserveCard.shortName} to Bench`);
        }
      }
      audio.playKick();
      setPendingSwap(null);
    } catch {
      // fallback
    }
  };

  // Handle Formation Change with Smart Transition
  const handleSelectFormation = (newFormation: Formation) => {
    if (newFormation === squad.formation) return;
    audio.playWhistle();

    // Perform smart transition of starting XI players to fit new formation
    const { newSlots, newBench } = smartTransitionSquadSlots(
      squad.slots,
      newFormation,
      inventory,
      activeBench
    );

    onUpdateSquad({
      ...squad,
      formation: newFormation,
      slots: newSlots,
      bench: newBench,
    });

    setPendingSwap(null);
    showToast(`Switched to ${newFormation} — starting XI re-aligned!`);
  };

  // Auto Build Best OVR Team
  const handleAutoBuild = () => {
    audio.playWhistle();
    const sorted = [...inventory].sort((a, b) => getPlayerCardCurrentRating(b) - getPlayerCardCurrentRating(a));
    const usedIds = new Set<string>();
    const newSlots: Record<string, PlayerCard | null> = {};

    // First assign GK
    const gk = sorted.find(c => c.position === 'GK');
    if (gk) {
      newSlots['gk'] = gk;
      usedIds.add(gk.id);
    }

    // Assign matching positions
    currentSlots.forEach(slot => {
      if (slot.id === 'gk') return;
      const match = sorted.find(c => !usedIds.has(c.id) && (c.position === slot.pos || c.secondaryPositions?.includes(slot.pos as any)));
      if (match) {
        newSlots[slot.id] = match;
        usedIds.add(match.id);
      } else {
        const fallback = sorted.find(c => !usedIds.has(c.id));
        if (fallback) {
          newSlots[slot.id] = fallback;
          usedIds.add(fallback.id);
        }
      }
    });

    // Populate bench with the next 7 highest rated
    const remainingForBench = sorted.filter(c => !usedIds.has(c.id)).slice(0, 7);
    const newBench: (PlayerCard | null)[] = [...remainingForBench];
    while (newBench.length < 7) newBench.push(null);

    onUpdateSquad({
      ...squad,
      slots: newSlots,
      bench: newBench,
    });
    setPendingSwap(null);
    showToast('Auto-built optimal Starting XI and Substitutes Bench!');
  };

  // Rank Up Player Card
  const handleRankUp = (card: PlayerCard) => {
    if (card.rank >= 5) return;
    if (userProfile.rankTokens < 1) return;

    audio.playPackReveal();

    const updatedCard: PlayerCard = {
      ...card,
      rank: card.rank + 1,
    };

    // Update in inventory
    const updatedInv = inventory.map(c => c.id === card.id ? updatedCard : c);
    onUpdateInventory(updatedInv);

    // Update in squad starters if present
    const updatedSlots = { ...squad.slots };
    Object.keys(updatedSlots).forEach(key => {
      if (updatedSlots[key]?.id === card.id) {
        updatedSlots[key] = updatedCard;
      }
    });

    // Update in bench if present
    const updatedBench = activeBench.map(b => b?.id === card.id ? updatedCard : b);

    onUpdateSquad({ ...squad, slots: updatedSlots, bench: updatedBench });

    // Deduct rank token
    onUpdateProfile({
      ...userProfile,
      rankTokens: userProfile.rankTokens - 1,
    });

    setInspectedCard(updatedCard);
    showToast(`Ranked up ${card.name} to Rank ${updatedCard.rank}!`);
    trackMilestoneProgress('train_player', 1);
  };

  // Filtered reserves based on tab and search
  const filteredReserves = useMemo(() => {
    return clubReserves.filter(card => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = card.name.toLowerCase().includes(q) || card.shortName.toLowerCase().includes(q);
        const matchClub = card.club.toLowerCase().includes(q);
        const matchPos = card.position.toLowerCase().includes(q);
        if (!matchName && !matchClub && !matchPos) return false;
      }

      // Position filter
      if (activeFilterPos === 'ALL') return true;
      if (activeFilterPos === 'MATCHING' && pendingSwap) {
        const targetPos = pendingSwap.card.position;
        return card.position === targetPos || card.secondaryPositions?.includes(targetPos as any);
      }
      if (activeFilterPos === 'ATT') return ['ST', 'CF', 'RW', 'LW'].includes(card.position);
      if (activeFilterPos === 'MID') return ['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(card.position);
      if (activeFilterPos === 'DEF') return ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(card.position);
      if (activeFilterPos === 'GK') return card.position === 'GK';
      return true;
    });
  }, [clubReserves, searchQuery, activeFilterPos, pendingSwap]);

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-cyan-500 text-black px-4 py-2.5 rounded-2xl font-black italic shadow-2xl flex items-center gap-2 border border-cyan-300 animate-in fade-in slide-in-from-top-4 duration-200">
          <ArrowLeftRight className="w-4 h-4 text-black shrink-0" />
          <span className="text-xs tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Top Squad Rating & Chemistry Bento Header */}
      <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Bento OVR & Team Header */}
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/20">
              <div className="w-full h-full rounded-[22px] bg-[#0A0D14] flex flex-col items-center justify-center">
                <span className="text-4xl font-black italic tracking-tighter text-white leading-none">
                  {teamStats.ovr}
                </span>
                <span className="text-[9px] font-bold text-cyan-400 tracking-widest uppercase mt-0.5">OVR</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Active Squad</div>
              <h2 className="text-2xl font-black italic tracking-tight text-white flex items-center gap-3">
                {squad.name}
                <button
                  onClick={() => {
                    audio.playClick();
                    setIsFormationModalOpen(true);
                  }}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 font-mono font-bold not-italic flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Click to browse and change tactical formation"
                >
                  <Compass className="w-3 h-3 text-cyan-400" />
                  {squad.formation}
                  <ChevronDown className="w-3 h-3 text-cyan-400" />
                </button>
              </h2>
              <div className="flex items-center gap-4 text-xs mt-1.5 text-gray-400 font-mono">
                <span>ATT: <strong className="text-white">{teamStats.att}</strong></span>
                <span>•</span>
                <span>MID: <strong className="text-white">{teamStats.mid}</strong></span>
                <span>•</span>
                <span>DEF: <strong className="text-white">{teamStats.def}</strong></span>
              </div>
            </div>
          </div>

          {/* Chemistry & Controls in Bento Card format */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bento Chemistry Block */}
            <div className="bg-[#151B28] px-4 py-2.5 rounded-2xl border border-gray-800 flex items-center gap-3.5 shadow-inner min-w-[190px]">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs font-bold mb-1 uppercase tracking-wider">
                  <span className="text-gray-400 text-[10px]">Chemistry</span>
                  <span className="text-cyan-400 font-mono">{teamStats.chemistry}/100</span>
                </div>
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    style={{ width: `${teamStats.chemistry}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tactical Formation Selector & Browser */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  audio.playClick();
                  setIsFormationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-[#151B28] hover:bg-[#1C2436] px-3.5 py-2 rounded-2xl border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-white transition-all shadow-md group cursor-pointer"
                title="Browse and select from 21 Tactical Formations & Variations"
              >
                <Compass className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform shrink-0" />
                <div className="text-left leading-tight">
                  <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Formation</div>
                  <div className="text-xs font-mono font-black text-cyan-300 flex items-center gap-1.5">
                    {squad.formation}
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* Quick Popular Switches */}
              <div className="hidden xl:flex items-center gap-1 bg-[#151B28] p-1.5 rounded-2xl border border-gray-800 text-xs">
                {[
                  { id: '4-3-3 (Attack)', short: '4-3-3 ATK' },
                  { id: '4-3-3 (Holding)', short: '4-3-3 HLD' },
                  { id: '4-1-2-1-2 (Narrow)', short: '4-1-2-1-2' },
                  { id: '4-2-3-1 (Narrow)', short: '4-2-3-1' },
                  { id: '4-4-2 (Flat)', short: '4-4-2' },
                  { id: '3-5-2', short: '3-5-2' },
                  { id: '5-3-2', short: '5-3-2' },
                ].map(({ id, short }) => (
                  <button
                    key={id}
                    onClick={() => handleSelectFormation(id as Formation)}
                    className={`px-2 py-1 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer ${
                      squad.formation === id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {short}
                  </button>
                ))}

                <button
                  onClick={() => {
                    audio.playClick();
                    setIsFormationModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors flex items-center gap-1 cursor-pointer"
                  title="View all 21 tactical formations and shapes"
                >
                  <Sparkles className="w-3 h-3" />
                  All 21
                </button>
              </div>
            </div>

            {/* Auto Build Button */}
            <button
              onClick={handleAutoBuild}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-cyan-400 text-black font-black uppercase italic text-xs tracking-wider transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              Auto-Build Best XI
            </button>
          </div>
        </div>

        {/* ACTIVE SWAPPING MODE FLOATING CONTROLLER */}
        {pendingSwap && (
          <div className="mt-4 pt-3 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3 bg-cyan-950/40 -mx-3 px-4 py-2.5 rounded-2xl border border-cyan-500/30 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500 text-black flex items-center justify-center font-black animate-pulse">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                  SWAP MODE ACTIVE • Click any starter, bench sub, or reserve to swap
                </div>
                <div className="text-sm font-black text-white flex items-center gap-2">
                  <span>{pendingSwap.card.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs">
                    {getPlayerCardCurrentRating(pendingSwap.card)} {pendingSwap.card.position}
                  </span>
                  <span className="text-xs text-gray-400 font-normal">
                    (from {pendingSwap.source === 'pitch' ? `Starting XI [${pendingSwap.slotId?.toUpperCase()}]` : pendingSwap.source === 'bench' ? `Bench Sub ${(pendingSwap.benchIndex || 0) + 1}` : 'Club Reserves'})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingSwap.source === 'pitch' && pendingSwap.slotId && (
                <button
                  onClick={() => handleSendStarterToBench(pendingSwap.slotId!)}
                  className="px-3 py-1.5 rounded-xl bg-[#151B28] hover:bg-white/10 text-xs font-bold text-gray-300 border border-gray-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-cyan-400" />
                  Send to Bench
                </button>
              )}
              <button
                onClick={() => setInspectedCard(pendingSwap.card)}
                className="px-3 py-1.5 rounded-xl bg-[#151B28] hover:bg-white/10 text-xs font-bold text-gray-300 border border-gray-700 cursor-pointer"
              >
                Inspect
              </button>
              <button
                onClick={() => {
                  audio.playClick();
                  setPendingSwap(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Cancel (Esc)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Pitch & Bench Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= PITCH & DEDICATED BENCH CONTAINER (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-5">
          {/* Football Field Grass Canvas */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-gray-400 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Starting Eleven ({squad.formation})
                </span>
                <button
                  onClick={() => {
                    audio.playClick();
                    setIsFormationModalOpen(true);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#182030] hover:bg-cyan-500/20 text-cyan-400 border border-gray-700 hover:border-cyan-500/50 text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Change formation variation"
                >
                  <Compass className="w-3 h-3" />
                  Tactics & Formations
                </button>
              </div>
              <span className="text-gray-400 text-[11px]">
                {pendingSwap ? (
                  <strong className="text-cyan-400 animate-pulse">Click any slot to complete swap</strong>
                ) : (
                  'Click or drag any player to swap positions'
                )}
              </span>
            </div>

            <div
              className="relative w-full rounded-2xl border-4 border-white/20 overflow-hidden shadow-2xl"
              style={{
                height: '590px',
                background: 'linear-gradient(to bottom, #15803d 0%, #166534 50%, #14532d 100%)',
                backgroundImage: `
                  repeating-linear-gradient(
                    0deg,
                    rgba(255, 255, 255, 0.03),
                    rgba(255, 255, 255, 0.03) 40px,
                    rgba(0, 0, 0, 0.04) 40px,
                    rgba(0, 0, 0, 0.04) 80px
                  )
                `,
              }}
            >
              {/* Pitch Markings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-2 border-white/25 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40 pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/25 pointer-events-none" />
              
              {/* Penalty Box Top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 border-b-2 border-l-2 border-r-2 border-white/25 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-10 border-b-2 border-l-2 border-r-2 border-white/20 pointer-events-none" />
              
              {/* Penalty Box Bottom (User Goal) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-24 border-t-2 border-l-2 border-r-2 border-white/25 pointer-events-none" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-10 border-t-2 border-l-2 border-r-2 border-white/20 pointer-events-none" />

              {/* Pitch Starting Players */}
              {currentSlots.map(slot => {
                const card = squad.slots[slot.id];
                const isSelectedForSwap = pendingSwap?.source === 'pitch' && pendingSwap?.slotId === slot.id;
                const isDragOver = dragOverTarget === `pitch-${slot.id}`;

                // Position match quality if pending swap is active
                let matchQuality: 'natural' | 'compatible' | 'out' | null = null;
                let ratingDiff: number | null = null;
                if (pendingSwap && pendingSwap.card) {
                  matchQuality = getPositionMatchQuality(slot.pos, pendingSwap.card);
                  if (card) {
                    ratingDiff = getPlayerCardCurrentRating(pendingSwap.card) - getPlayerCardCurrentRating(card);
                  }
                }

                return (
                  <div
                    key={slot.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverTarget(`pitch-${slot.id}`);
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(e) => handleDropOnPitch(slot.id, e)}
                    style={{
                      position: 'absolute',
                      top: `${slot.top}%`,
                      left: `${slot.left}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isSelectedForSwap ? 35 : isDragOver ? 30 : 10,
                    }}
                  >
                    {card ? (
                      <div
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, 'pitch', slot.id, card)}
                        className={`relative group cursor-pointer transition-transform ${
                          isSelectedForSwap ? 'ring-4 ring-cyan-400 rounded-xl scale-110 shadow-2xl shadow-cyan-500/50' : ''
                        } ${isDragOver ? 'scale-110 ring-4 ring-yellow-400 rounded-xl' : ''}`}
                      >
                        <PlayerCardView
                          card={card}
                          size="xs"
                          selected={isSelectedForSwap}
                          onClick={() => handlePitchSlotClick(slot.id)}
                        />

                        {/* Top quick position tag */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                          <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase font-mono tracking-wider border shadow ${
                            card.position === slot.pos
                              ? 'bg-emerald-600/90 text-white border-emerald-400'
                              : card.secondaryPositions?.includes(slot.pos as any)
                              ? 'bg-blue-600/90 text-white border-blue-400'
                              : 'bg-amber-600/90 text-white border-amber-400'
                          }`}>
                            {slot.label}
                          </span>
                        </div>

                        {/* Swap Target Indicator when in Swap Mode */}
                        {pendingSwap && !isSelectedForSwap && (
                          <div 
                            onClick={() => handlePitchSlotClick(slot.id)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center text-center p-1 z-30 transition-all hover:bg-cyan-900/70 border border-cyan-400/80 cursor-pointer"
                          >
                            <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center font-black text-xs mb-1 shadow">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] font-black uppercase text-white tracking-tight leading-tight">
                              SWAP
                            </span>

                            {matchQuality === 'natural' && (
                              <span className="text-[8px] font-bold text-emerald-400 leading-none mt-0.5">
                                ✓ Natural
                              </span>
                            )}
                            {matchQuality === 'compatible' && (
                              <span className="text-[8px] font-bold text-cyan-300 leading-none mt-0.5">
                                ✓ Alt Pos
                              </span>
                            )}
                            {matchQuality === 'out' && (
                              <span className="text-[8px] font-bold text-amber-300 leading-none mt-0.5">
                                ⚠️ Out Pos
                              </span>
                            )}

                            {ratingDiff !== null && ratingDiff !== 0 && (
                              <span className={`text-[8px] font-mono font-bold leading-none mt-0.5 ${ratingDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ratingDiff > 0 ? `+${ratingDiff}` : ratingDiff} OVR
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hover Quick Action Tray when not in swap mode */}
                        {!pendingSwap && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-[#0A0D14] border border-gray-700 px-1.5 py-1 rounded-xl shadow-xl z-20 whitespace-nowrap scale-90">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                audio.playClick();
                                setPendingSwap({ source: 'pitch', slotId: slot.id, card });
                              }}
                              title="Swap with bench or player"
                              className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[9px] font-bold uppercase cursor-pointer flex items-center gap-0.5"
                            >
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              Swap
                            </button>
                            <button
                              onClick={(e) => handleSendStarterToBench(slot.id, e)}
                              title="Send to Bench"
                              className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[9px] font-bold uppercase cursor-pointer"
                            >
                              Bench
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedCard(card);
                              }}
                              title="Inspect card details"
                              className="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 text-[9px] font-bold cursor-pointer"
                            >
                              Info
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty Slot */
                      <button
                        onClick={() => handlePitchSlotClick(slot.id)}
                        className={`w-20 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                          pendingSwap
                            ? 'border-cyan-400 bg-cyan-950/70 shadow-lg ring-2 ring-cyan-400 animate-pulse'
                            : 'border-white/30 bg-black/40 hover:bg-black/60 hover:border-white/60'
                        }`}
                      >
                        <span className="font-scoreboard text-base font-bold text-white/80">{slot.label}</span>
                        <span className="text-[9px] text-cyan-300 font-bold mt-1">
                          {pendingSwap ? 'Place Here' : '+ Assign'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= DEDICATED SUBSTITUTES BENCH TRAY (7 Slots) ================= */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    Substitutes Bench
                    <span className="px-2 py-0.2 rounded-full bg-gray-800 text-gray-300 font-mono text-[10px] font-bold">
                      {activeBench.filter(Boolean).length}/7
                    </span>
                  </h3>
                  <div className="text-[10px] text-gray-400">
                    Click any sub to swap into Starting XI or drag directly onto the pitch
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFillBench}
                  className="px-3 py-1.5 rounded-xl bg-[#151B28] hover:bg-white/10 text-gray-300 border border-gray-800 hover:border-cyan-500/50 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  Auto-Fill Subs
                </button>
                {activeBench.filter(Boolean).length > 0 && (
                  <button
                    onClick={handleClearBench}
                    className="px-2.5 py-1.5 rounded-xl bg-[#151B28] hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-gray-800 hover:border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer"
                    title="Clear bench"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 7 Dedicated Bench Slot Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {activeBench.map((card, idx) => {
                const isSelectedForSwap = pendingSwap?.source === 'bench' && pendingSwap.benchIndex === idx;
                const isDragOver = dragOverTarget === `bench-${idx}`;

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverTarget(`bench-${idx}`);
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(e) => handleDropOnBench(idx, e)}
                    className="relative"
                  >
                    {card ? (
                      <div
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, 'bench', String(idx), card)}
                        onClick={() => handleBenchSlotClick(idx)}
                        className={`group relative p-2.5 rounded-2xl bg-[#151B28] border transition-all cursor-pointer select-none flex flex-col justify-between min-h-[118px] hover:border-cyan-500/60 ${
                          isSelectedForSwap
                            ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                            : isDragOver
                            ? 'border-yellow-400 bg-yellow-950/30 ring-2 ring-yellow-400'
                            : 'border-gray-800'
                        }`}
                      >
                        {/* Bench slot header */}
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono font-bold uppercase text-gray-400">
                            SUB {idx + 1}
                          </span>
                          <button
                            onClick={(e) => handleRemoveFromBench(idx, e)}
                            title="Remove to club reserves"
                            className="text-gray-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Player info */}
                        <div className="flex items-center gap-2 my-1">
                          <div className="w-9 h-9 rounded-xl bg-black/50 border border-gray-700 flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-black italic text-white leading-none">
                              {getPlayerCardCurrentRating(card)}
                            </span>
                            <span className="text-[8px] font-bold text-cyan-400 uppercase leading-none mt-0.5">
                              {card.position}
                            </span>
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                              {card.shortName}
                            </div>
                            <div className="text-[9px] text-gray-400 truncate flex items-center gap-1">
                              <span>{card.nationFlag}</span>
                              <span className="truncate">{card.club}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-1 border-t border-gray-800/80 flex items-center justify-between gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBenchSlotClick(idx);
                            }}
                            className={`w-full py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isSelectedForSwap
                                ? 'bg-cyan-400 text-black'
                                : 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            <ArrowLeftRight className="w-2.5 h-2.5" />
                            {isSelectedForSwap ? 'Selecting' : 'Sub In'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Bench Slot */
                      <div
                        onClick={() => handleBenchSlotClick(idx)}
                        className={`p-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center min-h-[118px] transition-all cursor-pointer ${
                          pendingSwap
                            ? 'border-cyan-500/60 bg-cyan-950/30 hover:bg-cyan-950/60'
                            : 'border-gray-800 hover:border-gray-700 bg-[#121622]/50'
                        }`}
                      >
                        <span className="text-[9px] font-mono font-bold uppercase text-gray-500 mb-1">
                          SUB {idx + 1}
                        </span>
                        <Plus className="w-4 h-4 text-gray-500 mb-0.5" />
                        <span className="text-[9px] font-bold text-gray-400 text-center">
                          {pendingSwap ? 'Place Here' : 'Empty'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= CLUB RESERVES (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Club Reserves ({clubReserves.length})
                </h3>
                <div className="text-[10px] text-gray-400">
                  Click 'Sub In' to replace a starter or add to bench
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                Tokens: <strong className="text-yellow-400">{userProfile.rankTokens}</strong> 💎
              </span>
            </div>

            {/* Quick Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player, club, or position..."
                className="w-full pl-8 pr-3 py-2 bg-[#151B28] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Position filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {['ALL', 'ATT', 'MID', 'DEF', 'GK'].map(pos => (
                <button
                  key={pos}
                  onClick={() => setActiveFilterPos(pos)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeFilterPos === pos
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-[#151B28] text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  {pos}
                </button>
              ))}

              {/* Dynamic Filter: Suggested matching positions if swap is active */}
              {pendingSwap && (
                <button
                  onClick={() => setActiveFilterPos(activeFilterPos === 'MATCHING' ? 'ALL' : 'MATCHING')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    activeFilterPos === 'MATCHING'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-[#151B28] text-yellow-400 hover:text-yellow-300 border border-yellow-500/30'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Matching ({pendingSwap.card.position})
                </button>
              )}
            </div>

            {/* Scrollable reserves list */}
            <div className="space-y-2 max-h-[510px] overflow-y-auto pr-1">
              {filteredReserves.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs font-mono">
                  No reserve players found matching criteria.
                </div>
              ) : (
                filteredReserves.map(card => {
                  const isSelectedForSwap = pendingSwap?.source === 'reserve' && pendingSwap.card.id === card.id;

                  return (
                    <div
                      key={card.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, 'reserve', card.id, card)}
                      onClick={() => {
                        audio.playClick();
                        setPendingSwap({ source: 'reserve', card });
                      }}
                      className={`p-3 rounded-2xl bg-[#151B28] border transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                        isSelectedForSwap
                          ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400 shadow-md'
                          : 'border-gray-800 hover:border-cyan-500/50 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 border border-gray-700 flex flex-col items-center justify-center text-center shrink-0">
                          <span className="text-sm font-black italic tracking-tighter text-white leading-none">
                            {getPlayerCardCurrentRating(card)}
                          </span>
                          <span className="text-[8px] font-bold text-cyan-400 uppercase">{card.position}</span>
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                            {card.name}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span>{card.nationFlag}</span>
                            <span className="truncate max-w-[110px]">{card.club}</span>
                            {card.isTradable ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                <Unlock className="w-2.5 h-2.5" />
                              </span>
                            ) : (
                              <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleQuickSubReserve(card, e)}
                          title="Substitute directly into squad"
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-cyan-500/30"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          Sub In
                        </button>
                        <button
                          onClick={(e) => handleAddReserveToBench(card, e)}
                          title="Add to bench"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 text-[10px] transition-all cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3 text-cyan-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedCard(card);
                          }}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white text-[10px] transition-all cursor-pointer"
                          title="Inspect details"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= PLAYER INSPECTOR / RANK-UP / QUICK SUB MODAL ================= */}
      {inspectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Player Card Dossier
              </h3>
              <button
                onClick={() => setInspectedCard(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <PlayerCardView card={inspectedCard} size="md" />

              {/* Stats & Rank Up System */}
              <div className="flex-1 space-y-4 w-full text-xs">
                {/* Tradable / Untradable Details Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  inspectedCard.isTradable
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {inspectedCard.isTradable ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                    <div>
                      <div className="font-bold">{inspectedCard.isTradable ? 'Tradable Card' : 'Untradable Card'}</div>
                      <div className="text-[10px] opacity-80">
                        {inspectedCard.isTradable
                          ? 'Can be listed on the Transfer Market for coins'
                          : 'Locked to club; cannot be sold on market'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Substitution Action right from dossier */}
                <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                      Quick Lineup Placement
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        handleQuickSubReserve(inspectedCard);
                        setInspectedCard(null);
                      }}
                      className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-cyan-500/40 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Place in Starting XI
                    </button>
                    <button
                      onClick={() => {
                        handleAddReserveToBench(inspectedCard);
                        setInspectedCard(null);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#151B28] hover:bg-white/10 text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-700 cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 text-cyan-400" />
                      Place on Bench
                    </button>
                  </div>
                </div>

                {/* Rank Up Action */}
                <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Rank-Up Level ({inspectedCard.rank}/5)
                    </span>
                    <span className="font-scoreboard text-base font-bold text-amber-400">
                      +{inspectedCard.rank} OVR Boost
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    Rank-up upgrades player base attributes (+2 to Pace, Shooting, Dribbling, etc.). Use universal Mascherano Rank Tokens.
                  </p>

                  <button
                    onClick={() => handleRankUp(inspectedCard)}
                    disabled={inspectedCard.rank >= 5 || userProfile.rankTokens < 1}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      inspectedCard.rank < 5 && userProfile.rankTokens >= 1
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 text-neutral-950 shadow-md shadow-amber-900/30 cursor-pointer'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {inspectedCard.rank >= 5
                      ? 'Maximum Rank Reached (Rank 5)'
                      : `Rank Up (Requires 1 Token • You have ${userProfile.rankTokens})`}
                  </button>
                </div>

                {/* Full Radar Attributes */}
                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-1.5 font-tech">
                  {Object.entries(getPlayerRankedStats(inspectedCard)).map(([stat, val]) => (
                    <div key={stat} className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400 uppercase">{stat}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, val)}%` }}
                          />
                        </div>
                        <span className="font-bold text-white w-6 text-right">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectedCard(null)}
                className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 21 Tactical Formations & Variations Browser Modal */}
      <FormationModal
        isOpen={isFormationModalOpen}
        onClose={() => setIsFormationModalOpen(false)}
        currentFormation={squad.formation}
        onSelectFormation={handleSelectFormation}
      />
    </div>
  );
};
