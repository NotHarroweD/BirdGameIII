
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
  stage?: number; // For COMBO: 1 (Power), 2 (Absorb)
  storedMultiplier?: number; // Result of stage 1
  reflexTargets?: { id: number; x: number; y: number; value: number; hit: boolean }[]; // For REFLEX
}
