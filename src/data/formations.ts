import { Formation, PlayerCard, Position } from '../types';

export interface FormationSlot {
  id: string;
  label: string;
  pos: Position;
  top: number;
  left: number;
}

export interface FormationMeta {
  id: Formation;
  displayName: string;
  category: '4-Back' | '3-Back' | '5-Back';
  style: 'Attacking' | 'Balanced' | 'Defensive' | 'Counter';
  shortSummary: string;
  tacticalDescription: string;
  keyStrengths: string[];
  slotsSummary: string;
  isPopular?: boolean;
}

export const FORMATION_CONFIGS: Record<Formation, FormationSlot[]> = {
  // === 4-3-3 VARIATIONS ===
  '4-3-3': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 48, left: 28 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 58, left: 50 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 48, left: 72 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],
  '4-3-3 (Holding)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 58, left: 50 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 46, left: 30 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 46, left: 70 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],
  '4-3-3 (Attack)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 52, left: 28 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 52, left: 72 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 36, left: 50 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],
  '4-3-3 (Defend)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 58, left: 36 },
    { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 58, left: 64 },
    { id: 'cm', label: 'CM', pos: 'CM', top: 44, left: 50 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],
  '4-3-3 (False 9)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 58, left: 50 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 48, left: 28 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 48, left: 72 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'cf', label: 'CF', pos: 'CF', top: 26, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],
  '4-3-3 (Flat)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 48, left: 26 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 48, left: 50 },
    { id: 'cm3', label: 'CM', pos: 'CM', top: 48, left: 74 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],

  // === 4-4-2 VARIATIONS ===
  '4-4-2': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 46, left: 16 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 50, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 50, left: 62 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 46, left: 84 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],
  '4-4-2 (Flat)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 46, left: 16 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 50, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 50, left: 62 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 46, left: 84 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],
  '4-1-2-1-2 (Narrow)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 60, left: 50 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 48, left: 30 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 48, left: 70 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 34, left: 50 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],
  '4-1-2-1-2 (Wide)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 60, left: 50 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 46, left: 16 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 46, left: 84 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 34, left: 50 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],

  // === 4-2-3-1 VARIATIONS ===
  '4-2-3-1': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 56, left: 36 },
    { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 56, left: 64 },
    { id: 'lam', label: 'LAM', pos: 'CAM', top: 34, left: 24 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 32, left: 50 },
    { id: 'ram', label: 'RAM', pos: 'CAM', top: 34, left: 76 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
  ],
  '4-2-3-1 (Narrow)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 56, left: 36 },
    { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 56, left: 64 },
    { id: 'lam', label: 'LAM', pos: 'CAM', top: 34, left: 24 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 32, left: 50 },
    { id: 'ram', label: 'RAM', pos: 'CAM', top: 34, left: 76 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
  ],
  '4-2-3-1 (Wide)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 56, left: 36 },
    { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 56, left: 64 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 38, left: 16 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 32, left: 50 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 38, left: 84 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
  ],

  // === MORE 4-BACK FORMATIONS ===
  '4-3-2-1': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 52, left: 26 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 56, left: 50 },
    { id: 'cm3', label: 'CM', pos: 'CM', top: 52, left: 74 },
    { id: 'cf1', label: 'CF', pos: 'CF', top: 32, left: 34 },
    { id: 'cf2', label: 'CF', pos: 'CF', top: 32, left: 66 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
  ],
  '4-2-4': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 52, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 52, left: 62 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 16 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 16, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 16, left: 62 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 84 },
  ],
  '4-1-4-1': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 60, left: 50 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 44, left: 16 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 44, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 44, left: 62 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 44, left: 84 },
    { id: 'st', label: 'ST', pos: 'ST', top: 18, left: 50 },
  ],
  '4-5-1 (Attack)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lb', label: 'LB', pos: 'LB', top: 72, left: 16 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 38 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 74, left: 62 },
    { id: 'rb', label: 'RB', pos: 'RB', top: 72, left: 84 },
    { id: 'cm', label: 'CM', pos: 'CM', top: 56, left: 50 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 42, left: 16 },
    { id: 'cam1', label: 'CAM', pos: 'CAM', top: 32, left: 36 },
    { id: 'cam2', label: 'CAM', pos: 'CAM', top: 32, left: 64 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 42, left: 84 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
  ],

  // === 3-BACK FORMATIONS ===
  '3-5-2': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 26 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 74, left: 74 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 48, left: 14 },
    { id: 'cdm1', label: 'CDM', pos: 'CDM', top: 58, left: 38 },
    { id: 'cdm2', label: 'CDM', pos: 'CDM', top: 58, left: 62 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 36, left: 50 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 48, left: 86 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],
  '3-4-3 (Flat)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 26 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 74, left: 74 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 48, left: 14 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 50, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 50, left: 62 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 48, left: 86 },
    { id: 'lw', label: 'LW', pos: 'LW', top: 22, left: 18 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
    { id: 'rw', label: 'RW', pos: 'RW', top: 22, left: 82 },
  ],
  '3-4-2-1': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 26 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 74, left: 74 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 50, left: 14 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 52, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 52, left: 62 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 50, left: 86 },
    { id: 'cam1', label: 'CAM', pos: 'CAM', top: 32, left: 34 },
    { id: 'cam2', label: 'CAM', pos: 'CAM', top: 32, left: 66 },
    { id: 'st', label: 'ST', pos: 'ST', top: 16, left: 50 },
  ],
  '3-1-4-2': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 74, left: 26 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 75, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 74, left: 74 },
    { id: 'cdm', label: 'CDM', pos: 'CDM', top: 60, left: 50 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 46, left: 14 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 46, left: 36 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 46, left: 64 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 46, left: 86 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],

  // === 5-BACK FORMATIONS ===
  '5-3-2': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lwb', label: 'LWB', pos: 'LWB', top: 68, left: 12 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 76, left: 30 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 77, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 76, left: 70 },
    { id: 'rwb', label: 'RWB', pos: 'RWB', top: 68, left: 88 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 48, left: 30 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 52, left: 50 },
    { id: 'cm3', label: 'CM', pos: 'CM', top: 48, left: 70 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 20, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 20, left: 62 },
  ],
  '5-2-1-2': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lwb', label: 'LWB', pos: 'LWB', top: 68, left: 12 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 76, left: 30 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 77, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 76, left: 70 },
    { id: 'rwb', label: 'RWB', pos: 'RWB', top: 68, left: 88 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 52, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 52, left: 62 },
    { id: 'cam', label: 'CAM', pos: 'CAM', top: 34, left: 50 },
    { id: 'st1', label: 'ST', pos: 'ST', top: 18, left: 38 },
    { id: 'st2', label: 'ST', pos: 'ST', top: 18, left: 62 },
  ],
  '5-4-1 (Flat)': [
    { id: 'gk', label: 'GK', pos: 'GK', top: 88, left: 50 },
    { id: 'lwb', label: 'LWB', pos: 'LWB', top: 68, left: 12 },
    { id: 'cb1', label: 'CB', pos: 'CB', top: 76, left: 30 },
    { id: 'cb2', label: 'CB', pos: 'CB', top: 77, left: 50 },
    { id: 'cb3', label: 'CB', pos: 'CB', top: 76, left: 70 },
    { id: 'rwb', label: 'RWB', pos: 'RWB', top: 68, left: 88 },
    { id: 'lm', label: 'LM', pos: 'LM', top: 46, left: 16 },
    { id: 'cm1', label: 'CM', pos: 'CM', top: 48, left: 38 },
    { id: 'cm2', label: 'CM', pos: 'CM', top: 48, left: 62 },
    { id: 'rm', label: 'RM', pos: 'RM', top: 46, left: 84 },
    { id: 'st', label: 'ST', pos: 'ST', top: 18, left: 50 },
  ],
};

export const FORMATION_METAS: FormationMeta[] = [
  // 4-3-3 Group
  {
    id: '4-3-3 (Attack)',
    displayName: '4-3-3 Attack',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'High-octane wing overloads with a central CAM orchestrator',
    tacticalDescription: 'Pushes the central playmaker high up the pitch directly behind the striker, while the wingers pull opposing fullbacks wide to create devastating half-space channels.',
    keyStrengths: ['Deadly CAM Playmaker', 'Wing Overloads', 'Rapid Counter-Breaks'],
    slotsSummary: '4 DEF • 3 MID (CAM) • 3 ATT',
    isPopular: true,
  },
  {
    id: '4-3-3 (Holding)',
    displayName: '4-3-3 Holding',
    category: '4-Back',
    style: 'Balanced',
    shortSummary: 'Defensive midfield anchor shielding the back four with dual #8s',
    tacticalDescription: 'The gold-standard balanced formation. A dedicated CDM shields the centre-backs while two box-to-box CMs supply wide wingers and a clinical target man.',
    keyStrengths: ['Midfield Balance', 'Solid CDM Shield', 'Pacey Flanks'],
    slotsSummary: '4 DEF • 3 MID (CDM) • 3 ATT',
    isPopular: true,
  },
  {
    id: '4-3-3 (False 9)',
    displayName: '4-3-3 False 9',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'Tiki-taka possession with a dropping CF creating midfield overloads',
    tacticalDescription: 'Inspired by Pep Guardiola’s legendary Barcelona. The CF drops deep into the pocket, dragging defenders out of position while inverted wingers surge into the vacant space.',
    keyStrengths: ['Total Possession', 'Space Creation', 'Inverted Winger Goals'],
    slotsSummary: '4 DEF • 3 MID (CDM) • LW/CF/RW',
    isPopular: false,
  },
  {
    id: '4-3-3 (Defend)',
    displayName: '4-3-3 Defend',
    category: '4-Back',
    style: 'Defensive',
    shortSummary: 'Twin defensive pivots providing impenetrable central security',
    tacticalDescription: 'Deploys two holding midfielders to completely shut down opposing number 10s and through-balls, freeing the front three to attack with direct verticality.',
    keyStrengths: ['Twin CDMs', 'Impenetrable Central Axis', 'Counter Threat'],
    slotsSummary: '4 DEF • 3 MID (2 CDM) • 3 ATT',
    isPopular: false,
  },
  {
    id: '4-3-3 (Flat)',
    displayName: '4-3-3 Flat',
    category: '4-Back',
    style: 'Balanced',
    shortSummary: 'Classic symmetric midfield trio with balanced transitions',
    tacticalDescription: 'Three central midfielders positioned horizontally to control the tempo, shift side-to-side, and feed natural wingers on the break.',
    keyStrengths: ['Midfield Geometry', 'Symmetric Passing', 'Direct Wing Play'],
    slotsSummary: '4 DEF • 3 CMs • 3 ATT',
    isPopular: false,
  },

  // 4-4-2 Group
  {
    id: '4-1-2-1-2 (Narrow)',
    displayName: '4-1-2-1-2 Narrow',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'Suffocating central diamond with lethal dual-striker combinations',
    tacticalDescription: 'The competitive football community’s premier formation. The midfield diamond creates endless 1-2 passing triangles, feeding two lethal strikers inside the penalty box.',
    keyStrengths: ['Fast 1-2 Passing', 'Dual Strikers', 'Midfield Overload'],
    slotsSummary: '4 DEF • CDM/2 CM/CAM • 2 ST',
    isPopular: true,
  },
  {
    id: '4-4-2 (Flat)',
    displayName: '4-4-2 Flat',
    category: '4-Back',
    style: 'Balanced',
    shortSummary: 'The timeless British tactical balance with dual forwards and wingers',
    tacticalDescription: 'Two compact banks of four provide structural discipline across the pitch, with wide midfielders delivering quality crosses to dual target strikers.',
    keyStrengths: ['Two Striker Partnership', 'Compact Banks of 4', 'Wide Delivery'],
    slotsSummary: '4 DEF • LM/2 CM/RM • 2 ST',
    isPopular: true,
  },
  {
    id: '4-1-2-1-2 (Wide)',
    displayName: '4-1-2-1-2 Wide',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'Diamond system expanded to provide true wing width with a playmaker',
    tacticalDescription: 'Combines the central CAM/CDM axis of the diamond with natural LM and RM width, stretching opposing defenses horizontally while maintaining central penetration.',
    keyStrengths: ['Wide Crosses', 'CAM Creator', 'Twin Forwards'],
    slotsSummary: '4 DEF • CDM/LM/RM/CAM • 2 ST',
    isPopular: false,
  },

  // 4-2-3-1 Group
  {
    id: '4-2-3-1 (Narrow)',
    displayName: '4-2-3-1 Narrow',
    category: '4-Back',
    style: 'Balanced',
    shortSummary: 'Triple CAM playmakers orchestrating behind a lethal lone striker',
    tacticalDescription: 'A modern tactical masterpiece. Two holding pivots allow three attacking midfielders (LAM, CAM, RAM) to interchange seamlessly and dissect stubborn defenses.',
    keyStrengths: ['Fluid Playmaking', 'Double Pivot Cover', 'Controlled Possession'],
    slotsSummary: '4 DEF • 2 CDM • 3 CAM • 1 ST',
    isPopular: true,
  },
  {
    id: '4-2-3-1 (Wide)',
    displayName: '4-2-3-1 Wide',
    category: '4-Back',
    style: 'Balanced',
    shortSummary: 'Solid double pivot supporting authentic wide wingers and a #10',
    tacticalDescription: 'Maintains defensive integrity with two CDMs while utilizing orthodox LM and RM players to deliver pinpoint crosses to a clinical center-forward.',
    keyStrengths: ['Wing Speed', 'Defensive Stability', 'Target Man Supply'],
    slotsSummary: '4 DEF • 2 CDM • LM/CAM/RM • 1 ST',
    isPopular: false,
  },

  // More 4-Back
  {
    id: '4-3-2-1',
    displayName: '4-3-2-1 Christmas Tree',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'Carlo Ancelotti’s legendary AC Milan layout with twin shadow forwards',
    tacticalDescription: 'Three combative central midfielders form an iron platform for two creative shadow center-forwards buzzing behind a deadly central marksman.',
    keyStrengths: ['Central Domination', 'Dual Inside Forwards', 'Midfield Power'],
    slotsSummary: '4 DEF • 3 CMs • 2 CF • 1 ST',
    isPopular: true,
  },
  {
    id: '4-2-4',
    displayName: '4-2-4 Ultra Attack',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'All-out offensive warfare with four frontline attackers swarming the box',
    tacticalDescription: 'Famous from Brazil’s 1970 World Cup triumph. Overwhelms opposing defenses with sheer numbers—wingers and two central strikers pressing aggressively.',
    keyStrengths: ['4 Attackers', 'High Goal Potential', 'Relentless Pressure'],
    slotsSummary: '4 DEF • 2 CMs • LW/2 ST/RW',
    isPopular: false,
  },
  {
    id: '4-1-4-1',
    displayName: '4-1-4-1 Press',
    category: '4-Back',
    style: 'Balanced',
    shortSummary: 'Five-man midfield grid engineered for high pressing and turnovers',
    tacticalDescription: 'A single deep-lying playmaker anchors a high-energy four-man midfield line that presses aggressively to win the ball back in high-value zones.',
    keyStrengths: ['High Pressing', 'Pass Interceptions', 'Midfield Density'],
    slotsSummary: '4 DEF • CDM • LM/2 CM/RM • 1 ST',
    isPopular: false,
  },
  {
    id: '4-5-1 (Attack)',
    displayName: '4-5-1 Attack',
    category: '4-Back',
    style: 'Attacking',
    shortSummary: 'Twin attacking midfielders penetrating deep into the opponent box',
    tacticalDescription: 'Two dynamic CAMs make third-man runs past the lone striker, turning a conservative five-man midfield into an overwhelming attacking wave.',
    keyStrengths: ['Dual CAM Surges', 'Late Box Runs', 'Total Control'],
    slotsSummary: '4 DEF • CM • LM/2 CAM/RM • 1 ST',
    isPopular: false,
  },

  // 3-Back Group
  {
    id: '3-5-2',
    displayName: '3-5-2 Italian Masterclass',
    category: '3-Back',
    style: 'Balanced',
    shortSummary: 'Inter Milan & Juventus tactical blueprint with dual strikers & wingbacks',
    tacticalDescription: 'Three dominant central defenders allow wide midfielders to roam the entire touchline. Twin holding midfielders feed a playmaker and two predatory strikers.',
    keyStrengths: ['Touchline Dominance', 'Dual Strikers', 'Solid 3 CB Shield'],
    slotsSummary: '3 CB • 2 CDM • LM/CAM/RM • 2 ST',
    isPopular: true,
  },
  {
    id: '3-4-2-1',
    displayName: '3-4-2-1 Modern Dual #10s',
    category: '3-Back',
    style: 'Attacking',
    shortSummary: 'Xabi Alonso’s Leverkusen & Conte system with twin inside playmakers',
    tacticalDescription: 'The modern European revelation. Wingbacks supply the width while two inside playmakers operate in the half-spaces directly supporting the central striker.',
    keyStrengths: ['Half-Space Exploitation', 'Twin #10 Magic', 'High Transition Speed'],
    slotsSummary: '3 CB • LM/2 CM/RM • 2 CAM • 1 ST',
    isPopular: true,
  },
  {
    id: '3-4-3 (Flat)',
    displayName: '3-4-3 Flat Total Football',
    category: '3-Back',
    style: 'Attacking',
    shortSummary: 'Johan Cruyff’s Total Football framework for maximum pitch width',
    tacticalDescription: 'Stretches the opposition to breaking point with dual wingers and wide midfielders creating continuous 2v1 overloads down both touchlines.',
    keyStrengths: ['Total Pitch Width', '2v1 Flank Overloads', 'Cruyff Philosophy'],
    slotsSummary: '3 CB • LM/2 CM/RM • LW/ST/RW',
    isPopular: false,
  },
  {
    id: '3-1-4-2',
    displayName: '3-1-4-2 Regista',
    category: '3-Back',
    style: 'Attacking',
    shortSummary: 'Deep-lying playmaker quarterbacking four advanced midfield runners',
    tacticalDescription: 'A single regista dictates tempo from deep while four midfielders surge forward to overwhelm the defensive line alongside two central strikers.',
    keyStrengths: ['Regista Distribution', '4 Surging Runners', 'Vertical Depth'],
    slotsSummary: '3 CB • CDM • LM/2 CM/RM • 2 ST',
    isPopular: false,
  },

  // 5-Back Group
  {
    id: '5-3-2',
    displayName: '5-3-2 Iron Fortress',
    category: '5-Back',
    style: 'Defensive',
    shortSummary: 'Overlapping wingbacks backed by an unbreakable three-center-back core',
    tacticalDescription: 'Combines maximum defensive security with flying wingbacks who transition the team from a 5-man low block to a 3-5-2 counter in seconds.',
    keyStrengths: ['Iron Defense', 'Overlapping Wingbacks', 'Lethal Breakouts'],
    slotsSummary: '3 CB • LWB/RWB • 3 CMs • 2 ST',
    isPopular: true,
  },
  {
    id: '5-2-1-2',
    displayName: '5-2-1-2 Counter Strike',
    category: '5-Back',
    style: 'Counter',
    shortSummary: 'Unbeatable defensive spine with a CAM releasing two rapid strikers',
    tacticalDescription: 'Absorbs heavy opponent pressure before unleashing devastating through-balls from the central CAM to two fast counter-attacking strikers.',
    keyStrengths: ['Clinical Counters', 'CAM Long Balls', 'Low-Block Resilience'],
    slotsSummary: '3 CB • LWB/RWB • 2 CM • CAM • 2 ST',
    isPopular: true,
  },
  {
    id: '5-4-1 (Flat)',
    displayName: '5-4-1 Flat Lockdown',
    category: '5-Back',
    style: 'Defensive',
    shortSummary: 'The ultimate defensive wall with two deep banks of 5 and 4',
    tacticalDescription: 'Extremely difficult to break down. Stifles opponent attacks with an impenetrable defensive web and relies on wingers bursting forward on the break.',
    keyStrengths: ['Clean Sheet Machine', '5-Man Defensive Wall', 'Direct Outlet Striker'],
    slotsSummary: '3 CB • LWB/RWB • LM/2 CM/RM • 1 ST',
    isPopular: false,
  },
];

/**
 * Intelligent squad transition when changing formation:
 * Preserves as many active starters as possible in suitable positions.
 */
export function smartTransitionSquadSlots(
  currentSlots: Record<string, PlayerCard | null>,
  targetFormation: Formation,
  inventory: PlayerCard[],
  activeBench: (PlayerCard | null)[]
): {
  newSlots: Record<string, PlayerCard | null>;
  newBench: (PlayerCard | null)[];
} {
  const targetConfig = FORMATION_CONFIGS[targetFormation] || FORMATION_CONFIGS['4-3-3'];
  const oldStarters = Object.values(currentSlots).filter(Boolean) as PlayerCard[];

  const usedCardIds = new Set<string>();
  const newSlots: Record<string, PlayerCard | null> = {};

  // 1. Direct match: GK always to GK
  const gkSlot = targetConfig.find(s => s.pos === 'GK');
  if (gkSlot) {
    const oldGk = oldStarters.find(c => c.position === 'GK');
    if (oldGk) {
      newSlots[gkSlot.id] = oldGk;
      usedCardIds.add(oldGk.id);
    }
  }

  // 2. Direct exact-position match from remaining old starters
  targetConfig.forEach(slot => {
    if (newSlots[slot.id]) return;
    const match = oldStarters.find(c => !usedCardIds.has(c.id) && c.position === slot.pos);
    if (match) {
      newSlots[slot.id] = match;
      usedCardIds.add(match.id);
    }
  });

  // 3. Secondary positions match from remaining old starters
  targetConfig.forEach(slot => {
    if (newSlots[slot.id]) return;
    const match = oldStarters.find(c => !usedCardIds.has(c.id) && c.secondaryPositions?.includes(slot.pos as any));
    if (match) {
      newSlots[slot.id] = match;
      usedCardIds.add(match.id);
    }
  });

  // 4. Positional family match (DEF -> DEF, MID -> MID, ATT -> ATT) from remaining old starters
  const defenders = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
  const midfielders = ['CM', 'CDM', 'CAM', 'LM', 'RM'];
  const attackers = ['ST', 'CF', 'RW', 'LW'];

  targetConfig.forEach(slot => {
    if (newSlots[slot.id]) return;
    let match: PlayerCard | undefined;
    if (defenders.includes(slot.pos)) {
      match = oldStarters.find(c => !usedCardIds.has(c.id) && defenders.includes(c.position));
    } else if (midfielders.includes(slot.pos)) {
      match = oldStarters.find(c => !usedCardIds.has(c.id) && midfielders.includes(c.position));
    } else if (attackers.includes(slot.pos)) {
      match = oldStarters.find(c => !usedCardIds.has(c.id) && attackers.includes(c.position));
    }
    if (match) {
      newSlots[slot.id] = match;
      usedCardIds.add(match.id);
    }
  });

  // 5. If any target slot is still unfilled, check bench/inventory for best available
  targetConfig.forEach(slot => {
    if (newSlots[slot.id]) return;
    // Check old starters first
    const leftoverOldStarter = oldStarters.find(c => !usedCardIds.has(c.id));
    if (leftoverOldStarter) {
      newSlots[slot.id] = leftoverOldStarter;
      usedCardIds.add(leftoverOldStarter.id);
      return;
    }

    // Check bench
    const benchMatch = activeBench.find(b => b && !usedCardIds.has(b.id) && (b.position === slot.pos || b.secondaryPositions?.includes(slot.pos as any)));
    if (benchMatch) {
      newSlots[slot.id] = benchMatch;
      usedCardIds.add(benchMatch.id);
      return;
    }

    // Check inventory
    const invMatch = inventory.find(c => !usedCardIds.has(c.id) && c.position === slot.pos);
    if (invMatch) {
      newSlots[slot.id] = invMatch;
      usedCardIds.add(invMatch.id);
      return;
    }

    newSlots[slot.id] = null;
  });

  // 6. Update bench: Any old starter that was displaced from starting XI gets placed on the bench
  const displacedStarters = oldStarters.filter(c => !usedCardIds.has(c.id));
  const newBench: (PlayerCard | null)[] = [...activeBench];

  // Remove any player from bench that was promoted to starter
  for (let i = 0; i < newBench.length; i++) {
    if (newBench[i] && usedCardIds.has(newBench[i]!.id)) {
      newBench[i] = null;
    }
  }

  // Insert displaced starters into open bench slots
  displacedStarters.forEach(displaced => {
    const emptyIdx = newBench.findIndex(b => b === null);
    if (emptyIdx !== -1) {
      newBench[emptyIdx] = displaced;
    }
  });

  while (newBench.length < 7) {
    newBench.push(null);
  }

  return {
    newSlots,
    newBench: newBench.slice(0, 7),
  };
}
