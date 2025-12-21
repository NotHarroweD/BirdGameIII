
import { Move, SkillCheckType } from '../../types';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale?: number;
  target: 'player' | 'opponent';
  icon?: 'shield';
  customType?: 'rot-eater';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

export interface BoneData {
    id: number;
    x: number;
    y: number;
    collected: boolean;
    vx: number;
    vy: number;
}

export interface ActiveSkillCheck {
  type: SkillCheckType;
  move: Move;
  startTime: number;
  progress: number;
  isMovingZone?: boolean;
  drainBones?: BoneData[];
}
