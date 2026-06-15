import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { BeaconTower, Weather, EnemyLevel, SimulationState, SignalPath, BlindSpot, TowerDelayInfo } from '../types';
import { WEATHER_TYPES, ENEMY_LEVELS, DEFAULT_TOWER_CONFIG } from '../constants';
import {
  buildAdjacencyList,
  findMultiplePaths,
  findBlindSpots,
  analyzeTowerDelays,
  isCodeUnique,
} from '../utils/pathfinding';

interface SimulationStore {
  towers: BeaconTower[];
  selectedTowerId: string | null;
  startTowerId: string | null;
  endTowerId: string | null;
  weather: Weather;
  enemyLevel: EnemyLevel;
  simulation: SimulationState;
  paths: SignalPath[];
  selectedPathId: string | null;
  blindSpots: BlindSpot[];
  towerDelays: TowerDelayInfo[];
  isAddingTower: boolean;

  addTower: (x: number, y: number) => void;
  updateTower: (id: string, updates: Partial<BeaconTower>) => void;
  deleteTower: (id: string) => void;
  selectTower: (id: string | null) => void;
  setStartTower: (id: string | null) => void;
  setEndTower: (id: string | null) => void;
  setWeather: (weather: Weather) => void;
  setEnemyLevel: (level: EnemyLevel) => void;
  setIsAddingTower: (isAdding: boolean) => void;

  calculatePaths: () => void;
  selectPath: (pathId: string) => void;

  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setSimulationStep: (step: number) => void;
  advanceSimulation: (deltaTime: number) => void;

  moveTower: (id: string, x: number, y: number, recalculate?: boolean) => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  towers: [],
  selectedTowerId: null,
  startTowerId: null,
  endTowerId: null,
  weather: WEATHER_TYPES[0],
  enemyLevel: ENEMY_LEVELS[0],
  simulation: {
    status: 'idle',
    currentStep: 0,
    currentTime: 0,
    activeTowers: [],
    currentPath: [],
    signalProgress: 0,
  },
  paths: [],
  selectedPathId: null,
  blindSpots: [],
  towerDelays: [],
  isAddingTower: false,

  addTower: (x: number, y: number) => {
    const { towers } = get();
    let codeNum = 1;
    while (!isCodeUnique(`FT-${codeNum.toString().padStart(3, '0')}`, towers)) {
      codeNum++;
    }
    const code = `FT-${codeNum.toString().padStart(3, '0')}`;

    const newTower: BeaconTower = {
      id: uuidv4(),
      name: `烽火台 ${codeNum}`,
      code,
      x,
      y,
      visualRange: DEFAULT_TOWER_CONFIG.visualRange,
      garrisonCount: DEFAULT_TOWER_CONFIG.garrisonCount,
      signalDelay: DEFAULT_TOWER_CONFIG.signalDelay,
      isActive: true,
    };

    set((state) => ({
      towers: [...state.towers, newTower],
      isAddingTower: false,
      selectedTowerId: newTower.id,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
    }));
    get().calculatePaths();
  },

  updateTower: (id: string, updates: Partial<BeaconTower>) => {
    set((state) => {
      const towers = state.towers.map((t) => (t.id === id ? { ...t, ...updates } : t));
      return {
        towers,
        simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
      };
    });
    get().calculatePaths();
  },

  deleteTower: (id: string) => {
    set((state) => {
      const towers = state.towers.filter((t) => t.id !== id);
      return {
        towers,
        selectedTowerId: state.selectedTowerId === id ? null : state.selectedTowerId,
        startTowerId: state.startTowerId === id ? null : state.startTowerId,
        endTowerId: state.endTowerId === id ? null : state.endTowerId,
        simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
      };
    });
    get().calculatePaths();
  },

  selectTower: (id: string | null) => {
    set({ selectedTowerId: id });
  },

  setStartTower: (id: string | null) => {
    set((state) => ({
      startTowerId: id,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
    }));
    get().calculatePaths();
  },

  setEndTower: (id: string | null) => {
    set((state) => ({
      endTowerId: id,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
    }));
    get().calculatePaths();
  },

  setWeather: (weather: Weather) => {
    set((state) => ({
      weather,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
    }));
    get().calculatePaths();
  },

  setEnemyLevel: (level: EnemyLevel) => {
    set((state) => ({
      enemyLevel: level,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
    }));
    get().calculatePaths();
  },

  setIsAddingTower: (isAdding: boolean) => {
    set({ isAddingTower: isAdding });
  },

  calculatePaths: () => {
    const { towers, startTowerId, endTowerId, weather, enemyLevel } = get();

    if (!startTowerId || !endTowerId) {
      set({ paths: [], blindSpots: [], towerDelays: [], selectedPathId: null });
      return;
    }

    const adjacency = buildAdjacencyList(towers, weather.visibilityFactor, enemyLevel.delayFactor);
    const paths = findMultiplePaths(startTowerId, endTowerId, adjacency, 3);
    const blindSpots = findBlindSpots(towers, startTowerId, adjacency);
    const towerDelays = analyzeTowerDelays(towers, paths, 5);

    set({
      paths,
      blindSpots,
      towerDelays,
      selectedPathId: paths.length > 0 ? paths[0].id : null,
    });
  },

  selectPath: (pathId: string) => {
    set({ selectedPathId: pathId });
  },

  startSimulation: () => {
    const { paths, selectedPathId } = get();
    const selectedPath = paths.find((p) => p.id === selectedPathId);

    if (!selectedPath || selectedPath.towers.length < 2) {
      return;
    }

    set(() => ({
      simulation: {
        status: 'running',
        currentStep: 0,
        currentTime: 0,
        activeTowers: [selectedPath.towers[0]],
        currentPath: selectedPath.towers,
        signalProgress: 0,
      },
    }));
  },

  pauseSimulation: () => {
    set((state) => ({
      simulation: { ...state.simulation, status: 'paused' },
    }));
  },

  resumeSimulation: () => {
    set((state) => ({
      simulation: { ...state.simulation, status: 'running' },
    }));
  },

  stopSimulation: () => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        status: 'idle',
        currentStep: 0,
        currentTime: 0,
        activeTowers: [],
        signalProgress: 0,
      },
    }));
  },

  resetSimulation: () => {
    set(() => ({
      simulation: {
        status: 'idle',
        currentStep: 0,
        currentTime: 0,
        activeTowers: [],
        currentPath: [],
        signalProgress: 0,
      },
    }));
  },

  setSimulationStep: (step: number) => {
    const { paths, selectedPathId } = get();
    const selectedPath = paths.find((p) => p.id === selectedPathId);

    if (!selectedPath) return;

    const clampedStep = Math.max(0, Math.min(step, selectedPath.towers.length - 1));
    const activeTowers = selectedPath.towers.slice(0, clampedStep + 1);

    set((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: clampedStep,
        activeTowers,
      },
    }));
  },

  advanceSimulation: (deltaTime: number) => {
    const state = get();
    if (state.simulation.status !== 'running') return;

    const selectedPath = state.paths.find((p) => p.id === state.selectedPathId);
    if (!selectedPath) return;

    const { currentStep, currentTime, activeTowers } = state.simulation;

    if (currentStep >= selectedPath.towers.length - 1) {
      set((state) => ({
        simulation: {
          ...state.simulation,
          status: 'completed',
          signalProgress: 1,
        },
      }));
      return;
    }

    const currentTowerId = selectedPath.towers[currentStep];
    const currentTower = state.towers.find((t) => t.id === currentTowerId);

    if (!currentTower) return;

    const effectiveDelay = currentTower.signalDelay * state.enemyLevel.delayFactor;
    const newTime = currentTime + deltaTime;

    if (newTime >= effectiveDelay) {
      const nextStep = currentStep + 1;
      const nextTowerId = selectedPath.towers[nextStep];

      set((state) => ({
        simulation: {
          ...state.simulation,
          currentStep: nextStep,
          currentTime: newTime - effectiveDelay,
          activeTowers: [...activeTowers, nextTowerId],
          signalProgress: nextStep / (selectedPath.towers.length - 1),
        },
      }));
    } else {
      const progress = currentStep / (selectedPath.towers.length - 1);
      const stepProgress = newTime / effectiveDelay;
      const totalProgress = progress + stepProgress / (selectedPath.towers.length - 1);

      set((state) => ({
        simulation: {
          ...state.simulation,
          currentTime: newTime,
          signalProgress: Math.min(1, totalProgress),
        },
      }));
    }
  },

  moveTower: (id: string, x: number, y: number, recalculate: boolean = true) => {
    set((state) => {
      const towers = state.towers.map((t) => (t.id === id ? { ...t, x, y } : t));
      return {
        towers,
        simulation: recalculate
          ? { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 }
          : state.simulation,
      };
    });
    if (recalculate) {
      get().calculatePaths();
    }
  },
}));
