export interface BeaconTower {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  visualRange: number;
  garrisonCount: number;
  signalDelay: number;
  isActive: boolean;
}

export interface Weather {
  id: string;
  name: string;
  visibilityFactor: number;
  description: string;
  icon: string;
}

export interface EnemyLevel {
  id: string;
  name: string;
  signalType: 'smoke' | 'fire' | 'both';
  priority: number;
  description: string;
  delayFactor: number;
}

export interface SignalPath {
  id: string;
  towers: string[];
  totalTime: number;
  totalDistance: number;
  isOptimal: boolean;
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentStep: number;
  currentTime: number;
  activeTowers: string[];
  currentPath: string[];
  signalProgress: number;
}

export interface BlindSpot {
  towerId: string;
  reason: string;
}

export interface TowerDelayInfo {
  towerId: string;
  delay: number;
  isSevere: boolean;
}
