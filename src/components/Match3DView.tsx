import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { PitchPlayer, MatchBall, TeamProfile, Squad, PlayerCard } from '../types';
import { audio } from '../services/audioService';
import { 
  Camera, Zap, Shield, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  RefreshCw, Volume2, VolumeX, Maximize2, Pause, Play, Sparkles, Eye,
  Keyboard, Move
} from 'lucide-react';

export type CameraPreset = 'tele_broadcast' | 'action_pro' | 'end_to_end' | 'tactical';

interface Match3DViewProps {
  playersRef: React.MutableRefObject<PitchPlayer[]>;
  ballRef: React.MutableRefObject<MatchBall>;
  controlledUserPlayerIdRef: React.MutableRefObject<string>;
  controlledPlayerName: string;
  userSquad: Squad;
  selectedOpponent: TeamProfile;
  userScore: number;
  cpuScore: number;
  matchMinute: number;
  momentum: number;
  difficulty: 'pro' | 'world_class' | 'legendary';
  tacticalMindset: string;
  activeSkillAlert: string | null;
  goalAnnouncement: string | null;
  isPaused: boolean;
  onTogglePause: () => void;
  onPass: () => void;
  onThroughBall: () => void;
  onShoot: (power: number) => void;
  onSkillMove: () => void;
  onTackle: () => void;
  onSwitchPlayer: () => void;
  onDirectionChange: (x: number, y: number) => void;
  isSprinting: boolean;
  onSprintToggle: (sprint: boolean) => void;
}

// Coordinate mapping: 2D match space (0..1000, 0..600) -> 3D pitch meters (-50..50, -32..32)
const to3DX = (x: number) => (x - 500) / 10;
const to3DZ = (y: number) => (y - 300) / 9.375;

// ================= PROCEDURAL TEXTURE GENERATORS =================

// High-fidelity pitch turf texture with authentic EA FC lawn stripes and markings
function createPitchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Alternating lawn mowed stripe patterns (EA FC style vibrant emerald lawn)
  const stripes = 20;
  const stripeWidth = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    // Rich contrast turf stripes
    ctx.fillStyle = i % 2 === 0 ? '#1b5e20' : '#237328';
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);

    // Subtle grass blade texture
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
    for (let j = 0; j < 60; j++) {
      ctx.fillRect(
        i * stripeWidth + Math.random() * stripeWidth,
        Math.random() * canvas.height,
        2,
        6
      );
    }
  }

  // Pitch chalk white lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const marginX = 70;
  const marginY = 55;
  const fieldW = canvas.width - marginX * 2;
  const fieldH = canvas.height - marginY * 2;

  // Touchlines & Goal lines
  ctx.strokeRect(marginX, marginY, fieldW, fieldH);

  // Halfway line
  const midX = canvas.width / 2;
  ctx.beginPath();
  ctx.moveTo(midX, marginY);
  ctx.lineTo(midX, canvas.height - marginY);
  ctx.stroke();

  // Center Circle
  ctx.beginPath();
  ctx.arc(midX, canvas.height / 2, 115, 0, Math.PI * 2);
  ctx.stroke();

  // Center Spot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(midX, canvas.height / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // Penalty Boxes (16.5m)
  const boxW = 210;
  const boxH = 430;
  const boxY = (canvas.height - boxH) / 2;
  ctx.strokeRect(marginX, boxY, boxW, boxH);
  ctx.strokeRect(canvas.width - marginX - boxW, boxY, boxW, boxH);

  // 6-Yard Goal Areas
  const goalAreaW = 80;
  const goalAreaH = 210;
  const goalAreaY = (canvas.height - goalAreaH) / 2;
  ctx.strokeRect(marginX, goalAreaY, goalAreaW, goalAreaH);
  ctx.strokeRect(canvas.width - marginX - goalAreaW, goalAreaY, goalAreaW, goalAreaH);

  // Penalty Spots
  const spotDist = 145;
  ctx.beginPath();
  ctx.arc(marginX + spotDist, canvas.height / 2, 7, 0, Math.PI * 2);
  ctx.arc(canvas.width - marginX - spotDist, canvas.height / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  // Penalty D Arcs
  ctx.beginPath();
  ctx.arc(marginX + spotDist, canvas.height / 2, 105, -0.65, 0.65, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width - marginX - spotDist, canvas.height / 2, 105, Math.PI - 0.65, Math.PI + 0.65, false);
  ctx.stroke();

  // Corner Arcs
  const cornerR = 26;
  ctx.beginPath();
  ctx.arc(marginX, marginY, cornerR, 0, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(marginX, canvas.height - marginY, cornerR, Math.PI * 1.5, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width - marginX, marginY, cornerR, Math.PI * 0.5, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width - marginX, canvas.height - marginY, cornerR, Math.PI, Math.PI * 1.5);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  return texture;
}

// Authentic EA FC Mobile Match Ball Texture
function createBallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Black and gold geometric panels
  ctx.fillStyle = '#111827';
  for (let y = 30; y < canvas.height; y += 60) {
    for (let x = 30; x < canvas.width; x += 70) {
      ctx.beginPath();
      const r = 18;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Gold metallic perimeter trim
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Cyan swoosh accents
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(120, 80, 45, 0, Math.PI * 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(360, 180, 45, Math.PI, Math.PI * 2.2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

// Animated LED Perimeter Boards Texture
function createLEDTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#0a0f1d');
  grad.addColorStop(0.25, '#0284c7');
  grad.addColorStop(0.5, '#0a0f1d');
  grad.addColorStop(0.75, '#f59e0b');
  grad.addColorStop(1, '#0a0f1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const sponsors = [
    { text: '⚽ APEX 27 MOBILE', color: '#38bdf8' },
    { text: '⚡ HYPERMOTION V', color: '#facc15' },
    { text: '🎮 ULTIMATE TEAM', color: '#4ade80' },
    { text: '🏆 PLAY BEAUTIFUL', color: '#f43f5e' },
  ];

  const segW = canvas.width / sponsors.length;
  sponsors.forEach((sp, idx) => {
    ctx.fillStyle = sp.color;
    ctx.fillText(sp.text, idx * segW + segW / 2, canvas.height / 2);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

// Procedural Jersey Texture with Kit Colors, Stripes, and Player Number
function createJerseyTexture(
  primaryColor: string,
  secondaryColor: string,
  number: number,
  isGoalkeeper: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base kit color
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isGoalkeeper) {
    // High-vis geometric patterns for GK
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(80, 0);
    ctx.lineTo(0, 160);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(176, 0);
    ctx.lineTo(256, 160);
    ctx.closePath();
    ctx.fill();
  } else {
    // Athletic chest chevron & shoulder stripes
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, 256, 36); // Shoulder panel
    ctx.fillRect(116, 0, 24, 256); // Center stripe

    // Collar detail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 20, 28, 0, Math.PI);
    ctx.fill();
  }

  // Back squad number in bold athletic font
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 90px "Teko", "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(String(number || 10), 128, 140);
  ctx.fillText(String(number || 10), 128, 140);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const Match3DView: React.FC<Match3DViewProps> = ({
  playersRef,
  ballRef,
  controlledUserPlayerIdRef,
  controlledPlayerName,
  userSquad,
  selectedOpponent,
  userScore,
  cpuScore,
  matchMinute,
  momentum,
  difficulty,
  tacticalMindset,
  activeSkillAlert,
  goalAnnouncement,
  isPaused,
  onTogglePause,
  onPass,
  onThroughBall,
  onShoot,
  onSkillMove,
  onTackle,
  onSwitchPlayer,
  onDirectionChange,
  isSprinting,
  onSprintToggle,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('tele_broadcast');
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [shotCharge, setShotCharge] = useState<number>(0);
  const isChargingShotRef = useRef<boolean>(false);
  const chargeTimerRef = useRef<number>(0);

  // Virtual Joystick Touch handling
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [isJoystickActive, setIsJoystickActive] = useState<boolean>(false);
  const [joystickKnobPos, setJoystickKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera preset reference for animation loop
  const cameraPresetRef = useRef<CameraPreset>('tele_broadcast');
  cameraPresetRef.current = cameraPreset;

  // D-Pad and Control Pad states
  const [controlStyle, setControlStyle] = useState<'both' | 'joystick' | 'dpad'>('both');
  const [activeDpad, setActiveDpad] = useState<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(true);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const ballShadowRef = useRef<THREE.Mesh | null>(null);
  const ballTrailRef = useRef<THREE.Line | null>(null);
  const ballTrailPointsRef = useRef<THREE.Vector3[]>([]);

  // 3D Player Meshes Map
  const playerMeshesRef = useRef<Map<string, {
    group: THREE.Group;
    torso: THREE.Mesh;
    head: THREE.Mesh;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    groundRing: THREE.Mesh;
    reticle: THREE.Group;
    nameTag: THREE.Sprite;
  }>>(new Map());

  const ledBoardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const netLeftRef = useRef<THREE.Mesh | null>(null);
  const netRightRef = useRef<THREE.Mesh | null>(null);

  // ================= 3D PLAYER MESH SPAWNER =================
  // Athletic proportion: ~3.8 units tall so players are clearly visible & heroic
  const spawnPlayerMesh = useCallback((scene: THREE.Scene, p: PitchPlayer) => {
    const group = new THREE.Group();

    const isUser = p.team === 'user';
    const isGk = !!p.isGoalkeeper;

    // Team Kit Colors
    const userPrimary = '#0284c7'; // Apex Sky Blue
    const userSecondary = '#0f172a'; // Deep Navy
    const oppPrimary = selectedOpponent.primaryColor || '#dc2626';
    const oppSecondary = selectedOpponent.secondaryColor || '#ffffff';
    const gkUserColor = '#84cc16'; // Neon Lime GK
    const gkOppColor = '#ec4899'; // Hot Pink GK

    const jerseyPrimary = isGk
      ? (isUser ? gkUserColor : gkOppColor)
      : (isUser ? userPrimary : oppPrimary);
    const jerseySecondary = isGk ? '#1e293b' : (isUser ? userSecondary : oppSecondary);

    const shortsColor = isGk ? '#1e293b' : (isUser ? userSecondary : oppSecondary);
    const socksColor = jerseyPrimary;

    // Materials
    const jerseyTex = createJerseyTexture(jerseyPrimary, jerseySecondary, p.number, isGk);
    const jerseyMat = new THREE.MeshStandardMaterial({
      map: jerseyTex,
      roughness: 0.55,
      metalness: 0.1,
    });
    const shortsMat = new THREE.MeshStandardMaterial({
      color: shortsColor,
      roughness: 0.65,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#d4a373',
      roughness: 0.7,
    });
    const socksMat = new THREE.MeshStandardMaterial({
      color: socksColor,
      roughness: 0.6,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.35,
      metalness: 0.3,
    });

    // 1. Torso (Athletic V-shape)
    const torsoGeo = new THREE.CylinderGeometry(0.65, 0.52, 1.55, 14);
    const torso = new THREE.Mesh(torsoGeo, jerseyMat);
    torso.position.y = 2.15;
    torso.castShadow = true;
    group.add(torso);

    // 2. Head & Hair
    const headGeo = new THREE.SphereGeometry(0.44, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 3.25;
    head.castShadow = true;
    group.add(head);

    // Hair cap
    const hairGeo = new THREE.SphereGeometry(0.46, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.9 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 3.32;
    group.add(hair);

    // 3. Left Leg (Hip Joint)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.34, 1.45, 0);

    // Shorts thigh
    const thighGeo = new THREE.CylinderGeometry(0.22, 0.19, 0.7, 10);
    const lThigh = new THREE.Mesh(thighGeo, shortsMat);
    lThigh.position.y = -0.35;
    lThigh.castShadow = true;
    leftLeg.add(lThigh);

    // Sock shin
    const shinGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.75, 10);
    const lShin = new THREE.Mesh(shinGeo, socksMat);
    lShin.position.y = -0.95;
    lShin.castShadow = true;
    leftLeg.add(lShin);

    // Boot
    const bootGeo = new THREE.BoxGeometry(0.32, 0.22, 0.6);
    const lBoot = new THREE.Mesh(bootGeo, bootMat);
    lBoot.position.set(0, -1.35, 0.12);
    lBoot.castShadow = true;
    leftLeg.add(lBoot);
    group.add(leftLeg);

    // 4. Right Leg (Hip Joint)
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.34, 1.45, 0);

    const rThigh = new THREE.Mesh(thighGeo, shortsMat);
    rThigh.position.y = -0.35;
    rThigh.castShadow = true;
    rightLeg.add(rThigh);

    const rShin = new THREE.Mesh(shinGeo, socksMat);
    rShin.position.y = -0.95;
    rShin.castShadow = true;
    rightLeg.add(rShin);

    const rBoot = new THREE.Mesh(bootGeo, bootMat);
    rBoot.position.set(0, -1.35, 0.12);
    rBoot.castShadow = true;
    rightLeg.add(rBoot);
    group.add(rightLeg);

    // 5. Left Arm (Shoulder Joint)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.85, 2.7, 0);
    const sleeveGeo = new THREE.CylinderGeometry(0.2, 0.17, 0.65, 8);
    const lSleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
    lSleeve.position.y = -0.32;
    leftArm.add(lSleeve);
    const forearmGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.65, 8);
    const lForearm = new THREE.Mesh(forearmGeo, isGk ? bootMat : skinMat);
    lForearm.position.y = -0.9;
    leftArm.add(lForearm);
    group.add(leftArm);

    // 6. Right Arm (Shoulder Joint)
    const rightArm = new THREE.Group();
    rightArm.position.set(0.85, 2.7, 0);
    const rSleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
    rSleeve.position.y = -0.32;
    rightArm.add(rSleeve);
    const rForearm = new THREE.Mesh(forearmGeo, isGk ? bootMat : skinMat);
    rForearm.position.y = -0.9;
    rightArm.add(rForearm);
    group.add(rightArm);

    // 7. Ground Selection Ring (Illuminated FC Mobile Halo)
    const ringGeo = new THREE.RingGeometry(1.0, 1.35, 32);
    const ringColor = isUser ? '#38bdf8' : '#f43f5e';
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isUser ? 0.85 : 0.45,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.05;
    group.add(groundRing);

    // 8. Overhead Reticle (Iconic FC Mobile Neon Chevron)
    const reticle = new THREE.Group();
    const chevronGeo = new THREE.ConeGeometry(0.48, 0.85, 4);
    const chevronMat = new THREE.MeshBasicMaterial({
      color: '#facc15', // Vibrant EA Gold
    });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    chevron.rotation.x = Math.PI; // Inverted pointing down
    chevron.position.y = 4.7;
    reticle.add(chevron);
    reticle.visible = false;
    group.add(reticle);

    // 9. Floating Player Name Tag Billboard
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 70;
    const nCtx = nameCanvas.getContext('2d')!;

    // Pill background
    nCtx.fillStyle = 'rgba(7, 10, 15, 0.9)';
    nCtx.roundRect(10, 10, 236, 50, 14);
    nCtx.fill();
    nCtx.strokeStyle = isUser ? '#38bdf8' : '#f87171';
    nCtx.lineWidth = 4;
    nCtx.stroke();

    // Name text
    nCtx.fillStyle = '#ffffff';
    nCtx.font = 'bold 28px sans-serif';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    nCtx.fillText(`${p.number}. ${p.name.slice(0, 12)}`, 128, 35);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    const nameSpriteMat = new THREE.SpriteMaterial({ map: nameTex, depthTest: false });
    const nameTag = new THREE.Sprite(nameSpriteMat);
    nameTag.position.set(0, 5.4, 0);
    nameTag.scale.set(3.8, 1.05, 1);
    nameTag.visible = false;
    group.add(nameTag);

    // Initial position on pitch
    group.position.set(to3DX(p.x), 0, to3DZ(p.y));

    scene.add(group);
    playerMeshesRef.current.set(p.id, {
      group,
      torso,
      head,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      groundRing,
      reticle,
      nameTag,
    });
  }, [selectedOpponent]);

  // Dynamic Sync: Guarantee players are spawned on pitch immediately
  const syncPlayerMeshes = useCallback((scene: THREE.Scene, players: PitchPlayer[]) => {
    const currentMap = playerMeshesRef.current;
    if (players.length === 0) return;

    players.forEach(p => {
      if (!currentMap.has(p.id)) {
        spawnPlayerMesh(scene, p);
      }
    });

    // Clean up players that are no longer in lineup
    const activeIds = new Set(players.map(p => p.id));
    currentMap.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        scene.remove(entry.group);
        currentMap.delete(id);
      }
    });
  }, [spawnPlayerMesh]);

  // Setup Three.js 3D Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 580;

    // Scene with Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080d1a');
    scene.fog = new THREE.FogExp2('#080d1a', 0.0055);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 350);
    camera.position.set(0, 32, 42);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer with High Performance & ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ================= LIGHTING SYSTEM =================
    // Ambient Skylight
    const ambientLight = new THREE.AmbientLight('#93c5fd', 0.95);
    scene.add(ambientLight);

    // Main Stadium Floodlight (Casts soft shadows)
    const mainLight = new THREE.DirectionalLight('#ffffff', 2.2);
    mainLight.position.set(25, 55, 40);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 10;
    mainLight.shadow.camera.far = 140;
    mainLight.shadow.camera.left = -65;
    mainLight.shadow.camera.right = 65;
    mainLight.shadow.camera.top = 45;
    mainLight.shadow.camera.bottom = -45;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // Fill Stadium Floodlight from opposite stand
    const fillLight = new THREE.DirectionalLight('#a5b4fc', 1.4);
    fillLight.position.set(-25, 50, -40);
    scene.add(fillLight);

    // Warm Pitch Ground Bounce Light
    const hemiLight = new THREE.HemisphereLight('#60a5fa', '#15803d', 0.6);
    scene.add(hemiLight);

    // ================= 3D PITCH & SURROUND =================
    const pitchTex = createPitchTexture();
    const pitchGeo = new THREE.PlaneGeometry(100, 64);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.8,
      metalness: 0.05,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Surrounding Apron Turf
    const apronGeo = new THREE.PlaneGeometry(130, 94);
    const apronMat = new THREE.MeshStandardMaterial({
      color: '#0f3815',
      roughness: 0.95,
    });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.02;
    apron.receiveShadow = true;
    scene.add(apron);

    // ================= 3D GOALS =================
    const postMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.8,
    });
    const netMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    const createGoalCage = (isRight: boolean) => {
      const goalGroup = new THREE.Group();
      const goalX = isRight ? 50 : -50;
      const rotY = isRight ? 0 : Math.PI;

      const postRadius = 0.16;
      const goalW = 10.6; // across Z axis (~7.32m in pitch scale)
      const goalH = 3.6; // Y axis (~2.44m)
      const goalD = 3.0;

      // Crossbar
      const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalW, 12);
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, goalH, 0);
      goalGroup.add(crossbar);

      // Left & Right Upright Posts
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalH, 12);
      const post1 = new THREE.Mesh(postGeo, postMat);
      post1.position.set(0, goalH / 2, goalW / 2);
      goalGroup.add(post1);

      const post2 = new THREE.Mesh(postGeo, postMat);
      post2.position.set(0, goalH / 2, -goalW / 2);
      goalGroup.add(post2);

      // Goal Net Box Geometry
      const netGeo = new THREE.BoxGeometry(goalD, goalH, goalW);
      const net = new THREE.Mesh(netGeo, netMat);
      net.position.set(goalD / 2, goalH / 2, 0);
      goalGroup.add(net);

      if (isRight) netRightRef.current = net;
      else netLeftRef.current = net;

      goalGroup.position.set(goalX, 0, 0);
      goalGroup.rotation.y = rotY;
      scene.add(goalGroup);
    };

    createGoalCage(false); // Left goal
    createGoalCage(true);  // Right goal

    // ================= 3D STADIUM STANDS & CROWD =================
    const createStadiumStand = (x: number, z: number, rotY: number, length: number) => {
      const standGroup = new THREE.Group();

      // Multi-tier concrete seating terrace
      const tiers = 5;
      for (let t = 0; t < tiers; t++) {
        const stepGeo = new THREE.BoxGeometry(length, 1.6, 2.2);
        const stepMat = new THREE.MeshStandardMaterial({
          color: t % 2 === 0 ? '#1e293b' : '#0f172a',
          roughness: 0.85,
        });
        const step = new THREE.Mesh(stepGeo, stepMat);
        step.position.set(0, t * 1.5 + 1.2, t * 2.0);
        standGroup.add(step);

        // Vibrant Spectators / Seats (Color variation)
        const seatGeo = new THREE.BoxGeometry(length - 2, 0.4, 0.8);
        const seatColor = t % 3 === 0 ? '#0284c7' : t % 3 === 1 ? '#dc2626' : '#f59e0b';
        const seatMat = new THREE.MeshStandardMaterial({ color: seatColor, roughness: 0.6 });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(0, t * 1.5 + 2.1, t * 2.0);
        standGroup.add(seat);
      }

      // Roof Canopy
      const roofGeo = new THREE.BoxGeometry(length, 0.5, 14);
      const roofMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, tiers * 1.5 + 3.8, 5);
      standGroup.add(roof);

      standGroup.position.set(x, 0, z);
      standGroup.rotation.y = rotY;
      scene.add(standGroup);
    };

    // North Stand & South Stand (Along touchlines)
    createStadiumStand(0, -42, 0, 115);
    createStadiumStand(0, 42, Math.PI, 115);
    // East Stand & West Stand (Behind goals)
    createStadiumStand(65, 0, -Math.PI / 2, 75);
    createStadiumStand(-65, 0, Math.PI / 2, 75);

    // ================= LED ADVERTISING BOARDS =================
    const ledTexture = createLEDTexture();
    ledBoardTextureRef.current = ledTexture;
    const ledMat = new THREE.MeshBasicMaterial({ map: ledTexture });

    const createLEDBoard = (x: number, z: number, w: number, rotY: number) => {
      const ledGeo = new THREE.BoxGeometry(w, 1.2, 0.25);
      const board = new THREE.Mesh(ledGeo, ledMat);
      board.position.set(x, 0.6, z);
      board.rotation.y = rotY;
      scene.add(board);
    };

    // Along touchlines
    createLEDBoard(0, -33.5, 102, 0);
    createLEDBoard(0, 33.5, 102, Math.PI);
    // Behind goals
    createLEDBoard(53, 0, 66, -Math.PI / 2);
    createLEDBoard(-53, 0, 66, Math.PI / 2);

    // ================= CORNER FLOODLIGHT PYLONS =================
    const pylonPositions = [
      [58, -38],
      [-58, -38],
      [58, 38],
      [-58, 38],
    ];

    pylonPositions.forEach(([px, pz]) => {
      const mastGeo = new THREE.CylinderGeometry(0.5, 0.8, 32, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(px, 16, pz);
      scene.add(mast);

      // Light Bank
      const bankGeo = new THREE.BoxGeometry(5, 3.5, 1.2);
      const bankMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      const bank = new THREE.Mesh(bankGeo, bankMat);
      bank.position.set(px, 32, pz);
      bank.lookAt(0, 5, 0);
      scene.add(bank);
    });

    // ================= 3D SOCCER BALL =================
    const ballTex = createBallTexture();
    const ballGeo = new THREE.SphereGeometry(0.48, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.35,
      metalness: 0.2,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(0, 0.48, 0);
    scene.add(ballMesh);
    ballMeshRef.current = ballMesh;

    // Contact drop shadow on turf
    const shadowGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    ballShadow.rotation.x = -Math.PI / 2;
    ballShadow.position.y = 0.02;
    scene.add(ballShadow);
    ballShadowRef.current = ballShadow;

    // Ball Power Trail
    const trailPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 15; i++) trailPoints.push(new THREE.Vector3(0, 0, 0));
    ballTrailPointsRef.current = trailPoints;
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.7,
      linewidth: 3,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    ballTrailRef.current = trailLine;

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 1000;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      pitchTex.dispose();
      ballTex.dispose();
      ledTexture.dispose();
    };
  }, []);

  // Main 3D Animation & Render Loop
  useEffect(() => {
    let animId: number;
    let clock = new THREE.Clock();

    const render = () => {
      animId = requestAnimationFrame(render);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const ball = ballRef.current;
      const players = playersRef.current;
      const controlledId = controlledUserPlayerIdRef.current;

      if (!scene || !camera || !renderer || !ball) return;

      // DYNAMIC ENTITY SYNC: Always ensure all 22 players are spawned
      if (players && players.length > 0) {
        if (playerMeshesRef.current.size !== players.length) {
          syncPlayerMeshes(scene, players);
        }
      }

      // Animate LED Boards scrolling
      if (ledBoardTextureRef.current) {
        ledBoardTextureRef.current.offset.x += delta * 0.06;
      }

      // Update 3D Soccer Ball
      const ball3DX = to3DX(ball.x);
      const ball3DZ = to3DZ(ball.y);
      const ball3DY = Math.max(0.48, 0.48 + (ball.z || 0) / 9);

      if (ballMeshRef.current) {
        ballMeshRef.current.position.set(ball3DX, ball3DY, ball3DZ);

        // Realistic ball roll spin based on speed
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > 0.1) {
          ballMeshRef.current.rotation.x += ball.vy * 0.08;
          ballMeshRef.current.rotation.z -= ball.vx * 0.08;
        }

        // Net bulge animation when near goal lines
        if (ball3DX > 49 && Math.abs(ball3DZ) < 5.5 && netRightRef.current) {
          netRightRef.current.scale.x = 1 + Math.sin(elapsed * 18) * 0.2;
        } else if (netRightRef.current) {
          netRightRef.current.scale.x = 1;
        }
        if (ball3DX < -49 && Math.abs(ball3DZ) < 5.5 && netLeftRef.current) {
          netLeftRef.current.scale.x = 1 + Math.sin(elapsed * 18) * 0.2;
        } else if (netLeftRef.current) {
          netLeftRef.current.scale.x = 1;
        }

        // Update Ball Shot Trail
        if (ballTrailRef.current && ballTrailPointsRef.current) {
          const points = ballTrailPointsRef.current;
          points.pop();
          points.unshift(new THREE.Vector3(ball3DX, ball3DY, ball3DZ));
          ballTrailRef.current.geometry.setFromPoints(points);
          ballTrailRef.current.visible = speed > 8 || (ball.z || 0) > 2;
        }
      }

      if (ballShadowRef.current) {
        ballShadowRef.current.position.set(ball3DX, 0.03, ball3DZ);
        const shadowScale = Math.max(0.3, 1 - (ball3DY - 0.48) * 0.12);
        ballShadowRef.current.scale.set(shadowScale, shadowScale, 1);
      }

      // Update 3D Player Meshes & Running Locomotion Animation
      const playerMap = playerMeshesRef.current;
      players.forEach(p => {
        const meshEntry = playerMap.get(p.id);
        if (!meshEntry) return;

        const { group, leftLeg, rightLeg, leftArm, rightArm, groundRing, reticle, nameTag } = meshEntry;
        const targetX = to3DX(p.x);
        const targetZ = to3DZ(p.y);

        // Smooth position interpolation
        group.position.x += (targetX - group.position.x) * 0.7;
        group.position.z += (targetZ - group.position.z) * 0.7;

        // Facing direction rotation
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 0.2) {
          const angle = Math.atan2(p.vx, p.vy);
          group.rotation.y = angle;

          // Running locomotion stride cycle
          const strideSpeed = Math.min(20, speed * 3.0);
          const stride = Math.sin(elapsed * strideSpeed);
          leftLeg.rotation.x = stride * 0.85;
          rightLeg.rotation.x = -stride * 0.85;
          leftArm.rotation.x = -stride * 0.7;
          rightArm.rotation.x = stride * 0.7;
          group.position.y = Math.abs(Math.sin(elapsed * strideSpeed)) * 0.15;
        } else {
          // Idle breathing
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
          leftArm.rotation.x = 0;
          rightArm.rotation.x = 0;
          group.position.y = Math.sin(elapsed * 2.5) * 0.05;
        }

        // Active Controlled Player Visual Markers
        const isControlled = p.id === controlledId;
        reticle.visible = isControlled;
        nameTag.visible = isControlled;

        if (isControlled) {
          reticle.position.y = 0.2 + Math.sin(elapsed * 6) * 0.15;
          reticle.rotation.y += delta * 3.5;

          // Controlled player ground ring pulses bright gold
          const ringMat = groundRing.material as THREE.MeshBasicMaterial;
          ringMat.color.set('#facc15');
          ringMat.opacity = 0.95;
          const pulse = 1.0 + Math.sin(elapsed * 5) * 0.12;
          groundRing.scale.set(pulse, pulse, 1);
        } else {
          const ringMat = groundRing.material as THREE.MeshBasicMaterial;
          ringMat.color.set(p.team === 'user' ? '#38bdf8' : '#f43f5e');
          ringMat.opacity = p.team === 'user' ? 0.65 : 0.35;
          groundRing.scale.set(1, 1, 1);
        }
      });

      // ================= DYNAMIC FC MOBILE CAMERA SYSTEM =================
      const preset = cameraPresetRef.current;
      const targetFocusX = ball3DX * 0.85;
      const targetFocusZ = ball3DZ * 0.75;

      if (preset === 'tele_broadcast') {
        // Elevated TV broadcast camera with dynamic zoom
        const boxZoom = Math.abs(ball3DX) > 28 ? 0.88 : 1.0;
        const camTargetX = targetFocusX * 0.75;
        const camTargetY = 32 * boxZoom;
        const camTargetZ = 38 * boxZoom + targetFocusZ * 0.35;

        camera.position.x += (camTargetX - camera.position.x) * 0.08;
        camera.position.y += (camTargetY - camera.position.y) * 0.08;
        camera.position.z += (camTargetZ - camera.position.z) * 0.08;
        camera.lookAt(targetFocusX, 1.8, targetFocusZ * 0.5);
      } else if (preset === 'action_pro') {
        // Tight 3rd person chase camera behind attacking play
        const camTargetX = targetFocusX - 16;
        const camTargetY = 14;
        const camTargetZ = targetFocusZ + 12;

        camera.position.x += (camTargetX - camera.position.x) * 0.1;
        camera.position.y += (camTargetY - camera.position.y) * 0.1;
        camera.position.z += (camTargetZ - camera.position.z) * 0.1;
        camera.lookAt(ball3DX + 8, 2.0, ball3DZ);
      } else if (preset === 'end_to_end') {
        // Behind the user's attacking direction looking towards opponent's goal
        const camTargetX = Math.max(-48, ball3DX - 24);
        const camTargetY = 16;
        const camTargetZ = targetFocusZ * 0.5;

        camera.position.x += (camTargetX - camera.position.x) * 0.1;
        camera.position.y += (camTargetY - camera.position.y) * 0.1;
        camera.position.z += (camTargetZ - camera.position.z) * 0.1;
        camera.lookAt(50, 2.5, 0);
      } else if (preset === 'tactical') {
        // Overhead tactical sky view
        camera.position.x += (targetFocusX * 0.5 - camera.position.x) * 0.06;
        camera.position.y += (52 - camera.position.y) * 0.06;
        camera.position.z += (36 - camera.position.z) * 0.06;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [syncPlayerMeshes]);

  // Keyboard shortcut listener for camera & guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      if (key === 'c' || code === 'keyc') {
        audio.playClick();
        setCameraPreset(prev => {
          if (prev === 'tele_broadcast') return 'action_pro';
          if (prev === 'action_pro') return 'end_to_end';
          if (prev === 'end_to_end') return 'tactical';
          return 'tele_broadcast';
        });
      }
      if (key === 'g' || code === 'keyg') {
        setShowControlsGuide(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Shoot button charging & click logic (hold to charge shot power, release to fire)
  const handleShootDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    isChargingShotRef.current = true;
    setShotCharge(0.3);
    const start = Date.now();
    if (chargeTimerRef.current) window.clearInterval(chargeTimerRef.current);
    chargeTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const charge = Math.min(1.0, 0.3 + elapsed / 550);
      setShotCharge(charge);
    }, 25);
  };

  const handleShootUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (!isChargingShotRef.current) return;
    isChargingShotRef.current = false;
    if (chargeTimerRef.current) window.clearInterval(chargeTimerRef.current);
    const power = shotCharge || 0.75;
    onShoot(power);
    setShotCharge(0);
  };

  const handleShootClick = () => {
    // If a fast mouse click occurred without hold-and-release
    if (!isChargingShotRef.current) {
      onShoot(0.75);
    }
  };

  // Directional D-Pad Handlers (Up, Down, Left, Right with diagonals)
  const updateDpadMovement = (nextState: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    setActiveDpad(nextState);
    let dx = 0;
    let dy = 0;
    if (nextState.left) dx -= 1;
    if (nextState.right) dx += 1;
    if (nextState.up) dy -= 1;
    if (nextState.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const norm = 0.7071;
      onDirectionChange(dx * norm, dy * norm);
    } else {
      onDirectionChange(dx, dy);
    }
  };

  const handleDpadPress = (dir: 'up' | 'down' | 'left' | 'right', e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    updateDpadMovement({ ...activeDpad, [dir]: true });
  };

  const handleDpadRelease = (dir: 'up' | 'down' | 'left' | 'right', e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
    updateDpadMovement({ ...activeDpad, [dir]: false });
  };

  // Virtual Joystick Pointer Handlers with proper pointer capture
  const handleJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsJoystickActive(true);
    updateJoystickPos(e);
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isJoystickActive) return;
    e.preventDefault();
    updateJoystickPos(e);
  };

  const handleJoystickEnd = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setIsJoystickActive(false);
    setJoystickKnobPos({ x: 0, y: 0 });
    onDirectionChange(0, 0);
  };

  const updateJoystickPos = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 14;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const normDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * normDist;
    const knobY = Math.sin(angle) * normDist;

    setJoystickKnobPos({ x: knobX, y: knobY });
    const dirX = knobX / maxRadius;
    const dirY = knobY / maxRadius;
    onDirectionChange(dirX, dirY);
  };

  // Camera presets list for the switcher button
  const cameraPresetsList: { id: CameraPreset; label: string }[] = [
    { id: 'tele_broadcast', label: 'TELE' },
    { id: 'action_pro', label: 'ACTION' },
    { id: 'end_to_end', label: 'END-TO-END' },
    { id: 'tactical', label: 'TACTICAL' },
  ];

  const handleCycleCamera = () => {
    audio.playClick();
    const idx = cameraPresetsList.findIndex(c => c.id === cameraPreset);
    const next = cameraPresetsList[(idx + 1) % cameraPresetsList.length];
    setCameraPreset(next.id);
  };

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border-4 border-gray-800 shadow-2xl bg-[#080d1a] select-none touch-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* ================= FC MOBILE BROADCAST SCOREBOARD (TOP LEFT) ================= */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-[#0b1324]/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2.5 px-4 shadow-xl flex items-center gap-4">
          {/* User Squad */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🦁</span>
            <span className="font-black text-white text-xs uppercase tracking-wider hidden sm:inline">
              {userSquad.name.slice(0, 10)}
            </span>
          </div>

          {/* Live Score Display */}
          <div className="flex items-center gap-2 bg-[#030712] px-3 py-1 rounded-xl border border-gray-800 font-mono font-black text-lg">
            <span className="text-cyan-400">{userScore}</span>
            <span className="text-gray-500">:</span>
            <span className="text-rose-400">{cpuScore}</span>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-xs uppercase tracking-wider hidden sm:inline">
              {selectedOpponent.shortName}
            </span>
            <span className="text-xl">{selectedOpponent.badge}</span>
          </div>

          {/* Game Minute Timer */}
          <div className="border-l border-gray-700/60 pl-3 flex items-center gap-1.5 font-mono text-xs font-bold text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{matchMinute}'</span>
          </div>
        </div>
      </div>

      {/* ================= TOP RIGHT HUD ACTIONS (CAMERA, RADAR, PAUSE) ================= */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Camera Preset Switcher */}
        <button
          onClick={handleCycleCamera}
          className="bg-[#0b1324]/85 hover:bg-cyan-500/30 text-white border border-gray-700/70 px-3 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider shadow-lg flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all active:scale-95"
          title="Switch Camera View Angle"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span>CAM: {cameraPresetsList.find(c => c.id === cameraPreset)?.label}</span>
        </button>

        {/* Radar Toggle */}
        <button
          onClick={() => { audio.playClick(); setShowRadar(prev => !prev); }}
          className={`p-2 rounded-xl border backdrop-blur-md shadow-lg cursor-pointer transition-all ${
            showRadar 
              ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300' 
              : 'bg-[#0b1324]/85 border-gray-700/70 text-gray-400'
          }`}
          title="Toggle Tactical Radar"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Pause Button */}
        <button
          onClick={onTogglePause}
          className="bg-[#0b1324]/85 hover:bg-rose-500/20 text-white border border-gray-700/70 p-2 rounded-xl shadow-lg backdrop-blur-md cursor-pointer transition-all active:scale-95"
          title="Pause Match"
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-yellow-400" />}
        </button>
      </div>

      {/* ================= ACTIVE CONTROLLED PLAYER OVERHEAD BANNER ================= */}
      <div className="absolute top-16 left-4 z-10 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-mono text-gray-300">
            Player: <span className="text-cyan-300 font-bold">{controlledPlayerName || 'Active Player'}</span>
          </span>
          <span className="text-[10px] text-gray-500">|</span>
          <span className="text-[10px] font-mono text-yellow-400 uppercase font-bold">{tacticalMindset}</span>
        </div>
      </div>

      {/* ================= TACTICAL RADAR MINIMAP (BOTTOM RIGHT OR TOP RIGHT) ================= */}
      {showRadar && (
        <div className="absolute bottom-4 right-4 z-20 hidden md:block bg-[#090f1d]/90 backdrop-blur-md border border-cyan-500/30 p-2 rounded-2xl shadow-2xl">
          <div className="relative w-44 h-28 bg-[#111f18] rounded-xl overflow-hidden border border-emerald-500/20">
            {/* Field Pitch Markings */}
            <div className="absolute inset-1 border border-white/20 rounded-sm" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/20" />

            {/* Players on Radar */}
            {playersRef.current.map(p => {
              const rx = (p.x / 1000) * 100;
              const ry = (p.y / 600) * 100;
              const isControlled = p.id === controlledUserPlayerIdRef.current;
              return (
                <div
                  key={p.id}
                  className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                    isControlled 
                      ? 'w-3 h-3 bg-yellow-400 border border-black shadow-sm shadow-yellow-400 animate-ping'
                      : p.team === 'user'
                      ? 'w-2 h-2 bg-cyan-400 border border-black/50'
                      : 'w-2 h-2 bg-rose-500 border border-black/50'
                  }`}
                  style={{ left: `${rx}%`, top: `${ry}%` }}
                />
              );
            })}

            {/* Ball on Radar */}
            <div
              className="absolute w-2.5 h-2.5 bg-white border border-black rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm"
              style={{
                left: `${(ballRef.current.x / 1000) * 100}%`,
                top: `${(ballRef.current.y / 600) * 100}%`,
              }}
            />
          </div>
          <div className="text-[9px] font-mono text-gray-400 text-center mt-1 uppercase font-bold tracking-widest">
            Tactical Radar
          </div>
        </div>
      )}

      {/* ================= MOVEMENT CONTROLS: JOYSTICK & D-PAD (BOTTOM LEFT) ================= */}
      <div className="absolute bottom-6 left-6 z-20 select-none touch-none flex flex-col items-start gap-2">
        {/* Control Style Switcher Pill */}
        <div className="flex items-center gap-1 bg-[#0b1324]/90 backdrop-blur-md p-1 rounded-xl border border-gray-700/60 shadow-lg">
          <button
            type="button"
            onClick={() => setControlStyle('both')}
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              controlStyle === 'both' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Dual
          </button>
          <button
            type="button"
            onClick={() => setControlStyle('dpad')}
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              controlStyle === 'dpad' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            D-Pad
          </button>
          <button
            type="button"
            onClick={() => setControlStyle('joystick')}
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              controlStyle === 'joystick' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Stick
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* 360° Analog Floating Joystick */}
          {(controlStyle === 'both' || controlStyle === 'joystick') && (
            <div className="relative">
              <div
                ref={joystickBaseRef}
                onPointerDown={handleJoystickStart}
                onPointerMove={handleJoystickMove}
                onPointerUp={handleJoystickEnd}
                onPointerCancel={handleJoystickEnd}
                className="relative w-32 h-32 rounded-full bg-gradient-to-b from-[#1e293b]/80 to-[#0f172a]/95 backdrop-blur-md border-2 border-cyan-500/50 shadow-2xl flex items-center justify-center cursor-pointer active:border-cyan-300 transition-shadow"
              >
                {/* Direction indicators with PC keys */}
                <span className="absolute top-1 text-[8px] text-cyan-400/70 font-bold font-mono">▲ W</span>
                <span className="absolute bottom-1 text-[8px] text-cyan-400/70 font-bold font-mono">▼ S</span>
                <span className="absolute left-1 text-[8px] text-cyan-400/70 font-bold font-mono">◀ A</span>
                <span className="absolute right-1 text-[8px] text-cyan-400/70 font-bold font-mono">▶ D</span>

                {/* Inner target circle */}
                <div className="w-16 h-16 rounded-full border border-cyan-500/30 flex items-center justify-center">
                  <Move className="w-4 h-4 text-cyan-400/40" />
                </div>

                {/* Floating Joystick Thumb Knob */}
                <div
                  className={`absolute w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-400 to-cyan-300 border-2 border-white shadow-xl transition-transform duration-75 flex items-center justify-center ${
                    isJoystickActive ? 'scale-110 shadow-cyan-400/70' : ''
                  }`}
                  style={{
                    transform: `translate(${joystickKnobPos.x}px, ${joystickKnobPos.y}px)`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white/60 border border-white" />
                </div>
              </div>
            </div>
          )}

          {/* Tactical 4-Way Directional D-PAD with PC Key Badges */}
          {(controlStyle === 'both' || controlStyle === 'dpad') && (
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* UP [W / ↑] */}
              <button
                type="button"
                onPointerDown={(e) => handleDpadPress('up', e)}
                onPointerUp={(e) => handleDpadRelease('up', e)}
                onPointerLeave={(e) => handleDpadRelease('up', e)}
                onPointerCancel={(e) => handleDpadRelease('up', e)}
                className={`absolute top-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer shadow-lg active:scale-90 ${
                  activeDpad.up
                    ? 'bg-cyan-500 text-black border-white shadow-cyan-500/50'
                    : 'bg-[#151b28]/95 hover:bg-cyan-500/30 text-white border-cyan-500/40'
                }`}
                title="Move Up (W or Up Arrow)"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-[8px] font-mono font-black text-cyan-300 bg-black/50 px-1 rounded -mt-0.5">W</span>
              </button>

              {/* DOWN [S / ↓] */}
              <button
                type="button"
                onPointerDown={(e) => handleDpadPress('down', e)}
                onPointerUp={(e) => handleDpadRelease('down', e)}
                onPointerLeave={(e) => handleDpadRelease('down', e)}
                onPointerCancel={(e) => handleDpadRelease('down', e)}
                className={`absolute bottom-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer shadow-lg active:scale-90 ${
                  activeDpad.down
                    ? 'bg-cyan-500 text-black border-white shadow-cyan-500/50'
                    : 'bg-[#151b28]/95 hover:bg-cyan-500/30 text-white border-cyan-500/40'
                }`}
                title="Move Down (S or Down Arrow)"
              >
                <span className="text-[8px] font-mono font-black text-cyan-300 bg-black/50 px-1 rounded -mb-0.5">S</span>
                <ArrowDown className="w-4 h-4" />
              </button>

              {/* LEFT [A / ←] */}
              <button
                type="button"
                onPointerDown={(e) => handleDpadPress('left', e)}
                onPointerUp={(e) => handleDpadRelease('left', e)}
                onPointerLeave={(e) => handleDpadRelease('left', e)}
                onPointerCancel={(e) => handleDpadRelease('left', e)}
                className={`absolute left-0 w-11 h-11 rounded-xl flex flex-row items-center justify-center gap-0.5 border transition-all cursor-pointer shadow-lg active:scale-90 ${
                  activeDpad.left
                    ? 'bg-cyan-500 text-black border-white shadow-cyan-500/50'
                    : 'bg-[#151b28]/95 hover:bg-cyan-500/30 text-white border-cyan-500/40'
                }`}
                title="Move Left (A or Left Arrow)"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[8px] font-mono font-black text-cyan-300 bg-black/50 px-1 rounded">A</span>
              </button>

              {/* RIGHT [D / →] */}
              <button
                type="button"
                onPointerDown={(e) => handleDpadPress('right', e)}
                onPointerUp={(e) => handleDpadRelease('right', e)}
                onPointerLeave={(e) => handleDpadRelease('right', e)}
                onPointerCancel={(e) => handleDpadRelease('right', e)}
                className={`absolute right-0 w-11 h-11 rounded-xl flex flex-row items-center justify-center gap-0.5 border transition-all cursor-pointer shadow-lg active:scale-90 ${
                  activeDpad.right
                    ? 'bg-cyan-500 text-black border-white shadow-cyan-500/50'
                    : 'bg-[#151b28]/95 hover:bg-cyan-500/30 text-white border-cyan-500/40'
                }`}
                title="Move Right (D or Right Arrow)"
              >
                <span className="text-[8px] font-mono font-black text-cyan-300 bg-black/50 px-1 rounded">D</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Center Anchor */}
              <div className="w-6 h-6 rounded-lg bg-gray-800/80 border border-gray-700 flex items-center justify-center">
                <span className="text-[7px] text-gray-400 font-bold">PAD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= FC MOBILE ACTION BUTTON CLUSTER (BOTTOM RIGHT) ================= */}
      <div className="absolute bottom-6 right-6 md:right-48 z-20 flex flex-col items-end gap-2.5 select-none touch-none">
        {/* Top Mini Row: Sprint Boost & Player Switch */}
        <div className="flex items-center gap-2">
          {/* Switch Defender Button */}
          <button
            type="button"
            onClick={onSwitchPlayer}
            className="w-14 h-13 rounded-2xl bg-purple-600/90 hover:bg-purple-500 active:scale-95 text-white border border-purple-400/50 shadow-lg flex flex-col items-center justify-center text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer backdrop-blur-md"
            title="Switch Active Player [Q]"
          >
            <RefreshCw className="w-3.5 h-3.5 mb-0.5" />
            <span>SWITCH</span>
            <span className="text-[8px] font-mono font-bold bg-black/50 px-1.5 rounded text-purple-200 mt-0.5">Q</span>
          </button>

          {/* Sprint Boost Button */}
          <button
            type="button"
            onPointerDown={() => onSprintToggle(true)}
            onPointerUp={() => onSprintToggle(false)}
            onPointerLeave={() => onSprintToggle(false)}
            onPointerCancel={() => onSprintToggle(false)}
            className={`w-16 h-13 rounded-2xl border flex flex-col items-center justify-center text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer backdrop-blur-md shadow-lg ${
              isSprinting
                ? 'bg-amber-400 text-black border-amber-300 shadow-amber-400/50 scale-95'
                : 'bg-[#151b28]/90 hover:bg-amber-500/20 text-amber-400 border-amber-400/40'
            }`}
            title="Hold to Sprint [SHIFT]"
          >
            <Zap className="w-3.5 h-3.5 mb-0.5 fill-current" />
            <span>SPRINT</span>
            <span className="text-[8px] font-mono font-bold bg-black/50 px-1.5 rounded text-amber-300 mt-0.5">SHIFT</span>
          </button>
        </div>

        {/* Tactical Diamond Pass / Skill Cluster */}
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Left: Skill Move / Elastico */}
          <button
            type="button"
            onClick={onSkillMove}
            className="w-15 h-15 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 hover:from-cyan-500 hover:to-sky-300 active:scale-95 text-white border border-cyan-300/50 shadow-xl flex flex-col items-center justify-center text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer backdrop-blur-md"
            title="Signature Skill Move [E / U]"
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>SKILL</span>
            <span className="text-[8px] font-mono font-bold bg-black/50 px-1.5 rounded text-cyan-200 mt-0.5">E</span>
          </button>

          {/* Middle: Through Ball */}
          <button
            type="button"
            onClick={onThroughBall}
            className="w-15 h-15 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-black border border-yellow-200/50 shadow-xl flex flex-col items-center justify-center text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer backdrop-blur-md"
            title="Through Ball [L]"
          >
            <ArrowUp className="w-4 h-4 mb-0.5" />
            <span>THROUGH</span>
            <span className="text-[8px] font-mono font-bold bg-black/50 px-1.5 rounded text-amber-900 mt-0.5">L</span>
          </button>

          {/* Top/Right: Pass */}
          <button
            type="button"
            onClick={onPass}
            className="w-15 h-15 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 hover:from-emerald-500 hover:to-teal-300 active:scale-95 text-white border border-emerald-300/50 shadow-xl flex flex-col items-center justify-center text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer backdrop-blur-md"
            title="Pass to Teammate [K]"
          >
            <ArrowRight className="w-4 h-4 mb-0.5" />
            <span>PASS</span>
            <span className="text-[8px] font-mono font-bold bg-black/50 px-1.5 rounded text-emerald-200 mt-0.5">K</span>
          </button>
        </div>

        {/* Hero Row: Dedicated SHOOT and SLIDE TACKLE Buttons */}
        <div className="w-full flex items-center gap-2 mt-1">
          {/* SLIDE TACKLE BUTTON [J] */}
          <button
            type="button"
            onClick={onTackle}
            className="w-24 h-15 rounded-2xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 active:scale-95 text-white border-2 border-rose-400/60 shadow-xl flex flex-col items-center justify-center text-[10px] font-black uppercase italic tracking-wider transition-all cursor-pointer"
            title="Slide Tackle / Dispossess [J or SPACE]"
          >
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>TACKLE</span>
            </div>
            <span className="text-[8px] font-mono font-bold bg-black/50 px-1.5 rounded text-rose-200 mt-0.5">KEY: J</span>
          </button>

          {/* HERO POWER SHOOT BUTTON [SPACE] */}
          <button
            type="button"
            onClick={handleShootClick}
            onPointerDown={handleShootDown}
            onPointerUp={handleShootUp}
            onPointerLeave={handleShootUp}
            onPointerCancel={handleShootUp}
            className="relative flex-1 h-15 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 hover:from-red-500 hover:to-orange-400 active:scale-95 text-white border-2 border-red-300/80 shadow-2xl flex flex-col items-center justify-center font-black uppercase italic tracking-wider transition-all cursor-pointer overflow-hidden"
            title="Click to Shoot, or Hold to Charge Power [SPACE]"
          >
            {/* Charge Gauge Fill inside Button */}
            {shotCharge > 0 && (
              <div
                className="absolute inset-0 bg-yellow-400/40 transition-all pointer-events-none"
                style={{ width: `${shotCharge * 100}%` }}
              />
            )}
            <div className="relative z-10 flex items-center gap-1.5 text-xs sm:text-sm font-black">
              <span>⚡ SHOOT</span>
              {shotCharge > 0 && (
                <span className="text-yellow-300 font-mono text-[10px]">
                  ({Math.round(shotCharge * 100)}%)
                </span>
              )}
            </div>
            <span className="relative z-10 text-[8px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-yellow-300 mt-0.5">
              SPACE (HOLD TO CHARGE)
            </span>
          </button>
        </div>
      </div>

      {/* ================= PC KEYBOARD CONTROLS GUIDE BAR (BOTTOM DOCKED) ================= */}
      {showControlsGuide ? (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center gap-2 bg-[#090e1c]/95 backdrop-blur-md border border-cyan-500/40 px-3.5 py-1.5 rounded-2xl shadow-2xl text-[10px] text-gray-300 font-mono">
          <div className="flex items-center gap-1 text-cyan-400 font-black tracking-wider uppercase">
            <Keyboard className="w-3.5 h-3.5" />
            <span>PC Keys:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-gray-800 text-cyan-300 font-bold border border-gray-700">W A S D</span>
              <span className="text-gray-400">/</span>
              <span className="px-1.5 py-0.5 rounded bg-gray-800 text-cyan-300 font-bold border border-gray-700">↑ ↓ ← →</span>
              <span className="text-gray-400">Move</span>
            </div>

            <span className="text-gray-600">|</span>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 font-bold border border-red-800/60">SPACE</span>
              <span className="text-gray-400">Shoot (Hold: Power)</span>
            </div>

            <span className="text-gray-600">|</span>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/60">K</span>
              <span className="text-gray-400">Pass</span>
            </div>

            <span className="text-gray-600">|</span>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 font-bold border border-amber-800/60">L</span>
              <span className="text-gray-400">Through</span>
            </div>

            <span className="text-gray-600">|</span>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/60">E</span>
              <span className="text-gray-400">Skill</span>
            </div>

            <span className="text-gray-600">|</span>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 font-bold border border-purple-800/60">Q</span>
              <span className="text-gray-400">Switch</span>
            </div>

            <span className="text-gray-600">|</span>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 font-bold border border-blue-800/60">C</span>
              <span className="text-gray-400">Camera</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowControlsGuide(false)}
            className="ml-1 text-gray-500 hover:text-white text-[9px] px-1 rounded hover:bg-gray-800"
            title="Hide PC Controls Guide (Press G to toggle)"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowControlsGuide(true)}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center gap-1.5 bg-[#090e1c]/80 backdrop-blur border border-gray-700/60 px-3 py-1 rounded-xl text-[9px] text-gray-400 hover:text-cyan-300 font-mono transition-all cursor-pointer"
        >
          <Keyboard className="w-3 h-3 text-cyan-400" />
          <span>Show PC Keys Guide [G]</span>
        </button>
      )}
    </div>
  );
};
