import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Squad, TeamProfile, PlayerCard, UserProfile, CareerMatchRecord, SeasonCampaign, SeasonRewardsSummary, MatchBall, MatchCommentaryEvent } from '../types';
import { TOP_TEAMS } from '../data/teamsDatabase';
import { getPlayerCardCurrentRating } from '../data/playersDatabase';
import { audio } from '../services/audioService';
import { loadCareerHistory, saveCareerHistory } from '../services/storageService';
import { trackMilestoneProgress } from '../services/objectiveService';
import { 
  loadSeasonCampaign, 
  saveSeasonCampaign, 
  playUserMatchInSeason,
  generateSquadGoalscorers,
  generateCpuGoalscorers,
  formatScorersSummary,
  claimSeasonEndRewards
} from '../services/seasonService';
import { CareerProgress } from './CareerProgress';
import { Season38Hub } from './Season38Hub';
import { MatchHistory } from './MatchHistory';
import { Match3DView } from './Match3DView';
import { MatchCommentaryBox } from './MatchCommentaryBox';
import confetti from 'canvas-confetti';
import { 
  Play, FastForward, RotateCcw, Volume2, VolumeX, Trophy, 
  Gamepad2, Shield, Flame, Activity, ArrowRight, CheckCircle2,
  TrendingUp, BarChart3, Star, Zap, Sliders, Sparkles, Wind, Calendar,
  Pause, Disc, ArrowUp, ArrowDown, ArrowLeft, History
} from 'lucide-react';

export type TacticalMindset = 'balanced' | 'press' | 'tiki_taka' | 'counter' | 'catenaccio';

export const TACTICAL_CONFIGS: Record<TacticalMindset, { label: string; icon: string; desc: string; color: string }> = {
  balanced: { label: 'Balanced', icon: '⚖️', desc: 'Standard positioning & possession flow', color: 'border-gray-700 text-gray-300' },
  press: { label: 'Heavy Press', icon: '⚡', desc: '+20% closing pace & aggressive tackling', color: 'border-amber-500/60 text-amber-300' },
  tiki_taka: { label: 'Tiki-Taka', icon: '🌀', desc: '+30% pass velocity & fluid triangle support', color: 'border-cyan-500/60 text-cyan-300' },
  counter: { label: 'Deadly Counter', icon: '🏎️', desc: 'Strikers make rapid penetrating runs behind defense', color: 'border-emerald-500/60 text-emerald-300' },
  catenaccio: { label: 'Catenaccio', icon: '🛡️', desc: 'Deep compact block; CPU longshot error +40%', color: 'border-purple-500/60 text-purple-300' },
};

interface Props {
  userSquad: Squad;
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

interface PitchPlayer {
  id: string;
  name: string;
  number: number;
  team: 'user' | 'cpu';
  x: number; // 0 to 1000
  y: number; // 0 to 600
  vx: number;
  vy: number;
  speed: number;
  stamina: number;
  position: string;
  isGoalkeeper?: boolean;
}

export const MatchEngine: React.FC<Props> = ({
  userSquad,
  userProfile,
  onUpdateProfile,
}) => {
  // Mode selection
  const [selectedOpponent, setSelectedOpponent] = useState<TeamProfile>(TOP_TEAMS[0]);
  const [matchMode, setMatchMode] = useState<'lobby' | 'arcade' | 'quick_sim' | 'full_time'>('lobby');
  const [matchSubView, setMatchSubView] = useState<'season' | 'stadium' | 'history' | 'career'>('season');
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>('3d');
  const [careerHistory, setCareerHistory] = useState<CareerMatchRecord[]>(() => loadCareerHistory());
  const [isSeasonMatch, setIsSeasonMatch] = useState<boolean>(false);

  // User Squad OVR
  const userOvr = useMemo(() => {
    const starters = Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];
    if (starters.length === 0) return 85;
    return Math.round(starters.reduce((acc, c) => acc + getPlayerCardCurrentRating(c), 0) / starters.length);
  }, [userSquad]);

  // 38-Match Season Campaign State
  const [seasonCampaign, setSeasonCampaign] = useState<SeasonCampaign>(() => loadSeasonCampaign(userSquad.name, userOvr));
  const [seasonCompletionBonus, setSeasonCompletionBonus] = useState<SeasonRewardsSummary | null>(null);

  // Match state
  const [userScore, setUserScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [matchMinute, setMatchMinute] = useState(0);
  const matchMinuteRef = useRef(0);
  const [matchEvents, setMatchEvents] = useState<string[]>([]);
  const [commentaryEvents, setCommentaryEvents] = useState<MatchCommentaryEvent[]>([]);
  const [goalAnnouncement, setGoalAnnouncement] = useState<string | null>(null);

  // Cards and simulation tracking
  const playerCardsRef = useRef<Record<string, { yellow: number; red: boolean }>>({});
  const lastSaveTimeRef = useRef<number>(0);
  const halfTimeLoggedRef = useRef<boolean>(false);

  // Sync match minute ref
  useEffect(() => {
    matchMinuteRef.current = matchMinute;
  }, [matchMinute]);

  // Dynamic Commentary Event Dispatcher
  const addCommentaryEvent = useCallback((event: Omit<MatchCommentaryEvent, 'id' | 'timestamp'>) => {
    const newEvent: MatchCommentaryEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    setCommentaryEvents(prev => [newEvent, ...prev]);

    // Backward compatibility for legacy matchEvents strings
    const emojiMap: Record<string, string> = {
      goal: '⚽',
      card_yellow: '🟨',
      card_red: '🟥',
      save: '🧤',
      woodwork: '💥',
      tackle: '🛡️',
      skill: '⚡',
      tactics: '📋',
      whistle: '⏱️',
      chance: '⚠️',
    };
    const emoji = emojiMap[event.type] || '⏱️';
    setMatchEvents(prev => [`${event.minute}' ${emoji} ${event.headline} - ${event.detail}`, ...prev]);
  }, []);

  // New Gameplay Enhancements: Tactical Mindset & Momentum Gauge
  const [difficulty, setDifficulty] = useState<'pro' | 'world_class' | 'legendary'>(userProfile.difficultySetting || 'world_class');
  const difficultyRef = useRef<'pro' | 'world_class' | 'legendary'>(userProfile.difficultySetting || 'world_class');
  const [tacticalMindset, setTacticalMindset] = useState<TacticalMindset>('balanced');
  const tacticalMindsetRef = useRef<TacticalMindset>('balanced');
  const [momentum, setMomentum] = useState<number>(40);
  const momentumRef = useRef<number>(40);
  const [activeSkillAlert, setActiveSkillAlert] = useState<string | null>(null);
  const skillCooldownRef = useRef<boolean>(false);
  const skillTrailsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const sprintStaminaRef = useRef<number>(100);

  // Sync difficulty to ref
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Sync tactical mindset to ref
  useEffect(() => {
    tacticalMindsetRef.current = tacticalMindset;
  }, [tacticalMindset]);

  useEffect(() => {
    momentumRef.current = momentum;
  }, [momentum]);

  // Arcade Match Canvas & Controls
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const shotPowerCharge = useRef<number>(0);
  const isChargingShot = useRef<boolean>(false);
  const animationFrameId = useRef<number | null>(null);

  // Match control state & pause
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Active controlled player tracking (defaults to striker, auto switches to ball carrier or user can switch with Q / button)
  const controlledUserPlayerIdRef = useRef<string>('u_st');
  const [controlledPlayerName, setControlledPlayerName] = useState<string>('');

  // Scorer tracking across the entire squad
  const userMatchScorersRef = useRef<string[]>([]);
  const cpuMatchScorersRef = useRef<string[]>([]);
  const lastUserShooterRef = useRef<PitchPlayer | null>(null);
  const gkHoldingFramesRef = useRef<{ id: string; frames: number } | null>(null);

  // Virtual touch & pointer controls
  const [touchMovement, setTouchMovement] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchMovementRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isVirtualSprintingRef = useRef<boolean>(false);
  const [isVirtualSprinting, setIsVirtualSprinting] = useState<boolean>(false);
  const isPointerDownRef = useRef<boolean>(false);
  const pointerTargetRef = useRef<{ x: number; y: number } | null>(null);
  const kickoffGraceUntilRef = useRef<number>(0);
  const lastCpuTackleAttemptRef = useRef<number>(0);

  // Match entities
  const playersRef = useRef<PitchPlayer[]>([]);
  const ballRef = useRef<MatchBall>({ x: 500, y: 300, vx: 0, vy: 0, z: 0, vz: 0, possessionPlayerId: null });

  // Init Match Lineups using authentic user squad cards & opponent key stars
  const initMatchEntities = (opp: TeamProfile = selectedOpponent) => {
    const starters = Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];
    const gkCard = starters.find(c => c.position === 'GK');
    const defenders = starters.filter(c => ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(c.position));
    const midfielders = starters.filter(c => ['CM', 'CAM', 'CDM', 'RM', 'LM'].includes(c.position));
    const attackers = starters.filter(c => ['ST', 'CF', 'RW', 'LW', 'LF', 'RF'].includes(c.position));

    const cb1Card = defenders[0] || starters[1] || { shortName: 'Defender 1', number: 4 };
    const cb2Card = defenders[1] || starters[2] || { shortName: 'Defender 2', number: 5 };
    const cm1Card = midfielders[0] || starters[3] || { shortName: 'Midfielder 1', number: 8 };
    const cm2Card = midfielders[1] || starters[4] || { shortName: 'Playmaker', number: 10 };
    const stCard = attackers[0] || starters[0] || { shortName: 'Striker', number: 9 };

    const userPlayers: PitchPlayer[] = [
      { id: 'u_gk', name: gkCard?.shortName || 'Keeper', number: 1, team: 'user', x: 60, y: 300, vx: 0, vy: 0, speed: 4.8, stamina: 100, position: 'GK', isGoalkeeper: true },
      { id: 'u_cb1', name: cb1Card.shortName, number: 4, team: 'user', x: 220, y: 220, vx: 0, vy: 0, speed: 5.1, stamina: 100, position: 'CB' },
      { id: 'u_cb2', name: cb2Card.shortName, number: 5, team: 'user', x: 220, y: 380, vx: 0, vy: 0, speed: 5.1, stamina: 100, position: 'CB' },
      { id: 'u_cm1', name: cm1Card.shortName, number: 8, team: 'user', x: 380, y: 240, vx: 0, vy: 0, speed: 5.3, stamina: 100, position: 'CM' },
      { id: 'u_cm2', name: cm2Card.shortName, number: 10, team: 'user', x: 380, y: 360, vx: 0, vy: 0, speed: 5.3, stamina: 100, position: 'CM' },
      { id: 'u_st', name: stCard.shortName, number: 9, team: 'user', x: 480, y: 300, vx: 0, vy: 0, speed: 5.8, stamina: 100, position: 'ST' },
    ];

    const cpuGk = opp.keyPlayers[3] || `${opp.shortName} GK`;
    const cpuDef1 = opp.keyPlayers[3] ? `${opp.keyPlayers[3]} (DEF)` : `${opp.shortName} DEF`;
    const cpuDef2 = `${opp.shortName} CB`;
    const cpuMid1 = opp.keyPlayers[1] || `${opp.shortName} MID`;
    const cpuMid2 = opp.keyPlayers[2] || `${opp.shortName} CM`;
    const cpuSt = opp.keyPlayers[0] || `${opp.shortName} ST`;

    const cpuPlayers: PitchPlayer[] = [
      { id: 'c_gk', name: cpuGk, number: 1, team: 'cpu', x: 940, y: 300, vx: 0, vy: 0, speed: 4.8, stamina: 100, position: 'GK', isGoalkeeper: true },
      { id: 'c_cb1', name: cpuDef1, number: 4, team: 'cpu', x: 780, y: 220, vx: 0, vy: 0, speed: 4.9, stamina: 100, position: 'CB' },
      { id: 'c_cb2', name: cpuDef2, number: 3, team: 'cpu', x: 780, y: 380, vx: 0, vy: 0, speed: 4.9, stamina: 100, position: 'CB' },
      { id: 'c_cm1', name: cpuMid1, number: 8, team: 'cpu', x: 620, y: 240, vx: 0, vy: 0, speed: 5.1, stamina: 100, position: 'CM' },
      { id: 'c_cm2', name: cpuMid2, number: 6, team: 'cpu', x: 620, y: 360, vx: 0, vy: 0, speed: 5.1, stamina: 100, position: 'CM' },
      { id: 'c_st', name: cpuSt, number: 9, team: 'cpu', x: 520, y: 300, vx: 0, vy: 0, speed: 5.5, stamina: 100, position: 'ST' },
    ];

    playersRef.current = [...userPlayers, ...cpuPlayers];
    ballRef.current = { x: 500, y: 300, vx: 0, vy: 0, z: 0, vz: 0, possessionPlayerId: 'u_st' };
    controlledUserPlayerIdRef.current = 'u_st';
    touchMovementRef.current = { x: 0, y: 0 };
    setTouchMovement({ x: 0, y: 0 });
    isPointerDownRef.current = false;
    pointerTargetRef.current = null;
    kickoffGraceUntilRef.current = Date.now() + 2500;
    setControlledPlayerName(stCard.shortName);
    userMatchScorersRef.current = [];
    cpuMatchScorersRef.current = [];
    lastUserShooterRef.current = null;
    gkHoldingFramesRef.current = null;
  };

  // Ensure match entities are always initialized so 3D pitch always has active players
  useEffect(() => {
    if (playersRef.current.length === 0) {
      initMatchEntities(selectedOpponent);
    }
  }, [selectedOpponent]);

  // Switch active outfield player (Q key or Button)
  const handleSwitchPlayer = () => {
    const ball = ballRef.current;
    const outfieldUsers = playersRef.current.filter(p => p.team === 'user' && !p.isGoalkeeper);
    if (outfieldUsers.length === 0) return;

    // Find nearest outfield player to ball that isn't already selected
    const sorted = [...outfieldUsers].sort((a, b) => {
      const distA = Math.hypot(a.x - ball.x, a.y - ball.y);
      const distB = Math.hypot(b.x - ball.x, b.y - ball.y);
      return distA - distB;
    });

    const nextPlayer = sorted.find(p => p.id !== controlledUserPlayerIdRef.current) || sorted[0];
    controlledUserPlayerIdRef.current = nextPlayer.id;
    setControlledPlayerName(nextPlayer.name);
    audio.playClick();
  };

  // Defensive Tackle mechanic with timing, reach limit, and stumble on miss
  const handleTackle = () => {
    const ball = ballRef.current;
    const currPlayer = playersRef.current.find(p => p.id === controlledUserPlayerIdRef.current);
    if (!currPlayer) return;

    // If user already has possession, handle shot
    if (ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_')) {
      handleShoot(shotPowerCharge.current || 0.7);
      return;
    }

    // Defensive lunge towards ball / ball carrier
    audio.playKick();
    const lungeDirX = ball.x > currPlayer.x ? 6 : -6;
    const lungeDirY = ball.y > currPlayer.y ? 4 : -4;
    currPlayer.vx += lungeDirX;
    currPlayer.vy += lungeDirY;

    const distToBall = Math.hypot(currPlayer.x - ball.x, currPlayer.y - ball.y);
    const tackleReach = difficultyRef.current === 'legendary' ? 26 : difficultyRef.current === 'world_class' ? 30 : 36;

    if (distToBall < tackleReach) {
      // Dispossess CPU / claim loose ball
      ball.possessionPlayerId = currPlayer.id;
      ball.vx = 0;
      ball.vy = 0;
      controlledUserPlayerIdRef.current = currPlayer.id;
      setControlledPlayerName(currPlayer.name);
      setMomentum(prev => Math.min(100, prev + 10));
      setActiveSkillAlert(`🛡️ CRUNCHING TACKLE! ${currPlayer.name} wins the ball!`);
      setTimeout(() => setActiveSkillAlert(null), 1500);

      addCommentaryEvent({
        minute: matchMinuteRef.current,
        type: 'tackle',
        headline: `Great tackle by ${currPlayer.name}!`,
        detail: `Superb anticipation and timing to cleanly win back possession for ${userSquad.name}.`,
        team: 'user',
        playerName: currPlayer.name,
      });
    } else {
      // Mistimed tackle: lose speed momentarily and check for foul/card
      currPlayer.vx *= 0.35;
      currPlayer.vy *= 0.35;

      const cpuCarrier = playersRef.current.find(p => p.id === ball.possessionPlayerId && p.team === 'cpu');
      const distToCarrier = cpuCarrier ? Math.hypot(currPlayer.x - cpuCarrier.x, currPlayer.y - cpuCarrier.y) : 999;

      if (distToCarrier < 52 && Math.random() < 0.28) {
        // Late challenge foul!
        audio.playWhistle();
        const cardRecord = playerCardsRef.current[currPlayer.id] || { yellow: 0, red: false };
        cardRecord.yellow += 1;
        playerCardsRef.current[currPlayer.id] = cardRecord;

        if (cardRecord.yellow >= 2) {
          cardRecord.red = true;
          addCommentaryEvent({
            minute: matchMinuteRef.current,
            type: 'card_red',
            headline: `Red card for ${currPlayer.name}!`,
            detail: `Second yellow card! ${currPlayer.name} is sent off after an impetuous slide tackle!`,
            team: 'user',
            playerName: currPlayer.name,
          });
          setActiveSkillAlert(`🟥 RED CARD! ${currPlayer.name} sent off!`);
        } else {
          addCommentaryEvent({
            minute: matchMinuteRef.current,
            type: 'card_yellow',
            headline: `Yellow card for ${currPlayer.name}`,
            detail: `Referee brandishes a yellow card after a late sliding challenge on ${cpuCarrier?.name || 'the attacker'}.`,
            team: 'user',
            playerName: currPlayer.name,
          });
          setActiveSkillAlert(`🟨 YELLOW CARD for ${currPlayer.name}!`);
        }
        setMomentum(prev => Math.max(0, prev - 12));
        setTimeout(() => setActiveSkillAlert(null), 1800);
      } else {
        setActiveSkillAlert(`⚠️ TACKLE MISSED! Off balance!`);
        setTimeout(() => setActiveSkillAlert(null), 1200);
      }
    }
  };

  // Directional pad control handlers (both ref and state for zero-lag reactivity)
  const handleDirectionPress = (x: number, y: number) => {
    touchMovementRef.current = { x, y };
    setTouchMovement({ x, y });
  };

  const handleDirectionRelease = () => {
    touchMovementRef.current = { x: 0, y: 0 };
    setTouchMovement({ x: 0, y: 0 });
  };

  // Canvas pointer navigation (click or drag to move active player directly towards point on pitch)
  const updateCanvasPointerMovement = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 600 / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    pointerTargetRef.current = { x: clickX, y: clickY };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.focus();
    isPointerDownRef.current = true;
    updateCanvasPointerMovement(e);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPointerDownRef.current) {
      updateCanvasPointerMovement(e);
    }
  };

  const handleCanvasPointerUp = () => {
    isPointerDownRef.current = false;
    pointerTargetRef.current = null;
  };

  // Keyboard controls listener (supports WASD, Arrow keys, ZQSD, and physical keycodes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      // Prevent page scrolling on gaming keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'space'].includes(key) || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(code)) {
        e.preventDefault();
      }

      keysPressed.current[key] = true;
      keysPressed.current[code] = true;

      // Normalize common movement bindings
      if (key === 'w' || code === 'keyw' || key === 'z') keysPressed.current['w'] = true;
      if (key === 's' || code === 'keys') keysPressed.current['s'] = true;
      if (key === 'a' || code === 'keya') keysPressed.current['a'] = true;
      if (key === 'd' || code === 'keyd') keysPressed.current['d'] = true;
      if (key === 'arrowup' || code === 'arrowup') keysPressed.current['arrowup'] = true;
      if (key === 'arrowdown' || code === 'arrowdown') keysPressed.current['arrowdown'] = true;
      if (key === 'arrowleft' || code === 'arrowleft') keysPressed.current['arrowleft'] = true;
      if (key === 'arrowright' || code === 'arrowright') keysPressed.current['arrowright'] = true;
      if (key === 'shift' || code === 'shiftleft' || code === 'shiftright') keysPressed.current['shift'] = true;

      // Shoot / Tackle
      if ([' ', 'j'].includes(key) || code === 'space' || code === 'keyj') {
        const ball = ballRef.current;
        const currP = playersRef.current.find(p => p.id === controlledUserPlayerIdRef.current);
        const dist = currP ? Math.hypot(currP.x - ball.x, currP.y - ball.y) : 999;
        if ((ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_')) || dist < 65) {
          isChargingShot.current = true;
        } else {
          handleTackle();
        }
      }
      // Pass
      if (key === 'k' || code === 'keyk') {
        handlePass();
      }
      // Through Ball
      if (key === 'l' || code === 'keyl') {
        handleThroughBall();
      }
      // Signature Skill Move
      if (key === 'e' || key === 'u' || code === 'keye' || code === 'keyu') {
        handleSkillMove();
      }
      // Switch player
      if (key === 'q' || code === 'keyq') {
        handleSwitchPlayer();
      }
      // Pause
      if (key === 'p' || code === 'keyp') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      keysPressed.current[key] = false;
      keysPressed.current[code] = false;

      if (key === 'w' || code === 'keyw' || key === 'z') keysPressed.current['w'] = false;
      if (key === 's' || code === 'keys') keysPressed.current['s'] = false;
      if (key === 'a' || code === 'keya') keysPressed.current['a'] = false;
      if (key === 'd' || code === 'keyd') keysPressed.current['d'] = false;
      if (key === 'arrowup' || code === 'arrowup') keysPressed.current['arrowup'] = false;
      if (key === 'arrowdown' || code === 'arrowdown') keysPressed.current['arrowdown'] = false;
      if (key === 'arrowleft' || code === 'arrowleft') keysPressed.current['arrowleft'] = false;
      if (key === 'arrowright' || code === 'arrowright') keysPressed.current['arrowright'] = false;
      if (key === 'shift' || code === 'shiftleft' || code === 'shiftright') keysPressed.current['shift'] = false;

      if ([' ', 'j'].includes(key) || code === 'space' || code === 'keyj') {
        if (isChargingShot.current) {
          handleShoot(shotPowerCharge.current);
          shotPowerCharge.current = 0;
          isChargingShot.current = false;
        }
      }
    };

    const handleBlur = () => {
      keysPressed.current = {};
      touchMovementRef.current = { x: 0, y: 0 };
      isPointerDownRef.current = false;
      pointerTargetRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Signature Skill Move mechanic (Elastico, Roulette, Step-Over burst)
  const handleSkillMove = () => {
    const ball = ballRef.current;
    if (!ball.possessionPlayerId || !ball.possessionPlayerId.startsWith('u_')) return;
    if (skillCooldownRef.current) return;

    audio.playSkillMove();
    skillCooldownRef.current = true;
    setTimeout(() => { skillCooldownRef.current = false; }, 850);

    const currPlayer = playersRef.current.find(p => p.id === ball.possessionPlayerId);
    if (!currPlayer) return;

    // Determine direction of skill burst
    const dirX = currPlayer.vx !== 0 ? Math.sign(currPlayer.vx) : 1;
    const dirY = currPlayer.vy !== 0 ? Math.sign(currPlayer.vy) : (Math.random() > 0.5 ? 0.35 : -0.35);

    currPlayer.vx = dirX * 12.5;
    currPlayer.vy = dirY * 6;

    // Evade nearby CPU defenders by nudging them off balance
    playersRef.current.forEach(p => {
      if (p.team === 'cpu') {
        const dist = Math.hypot(p.x - currPlayer.x, p.y - currPlayer.y);
        if (dist < 50) {
          p.vx = -p.vx * 0.4;
          p.x += (p.x > currPlayer.x ? 35 : -35);
        }
      }
    });

    // Particle motion trail
    for (let i = 0; i < 6; i++) {
      skillTrailsRef.current.push({
        x: currPlayer.x - (dirX * i * 5),
        y: currPlayer.y - (dirY * i * 5),
        alpha: 1.0,
      });
    }

    // Get star player card trait
    const starters = Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];
    const card = starters.find(c => c.shortName === currPlayer.name) || starters[0];
    const traitText = card?.specialTrait ? `${currPlayer.name} • ${card.specialTrait}` : `${currPlayer.name} • Signature Elastico Burst!`;

    setActiveSkillAlert(`⚡ ${traitText}`);
    setTimeout(() => setActiveSkillAlert(null), 1600);

    // Dynamic Commentary
    addCommentaryEvent({
      minute: matchMinuteRef.current,
      type: 'skill',
      headline: `Skill move by ${currPlayer.name}!`,
      detail: `Dazzles the defender with a sharp burst of trickery and agility!`,
      team: 'user',
      playerName: currPlayer.name,
    });

    // Increase momentum gauge
    setMomentum(prev => Math.min(100, prev + 15));
  };

  // Pass mechanic
  const handlePass = () => {
    const ball = ballRef.current;
    let currPlayer = playersRef.current.find(p => p.id === controlledUserPlayerIdRef.current);
    if (!currPlayer) {
      currPlayer = playersRef.current.find(p => p.team === 'user' && !p.isGoalkeeper);
    }
    if (!currPlayer) return;

    const distToBall = Math.hypot(currPlayer.x - ball.x, currPlayer.y - ball.y);
    const hasPossession = ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_');
    if (!hasPossession && distToBall >= 65) return;

    audio.playKick();

    // Find best open teammate ahead
    const teammates = playersRef.current.filter(p => p.team === 'user' && p.id !== currPlayer.id && !p.isGoalkeeper);
    let bestTeammate = teammates[0];
    let minDiff = 9999;

    teammates.forEach(tm => {
      const dist = Math.hypot(tm.x - currPlayer.x, tm.y - currPlayer.y);
      if (dist < minDiff && tm.x >= currPlayer.x - 50) {
        minDiff = dist;
        bestTeammate = tm;
      }
    });

    if (bestTeammate) {
      const angle = Math.atan2(bestTeammate.y - currPlayer.y, bestTeammate.x - currPlayer.x);
      const passSpeed = tacticalMindsetRef.current === 'tiki_taka' ? 18 : 14;
      ball.vx = Math.cos(angle) * passSpeed;
      ball.vy = Math.sin(angle) * passSpeed;
      ball.possessionPlayerId = null;
      controlledUserPlayerIdRef.current = bestTeammate.id;
      setControlledPlayerName(bestTeammate.name);
      setMomentum(prev => Math.min(100, prev + (tacticalMindsetRef.current === 'tiki_taka' ? 7 : 4)));
    }
  };

  // Through Ball mechanic
  const handleThroughBall = () => {
    const ball = ballRef.current;
    let currPlayer = playersRef.current.find(p => p.id === controlledUserPlayerIdRef.current);
    if (!currPlayer) {
      currPlayer = playersRef.current.find(p => p.team === 'user' && !p.isGoalkeeper);
    }
    if (!currPlayer) return;

    const distToBall = Math.hypot(currPlayer.x - ball.x, currPlayer.y - ball.y);
    const hasPossession = ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_');
    if (!hasPossession && distToBall >= 65) return;

    audio.playKick();

    // Lead into attacking space
    const leadDistance = tacticalMindsetRef.current === 'counter' ? 270 : 220;
    const targetX = currPlayer.x + leadDistance;
    const targetY = currPlayer.y + (Math.random() * 80 - 40);
    const angle = Math.atan2(targetY - currPlayer.y, targetX - currPlayer.x);

    const speed = tacticalMindsetRef.current === 'counter' ? 18.5 : 16;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.possessionPlayerId = null;
    setMomentum(prev => Math.min(100, prev + 5));
  };

  // Shoot mechanic with power calibration, overcharge risk, and pressure deflection
  const handleShoot = (power: number = 0.75) => {
    const ball = ballRef.current;
    let currPlayer = playersRef.current.find(p => p.id === controlledUserPlayerIdRef.current);
    if (!currPlayer) {
      currPlayer = playersRef.current.find(p => p.team === 'user' && !p.isGoalkeeper) || playersRef.current[0];
    }
    if (!currPlayer) return;

    const distToBall = Math.hypot(currPlayer.x - ball.x, currPlayer.y - ball.y);
    const hasPossession = ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_');

    // If active player has ball or is within striking distance (65px), execute strike!
    if (hasPossession || distToBall < 65) {
      audio.playKick();
      lastUserShooterRef.current = currPlayer;

      const isApex = momentumRef.current >= 95;
      const shotPower = power || 0.75;

      const overchargeThreshold = difficultyRef.current === 'legendary' ? 0.78 : difficultyRef.current === 'world_class' ? 0.83 : 0.90;
      const isOvercharge = shotPower > overchargeThreshold;

      const cpuDefenders = playersRef.current.filter(p => p.team === 'cpu' && !p.isGoalkeeper);
      const closestDefDist = cpuDefenders.length > 0
        ? Math.min(...cpuDefenders.map(d => Math.hypot(d.x - currPlayer.x, d.y - currPlayer.y)))
        : 999;
      const isPressured = closestDefDist < 42;

      const distToGoal = Math.hypot(970 - currPlayer.x, 300 - currPlayer.y);
      const isLongRange = distToGoal > 440;

      let targetY = 250 + Math.random() * 100;
      let elevation = 3.5 + shotPower * 5;

      if (isOvercharge) {
        elevation = 14 + (shotPower - overchargeThreshold) * 22;
        targetY += (Math.random() - 0.5) * 180;
        setActiveSkillAlert("⚠️ OVERCHARGED! Strike blazes wildly over the bar!");
        setTimeout(() => setActiveSkillAlert(null), 1800);
      } else if (isPressured) {
        targetY += (Math.random() - 0.5) * 85;
        elevation += (Math.random() - 0.25) * 5;
        setActiveSkillAlert("⚠️ CONTESTED SHOT! Forced off-balance under pressure!");
        setTimeout(() => setActiveSkillAlert(null), 1500);
      } else if (isLongRange) {
        targetY += (Math.random() - 0.5) * 50;
      }

      const goalX = 970;
      const angle = Math.atan2(targetY - currPlayer.y, goalX - currPlayer.x);

      const baseSpeed = 16 + Math.min(10, shotPower * 11);
      const finalSpeed = isApex ? baseSpeed * 1.25 : (isPressured ? baseSpeed * 0.88 : baseSpeed);
      ball.vx = Math.cos(angle) * finalSpeed;
      ball.vy = Math.sin(angle) * finalSpeed;
      ball.vz = elevation;
      ball.possessionPlayerId = null;

      if (isApex) {
        setGoalAnnouncement("🔥 APEX SURGE ROCKET SHOT!");
        setTimeout(() => setGoalAnnouncement(null), 2000);
        setMomentum(35);
      }
    } else {
      // If player is further from ball, execute tackle / lunge towards ball
      handleTackle();
    }
  };

  // Start Interactive Arcade Match
  const startArcadeMatch = (opp?: TeamProfile, isSeason: boolean = false) => {
    const oppToUse = opp || selectedOpponent;
    if (opp) setSelectedOpponent(opp);
    setIsSeasonMatch(isSeason);
    setIsPaused(false);
    setSeasonCompletionBonus(null);
    playerCardsRef.current = {};
    lastSaveTimeRef.current = 0;
    halfTimeLoggedRef.current = false;
    audio.playWhistle();
    initMatchEntities(oppToUse);
    setUserScore(0);
    setCpuScore(0);
    setMatchMinute(0);
    setCommentaryEvents([
      {
        id: `evt_0_${Date.now()}`,
        minute: 0,
        type: 'whistle',
        headline: 'Kick-off! Match Underway!',
        detail: `The referee signals kick-off! ${userSquad.name} face off against ${oppToUse.name}.`,
        timestamp: Date.now(),
      }
    ]);
    setMatchEvents(['0\' ⏱️ Kick-off! Match underway!']);
    setMatchMode('arcade');
  };
  // Launch from 38-Match Season
  const handleLaunchArcadeSeasonMatch = (opp: TeamProfile, isHome: boolean) => {
    startArcadeMatch(opp, true);
  };

  // Start Quick Sim Match with realistic difficulty scaling & tactical simulation
  const startQuickSim = () => {
    audio.playWhistle();
    setMatchMode('quick_sim');
    setSeasonCompletionBonus(null);
    setUserScore(0);
    setCpuScore(0);
    setMatchMinute(0);
    playerCardsRef.current = {};
    lastSaveTimeRef.current = 0;
    halfTimeLoggedRef.current = false;
    setCommentaryEvents([
      {
        id: `evt_0_${Date.now()}`,
        minute: 0,
        type: 'whistle',
        headline: 'Referee signals kick-off!',
        detail: `The quick simulation kicks off between ${userSquad.name} and ${selectedOpponent.name}.`,
        timestamp: Date.now(),
      }
    ]);
    setMatchEvents(['0\' ⏱️ Referee signals kick-off!']);
    userMatchScorersRef.current = [];
    cpuMatchScorersRef.current = [];

    const starterCards = Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];

    let uScore = 0;
    let cScore = 0;
    let min = 0;

    const interval = setInterval(() => {
      min += 10;
      setMatchMinute(min);

      // Event simulation based on OVR difference and difficulty
      const ovrDiff = userOvr - selectedOpponent.rating;
      const diffMultiplier = difficultyRef.current === 'legendary' ? 0.70 : difficultyRef.current === 'world_class' ? 0.85 : 1.0;
      const cpuAggression = difficultyRef.current === 'legendary' ? 1.35 : difficultyRef.current === 'world_class' ? 1.15 : 1.0;

      const userChance = Math.max(0.08, (0.22 + ovrDiff * 0.015) * diffMultiplier);
      const cpuChance = Math.max(0.12, (0.23 - ovrDiff * 0.012) * cpuAggression);

      const roll = Math.random();
      if (roll < userChance * 0.45) {
        // User Goal!
        uScore++;
        setUserScore(uScore);
        audio.playGoalHorn();
        confetti({ particleCount: 60, spread: 70 });
        const [scorer] = generateSquadGoalscorers(starterCards, 1, starterCards[0]?.shortName || 'Apex Striker');
        userMatchScorersRef.current.push(scorer);
        setMatchEvents(prev => [`${min}' ⚽ GOAL! Spectacular strike by ${scorer}! (${uScore}-${cScore})`, ...prev]);
        addCommentaryEvent({
          minute: min,
          type: 'goal',
          headline: `Goal scored by ${scorer}!`,
          detail: `Spectacular strike rifled into the back of the net! (${uScore} - ${cScore})`,
          team: 'user',
          playerName: scorer,
          score: `${uScore} - ${cScore}`,
        });
      } else if (roll > 1 - cpuChance * 0.45) {
        // CPU Goal
        cScore++;
        setCpuScore(cScore);
        audio.playWhistle();
        const [cpuScorer] = generateCpuGoalscorers(selectedOpponent.keyPlayers, 1, selectedOpponent.shortName);
        cpuMatchScorersRef.current.push(cpuScorer);
        setMatchEvents(prev => [`${min}' ⚽ GOAL! ${cpuScorer} slots it home for ${selectedOpponent.shortName}! (${uScore}-${cScore})`, ...prev]);
        addCommentaryEvent({
          minute: min,
          type: 'goal',
          headline: `Goal scored by ${cpuScorer}!`,
          detail: `${cpuScorer} slots it home with clinical composure for ${selectedOpponent.shortName}! (${uScore} - ${cScore})`,
          team: 'cpu',
          playerName: cpuScorer,
          score: `${uScore} - ${cScore}`,
        });
      } else if (Math.random() < 0.28) {
        // Goalkeeper save
        const isUserKeeper = Math.random() > 0.5;
        const gkCard = starterCards.find(c => c.position === 'GK');
        const gkName = isUserKeeper ? (gkCard?.shortName || 'Apex Keeper') : (selectedOpponent.keyPlayers[selectedOpponent.keyPlayers.length - 1] || 'Opponent Keeper');
        setMatchEvents(prev => [`${min}' 🧤 Terrific diving reflex save by ${gkName}!`, ...prev]);
        addCommentaryEvent({
          minute: min,
          type: 'save',
          headline: `Great save by keeper ${gkName}!`,
          detail: `Terrific diving reflex save turns a goal-bound strike safely around the post!`,
          team: isUserKeeper ? 'user' : 'cpu',
          playerName: gkName,
        });
      } else if (Math.random() < 0.20) {
        // Yellow card
        const isUserCard = Math.random() > 0.5;
        const bookedName = isUserCard 
          ? (starterCards[Math.floor(Math.random() * starterCards.length)]?.shortName || 'Defender')
          : (selectedOpponent.keyPlayers[Math.floor(Math.random() * selectedOpponent.keyPlayers.length)] || 'Midfielder');
        audio.playWhistle();
        setMatchEvents(prev => [`${min}' 🟨 Yellow card for ${bookedName}`, ...prev]);
        addCommentaryEvent({
          minute: min,
          type: 'card_yellow',
          headline: `Yellow card for ${bookedName}`,
          detail: `Referee brandishes a yellow card after a cynical tactical foul stopping a dangerous counter-attack.`,
          team: isUserCard ? 'user' : 'cpu',
          playerName: bookedName,
        });
      }

      if (min >= 90) {
        clearInterval(interval);
        audio.playWhistle();
        finishMatch(uScore, cScore);
      }
    }, 900);
  };

  // Finish match & distribute realistic, challenging rewards
  const finishMatch = (finalUserScore: number, finalCpuScore: number) => {
    setMatchMode('full_time');
    const isWin = finalUserScore > finalCpuScore;
    const isDraw = finalUserScore === finalCpuScore;

    // Full-Time Commentary Event
    addCommentaryEvent({
      minute: 90,
      type: 'whistle',
      headline: 'Full-Time Whistle Blown!',
      detail: `Final whistle sounds! Final score: ${userSquad.name} ${finalUserScore} - ${finalCpuScore} ${selectedOpponent.name}. ${isWin ? `A triumphant victory for ${userSquad.name}!` : isDraw ? 'Honors even after a fierce battle!' : `${selectedOpponent.name} hold on for the win.`}`,
      score: `${finalUserScore} - ${finalCpuScore}`,
    });

    // Strict realistic match economy based on difficulty
    const diff = difficultyRef.current;
    const winCoins = diff === 'legendary' ? 45000 : diff === 'world_class' ? 35000 : 25000;
    const drawCoins = 10000;
    const lossCoins = 4000;
    const coinsReward = isWin ? winCoins : isDraw ? drawCoins : lossCoins;

    const xpReward = isWin ? 140 : isDraw ? 60 : 25;
    // Mascherano Universal Rank Tokens are ultra-rare: only 15% chance on Legendary clean sheet win!
    const rankTokensEarned = (isWin && diff === 'legendary' && finalCpuScore === 0 && Math.random() < 0.15) ? 1 : 0;

    if (isWin) {
      audio.playCrowdCheer();
      confetti({ particleCount: 120, spread: 100 });
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      coins: userProfile.coins + coinsReward,
      xp: userProfile.xp + xpReward,
      rankTokens: userProfile.rankTokens + rankTokensEarned,
      stats: {
        ...userProfile.stats,
        matchesPlayed: userProfile.stats.matchesPlayed + 1,
        wins: userProfile.stats.wins + (isWin ? 1 : 0),
        draws: userProfile.stats.draws + (isDraw ? 1 : 0),
        losses: userProfile.stats.losses + (!isWin && !isDraw ? 1 : 0),
        goalsScored: userProfile.stats.goalsScored + finalUserScore,
        goalsConceded: userProfile.stats.goalsConceded + finalCpuScore,
        trophies: userProfile.stats.trophies + (isWin ? 1 : 0),
      },
    };
    onUpdateProfile(updatedProfile);

    // Record to Career History for Seasonal Tracking & Charts
    const resultType: 'W' | 'D' | 'L' = isWin ? 'W' : isDraw ? 'D' : 'L';
    const starters = Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];

    // Calculate top performer: player who scored the most goals or team captain
    let starName = starters[0]?.shortName || 'Squad Striker';
    let starGoals = 0;
    if (userMatchScorersRef.current.length > 0) {
      const counts: Record<string, number> = {};
      userMatchScorersRef.current.forEach(s => {
        counts[s] = (counts[s] || 0) + 1;
        if (counts[s] > starGoals) {
          starGoals = counts[s];
          starName = s;
        }
      });
    }

    const starCard = starters.find(c => c.shortName === starName) || starters[0];
    const starClub = starCard ? starCard.club : 'Apex FC';
    const topRating = Number((8.4 + (isWin ? 1.0 : isDraw ? 0.2 : -0.7) + (Math.random() * 0.4)).toFixed(1));

    // Update 38-Match Season Campaign if this was a season fixture
    if (isSeasonMatch) {
      try {
        const scorersToRecord = userMatchScorersRef.current.length > 0 ? userMatchScorersRef.current : starName;
        const res = playUserMatchInSeason(seasonCampaign, finalUserScore, finalCpuScore, scorersToRecord);
        if (res.campaign.isCompleted && !res.campaign.rewardsClaimed) {
          const claimRes = claimSeasonEndRewards(res.campaign, updatedProfile);
          setSeasonCampaign(claimRes.updatedCampaign);
          onUpdateProfile(claimRes.updatedProfile);
          setSeasonCompletionBonus(claimRes.summary);
        } else {
          setSeasonCampaign(res.campaign);
        }
      } catch (e) {
        console.error('Error recording season match result in campaign', e);
      }
    }

    const newCareerMatch: CareerMatchRecord = {
      id: `cm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      season: isSeasonMatch ? seasonCampaign.seasonNumber : 4,
      opponentName: selectedOpponent.name,
      opponentBadge: selectedOpponent.badge,
      userScore: finalUserScore,
      cpuScore: finalCpuScore,
      result: resultType,
      matchType: matchMode === 'quick_sim' ? 'quick_sim' : 'arcade',
      competition: isSeasonMatch ? 'season_38' : 'exhibition',
      topPerformer: {
        playerName: starName,
        playerClub: starClub,
        matchRating: Math.min(10, Math.max(6.5, topRating)),
        goals: starGoals || (finalUserScore > 0 ? Math.ceil(finalUserScore / 2) : 0),
        assists: isWin ? 1 : 0,
      },
      possessionPct: Math.round(52 + (finalUserScore - finalCpuScore) * 2.5 + (Math.random() * 6 - 3)),
      shots: Math.max(6, finalUserScore * 3 + Math.floor(Math.random() * 4)),
      shotsOnTarget: Math.max(finalUserScore, Math.floor((finalUserScore * 2.5) + 1)),
      teamPerformanceRating: Number((7.8 + (isWin ? 1.0 : isDraw ? 0.2 : -0.8) + (Math.random() * 0.4)).toFixed(1)),
    };

    setCareerHistory(prev => {
      const updated = [...prev, newCareerMatch];
      saveCareerHistory(updated);
      return updated;
    });

    // Track Daily Objectives & Milestones
    trackMilestoneProgress('play_match', 1);
    if (isWin) {
      trackMilestoneProgress('win_match', 1);
    }
    if (finalUserScore > 0) {
      trackMilestoneProgress('score_goals', finalUserScore);
    }
    if (finalCpuScore === 0) {
      trackMilestoneProgress('clean_sheet', 1);
    }
  };

  // Arcade Match Main Loop
  useEffect(() => {
    if (matchMode !== 'arcade') return;

    let localUserScore = 0;
    let localCpuScore = 0;
    let currentMin = 0;
    const totalMatchDurationSeconds = 80; // 80 real seconds for a thrilling 90 min match
    let lastTime = Date.now();
    let accumulatedElapsed = 0;

    const loop = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPausedRef.current) {
        accumulatedElapsed += delta;
      }
      currentMin = Math.min(90, Math.floor((accumulatedElapsed / totalMatchDurationSeconds) * 90));
      setMatchMinute(currentMin);

      // Half-Time announcement
      if (currentMin >= 45 && currentMin < 50 && !halfTimeLoggedRef.current) {
        halfTimeLoggedRef.current = true;
        addCommentaryEvent({
          minute: 45,
          type: 'whistle',
          headline: 'Half-Time Whistle!',
          detail: `The referee brings an intense first half to a close. Current score: ${userSquad.name} ${localUserScore} - ${localCpuScore} ${selectedOpponent.name}.`,
          score: `${localUserScore} - ${localCpuScore}`,
        });
      }

      const ball = ballRef.current;
      const players = playersRef.current;

      // When game is paused, render pitch and overlay without advancing physics
      if (isPausedRef.current) {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'rgba(10, 15, 25, 0.4)';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 24px Chakra Petch, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⏸️ MATCH PAUSED', 500, 290);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '13px Chakra Petch, monospace';
            ctx.fillText('Press [P] or click Resume to continue playing', 500, 320);
          }
        }
        animationFrameId.current = requestAnimationFrame(loop);
        return;
      }

      // Charge shot power if held
      if (isChargingShot.current) {
        shotPowerCharge.current = Math.min(1, shotPowerCharge.current + 0.035);
      }

      // 1. Process User Player Controls
      // Auto-lock controlled player to ball possessor if user has ball
      if (ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_')) {
        controlledUserPlayerIdRef.current = ball.possessionPlayerId;
      } else if (ball.possessionPlayerId && ball.possessionPlayerId.startsWith('c_')) {
        // Auto-switch to closest outfield defender if active player is too far from action (> 280px)
        const currentP = players.find(p => p.id === controlledUserPlayerIdRef.current);
        const distToBall = currentP ? Math.hypot(currentP.x - ball.x, currentP.y - ball.y) : 999;
        if (distToBall > 280) {
          const userOutfield = players.filter(p => p.team === 'user' && !p.isGoalkeeper);
          if (userOutfield.length > 0) {
            let closest = userOutfield[0];
            let minDist = Math.hypot(closest.x - ball.x, closest.y - ball.y);
            for (let i = 1; i < userOutfield.length; i++) {
              const d = Math.hypot(userOutfield[i].x - ball.x, userOutfield[i].y - ball.y);
              if (d < minDist) {
                minDist = d;
                closest = userOutfield[i];
              }
            }
            controlledUserPlayerIdRef.current = closest.id;
          }
        }
      }

      let userControllable = players.find(p => p.id === controlledUserPlayerIdRef.current);
      if (!userControllable) {
        userControllable = players.find(p => p.id === 'u_st') || players[0];
        controlledUserPlayerIdRef.current = userControllable.id;
      }

      let moveX = 0;
      let moveY = 0;

      // Keyboard directional inputs
      const kp = keysPressed.current;
      if (kp['arrowup'] || kp['w'] || kp['keyw'] || kp['z'] || kp['up']) moveY -= 1;
      if (kp['arrowdown'] || kp['s'] || kp['keys'] || kp['down']) moveY += 1;
      if (kp['arrowleft'] || kp['a'] || kp['keya'] || kp['left']) moveX -= 1;
      if (kp['arrowright'] || kp['d'] || kp['keyd'] || kp['right']) moveX += 1;

      // Touch / Virtual D-pad input from ref (zero closure lag)
      const touch = touchMovementRef.current;
      if (touch.x !== 0 || touch.y !== 0) {
        moveX = touch.x;
        moveY = touch.y;
      }

      // Pointer click / touch-drag directly on pitch
      if (isPointerDownRef.current && pointerTargetRef.current) {
        const ptx = pointerTargetRef.current.x;
        const pty = pointerTargetRef.current.y;
        const pdx = ptx - userControllable.x;
        const pdy = pty - userControllable.y;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist > 18) {
          moveX = pdx / pdist;
          moveY = pdy / pdist;
        }
      }

      const isSprinting = Boolean(
        kp['shift'] ||
        kp['shiftleft'] ||
        kp['shiftright'] ||
        isVirtualSprintingRef.current
      );
      const currentSpeed = isSprinting ? userControllable.speed * 1.4 : userControllable.speed;

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY) || 1;
        userControllable.vx = (moveX / len) * currentSpeed;
        userControllable.vy = (moveY / len) * currentSpeed;
      } else {
        userControllable.vx *= 0.75;
        userControllable.vy *= 0.75;
      }

      // 2. AI Opponents & Teammates Logic with Tactical Mindset
      const tactic = tacticalMindsetRef.current;
      const tacticSpeedBoost = tactic === 'press' ? 1.15 : 1.0;

      players.forEach(p => {
        if (p.id === userControllable.id) {
          // Controlled by user
          p.x = Math.max(30, Math.min(970, p.x + p.vx));
          p.y = Math.max(30, Math.min(570, p.y + p.vy));
          return;
        }

        if (p.isGoalkeeper) {
          // Goalkeeper behavior:
          p.x = p.team === 'user' ? 60 : 940;

          // If goalkeeper has possession, hold briefly then punt upfield
          if (ball.possessionPlayerId === p.id) {
            p.y = 300;
            if (!gkHoldingFramesRef.current || gkHoldingFramesRef.current.id !== p.id) {
              gkHoldingFramesRef.current = { id: p.id, frames: 0 };
            }
            gkHoldingFramesRef.current.frames++;
            if (gkHoldingFramesRef.current.frames > 30) {
              audio.playKick();
              ball.possessionPlayerId = null;
              ball.vx = p.team === 'user' ? 18 : -18;
              ball.vy = (Math.random() - 0.5) * 6;
              gkHoldingFramesRef.current = null;
            }
            return;
          }

          // Track ball Y inside goal area with agile positioning
          const targetY = Math.max(242, Math.min(358, ball.y));
          const currentDiff = difficultyRef.current;
          const gkSpeed = p.team === 'cpu'
            ? (currentDiff === 'legendary' ? 0.16 : currentDiff === 'world_class' ? 0.12 : 0.08)
            : 0.10;
          p.y += (targetY - p.y) * gkSpeed;

          // Intercept shots across full goal frame
          const distToBall = Math.hypot(p.x - ball.x, p.y - ball.y);
          const isShot = !ball.possessionPlayerId && Math.abs(ball.vx) > 6;
          const gkReach = p.team === 'cpu'
            ? (currentDiff === 'legendary' ? 44 : currentDiff === 'world_class' ? 36 : 28)
            : 34;

          if (distToBall < gkReach && isShot) {
            const isApexShot = momentumRef.current >= 95;
            const distToGkY = Math.abs(p.y - ball.y);
            const saveChance = isApexShot ? 0.25 : (distToGkY < 25 ? 0.88 : 0.62);

            if (Math.random() < saveChance) {
              audio.playKick();
              const isCatch = Math.random() < 0.40 && !isApexShot;
              if (isCatch) {
                // Secure catch
                ball.possessionPlayerId = p.id;
                ball.vx = 0;
                ball.vy = 0;
                setActiveSkillAlert(`🧤 SENSATIONAL CATCH! ${p.name} stops the shot!`);
              } else {
                // Parried / tipped away
                ball.vx = p.team === 'user' ? 12 : -12;
                ball.vy = (ball.y < 300 ? -1 : 1) * (7 + Math.random() * 6);
                audio.playWhistle();
                setActiveSkillAlert(`🧤 SPECTACULAR PARRIED SAVE! ${p.name} tips it wide!`);
              }
              setTimeout(() => setActiveSkillAlert(null), 1800);

              const now = Date.now();
              if (now - lastSaveTimeRef.current > 1500) {
                lastSaveTimeRef.current = now;
                addCommentaryEvent({
                  minute: currentMin,
                  type: 'save',
                  headline: `Great save by keeper ${p.name}!`,
                  detail: isCatch
                    ? `Safe hands! ${p.name} securely holds onto the venomous drive with composure under pressure.`
                    : `Incredible acrobatics from ${p.name}! Dives full stretch to claw the goal-bound shot wide!`,
                  team: p.team,
                  playerName: p.name,
                });
              }
            }
          }
          return;
        }

        if (p.team === 'cpu') {
          const currentDiff = difficultyRef.current;
          const cpuSpeedMultiplier = currentDiff === 'legendary' ? 1.08 : currentDiff === 'world_class' ? 0.98 : 0.85;

          // CPU AI: If CPU has ball, attack user goal; otherwise press ball
          if (ball.possessionPlayerId === p.id) {
            // CPU with ball moves purposefully towards user goal (x: 50, y: 300)
            const targetGoalY = 300 + Math.sin(Date.now() / 400) * 45;
            p.x -= p.speed * cpuSpeedMultiplier;
            p.y += (targetGoalY - p.y) * 0.045;

            // CPU shoot logic when in attacking range
            const shootRange = currentDiff === 'legendary' ? 380 : currentDiff === 'world_class' ? 340 : 300;
            const cpuShootThreshold = tactic === 'catenaccio' 
              ? (currentDiff === 'legendary' ? 0.025 : 0.012)
              : (currentDiff === 'legendary' ? 0.065 : currentDiff === 'world_class' ? 0.045 : 0.025);

            if (p.x < shootRange && Math.random() < cpuShootThreshold) {
              audio.playKick();
              const shotPower = currentDiff === 'legendary' ? 22 : 19;
              const angleToGoal = Math.atan2((250 + Math.random() * 100) - p.y, 40 - p.x);
              ball.vx = Math.cos(angleToGoal) * shotPower;
              ball.vy = Math.sin(angleToGoal) * shotPower;
              ball.vz = 4 + Math.random() * 5;
              ball.possessionPlayerId = null;
            }
          } else {
            // CPU without ball: Press the ball and dispossess the user!
            const dx = ball.x - p.x;
            const dy = ball.y - p.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Aggressive pressing: do not stop outside 30px!
            p.x += (dx / dist) * p.speed * cpuSpeedMultiplier;
            p.y += (dy / dist) * p.speed * cpuSpeedMultiplier;

            // Dispossession attempt if user has the ball and CPU defender gets close
            if (ball.possessionPlayerId && ball.possessionPlayerId.startsWith('u_') && dist < 26) {
              const now = Date.now();
              const isKickoffProtected = now < kickoffGraceUntilRef.current;
              const isTackleReady = now - lastCpuTackleAttemptRef.current > 1200;

              if (!isKickoffProtected && isTackleReady) {
                lastCpuTackleAttemptRef.current = now;
                const userSprintActive = isSprinting;
                const tackleChance = currentDiff === 'legendary'
                  ? (userSprintActive ? 0.65 : 0.40)
                  : currentDiff === 'world_class'
                  ? (userSprintActive ? 0.48 : 0.28)
                  : (userSprintActive ? 0.32 : 0.16);

                if (Math.random() < tackleChance && !skillCooldownRef.current) {
                  audio.playKick();
                  ball.possessionPlayerId = p.id;
                  ball.vx = 0;
                  ball.vy = 0;
                  setMomentum(prev => Math.max(0, prev - 15));
                  setActiveSkillAlert(`⚠️ DISPOSSESSED! ${p.name} strips the ball!`);
                  setTimeout(() => setActiveSkillAlert(null), 1500);

                  addCommentaryEvent({
                    minute: currentMin,
                    type: 'tackle',
                    headline: `Dispossessed by ${p.name}!`,
                    detail: `${p.name} cleanly wins the ball in dangerous territory for ${selectedOpponent.shortName}.`,
                    team: 'cpu',
                    playerName: p.name,
                  });
                } else if (Math.random() < 0.16 && !skillCooldownRef.current) {
                  // CPU commits foul on user
                  audio.playWhistle();
                  const cpuCardRecord = playerCardsRef.current[p.id] || { yellow: 0, red: false };
                  cpuCardRecord.yellow += 1;
                  playerCardsRef.current[p.id] = cpuCardRecord;

                  if (cpuCardRecord.yellow >= 2) {
                    cpuCardRecord.red = true;
                    addCommentaryEvent({
                      minute: currentMin,
                      type: 'card_red',
                      headline: `Red card for ${p.name}!`,
                      detail: `Second yellow card! ${p.name} is sent off for a reckless challenge!`,
                      team: 'cpu',
                      playerName: p.name,
                    });
                    setActiveSkillAlert(`🟥 RED CARD! ${p.name} sent off!`);
                  } else {
                    addCommentaryEvent({
                      minute: currentMin,
                      type: 'card_yellow',
                      headline: `Yellow card for ${p.name}`,
                      detail: `Referee books ${p.name} after a cynical challenge stopping the attack. Free kick awarded!`,
                      team: 'cpu',
                      playerName: p.name,
                    });
                    setActiveSkillAlert(`🟨 YELLOW CARD! Foul by ${p.name}!`);
                  }
                  setMomentum(prev => Math.min(100, prev + 10));
                  setTimeout(() => setActiveSkillAlert(null), 1800);
                }
              }
            }
          }
        } else {
          // User AI Teammates: support positions influenced by tactical mindset
          if (p.position === 'ST') {
            const forwardTarget = tactic === 'counter' ? ball.x + 160 : ball.x + 80;
            p.x += (forwardTarget - p.x) * 0.05 * tacticSpeedBoost;
          } else if (p.position === 'CB') {
            const defLine = tactic === 'catenaccio' ? 170 : (tactic === 'press' ? 280 : 210);
            p.x += (defLine - p.x) * 0.04;
          } else if (p.position === 'CM') {
            const midTargetX = tactic === 'press' ? ball.x + 30 : 380;
            p.x += (midTargetX - p.x) * 0.04 * tacticSpeedBoost;
          }
        }

        p.x = Math.max(30, Math.min(970, p.x));
        p.y = Math.max(30, Math.min(570, p.y));
      });

      // 3. Ball Physics & Possession
      if (ball.possessionPlayerId) {
        const possessor = players.find(p => p.id === ball.possessionPlayerId);
        if (possessor) {
          const forwardOffset = possessor.team === 'user' ? 14 : -14;
          ball.x = possessor.x + forwardOffset;
          ball.y = possessor.y;
          ball.vx = possessor.vx;
          ball.vy = possessor.vy;
        }
      } else {
        // Free ball rolling with friction
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.965;
        ball.vy *= 0.965;

        // Check if any player retrieves the ball
        for (const p of players) {
          const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (dist < 23) {
            ball.possessionPlayerId = p.id;
            break;
          }
        }
      }

      // Check Woodwork / Crossbar (posts at x: 960 to 975, y around 224-238 or 362-376)
      if (ball.x >= 958 && ball.x <= 978 && ((ball.y >= 222 && ball.y <= 238) || (ball.y >= 362 && ball.y <= 378))) {
        audio.playPostHit();
        ball.vx = -Math.abs(ball.vx) * 0.78;
        ball.vy = (Math.random() - 0.5) * 14;
        setGoalAnnouncement("💥 WOODWORK! RATTLED THE POST!");
        setTimeout(() => setGoalAnnouncement(null), 2000);
        addCommentaryEvent({
          minute: currentMin,
          type: 'woodwork',
          headline: 'Rattled the woodwork!',
          detail: 'Thunderous strike beats the goalkeeper but rebounds violently off the post!',
          team: 'user',
        });
      }

      // Check Over the Crossbar (overhit shots)
      if (ball.x >= 965 && (ball.vz || 0) > 9.5) {
        ball.x = 940;
        ball.y = 300;
        ball.vx = 0;
        ball.vy = 0;
        ball.vz = 0;
        ball.possessionPlayerId = 'c_gk';
        setActiveSkillAlert("🧤 OVER THE CROSSBAR! Opponent goal kick!");
        setTimeout(() => setActiveSkillAlert(null), 1500);
        addCommentaryEvent({
          minute: currentMin,
          type: 'chance',
          headline: 'Chance wasted over the crossbar!',
          detail: 'Powerful effort blazed high into the stands. Opponent goal kick.',
          team: 'user',
        });
      }

      // Check Goals
      // Opponent Goal (User scores at x > 965 and y between 238 and 362 with valid height)
      if (ball.x >= 965 && ball.y >= 238 && ball.y <= 362 && (ball.vz || 0) <= 9.5) {
        localUserScore++;
        setUserScore(localUserScore);
        audio.playGoalHorn();
        confetti({ particleCount: 90, spread: 80 });

        const starters = Object.values(userSquad.slots).filter(Boolean) as PlayerCard[];
        const scorer = lastUserShooterRef.current?.name || userControllable.name || starters[0]?.shortName || 'Apex Striker';
        userMatchScorersRef.current.push(scorer);

        setGoalAnnouncement(`⚽ GOAL! ${scorer} Scores! (${localUserScore} - ${localCpuScore})`);
        setTimeout(() => setGoalAnnouncement(null), 3000);
        setMatchEvents(prev => [`${currentMin}' ⚽ GOAL! ${scorer} (${localUserScore}-${localCpuScore})`, ...prev]);
        setMomentum(prev => Math.min(100, prev + 25));

        addCommentaryEvent({
          minute: currentMin,
          type: 'goal',
          headline: `Goal scored by ${scorer}!`,
          detail: `Spectacular strike rifled into the net! The crowd erupts in deafening celebration! (${localUserScore} - ${localCpuScore})`,
          team: 'user',
          playerName: scorer,
          score: `${localUserScore} - ${localCpuScore}`,
        });

        // Reset to center
        ball.x = 500;
        ball.y = 300;
        ball.vx = 0;
        ball.vy = 0;
        ball.possessionPlayerId = 'c_st';
      }

      // User Goal (CPU scores at x <= 35 and y between 238 and 362)
      if (ball.x <= 35 && ball.y >= 238 && ball.y <= 362) {
        localCpuScore++;
        setCpuScore(localCpuScore);
        audio.playWhistle();

        const [cpuScorer] = generateCpuGoalscorers(selectedOpponent.keyPlayers, 1, selectedOpponent.shortName);
        cpuMatchScorersRef.current.push(cpuScorer);

        setGoalAnnouncement(`⚽ GOAL! ${cpuScorer} Scores! (${localUserScore} - ${localCpuScore})`);
        setTimeout(() => setGoalAnnouncement(null), 3000);
        setMatchEvents(prev => [`${currentMin}' ⚽ Goal for ${selectedOpponent.shortName} (${localUserScore}-${localCpuScore})`, ...prev]);

        addCommentaryEvent({
          minute: currentMin,
          type: 'goal',
          headline: `Goal scored by ${cpuScorer}!`,
          detail: `Clinical finish for ${selectedOpponent.shortName}! Stranded the keeper with ruthless precision. (${localUserScore} - ${localCpuScore})`,
          team: 'cpu',
          playerName: cpuScorer,
          score: `${localUserScore} - ${localCpuScore}`,
        });

        // Reset to center
        ball.x = 500;
        ball.y = 300;
        ball.vx = 0;
        ball.vy = 0;
        ball.possessionPlayerId = 'u_st';
        controlledUserPlayerIdRef.current = 'u_st';
      }

      // Rebound off pitch boundaries
      if (ball.y <= 20 || ball.y >= 580) {
        ball.vy *= -0.8;
      }
      if (ball.x <= 20 || ball.x >= 980) {
        ball.vx *= -0.8;
      }

      // 4. DRAW PITCH & GRAPHICS (if 2D canvas is mounted)
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Grass turf with alternating stripes
          for (let i = 0; i < 10; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#1b7433' : '#1e8239';
            ctx.fillRect(i * 100, 0, 100, 600);
          }

      // Pitch lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 3;

      // Outer boundary
      ctx.strokeRect(30, 20, 940, 560);

      // Center Line & Circle
      ctx.beginPath();
      ctx.moveTo(500, 20);
      ctx.lineTo(500, 580);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(500, 300, 75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(500, 300, 4, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Boxes
      // Left Goal Box (User)
      ctx.strokeRect(30, 170, 150, 260);
      ctx.strokeRect(30, 230, 60, 140);
      // Left Goal Net
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(5, 240, 25, 120);
      ctx.strokeRect(5, 240, 25, 120);

      // Right Goal Box (CPU)
      ctx.strokeRect(820, 170, 150, 260);
      ctx.strokeRect(910, 230, 60, 140);
      // Right Goal Net
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(970, 240, 25, 120);
      ctx.strokeRect(970, 240, 25, 120);

      // Draw Skill Trails
      if (skillTrailsRef.current.length > 0) {
        skillTrailsRef.current.forEach(trail => {
          ctx.fillStyle = `rgba(6, 182, 212, ${trail.alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, 8 * trail.alpha, 0, Math.PI * 2);
          ctx.fill();
          trail.alpha -= 0.06;
        });
        skillTrailsRef.current = skillTrailsRef.current.filter(t => t.alpha > 0);
      }

      // Draw Players
      players.forEach(p => {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Apex Surge Golden Glow for User Squad
        if (p.team === 'user' && momentumRef.current >= 95) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Kit body
        ctx.fillStyle = p.team === 'user' ? '#06b6d4' : selectedOpponent.primaryColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.team === 'user' ? '#ffffff' : selectedOpponent.secondaryColor;
        ctx.stroke();

        // Player Name text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Chakra Petch, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 14);

        // Highlight & Indicator over user controlled player
        if (p.id === userControllable.id) {
          // Vibrant cyan highlight circle under player's feet
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 12, 16, 8, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Overhead neon indicator marker
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(p.x - 6, p.y - 24);
          ctx.lineTo(p.x + 6, p.y - 24);
          ctx.lineTo(p.x, p.y - 16);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Pointer destination waypoint marker (when touching or dragging on pitch)
      if (isPointerDownRef.current && pointerTargetRef.current) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pointerTargetRef.current.x, pointerTargetRef.current.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(pointerTargetRef.current.x, pointerTargetRef.current.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Football (Ball)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y + 4, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball core with classic hexagonal markings
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y - ball.z, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Shot Power Meter Gauge when charging
      if (isChargingShot.current) {
        const gaugeW = 40;
        const gaugeH = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(userControllable.x - gaugeW / 2, userControllable.y - 28, gaugeW, gaugeH);

        ctx.fillStyle = shotPowerCharge.current > 0.8 ? '#ef4444' : '#eab308';
        ctx.fillRect(userControllable.x - gaugeW / 2, userControllable.y - 28, gaugeW * shotPowerCharge.current, gaugeH);
      }

      // 5. Tactical Radar Minimap (APEX 27 Broadcast Style)
      const radarX = 790;
      const radarY = 15;
      const radarW = 180;
      const radarH = 105;

      ctx.fillStyle = 'rgba(10, 14, 23, 0.75)';
      ctx.fillRect(radarX, radarY, radarW, radarH);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(radarX, radarY, radarW, radarH);

      // Pitch center line & circle inside radar
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(radarX + radarW / 2, radarY);
      ctx.lineTo(radarX + radarW / 2, radarY + radarH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(radarX + radarW / 2, radarY + radarH / 2, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Players on radar
      players.forEach(p => {
        const rx = radarX + (p.x / 1000) * radarW;
        const ry = radarY + (p.y / 600) * radarH;
        ctx.fillStyle = p.team === 'user' ? '#06b6d4' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(rx, ry, p.isGoalkeeper ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ball on radar
      const rbx = radarX + (ball.x / 1000) * radarW;
      const rby = radarY + (ball.y / 600) * radarH;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(rbx, rby, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Radar watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = 'bold 8px Chakra Petch, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('LIVE TACTICAL RADAR', radarX + 6, radarY + 12);
        }
      }

      // Check Full Time
      if (currentMin >= 90) {
        finishMatch(localUserScore, localCpuScore);
      } else {
        animationFrameId.current = requestAnimationFrame(loop);
      }
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [matchMode, selectedOpponent, userOvr]);

  return (
    <div className="space-y-5">
      {/* Sub-view Navigation Switcher within Match Tab */}
      {matchMode === 'lobby' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F141F] border border-gray-800 p-2 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { audio.playClick(); setMatchSubView('season'); }}
              className={`px-4 py-2.5 rounded-xl font-black italic uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                matchSubView === 'season'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                  : 'text-gray-400 hover:text-white bg-[#151B28] border border-gray-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>38-Match Season Campaign</span>
              <span className="px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 text-[10px] font-mono font-bold">
                {seasonCampaign.isCompleted ? 'Finished (38/38)' : `MD ${seasonCampaign.currentMatchday}/38`}
              </span>
            </button>

            <button
              onClick={() => { audio.playClick(); setMatchSubView('stadium'); }}
              className={`px-4 py-2.5 rounded-xl font-black italic uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                matchSubView === 'stadium'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                  : 'text-gray-400 hover:text-white bg-[#151B28] border border-gray-800'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <span>Exhibition Stadium</span>
            </button>

            <button
              onClick={() => { audio.playClick(); setMatchSubView('history'); }}
              className={`px-4 py-2.5 rounded-xl font-black italic uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                matchSubView === 'history'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                  : 'text-gray-400 hover:text-white bg-[#151B28] border border-gray-800'
              }`}
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Match History</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] font-mono font-bold">
                {careerHistory.length} Matches
              </span>
            </button>

            <button
              onClick={() => { audio.playClick(); setMatchSubView('career'); }}
              className={`px-4 py-2.5 rounded-xl font-black italic uppercase text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                matchSubView === 'career'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                  : 'text-gray-400 hover:text-white bg-[#151B28] border border-gray-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span>Career Analytics</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono font-bold pr-3">
            <span className="text-gray-500 uppercase text-[10px]">Career Record:</span>
            <span className="text-emerald-400">{userProfile.stats.wins}W</span>
            <span className="text-gray-600">-</span>
            <span className="text-cyan-400">{userProfile.stats.draws}D</span>
            <span className="text-gray-600">-</span>
            <span className="text-rose-400">{userProfile.stats.losses}L</span>
          </div>
        </div>
      )}

      {/* Render 38-Match Season Campaign Component */}
      {matchMode === 'lobby' && matchSubView === 'season' && (
        <Season38Hub
          campaign={seasonCampaign}
          onUpdateCampaign={setSeasonCampaign}
          userSquad={userSquad}
          userProfile={userProfile}
          userOvr={userOvr}
          onUpdateProfile={onUpdateProfile}
          onLaunchArcadeMatch={handleLaunchArcadeSeasonMatch}
        />
      )}

      {/* Render Match History Component */}
      {matchMode === 'lobby' && matchSubView === 'history' && (
        <MatchHistory
          matches={careerHistory}
          userProfile={userProfile}
          onPlayRematch={(oppName) => {
            const opp = TOP_TEAMS.find(t => t.name === oppName) || TOP_TEAMS[0];
            setSelectedOpponent(opp);
            setMatchSubView('stadium');
          }}
          onNavigateToPlay={() => {
            setMatchSubView('stadium');
          }}
        />
      )}

      {/* Render Career Progress Component */}
      {matchMode === 'lobby' && matchSubView === 'career' && (
        <CareerProgress 
          careerHistory={careerHistory}
          userProfile={userProfile}
        />
      )}

      {/* Match Lobby / Team Selection */}
      {matchMode === 'lobby' && matchSubView === 'stadium' && (
        <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-gray-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Gameplay Simulation</div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                <Gamepad2 className="w-6 h-6 text-cyan-400" />
                Match Stadium (APEX 27 Match Engine)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Challenge authentic European clubs with real lineups or take on the legendary APEX 27 Master XI!
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#151B28] px-4 py-2 rounded-2xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Match Purse:</span>
              <span className="text-xs font-mono font-bold text-yellow-400">
                {difficulty === 'legendary' ? '+45,000 Coins' : difficulty === 'world_class' ? '+35,000 Coins' : '+25,000 Coins'}
              </span>
            </div>
          </div>

          {/* Versus Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 py-2">
            {/* User Club */}
            <div className="md:col-span-5 bg-[#151B28] p-5 rounded-3xl border border-cyan-500/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-3xl shadow-inner">
                  🦁
                </div>
                <div>
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest font-mono">Your Squad</span>
                  <h3 className="text-xl font-black italic uppercase text-white">{userSquad.name}</h3>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{userSquad.formation} Formation</div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-4xl font-black italic tracking-tighter text-white leading-none">{userOvr}</span>
                <span className="block text-[9px] text-cyan-400 font-bold uppercase tracking-wider">OVR</span>
              </div>
            </div>

            {/* VS Badge */}
            <div className="md:col-span-1 text-center font-black italic text-2xl text-yellow-400 tracking-tighter">
              VS
            </div>

            {/* Opponent Club */}
            <div className="md:col-span-5 bg-[#151B28] p-5 rounded-3xl border border-rose-500/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-3xl shadow-inner">
                  {selectedOpponent.badge}
                </div>
                <div>
                  <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest font-mono">{selectedOpponent.league}</span>
                  <h3 className="text-xl font-black italic uppercase text-white">{selectedOpponent.name}</h3>
                  <div className="text-xs text-gray-400 font-semibold truncate max-w-[180px] mt-0.5">
                    {selectedOpponent.keyPlayers.slice(0, 3).join(', ')}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-4xl font-black italic tracking-tighter text-rose-400 leading-none">{selectedOpponent.rating}</span>
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">OVR</span>
              </div>
            </div>
          </div>

          {/* Opponent Selection Carousel */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Select European Rival:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {TOP_TEAMS.map(team => (
                <button
                  key={team.id}
                  onClick={() => { audio.playClick(); setSelectedOpponent(team); }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedOpponent.id === team.id
                      ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50'
                      : 'border-gray-800 bg-[#151B28] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{team.badge}</span>
                    <span className="font-mono text-base font-bold text-yellow-400">{team.rating}</span>
                  </div>
                  <div className="font-bold text-xs text-white mt-1.5 truncate">{team.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{team.league}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Setting Selector */}
          <div className="bg-[#151B28] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono">
                  Engine Challenge Level
                </span>
                <h4 className="text-sm font-black italic uppercase text-white">AI Difficulty & Tactical Pressure</h4>
              </div>
              <span className={`text-[11px] font-mono font-black uppercase px-2.5 py-1 rounded-full border ${
                difficulty === 'legendary' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                difficulty === 'world_class' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {difficulty.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['pro', 'world_class', 'legendary'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => {
                    audio.playClick();
                    setDifficulty(diff);
                    onUpdateProfile({ ...userProfile, difficultySetting: diff });
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    difficulty === diff
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/50'
                      : 'bg-[#0F141F] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                  }`}
                >
                  <div className="text-xs font-black uppercase tracking-wider">{diff.replace('_', ' ')}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                    {diff === 'legendary' ? 'Ruthless AI (108% SPD)' : diff === 'world_class' ? 'Hardcore Pressure' : 'Competitive Pro'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <button
              onClick={startArcadeMatch}
              className="py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 font-black italic uppercase text-xs tracking-wider text-white shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <Gamepad2 className="w-5 h-5" />
              Play Interactive Match (APEX 27 Controls)
            </button>
            <button
              onClick={startQuickSim}
              className="py-4 px-6 rounded-2xl bg-white hover:bg-cyan-400 font-black italic uppercase text-xs tracking-wider text-black shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <FastForward className="w-5 h-5 fill-black" />
              Quick Simulation (Fast Manager Result)
            </button>
          </div>

          {/* Active Season & Career Progress Teaser Bento */}
          <div className="p-4 rounded-2xl bg-[#151B28] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black italic uppercase text-white flex items-center gap-2">
                  <span>Season 4: Champions League Campaign</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                  Current Campaign: {userProfile.stats.wins} Wins • {userProfile.stats.goalsScored} Goals Scored • {userProfile.stats.trophies} Trophies
                </div>
              </div>
            </div>

            <button
              onClick={() => setMatchSubView('career')}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              View Performance Charts & Trends
            </button>
          </div>
        </div>
      )}

      {/* ================= ACTIVE ARCADE MATCH SCREEN ================= */}
      {matchMode === 'arcade' && (
        <div className="space-y-4">
          {/* Scoreboard Bar with Bento Grid Styling & Momentum Gauge */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🦁</span>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-500 font-mono tracking-wider block">Home</span>
                <span className="font-black italic uppercase text-sm text-white">{userSquad.name}</span>
                {controlledPlayerName && (
                  <span className="text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Controlling: {controlledPlayerName}
                  </span>
                )}
              </div>
            </div>

            {/* Live Score & Clock */}
            <div className="flex items-center gap-4 bg-[#151B28] px-6 py-2 rounded-2xl border border-gray-800 shadow-inner">
              <span className="font-mono text-3xl font-black text-cyan-400 leading-none">{userScore}</span>
              <span className="text-gray-600 font-bold">-</span>
              <span className="font-mono text-3xl font-black text-rose-400 leading-none">{cpuScore}</span>
              <div className="h-6 w-px bg-gray-800 mx-1" />
              <span className="font-mono text-yellow-400 font-bold text-base">{matchMinute}'</span>
            </div>

            {/* Apex Momentum Gauge */}
            <div className="flex items-center gap-3 bg-[#151B28] px-4 py-2 rounded-2xl border border-gray-800 min-w-[200px]">
              <Flame className={`w-4 h-4 ${momentum >= 95 ? 'text-yellow-400 animate-bounce' : 'text-cyan-400'}`} />
              <div className="flex-1">
                <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase mb-1">
                  <span className={momentum >= 95 ? 'text-yellow-400' : 'text-gray-400'}>
                    {momentum >= 95 ? '🔥 APEX SURGE' : 'MOMENTUM'}
                  </span>
                  <span className="text-white">{Math.round(momentum)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${momentum >= 95 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/50' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                    style={{ width: `${momentum}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Match Action Controls (Pause / Forfeit) & Opponent Info */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { audio.playClick(); setIsPaused(prev => !prev); }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  isPaused 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse' 
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border-gray-700'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Forfeit and exit match? Current score will stand.')) {
                    audio.playWhistle();
                    finishMatch(userScore, cpuScore);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all cursor-pointer"
                title="Forfeit & Exit Match"
              >
                Exit
              </button>

              <div className="text-right pl-2 border-l border-gray-800">
                <span className="text-[9px] uppercase font-bold text-gray-500 font-mono tracking-wider block">Away</span>
                <span className="font-black italic uppercase text-sm text-white">{selectedOpponent.name}</span>
              </div>
              <span className="text-2xl">{selectedOpponent.badge}</span>
            </div>
          </div>

          {/* Live Tactical Mindset Selector & 3D/2D Engine Switcher */}
          <div className="bg-[#0F141F] border border-gray-800 rounded-2xl p-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase text-gray-400 font-mono">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tactics:</span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                {(Object.keys(TACTICAL_CONFIGS) as TacticalMindset[]).map(t => {
                  const config = TACTICAL_CONFIGS[t];
                  const isActive = tacticalMindset === t;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        audio.playClick();
                        setTacticalMindset(t);
                        addCommentaryEvent({
                          minute: matchMinuteRef.current,
                          type: 'tactics',
                          headline: `Tactics: ${config.label}`,
                          detail: `${userSquad.name} shifts tactical instructions to ${config.label}. ${config.desc}`,
                          team: 'user',
                        });
                      }}
                      title={config.desc}
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30 ring-1 ring-cyan-400/40' 
                          : 'bg-[#151B28] border-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3D FC MOBILE vs 2D Tactical View Switcher */}
            <div className="flex items-center gap-1 bg-[#151B28] p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => { audio.playClick(); setRenderMode('3d'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase italic tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  renderMode === '3d'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-neutral-950 font-black shadow-md shadow-cyan-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>3D FC MOBILE</span>
              </button>
              <button
                onClick={() => { audio.playClick(); setRenderMode('2d'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase italic tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  renderMode === '2d'
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>2D TACTICAL</span>
              </button>
            </div>
          </div>

          {/* Goal or Skill Announcement Banner */}
          {goalAnnouncement && (
            <div className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-black font-black italic uppercase text-2xl py-3 text-center rounded-2xl shadow-2xl animate-bounce">
              {goalAnnouncement}
            </div>
          )}
          {activeSkillAlert && !goalAnnouncement && (
            <div className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-black italic uppercase text-sm py-2 px-4 text-center rounded-xl shadow-lg backdrop-blur animate-pulse">
              {activeSkillAlert}
            </div>
          )}

          {/* ================= 3D FC MOBILE ENGINE (DEFAULT) ================= */}
          {renderMode === '3d' ? (
            <Match3DView
              playersRef={playersRef}
              ballRef={ballRef}
              controlledUserPlayerIdRef={controlledUserPlayerIdRef}
              controlledPlayerName={controlledPlayerName}
              userSquad={userSquad}
              selectedOpponent={selectedOpponent}
              userScore={userScore}
              cpuScore={cpuScore}
              matchMinute={matchMinute}
              momentum={momentum}
              difficulty={difficulty}
              tacticalMindset={tacticalMindset}
              activeSkillAlert={activeSkillAlert}
              goalAnnouncement={goalAnnouncement}
              isPaused={isPaused}
              onTogglePause={() => {
                setIsPaused(prev => !prev);
                audio.playClick();
              }}
              onPass={handlePass}
              onThroughBall={handleThroughBall}
              onShoot={handleShoot}
              onSkillMove={handleSkillMove}
              onTackle={handleTackle}
              onSwitchPlayer={handleSwitchPlayer}
              onDirectionChange={(x, y) => {
                touchMovementRef.current = { x, y };
                setTouchMovement({ x, y });
              }}
              isSprinting={isVirtualSprinting}
              onSprintToggle={(val) => {
                isVirtualSprintingRef.current = val;
                setIsVirtualSprinting(val);
              }}
            />
          ) : (
            /* ================= 2D TACTICAL BOARD SCREEN ================= */
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden border-4 border-gray-800 shadow-2xl flex justify-center bg-[#070A0F]">
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={600}
                  tabIndex={0}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  className="max-w-full h-auto block select-none cursor-crosshair outline-none focus:ring-2 focus:ring-cyan-500/50"
                />

                <div className="absolute top-3 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-700/60 flex items-center gap-2 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[11px] font-mono text-gray-200">
                    Active: <span className="text-cyan-300 font-bold">{controlledPlayerName || 'Controlled Player'}</span> • Move with <span className="text-yellow-300 font-bold">WASD / D-Pad</span> or <span className="text-cyan-300 font-bold">Click & Drag Pitch</span>
                  </span>
                </div>
              </div>

              {/* On-screen Controls Guide with Responsive Touch Controls & Virtual D-Pad */}
              <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
                {/* Virtual Directional D-Pad for Touch/Mouse */}
                <div className="flex items-center gap-4">
                  <div className="grid grid-cols-3 gap-1 w-32 h-32 bg-[#151B28] p-2 rounded-2xl border border-gray-800 shadow-inner select-none touch-none">
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(-0.7, -0.7); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800/70 hover:bg-cyan-500/30 active:bg-cyan-500 text-gray-400 active:text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Up-Left"
                    >
                      ↖
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(0, -1); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800 hover:bg-cyan-500/30 active:bg-cyan-500 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Up (W / Arrow Up)"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(0.7, -0.7); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800/70 hover:bg-cyan-500/30 active:bg-cyan-500 text-gray-400 active:text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Up-Right"
                    >
                      ↗
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(-1, 0); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800 hover:bg-cyan-500/30 active:bg-cyan-500 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Left (A / Arrow Left)"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center justify-center text-[9px] text-cyan-400 font-mono font-bold bg-[#0d121c] rounded-md border border-cyan-500/20">
                      PAD
                    </div>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(1, 0); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800 hover:bg-cyan-500/30 active:bg-cyan-500 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Right (D / Arrow Right)"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(-0.7, 0.7); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800/70 hover:bg-cyan-500/30 active:bg-cyan-500 text-gray-400 active:text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Down-Left"
                    >
                      ↙
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(0, 1); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800 hover:bg-cyan-500/30 active:bg-cyan-500 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Down (S / Arrow Down)"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleDirectionPress(0.7, 0.7); }}
                      onPointerUp={handleDirectionRelease}
                      onPointerLeave={handleDirectionRelease}
                      onPointerCancel={handleDirectionRelease}
                      className="bg-gray-800/70 hover:bg-cyan-500/30 active:bg-cyan-500 text-gray-400 active:text-white rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Move Down-Right"
                    >
                      ↘
                    </button>
                  </div>

                  <div className="hidden sm:flex flex-wrap items-center gap-1.5 max-w-sm">
                    <span className="font-black uppercase tracking-wider text-gray-400 text-[10px] w-full mb-1">Keyboard & Touch Controls:</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-gray-800 rounded-lg font-mono text-[11px] text-gray-200">WASD / Arrows / Drag</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-amber-500/40 text-amber-300 rounded-lg font-mono text-[11px] font-bold">SHIFT (Sprint)</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-cyan-500/40 text-cyan-300 rounded-lg font-mono text-[11px] font-bold">SPACE (Shoot/Tackle)</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-gray-800 rounded-lg font-mono text-[11px] text-emerald-300">K (Pass)</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-gray-800 rounded-lg font-mono text-[11px] text-yellow-300">L (Through)</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-gray-800 rounded-lg font-mono text-[11px] text-amber-300">E / U (⚡ Skill)</span>
                    <span className="px-2 py-1 bg-[#151B28] border border-gray-800 rounded-lg font-mono text-[11px] text-purple-300">Q (Switch)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSwitchPlayer}
                    className="px-3 py-2 bg-purple-600/80 hover:bg-purple-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer flex items-center gap-1"
                    title="Switch Controlled Player (Q)"
                  >
                    SWITCH (Q)
                  </button>

                  <button
                    onPointerDown={() => {
                      isVirtualSprintingRef.current = true;
                      setIsVirtualSprinting(true);
                    }}
                    onPointerUp={() => {
                      isVirtualSprintingRef.current = false;
                      setIsVirtualSprinting(false);
                    }}
                    onPointerLeave={() => {
                      isVirtualSprintingRef.current = false;
                      setIsVirtualSprinting(false);
                    }}
                    onPointerCancel={() => {
                      isVirtualSprintingRef.current = false;
                      setIsVirtualSprinting(false);
                    }}
                    className={`px-3 py-2 font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer transition-all ${
                      isVirtualSprinting 
                        ? 'bg-amber-400 text-black shadow-amber-400/50 scale-95' 
                        : 'bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-400/30'
                    }`}
                    title="Hold to Sprint (SHIFT)"
                  >
                    ⚡ SPRINT {isVirtualSprinting ? 'ON' : ''}
                  </button>

                  <button
                    onClick={handleTackle}
                    className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer"
                    title="Defensive Tackle / Dispossess"
                  >
                    TACKLE
                  </button>

                  <button
                    onMouseDown={handlePass}
                    onTouchStart={handlePass}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer"
                  >
                    PASS (K)
                  </button>

                  <button
                    onMouseDown={handleThroughBall}
                    onTouchStart={handleThroughBall}
                    className="px-3.5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer"
                  >
                    THROUGH (L)
                  </button>

                  <button
                    onMouseDown={() => handleShoot(0.85)}
                    onTouchStart={() => handleShoot(0.85)}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer"
                  >
                    SHOOT (SPACE)
                  </button>

                  <button
                    onMouseDown={handleSkillMove}
                    onTouchStart={handleSkillMove}
                    className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl shadow cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    SKILL (E)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Text Commentary Box directly below the MatchEngine pitch */}
          <MatchCommentaryBox
            events={commentaryEvents}
            currentMinute={matchMinute}
            userTeamName={userSquad.name}
            opponentTeamName={selectedOpponent.name}
            opponentBadge={selectedOpponent.badge}
            userScore={userScore}
            cpuScore={cpuScore}
            isPaused={isPaused}
          />
        </div>
      )}

      {/* ================= QUICK SIMULATION SCREEN ================= */}
      {matchMode === 'quick_sim' && (
        <div className="bg-[#0F141F] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <h3 className="font-black italic uppercase text-lg text-white flex items-center gap-2">
              <FastForward className="w-5 h-5 text-emerald-400" />
              Live Match Simulation
            </h3>
            <span className="font-mono text-xl font-bold text-yellow-400">{matchMinute}' MIN</span>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <div className="text-4xl mb-1">🦁</div>
              <div className="font-bold text-base text-white">{userSquad.name}</div>
              <div className="font-mono text-5xl font-black text-cyan-400">{userScore}</div>
            </div>
            <div className="text-gray-600 font-black italic text-3xl">VS</div>
            <div className="text-center">
              <div className="text-4xl mb-1">{selectedOpponent.badge}</div>
              <div className="font-bold text-base text-white">{selectedOpponent.name}</div>
              <div className="font-mono text-5xl font-black text-rose-400">{cpuScore}</div>
            </div>
          </div>

          {/* Dynamic Text Commentary Box in Quick Sim */}
          <MatchCommentaryBox
            events={commentaryEvents}
            currentMinute={matchMinute}
            userTeamName={userSquad.name}
            opponentTeamName={selectedOpponent.name}
            opponentBadge={selectedOpponent.badge}
            userScore={userScore}
            cpuScore={cpuScore}
            isPaused={false}
          />
        </div>
      )}

      {/* ================= FULL TIME REWARD SCREEN ================= */}
      {matchMode === 'full_time' && (
        <div className="bg-neutral-900/95 border border-neutral-700 rounded-3xl p-8 max-w-lg mx-auto shadow-2xl space-y-6 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>

          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Final Whistle</span>
            <h3 className="text-2xl font-black text-white mt-1">
              {userScore > cpuScore ? 'Victory! Masterclass Win!' : userScore === cpuScore ? 'Draw! Hard-Fought Match' : 'Defeat! Better Luck Next Time'}
            </h3>
          </div>

          {/* Final Score */}
          <div className="flex items-center justify-center gap-6 bg-neutral-950 py-4 px-6 rounded-2xl border border-neutral-800">
            <div className="text-right">
              <div className="font-bold text-sm text-white">{userSquad.name}</div>
              <span className="font-scoreboard text-4xl font-black text-cyan-400">{userScore}</span>
            </div>
            <div className="font-scoreboard text-2xl font-bold text-neutral-600">-</div>
            <div className="text-left">
              <div className="font-bold text-sm text-white">{selectedOpponent.shortName}</div>
              <span className="font-scoreboard text-4xl font-black text-rose-400">{cpuScore}</span>
            </div>
          </div>

          {/* Goalscorers List */}
          {(userMatchScorersRef.current.length > 0 || cpuMatchScorersRef.current.length > 0) && (
            <div className="bg-[#151B28] p-3.5 rounded-2xl border border-gray-800 text-left text-xs space-y-2">
              <div className="font-bold text-[10px] text-gray-400 uppercase tracking-wider font-mono">Match Scorers:</div>
              {userMatchScorersRef.current.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">⚽ {userSquad.name}:</span>
                  <span className="text-white font-mono">{formatScorersSummary(userMatchScorersRef.current)}</span>
                </div>
              )}
              {cpuMatchScorersRef.current.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">⚽ {selectedOpponent.shortName}:</span>
                  <span className="text-gray-300 font-mono">{formatScorersSummary(cpuMatchScorersRef.current)}</span>
                </div>
              )}
            </div>
          )}

          {/* Rewards Received */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-950/30 border border-amber-500/40 text-left space-y-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Match Rewards Credited ({difficulty.replace('_', ' ')}):</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300">Transfer Coins:</span>
              <strong className="text-amber-400 font-scoreboard text-lg">
                +{userScore > cpuScore
                  ? (difficulty === 'legendary' ? '45,000' : difficulty === 'world_class' ? '35,000' : '25,000')
                  : userScore === cpuScore ? '10,000' : '4,000'} Coins
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300">Manager XP:</span>
              <strong className="text-cyan-400 font-bold">+{userScore > cpuScore ? '140' : userScore === cpuScore ? '60' : '25'} XP</strong>
            </div>
            {userScore > cpuScore && difficulty === 'legendary' && cpuScore === 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/30">
                <span className="text-neutral-300">Clean Sheet Bonus:</span>
                <strong className="text-amber-300 font-bold">Legendary Mastery ⭐</strong>
              </div>
            )}
          </div>

          {/* Season 38 Completion & Golden Boot Bonus Screen */}
          {seasonCompletionBonus && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-emerald-500/20 border-2 border-yellow-400 text-left space-y-2.5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-yellow-500/30 pb-2">
                <span className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span>🏆</span>
                  <span>Full Season 38 Completed!</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold font-mono">
                  BONUSES CREDITED
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Final Table Finish ({seasonCompletionBonus.rankTitle}):</span>
                <strong className="text-yellow-400 font-mono text-sm">+{seasonCompletionBonus.rankCoins.toLocaleString()} Coins</strong>
              </div>

              {seasonCompletionBonus.rankTokens > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Universal Rank Tokens:</span>
                  <strong className="text-emerald-400 font-mono text-sm">+{seasonCompletionBonus.rankTokens} Mascherano 💎</strong>
                </div>
              )}

              {/* Golden Boot Bonus */}
              {seasonCompletionBonus.goldenBootWon ? (
                <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-amber-300 flex items-center gap-1">
                      <span>👟 Golden Boot Winner:</span>
                      <span className="text-white font-bold">{seasonCompletionBonus.goldenBootScorerName}</span>
                    </span>
                    <span className="text-[10px] text-amber-200/80 block mt-0.5 font-mono">
                      Top league finisher with {seasonCompletionBonus.goldenBootGoals} Goals!
                    </span>
                  </div>
                  <strong className="text-yellow-300 font-mono text-sm font-black">
                    +{seasonCompletionBonus.goldenBootBonus.toLocaleString()} Coins
                  </strong>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-black/40 border border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>👟 Golden Boot: Won by rival striker</span>
                  <span className="font-mono text-gray-500">+0 Coins</span>
                </div>
              )}

              <div className="pt-1.5 border-t border-yellow-500/30 flex items-center justify-between text-xs font-black">
                <span className="text-white uppercase tracking-wider">Total Season Purse Added:</span>
                <strong className="text-yellow-400 font-mono text-base">
                  +{seasonCompletionBonus.totalCoins.toLocaleString()} Coins
                </strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              onClick={() => {
                setMatchMode('lobby');
                setMatchSubView(isSeasonMatch ? 'season' : 'stadium');
                setIsSeasonMatch(false);
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-black italic uppercase text-xs text-neutral-950 shadow-lg shadow-cyan-500/30 hover:from-cyan-400 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Gamepad2 className="w-4 h-4 fill-neutral-950" />
              <span>{isSeasonMatch ? 'Continue Season' : 'Play Stadium'}</span>
            </button>
            <button
              onClick={() => {
                setMatchMode('lobby');
                setMatchSubView('history');
                setIsSeasonMatch(false);
              }}
              className="w-full py-3.5 rounded-xl bg-[#151B28] border border-cyan-500/50 hover:border-cyan-400 font-black italic uppercase text-xs text-cyan-300 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Match History</span>
            </button>
            <button
              onClick={() => {
                setMatchMode('lobby');
                setMatchSubView(isSeasonMatch ? 'season' : 'career');
                setIsSeasonMatch(false);
              }}
              className="w-full py-3.5 rounded-xl bg-[#151B28] border border-gray-700 hover:border-gray-500 font-black italic uppercase text-xs text-gray-300 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>{isSeasonMatch ? 'Season Table' : 'Career Stats'}</span>
            </button>
          </div>

          {/* Full Match Commentary Log Review */}
          <div className="pt-2 text-left">
            <MatchCommentaryBox
              events={commentaryEvents}
              currentMinute={90}
              userTeamName={userSquad.name}
              opponentTeamName={selectedOpponent.name}
              opponentBadge={selectedOpponent.badge}
              userScore={userScore}
              cpuScore={cpuScore}
              isPaused={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
