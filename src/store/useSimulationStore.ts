import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  BeaconTower,
  Weather,
  EnemyLevel,
  SimulationState,
  SignalPath,
  BlindSpot,
  TowerDelayInfo,
  EnemySource,
  SignalMission,
  GarrisonDispatch,
  WeatherEvent,
  HistoryEvent,
  StateSnapshot,
  EvaluationResult,
  Warning,
  ComprehensiveAssessment,
} from '../types';
import { WEATHER_TYPES, ENEMY_LEVELS, DEFAULT_TOWER_CONFIG, WEATHER_CHANGE_INTERVAL, SNAPSHOT_INTERVAL, TOWER_FAILURE_PROBABILITY, TOWER_RECOVERY_TIME } from '../constants';
import {
  buildAdjacencyList,
  findPathByStrategy,
  findBlindSpots,
  analyzeTowerDelays,
  isCodeUnique,
  canTransmit,
} from '../utils/pathfinding';
import {
  createEnemySource,
  detectConflicts,
  mergeEnemySources,
  createSignalMission,
  createHistoryEvent,
  findWeakTowers,
  getEffectiveDelay,
} from '../utils/enemyIntelligence';
import {
  findOptimalDispatch,
  findAutoDispatchCandidates,
  applyDispatchEffect,
  revertDispatchEffect,
} from '../utils/garrisonDispatch';
import {
  createWeatherEvent,
  getWeatherForecast,
  applyWeatherEffect,
  recoverFromWeather,
  recalculatePathsOnWeatherChange,
  findAlternativePathForMission,
} from '../utils/weatherEngine';
import {
  createStateSnapshot,
  findNearestSnapshot,
  calculateEvaluationResult,
} from '../utils/evaluationEngine';
import {
  generateWarnings,
  updateWarningEvolution,
  calculateComprehensiveAssessment,
  acknowledgeWarning as ackWarning,
  resolveWarning as resWarning,
} from '../utils/warningEngine';

interface SimulationStore {
  towers: BeaconTower[];
  selectedTowerId: string | null;
  startTowerId: string | null;
  endTowerId: string | null;
  enemyLevel: EnemyLevel;
  weather: Weather;
  weatherEvents: WeatherEvent[];
  weatherForecast: WeatherEvent[];
  enemySources: EnemySource[];
  missions: SignalMission[];
  dispatches: GarrisonDispatch[];
  historyEvents: HistoryEvent[];
  snapshots: StateSnapshot[];
  evaluationResult: EvaluationResult | null;
  warnings: Warning[];
  lastAssessment: ComprehensiveAssessment | null;
  showWarningCenter: boolean;
  lastNewWarningIds: string[];
  simulation: SimulationState;
  paths: SignalPath[];
  selectedPathId: string | null;
  blindSpots: BlindSpot[];
  towerDelays: TowerDelayInfo[];
  isAddingTower: boolean;
  isDynamicWeather: boolean;
  autoDispatch: boolean;
  showEvaluation: boolean;

  addTower: (x: number, y: number) => void;
  updateTower: (id: string, updates: Partial<BeaconTower>) => void;
  deleteTower: (id: string) => void;
  selectTower: (id: string | null) => void;
  setWeather: (weather: Weather) => void;
  setIsAddingTower: (isAdding: boolean) => void;
  setDynamicWeather: (enabled: boolean) => void;
  setAutoDispatch: (enabled: boolean) => void;
  setShowEvaluation: (show: boolean) => void;
  setShowWarningCenter: (show: boolean) => void;
  runWarningAssessment: () => void;
  acknowledgeWarning: (warningId: string) => void;
  resolveWarning: (warningId: string) => void;
  setStartTower: (id: string | null) => void;
  setEndTower: (id: string | null) => void;
  setEnemyLevel: (level: EnemyLevel) => void;
  setSimulationStep: (step: number) => void;

  addEnemySource: (level: EnemyLevel, startTowerId: string, endTowerId: string) => void;
  removeEnemySource: (id: string) => void;
  mergeEnemySourcesById: (sourceIds: string[]) => void;
  calculatePathsForSource: (sourceId: string) => void;

  dispatchGarrison: (fromTowerId: string, toTowerId: string, count: number) => void;
  cancelDispatch: (dispatchId: string) => void;

  addHistoryEvent: (type: HistoryEvent['type'], data: Record<string, unknown>, description: string) => void;
  takeSnapshot: () => void;

  calculatePaths: () => void;
  selectPath: (pathId: string) => void;

  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  advanceSimulation: (deltaTime: number) => void;

  startReplay: () => void;
  stopReplay: () => void;
  setReplayTime: (time: number) => void;
  setReplaySpeed: (speed: number) => void;
  seekReplay: (time: number) => void;

  moveTower: (id: string, x: number, y: number, recalculate?: boolean) => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  towers: [],
  selectedTowerId: null,
  startTowerId: null,
  endTowerId: null,
  enemyLevel: ENEMY_LEVELS[0],
  weather: WEATHER_TYPES[0],
  weatherEvents: [],
  weatherForecast: [],
  enemySources: [],
  missions: [],
  dispatches: [],
  historyEvents: [],
  snapshots: [],
  evaluationResult: null,
  warnings: [],
  lastAssessment: null,
  showWarningCenter: false,
  lastNewWarningIds: [],
  simulation: {
    status: 'idle',
    currentStep: 0,
    currentTime: 0,
    activeTowers: [],
    currentPath: [],
    signalProgress: 0,
    globalTime: 0,
    isReplaying: false,
    replayTime: 0,
    replaySpeed: 1,
  },
  paths: [],
  selectedPathId: null,
  blindSpots: [],
  towerDelays: [],
  isAddingTower: false,
  isDynamicWeather: true,
  autoDispatch: true,
  showEvaluation: false,

  addTower: (x: number, y: number) => {
    const { towers } = get();
    let codeNum = 1;
    while (!isCodeUnique(`FT-${codeNum.toString().padStart(3, '0')}`, towers)) {
      codeNum++;
    }
    const code = `FT-${codeNum.toString().padStart(3, '0')}`;
    const garrison = DEFAULT_TOWER_CONFIG.garrisonCount;

    const newTower: BeaconTower = {
      id: uuidv4(),
      name: `烽火台 ${codeNum}`,
      code,
      x,
      y,
      visualRange: DEFAULT_TOWER_CONFIG.visualRange,
      garrisonCount: garrison,
      baseGarrisonCount: garrison,
      signalDelay: DEFAULT_TOWER_CONFIG.signalDelay,
      isActive: true,
    };

    set((state) => ({
      towers: [...state.towers, newTower],
      isAddingTower: false,
      selectedTowerId: newTower.id,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0, globalTime: 0 },
    }));
    get().calculatePaths();
  },

  updateTower: (id: string, updates: Partial<BeaconTower>) => {
    set((state) => {
      const towers = state.towers.map((t) => (t.id === id ? { ...t, ...updates } : t));
      return {
        towers,
        simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0, globalTime: 0 },
      };
    });
    get().calculatePaths();
  },

  deleteTower: (id: string) => {
    set((state) => {
      const towers = state.towers.filter((t) => t.id !== id);
      const enemySources = state.enemySources.map(s => 
        s.startTowerId === id || s.endTowerId === id 
          ? { ...s, status: 'failed' as const }
          : s
      );
      return {
        towers,
        selectedTowerId: state.selectedTowerId === id ? null : state.selectedTowerId,
        enemySources,
        simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0, globalTime: 0 },
      };
    });
    get().calculatePaths();
  },

  selectTower: (id: string | null) => {
    set({ selectedTowerId: id });
  },

  setWeather: (weather: Weather) => {
    const globalTime = get().simulation.globalTime;
    const oldWeather = get().weather;
    const towers = get().towers;
    
    const weatherEvent = createWeatherEvent(weather, globalTime, 30, towers, 'manual');
    
    let updatedTowers = towers;
    if (oldWeather.visibilityFactor < 0.8) {
      const oldEvent = get().weatherEvents.find(e => e.weather.id === oldWeather.id && e.startTime <= globalTime);
      if (oldEvent) {
        updatedTowers = recoverFromWeather(towers, oldEvent.affectedTowers);
      }
    }
    
    if (weather.visibilityFactor < 0.8) {
      updatedTowers = applyWeatherEffect(updatedTowers, weather, weatherEvent.affectedTowers);
    }

    get().addHistoryEvent('weather_change', { oldWeather: oldWeather.id, newWeather: weather.id }, `天气变化：${oldWeather.name} → ${weather.name}`);

    set((state) => ({
      weather,
      weatherEvents: [...state.weatherEvents, weatherEvent],
      towers: updatedTowers,
      simulation: { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0 },
    }));
    get().calculatePaths();
  },

  setIsAddingTower: (isAdding: boolean) => {
    set({ isAddingTower: isAdding });
  },

  setDynamicWeather: (enabled: boolean) => {
    set({ isDynamicWeather: enabled });
  },

  setAutoDispatch: (enabled: boolean) => {
    set({ autoDispatch: enabled });
  },

  setShowEvaluation: (show: boolean) => {
    set({ showEvaluation: show });
  },

  setShowWarningCenter: (show: boolean) => {
    set({ showWarningCenter: show });
  },

  runWarningAssessment: () => {
    const state = get();
    const ctx = {
      towers: state.towers,
      missions: state.missions,
      enemySources: state.enemySources,
      dispatches: state.dispatches,
      weather: state.weather,
      historyEvents: state.historyEvents,
      snapshots: state.snapshots,
      blindSpots: state.blindSpots,
      currentTime: state.simulation.globalTime,
    };

    const updatedWarnings = state.warnings.map(w => updateWarningEvolution(w, ctx));
    const newWarnings = generateWarnings(ctx, updatedWarnings);
    const allWarnings = [...updatedWarnings, ...newWarnings];
    const assessment = calculateComprehensiveAssessment(ctx, allWarnings);
    const newWarningIds = newWarnings.map(w => w.id);

    set({
      warnings: allWarnings,
      lastAssessment: assessment,
      lastNewWarningIds: newWarningIds,
    });
  },

  acknowledgeWarning: (warningId: string) => {
    const state = get();
    const warning = state.warnings.find(w => w.id === warningId);
    if (!warning) return;

    const updated = ackWarning(warning, state.simulation.globalTime);
    set({
      warnings: state.warnings.map(w => w.id === warningId ? updated : w),
    });
  },

  resolveWarning: (warningId: string) => {
    const state = get();
    const warning = state.warnings.find(w => w.id === warningId);
    if (!warning) return;

    const updated = resWarning(warning, state.simulation.globalTime);
    set({
      warnings: state.warnings.map(w => w.id === warningId ? updated : w),
    });
  },

  setStartTower: (id: string | null) => {
    set({ startTowerId: id });
  },

  setEndTower: (id: string | null) => {
    set({ endTowerId: id });
  },

  setEnemyLevel: (level: EnemyLevel) => {
    set({ enemyLevel: level });
  },

  setSimulationStep: (step: number) => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: step,
      },
    }));
  },

  addEnemySource: (level: EnemyLevel, startTowerId: string, endTowerId: string) => {
    const { towers, enemySources } = get();
    const newSource = createEnemySource(level, startTowerId, endTowerId, towers, enemySources);
    const globalTime = get().simulation.globalTime;

    const conflicts = detectConflicts(newSource, enemySources, towers);
    let finalSource = newSource;
    let mergedIds: string[] = [];

    if (conflicts.length > 0) {
      const mergeResult = mergeEnemySources([newSource, ...conflicts], globalTime);
      if (mergeResult) {
        finalSource = mergeResult.mergedSource;
        mergedIds = mergeResult.mergedIds;
        get().addHistoryEvent('enemy_merged', { mergedIds, newId: finalSource.id }, 
          `合并敌情：${conflicts.map(c => c.name).join(', ')} 合并为 ${finalSource.name}`);
      }
    }

    get().addHistoryEvent('enemy_detected', { sourceId: finalSource.id, level: level.id }, 
      `发现敌情：${finalSource.name} (${level.name})`);

    set((state) => ({
      enemySources: [
        ...state.enemySources.map(s => 
          mergedIds.includes(s.id) ? { ...s, status: 'merged' as const, mergedInto: finalSource.id } : s
        ),
        finalSource,
      ],
    }));

    get().calculatePathsForSource(finalSource.id);
  },

  removeEnemySource: (id: string) => {
    set((state) => ({
      enemySources: state.enemySources.filter(s => s.id !== id),
      missions: state.missions.filter(m => m.enemySourceId !== id),
    }));
    get().calculatePaths();
  },

  mergeEnemySourcesById: (sourceIds: string[]) => {
    const { enemySources, simulation } = get();
    const sourcesToMerge = enemySources.filter(s => sourceIds.includes(s.id));
    
    if (sourcesToMerge.length < 2) return;

    const mergeResult = mergeEnemySources(sourcesToMerge, simulation.globalTime);
    if (!mergeResult) return;

    get().addHistoryEvent('enemy_merged', 
      { mergedIds: sourceIds, newId: mergeResult.mergedSource.id }, 
      `手动合并敌情：${sourcesToMerge.map(s => s.name).join(', ')}`);

    set((state) => ({
      enemySources: [
        ...state.enemySources.map(s => 
          sourceIds.includes(s.id) ? { ...s, status: 'merged' as const, mergedInto: mergeResult.mergedSource.id } : s
        ),
        mergeResult.mergedSource,
      ],
    }));

    get().calculatePathsForSource(mergeResult.mergedSource.id);
  },

  calculatePathsForSource: (sourceId: string) => {
    const { towers, weather, enemySources } = get();
    const source = enemySources.find(s => s.id === sourceId);
    if (!source) return;

    const adjacency = buildAdjacencyList(towers, weather.visibilityFactor, source.level.delayFactor);
    const paths = findPathByStrategy(
      source.startTowerId,
      source.endTowerId,
      adjacency,
      towers,
      source.level.pathStrategy,
      source.level.pathStrategy === 'redundant' ? 3 : 1
    );

    if (paths.length > 0) {
      const mission = createSignalMission(source, paths[0]);
      
      if (source.level.pathStrategy === 'redundant' && paths.length > 1) {
        const extraMissions = paths.slice(1).map(p => ({
          ...createSignalMission(source, p),
          id: uuidv4(),
        }));
        set((state) => ({
          missions: [...state.missions, mission, ...extraMissions],
          paths: [...state.paths, ...paths.map(p => ({ ...p, enemySourceId: sourceId }))],
        }));
      } else {
        set((state) => ({
          missions: [...state.missions, mission],
          paths: [...state.paths, ...paths.map(p => ({ ...p, enemySourceId: sourceId }))],
        }));
      }
    }
  },

  dispatchGarrison: (fromTowerId: string, toTowerId: string, count: number) => {
    const { towers, simulation } = get();
    const dispatch = findOptimalDispatch(fromTowerId, toTowerId, count, towers, simulation.globalTime);
    
    if (!dispatch) return;

    const fromTower = towers.find(t => t.id === fromTowerId);
    const toTower = towers.find(t => t.id === toTowerId);

    get().addHistoryEvent('garrison_dispatch', 
      { dispatchId: dispatch.id, from: fromTowerId, to: toTowerId, count }, 
      `调度驻军：${fromTower?.code || ''} → ${toTower?.code || ''} (${count}人)`);

    set((state) => ({
      dispatches: [...state.dispatches, dispatch],
    }));
  },

  cancelDispatch: (dispatchId: string) => {
    const { dispatches, towers } = get();
    const dispatch = dispatches.find(d => d.id === dispatchId);
    
    if (!dispatch || dispatch.status === 'completed') return;

    let updatedTowers = towers;
    if (dispatch.status === 'active') {
      updatedTowers = revertDispatchEffect(towers, dispatch);
    }

    set((state) => ({
      dispatches: state.dispatches.filter(d => d.id !== dispatchId),
      towers: updatedTowers,
    }));
  },

  addHistoryEvent: (type: HistoryEvent['type'], data: Record<string, unknown>, description: string) => {
    const globalTime = get().simulation.globalTime;
    const event = createHistoryEvent(type, data, description, globalTime);
    
    set((state) => ({
      historyEvents: [...state.historyEvents, event],
    }));
  },

  takeSnapshot: () => {
    const { towers, missions, enemySources, weather, dispatches, paths, simulation, blindSpots, towerDelays, selectedPathId } = get();
    const snapshot = createStateSnapshot(
      simulation.globalTime,
      towers,
      missions,
      enemySources,
      weather,
      dispatches,
      paths,
      blindSpots,
      towerDelays,
      selectedPathId
    );

    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
    }));
  },

  calculatePaths: () => {
    const { towers, weather, enemySources } = get();
    const adjacency = buildAdjacencyList(towers, weather.visibilityFactor, 1);
    
    const allPaths: SignalPath[] = [];
    const allMissions: SignalMission[] = [];

    enemySources.forEach(source => {
      if (source.status === 'merged' || source.status === 'completed' || source.status === 'failed') return;
      
      const sourceAdjacency = buildAdjacencyList(towers, weather.visibilityFactor, source.level.delayFactor);
      const paths = findPathByStrategy(
        source.startTowerId,
        source.endTowerId,
        sourceAdjacency,
        towers,
        source.level.pathStrategy,
        source.level.pathStrategy === 'redundant' ? 3 : 1
      );

      if (paths.length > 0) {
        const pathsWithSource = paths.map(p => ({ ...p, enemySourceId: source.id }));
        allPaths.push(...pathsWithSource);

        const mission = createSignalMission(source, pathsWithSource[0]);
        allMissions.push(mission);

        if (source.level.pathStrategy === 'redundant' && pathsWithSource.length > 1) {
          pathsWithSource.slice(1).forEach(p => {
            allMissions.push({
              ...createSignalMission(source, p),
              id: uuidv4(),
            });
          });
        }
      }
    });

    let blindSpots: BlindSpot[] = [];
    let towerDelays: TowerDelayInfo[] = [];

    if (enemySources.length > 0) {
      const firstSource = enemySources.find(s => s.status !== 'merged' && s.status !== 'failed');
      if (firstSource) {
        blindSpots = findBlindSpots(towers, firstSource.startTowerId, adjacency).map(b => ({
          ...b,
          firstDetected: get().simulation.globalTime,
        }));
      }
      towerDelays = analyzeTowerDelays(towers, allPaths, 5).map(d => ({
        ...d,
        missionCount: allMissions.filter(m => m.path.towers.includes(d.towerId)).length,
      }));
    }

    set({
      paths: allPaths,
      missions: allMissions,
      selectedPathId: allPaths.length > 0 ? allPaths[0].id : null,
      blindSpots,
      towerDelays,
    });
  },

  selectPath: (pathId: string) => {
    set({ selectedPathId: pathId });
  },

  startSimulation: () => {
    const { missions, enemySources, weather } = get();

    if (missions.length === 0) {
      return;
    }

    const updatedMissions = missions.map(m => {
      const source = enemySources.find(s => s.id === m.enemySourceId);
      if (source?.status !== 'merged') {
        return { ...m, status: 'running' as const, startTime: 0 };
      }
      return m;
    });

    const updatedSources = enemySources.map(s => ({
      ...s,
      status: s.status === 'pending' ? 'active' as const : s.status,
    }));

    const forecast = getWeatherForecast(5, weather, 0, WEATHER_CHANGE_INTERVAL);

    set((state) => ({
      simulation: {
        ...state.simulation,
        status: 'running',
        currentStep: 0,
        currentTime: 0,
        globalTime: 0,
        signalProgress: 0,
      },
      missions: updatedMissions,
      enemySources: updatedSources,
      weatherForecast: forecast,
      historyEvents: [],
      snapshots: [],
      evaluationResult: null,
    }));

    get().addHistoryEvent('simulation_start', {}, '联防调度模拟开始');
    
    updatedMissions.forEach(m => {
      const source = updatedSources.find(s => s.id === m.enemySourceId);
      if (source?.status !== 'merged' && m.status === 'running') {
        get().addHistoryEvent('signal_start', 
          { missionId: m.id, sourceId: m.enemySourceId }, 
          `信号传递开始：${source?.name || '未知敌情'}`);
      }
    });

    get().takeSnapshot();
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
    const { simulation, towers, enemySources, missions, dispatches, weatherEvents, historyEvents, blindSpots, snapshots } = get();

    get().addHistoryEvent('simulation_end', {}, '联防调度模拟结束');

    const evaluation = calculateEvaluationResult(
      simulation.globalTime,
      enemySources,
      missions,
      towers,
      dispatches,
      weatherEvents,
      historyEvents,
      blindSpots,
      snapshots
    );

    set((state) => ({
      simulation: {
        ...state.simulation,
        status: 'completed',
      },
      evaluationResult: evaluation,
      showEvaluation: true,
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
        globalTime: 0,
        isReplaying: false,
        replayTime: 0,
        replaySpeed: 1,
      },
      startTowerId: null,
      endTowerId: null,
      enemySources: [],
      missions: [],
      dispatches: [],
      weatherEvents: [],
      weatherForecast: [],
      historyEvents: [],
      snapshots: [],
      evaluationResult: null,
      warnings: [],
      lastAssessment: null,
      lastNewWarningIds: [],
      showEvaluation: false,
      paths: [],
      selectedPathId: null,
      blindSpots: [],
      towerDelays: [],
    }));
    get().calculatePaths();
  },

  advanceSimulation: (deltaTime: number) => {
    const state = get();
    if (state.simulation.status !== 'running' || state.simulation.isReplaying) return;

    const newGlobalTime = state.simulation.globalTime + deltaTime;
    let updatedTowers = [...state.towers];
    let updatedMissions = [...state.missions];
    let updatedDispatches = [...state.dispatches];
    let updatedWeather = state.weather;
    let updatedWeatherEvents = [...state.weatherEvents];
    let updatedEnemySources = [...state.enemySources];
    let needsPathRecalc = false;

    state.dispatches.forEach((dispatch, index) => {
      if (dispatch.status === 'pending' || dispatch.status === 'active') {
        const result = applyDispatchEffect(updatedTowers, dispatch, newGlobalTime);
        updatedTowers = result.towers;
        
        if (result.completed) {
          updatedDispatches[index] = { ...dispatch, status: 'completed' };
          needsPathRecalc = true;
          
          const fromTower = updatedTowers.find(t => t.id === dispatch.fromTowerId);
          const toTower = updatedTowers.find(t => t.id === dispatch.toTowerId);
          get().addHistoryEvent('garrison_dispatch', 
            { dispatchId: dispatch.id, completed: true }, 
            `驻军到达：${fromTower?.code || ''} → ${toTower?.code || ''}`);
        } else if (dispatch.status === 'pending') {
          updatedDispatches[index] = { ...dispatch, status: 'active' };
        }
      }
    });

    if (state.isDynamicWeather) {
      const nextWeatherEvent = state.weatherForecast.find(e => 
        e.startTime <= newGlobalTime && e.startTime > state.simulation.globalTime
      );
      
      if (nextWeatherEvent) {
        const oldWeather = state.weather;
        
        if (oldWeather.visibilityFactor < 0.8) {
          const oldEvent = state.weatherEvents.find(e => 
            e.weather.id === oldWeather.id && e.startTime <= newGlobalTime
          );
          if (oldEvent) {
            updatedTowers = recoverFromWeather(updatedTowers, oldEvent.affectedTowers);
            oldEvent.affectedTowers.forEach(towerId => {
              get().addHistoryEvent('tower_recovered', { towerId }, 
                `${updatedTowers.find(t => t.id === towerId)?.code || ''} 从天气影响中恢复`);
            });
          }
        }

        const eventWithTowers = createWeatherEvent(
          nextWeatherEvent.weather,
          nextWeatherEvent.startTime,
          nextWeatherEvent.duration,
          updatedTowers,
          'automatic'
        );
        updatedWeatherEvents = [...updatedWeatherEvents, eventWithTowers];
        updatedWeather = nextWeatherEvent.weather;

        if (nextWeatherEvent.weather.visibilityFactor < 0.8) {
          updatedTowers = applyWeatherEffect(updatedTowers, nextWeatherEvent.weather, eventWithTowers.affectedTowers);
          eventWithTowers.affectedTowers.forEach(towerId => {
            const tower = updatedTowers.find(t => t.id === towerId);
            if (tower?.isDisabled) {
              get().addHistoryEvent('tower_disabled', 
                { towerId, reason: tower.disabledReason }, 
                `${tower.code} 因天气故障：${tower.disabledReason}`);
            }
          });
        }

        get().addHistoryEvent('weather_change', 
          { oldWeather: oldWeather.id, newWeather: updatedWeather.id }, 
          `天气变化：${oldWeather.name} → ${updatedWeather.name}`);

        const { needRecalc, interrupted } = recalculatePathsOnWeatherChange(
          updatedMissions, updatedTowers, updatedWeather
        );

        interrupted.forEach(missionId => {
          const missionIndex = updatedMissions.findIndex(m => m.id === missionId);
          if (missionIndex !== -1) {
            const mission = updatedMissions[missionIndex];
            const altMission = findAlternativePathForMission(
              mission, updatedTowers, updatedWeather, buildAdjacencyList
            );
            
            if (altMission) {
              updatedMissions[missionIndex] = altMission;
              get().addHistoryEvent('path_recalculated', 
                { missionId, oldPath: mission.path.towers, newPath: altMission.path.towers }, 
                `路径重算：为任务找到备用路线`);
            } else {
              updatedMissions[missionIndex] = { ...mission, status: 'failed', failedReason: '天气导致路径中断，无备用路线' };
              get().addHistoryEvent('signal_failed', 
                { missionId, reason: 'weather_interruption' }, 
                `信号传递失败：天气导致路径中断`);
            }
          }
        });

        needsPathRecalc = needsPathRecalc || needRecalc.length > 0;
      }
    }

    updatedTowers = updatedTowers.map(tower => {
      if (tower.isDisabled && tower.disabledUntil && tower.disabledUntil <= newGlobalTime) {
        get().addHistoryEvent('tower_recovered', { towerId: tower.id }, 
          `${tower.code} 恢复正常运行`);
        return {
          ...tower,
          isDisabled: false,
          disabledReason: undefined,
          disabledUntil: undefined,
        };
      }
      
      if (!tower.isDisabled && tower.isActive && tower.garrisonCount > 0) {
        if (Math.random() < TOWER_FAILURE_PROBABILITY * deltaTime) {
          const reasons = ['烽火台失火', '士兵突发疾病', '设备损坏', '遭遇小股敌军偷袭'];
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          get().addHistoryEvent('tower_disabled', 
            { towerId: tower.id, reason }, 
            `${tower.code} 故障：${reason}`);
          return {
            ...tower,
            isDisabled: true,
            disabledReason: reason,
            disabledUntil: newGlobalTime + TOWER_RECOVERY_TIME,
          };
        }
      }
      
      return tower;
    });

    if (state.autoDispatch && newGlobalTime % 10 < deltaTime) {
      const weakTowers = findWeakTowers(updatedTowers, updatedMissions);
      const autoDispatches = findAutoDispatchCandidates(updatedTowers, weakTowers, newGlobalTime);
      
      autoDispatches.forEach(dispatch => {
        const exists = updatedDispatches.some(d => 
          d.fromTowerId === dispatch.fromTowerId && 
          d.toTowerId === dispatch.toTowerId &&
          d.status !== 'completed'
        );
        
        if (!exists) {
          const fromTower = updatedTowers.find(t => t.id === dispatch.fromTowerId);
          const toTower = updatedTowers.find(t => t.id === dispatch.toTowerId);
          get().addHistoryEvent('garrison_dispatch', 
            { dispatchId: dispatch.id, from: dispatch.fromTowerId, to: dispatch.toTowerId, count: dispatch.count, auto: true }, 
            `自动调度：${fromTower?.code || ''} → ${toTower?.code || ''} (${dispatch.count}人) - ${dispatch.reason}`);
          updatedDispatches.push(dispatch);
        }
      });
    }

    updatedMissions = updatedMissions.map(mission => {
      if (mission.status !== 'running') return mission;

      const source = updatedEnemySources.find(s => s.id === mission.enemySourceId);
      if (!source) return mission;

      const { currentStep, currentTime, activeTowers } = mission;
      const path = mission.path.towers;

      if (currentStep >= path.length - 1) {
        get().addHistoryEvent('signal_complete', 
          { missionId: mission.id, sourceId: mission.enemySourceId }, 
          `信号传递完成：${source.name}`);
        
        const sourceIndex = updatedEnemySources.findIndex(s => s.id === mission.enemySourceId);
        if (sourceIndex !== -1) {
          updatedEnemySources[sourceIndex] = { ...updatedEnemySources[sourceIndex], status: 'completed' };
        }
        
        return {
          ...mission,
          status: 'completed',
          signalProgress: 1,
          endTime: newGlobalTime,
        };
      }

      const currentTowerId = path[currentStep];
      const currentTower = updatedTowers.find(t => t.id === currentTowerId);
      const nextTowerId = path[currentStep + 1];
      const nextTower = updatedTowers.find(t => t.id === nextTowerId);

      if (!currentTower || !nextTower) return mission;

      if (currentTower.isDisabled || nextTower.isDisabled) {
        const altMission = findAlternativePathForMission(
          mission, updatedTowers, updatedWeather, buildAdjacencyList
        );
        
        if (altMission) {
          get().addHistoryEvent('path_recalculated', 
            { missionId: mission.id, reason: 'tower_disabled' }, 
            `路径重算：${currentTower.isDisabled ? currentTower.code : nextTower.code} 故障，切换备用路线`);
          return { ...altMission, interruptions: mission.interruptions + 1 };
        } else {
          get().addHistoryEvent('signal_failed', 
            { missionId: mission.id, reason: 'tower_failure' }, 
            `信号传递失败：${currentTower.isDisabled ? currentTower.code : nextTower.code} 故障，无备用路线`);
          return { ...mission, status: 'failed', failedReason: '中继台故障，无备用路线' };
        }
      }

      if (!canTransmit(currentTower, nextTower, updatedWeather.visibilityFactor)) {
        const altMission = findAlternativePathForMission(
          mission, updatedTowers, updatedWeather, buildAdjacencyList
        );
        
        if (altMission) {
          get().addHistoryEvent('path_recalculated', 
            { missionId: mission.id, reason: 'out_of_range' }, 
            `路径重算：${currentTower.code} 无法到达 ${nextTower.code}，切换备用路线`);
          return { ...altMission, interruptions: mission.interruptions + 1 };
        } else {
          get().addHistoryEvent('signal_failed', 
            { missionId: mission.id, reason: 'out_of_range' }, 
            `信号传递失败：超出可视范围，无备用路线`);
          return { ...mission, status: 'failed', failedReason: '超出可视范围，无备用路线' };
        }
      }

      const effectiveDelay = getEffectiveDelay(
        currentTower.signalDelay,
        source.level,
        currentTower.garrisonCount,
        currentTower.baseGarrisonCount
      );

      const newTime = currentTime + deltaTime;

      if (newTime >= effectiveDelay) {
        const nextStep = currentStep + 1;
        const nextActiveTowers = [...activeTowers, path[nextStep]];
        
        get().addHistoryEvent('signal_reach', 
          { missionId: mission.id, towerId: path[nextStep] }, 
          `信号到达：${nextTower.code}`);

        return {
          ...mission,
          currentStep: nextStep,
          currentTime: newTime - effectiveDelay,
          activeTowers: nextActiveTowers,
          signalProgress: nextStep / (path.length - 1),
        };
      } else {
        const progress = currentStep / (path.length - 1);
        const stepProgress = newTime / effectiveDelay;
        const totalProgress = progress + stepProgress / (path.length - 1);

        return {
          ...mission,
          currentTime: newTime,
          signalProgress: Math.min(1, totalProgress),
        };
      }
    });

    if (needsPathRecalc) {
      const adjacency = buildAdjacencyList(updatedTowers, updatedWeather.visibilityFactor, 1);
      const firstSource = updatedEnemySources.find(s => s.status !== 'merged' && s.status !== 'failed');
      if (firstSource) {
        const blindSpots = findBlindSpots(updatedTowers, firstSource.startTowerId, adjacency).map(b => ({
          ...b,
          firstDetected: newGlobalTime,
        }));
        const towerDelays = analyzeTowerDelays(updatedTowers, state.paths, 5).map(d => ({
          ...d,
          missionCount: updatedMissions.filter(m => m.path.towers.includes(d.towerId)).length,
        }));
        set({ blindSpots, towerDelays });
      }
    }

    const allCompleted = updatedMissions.every(m => m.status === 'completed' || m.status === 'failed');
    const hasActiveSources = updatedEnemySources.some(s => s.status === 'active' || s.status === 'pending');

    let newStatus: SimulationState['status'] = state.simulation.status;
    if (allCompleted && hasActiveSources) {
      newStatus = 'completed';
      
      get().addHistoryEvent('simulation_end', {}, '联防调度模拟结束');

      const evaluation = calculateEvaluationResult(
        newGlobalTime,
        updatedEnemySources,
        updatedMissions,
        updatedTowers,
        updatedDispatches,
        updatedWeatherEvents,
        [...state.historyEvents],
        state.blindSpots,
        state.snapshots
      );

      set(() => ({
        evaluationResult: evaluation,
        showEvaluation: true,
      }));
    }

    if (newGlobalTime % SNAPSHOT_INTERVAL < deltaTime) {
      get().takeSnapshot();
    }

    if (newGlobalTime % 5 < deltaTime) {
      get().runWarningAssessment();
    }

    set((state) => ({
      simulation: {
        ...state.simulation,
        status: newStatus,
        globalTime: newGlobalTime,
        currentTime: state.simulation.currentTime + deltaTime,
      },
      towers: updatedTowers,
      missions: updatedMissions,
      dispatches: updatedDispatches,
      weather: updatedWeather,
      weatherEvents: updatedWeatherEvents,
      enemySources: updatedEnemySources,
    }));
  },

  startReplay: () => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        isReplaying: true,
        replayTime: 0,
      },
    }));
  },

  stopReplay: () => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        isReplaying: false,
        replayTime: 0,
      },
    }));
  },

  setReplayTime: (time: number) => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        replayTime: time,
      },
    }));
  },

  setReplaySpeed: (speed: number) => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        replaySpeed: speed,
      },
    }));
  },

  seekReplay: (time: number) => {
    const { snapshots } = get();
    const snapshot = findNearestSnapshot(snapshots, time);
    
    if (snapshot) {
      set((state) => ({
        towers: snapshot.towers,
        missions: snapshot.missions,
        enemySources: snapshot.enemySources,
        weather: snapshot.weather,
        dispatches: snapshot.dispatches,
        paths: snapshot.activePaths,
        blindSpots: snapshot.blindSpots,
        towerDelays: snapshot.towerDelays,
        selectedPathId: snapshot.selectedPathId,
        simulation: {
          ...state.simulation,
          replayTime: time,
          globalTime: snapshot.timestamp,
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
          ? { ...state.simulation, status: 'idle', currentStep: 0, currentTime: 0, globalTime: 0 }
          : state.simulation,
      };
    });
    if (recalculate) {
      get().calculatePaths();
    }
  },
}));
