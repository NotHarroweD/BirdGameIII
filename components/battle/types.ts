import { Move, SkillCheckType } from '../../types';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale?: number;
  target: 'player' | 'opponent';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

export interface ActiveSkillCheck {
  type: SkillCheckType;
  move: Move;
  startTime: number;
  progress: number;
  direction?: 1 | -1;
  stage?: number; 
  maxStages?: number;
  targetZoneStart?: number;
  targetZoneWidth?: number;
  accumulatedMultiplier?: number;
  storedMultiplier?: number; 
  currentCombo?: number;
  hitMarkers?: { id: number; progress: number }[];
  isFlashing?: boolean;
  flashColor?: 'white' | 'red' | 'emerald' | 'yellow';
  hitFeedback?: { text: string; color: string; id: number; intensity: number };
  reflexTargets?: { id: number; x: number; y: number; value: number; hit: boolean }[];
  isMovingZone?: boolean;
  hitResult?: { color: string; intensity: number; id: number };
  flickDirection?: number; 
  flickStartPos?: { x: number, y: number };
  flickCurrentPos?: { x: number, y: number };
  drainBones?: { id: number; x: number; y: number; collected: boolean; value: number; vx: number; vy: number }[];
}