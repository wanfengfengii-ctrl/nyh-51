import { useMemo } from 'react';
import { useSimulationStore } from './useSimulationStore';
import {
  selectTowers,
  selectActiveTowers,
  selectDisabledTowers,
  selectSelectedTower,
  selectTowerById,
  selectWarnings,
  selectActiveWarnings,
  selectWarningsByStatus,
  selectWarningsByRisk,
  selectWarningsByCategory,
  selectWarningById,
  selectSortedWarnings,
  selectNewWarningIds,
  selectLinkageTriggers,
  selectActiveLinkageTriggers,
  selectSimulation,
  selectSimulationStatus,
  selectGlobalTime,
  selectIsRunning,
  selectIsReplaying,
  selectMissions,
  selectRunningMissions,
  selectCompletedMissions,
  selectFailedMissions,
  selectMissionById,
  selectEnemySources,
  selectActiveEnemySources,
  selectDispatches,
  selectActiveDispatches,
  selectPaths,
  selectSelectedPath,
  selectTheaterZones,
  selectTheaterZoneById,
  selectLastAssessment,
  selectEvaluationResult,
  selectTheaterReport,
  selectWarningCountsByRisk,
  selectWeather,
  selectSettingsFlags,
  selectBlindSpots,
  selectTowerDelays,
  selectDisposalRecords,
  selectWarningReplayEvents,
} from './selectors';
import {
  createDomainContext,
  createWarningContext,
  createLinkageContext,
  createDisposalContext,
  createReplayContext,
  createTheaterContext,
} from '../domain/context';
import {
  calculateRegionHeatData,
  calculateFaultyTowerStats,
  predictFailures,
  predictMissionFailure,
  DomainContext,
} from '../domain';

function useShallowSelector<T>(selector: (state: ReturnType<typeof useSimulationStore.getState>) => T): T {
  return useSimulationStore(selector);
}

export function useTowers() {
  return useShallowSelector(selectTowers);
}

export function useActiveTowers() {
  return useShallowSelector(selectActiveTowers);
}

export function useDisabledTowers() {
  return useShallowSelector(selectDisabledTowers);
}

export function useSelectedTower() {
  return useShallowSelector(selectSelectedTower);
}

export function useTowerById(towerId: string) {
  const selector = useMemo(() => selectTowerById(towerId), [towerId]);
  return useShallowSelector(selector);
}

export function useWarnings() {
  return useShallowSelector(selectWarnings);
}

export function useActiveWarnings() {
  return useShallowSelector(selectActiveWarnings);
}

export function useWarningsByStatus(status: Parameters<typeof selectWarningsByStatus>[0]) {
  const selector = useMemo(() => selectWarningsByStatus(status), [status]);
  return useShallowSelector(selector);
}

export function useWarningsByRisk(risk: Parameters<typeof selectWarningsByRisk>[0]) {
  const selector = useMemo(() => selectWarningsByRisk(risk), [risk]);
  return useShallowSelector(selector);
}

export function useWarningsByCategory(category: Parameters<typeof selectWarningsByCategory>[0]) {
  const selector = useMemo(() => selectWarningsByCategory(category), [category]);
  return useShallowSelector(selector);
}

export function useWarningById(warningId: string) {
  const selector = useMemo(() => selectWarningById(warningId), [warningId]);
  return useShallowSelector(selector);
}

export function useSortedWarnings() {
  return useShallowSelector(selectSortedWarnings);
}

export function useNewWarningIds() {
  return useShallowSelector(selectNewWarningIds);
}

export function useLinkageTriggers() {
  return useShallowSelector(selectLinkageTriggers);
}

export function useActiveLinkageTriggers() {
  return useShallowSelector(selectActiveLinkageTriggers);
}

export function useSimulation() {
  return useShallowSelector(selectSimulation);
}

export function useSimulationStatus() {
  return useShallowSelector(selectSimulationStatus);
}

export function useGlobalTime() {
  return useShallowSelector(selectGlobalTime);
}

export function useIsRunning() {
  return useShallowSelector(selectIsRunning);
}

export function useIsReplaying() {
  return useShallowSelector(selectIsReplaying);
}

export function useMissions() {
  return useShallowSelector(selectMissions);
}

export function useRunningMissions() {
  return useShallowSelector(selectRunningMissions);
}

export function useCompletedMissions() {
  return useShallowSelector(selectCompletedMissions);
}

export function useFailedMissions() {
  return useShallowSelector(selectFailedMissions);
}

export function useMissionById(missionId: string) {
  const selector = useMemo(() => selectMissionById(missionId), [missionId]);
  return useShallowSelector(selector);
}

export function useEnemySources() {
  return useShallowSelector(selectEnemySources);
}

export function useActiveEnemySources() {
  return useShallowSelector(selectActiveEnemySources);
}

export function useDispatches() {
  return useShallowSelector(selectDispatches);
}

export function useActiveDispatches() {
  return useShallowSelector(selectActiveDispatches);
}

export function usePaths() {
  return useShallowSelector(selectPaths);
}

export function useSelectedPath() {
  return useShallowSelector(selectSelectedPath);
}

export function useTheaterZones() {
  return useShallowSelector(selectTheaterZones);
}

export function useTheaterZoneById(zoneId: string) {
  const selector = useMemo(() => selectTheaterZoneById(zoneId), [zoneId]);
  return useShallowSelector(selector);
}

export function useLastAssessment() {
  return useShallowSelector(selectLastAssessment);
}

export function useEvaluationResult() {
  return useShallowSelector(selectEvaluationResult);
}

export function useTheaterReport() {
  return useShallowSelector(selectTheaterReport);
}

export function useWarningCountsByRisk() {
  return useShallowSelector(selectWarningCountsByRisk);
}

export function useWeather() {
  return useShallowSelector(selectWeather);
}

export function useSettingsFlags() {
  return useShallowSelector(selectSettingsFlags);
}

export function useBlindSpots() {
  return useShallowSelector(selectBlindSpots);
}

export function useTowerDelays() {
  return useShallowSelector(selectTowerDelays);
}

export function useDisposalRecords() {
  return useShallowSelector(selectDisposalRecords);
}

export function useWarningReplayEvents() {
  return useShallowSelector(selectWarningReplayEvents);
}

export function useDomainContext(): DomainContext {
  const towers = useTowers();
  const missions = useMissions();
  const enemySources = useEnemySources();
  const dispatches = useDispatches();
  const weather = useWeather();
  const historyEvents = useShallowSelector((s) => s.historyEvents);
  const snapshots = useShallowSelector((s) => s.snapshots);
  const blindSpots = useBlindSpots();
  const currentTime = useGlobalTime();

  return useMemo(
    () =>
      createDomainContext({
        towers,
        missions,
        enemySources,
        dispatches,
        weather,
        historyEvents,
        snapshots,
        blindSpots,
        currentTime,
      }),
    [towers, missions, enemySources, dispatches, weather, historyEvents, snapshots, blindSpots, currentTime]
  );
}

export function useWarningContext() {
  const domainCtx = useDomainContext();
  const warnings = useWarnings();
  return useMemo(() => createWarningContext(domainCtx, warnings), [domainCtx, warnings]);
}

export function useLinkageContext() {
  const domainCtx = useDomainContext();
  const warnings = useWarnings();
  return useMemo(() => createLinkageContext(domainCtx, warnings), [domainCtx, warnings]);
}

export function useDisposalContext() {
  const domainCtx = useDomainContext();
  const warnings = useWarnings();
  const linkageTriggers = useLinkageTriggers();
  return useMemo(
    () => createDisposalContext(domainCtx, warnings, linkageTriggers),
    [domainCtx, warnings, linkageTriggers]
  );
}

export function useReplayContext() {
  const domainCtx = useDomainContext();
  const warnings = useWarnings();
  const linkageTriggers = useLinkageTriggers();
  const disposalRecords = useDisposalRecords();
  return useMemo(
    () => createReplayContext(domainCtx, warnings, linkageTriggers, disposalRecords),
    [domainCtx, warnings, linkageTriggers, disposalRecords]
  );
}

export function useTheaterContext() {
  const domainCtx = useDomainContext();
  const warnings = useWarnings();
  const disposalRecords = useDisposalRecords();
  const theaterZones = useTheaterZones();
  return useMemo(
    () => createTheaterContext(domainCtx, warnings, disposalRecords, theaterZones),
    [domainCtx, warnings, disposalRecords, theaterZones]
  );
}

export function useRegionHeatData(regionCount: number = 4) {
  const ctx = useDomainContext();
  return useMemo(() => calculateRegionHeatData(ctx, regionCount), [ctx, regionCount]);
}

export function useFaultyTowerStats() {
  const ctx = useDomainContext();
  return useMemo(() => calculateFaultyTowerStats(ctx), [ctx]);
}

export function useFailurePredictions(horizonSeconds: number = 60) {
  const ctx = useDomainContext();
  return useMemo(() => predictFailures(ctx, horizonSeconds), [ctx, horizonSeconds]);
}

export function useMissionFailurePredictions() {
  const ctx = useDomainContext();
  return useMemo(() => predictMissionFailure(ctx), [ctx]);
}

export function useSimulationActions() {
  const startSimulation = useShallowSelector((s) => s.startSimulation);
  const pauseSimulation = useShallowSelector((s) => s.pauseSimulation);
  const resumeSimulation = useShallowSelector((s) => s.resumeSimulation);
  const stopSimulation = useShallowSelector((s) => s.stopSimulation);
  const resetSimulation = useShallowSelector((s) => s.resetSimulation);
  const advanceSimulation = useShallowSelector((s) => s.advanceSimulation);

  const startReplay = useShallowSelector((s) => s.startReplay);
  const stopReplay = useShallowSelector((s) => s.stopReplay);
  const setReplayTime = useShallowSelector((s) => s.setReplayTime);
  const setReplaySpeed = useShallowSelector((s) => s.setReplaySpeed);
  const seekReplay = useShallowSelector((s) => s.seekReplay);

  const addTower = useShallowSelector((s) => s.addTower);
  const updateTower = useShallowSelector((s) => s.updateTower);
  const deleteTower = useShallowSelector((s) => s.deleteTower);
  const selectTower = useShallowSelector((s) => s.selectTower);
  const moveTower = useShallowSelector((s) => s.moveTower);

  const setWeather = useShallowSelector((s) => s.setWeather);
  const setDynamicWeather = useShallowSelector((s) => s.setDynamicWeather);
  const setAutoDispatch = useShallowSelector((s) => s.setAutoDispatch);
  const setShowEvaluation = useShallowSelector((s) => s.setShowEvaluation);
  const setShowWarningCenter = useShallowSelector((s) => s.setShowWarningCenter);
  const setIsAddingTower = useShallowSelector((s) => s.setIsAddingTower);

  const addEnemySource = useShallowSelector((s) => s.addEnemySource);
  const removeEnemySource = useShallowSelector((s) => s.removeEnemySource);
  const mergeEnemySourcesById = useShallowSelector((s) => s.mergeEnemySourcesById);

  const dispatchGarrison = useShallowSelector((s) => s.dispatchGarrison);
  const cancelDispatch = useShallowSelector((s) => s.cancelDispatch);

  const calculatePaths = useShallowSelector((s) => s.calculatePaths);
  const selectPath = useShallowSelector((s) => s.selectPath);
  const setStartTower = useShallowSelector((s) => s.setStartTower);
  const setEndTower = useShallowSelector((s) => s.setEndTower);
  const setEnemyLevel = useShallowSelector((s) => s.setEnemyLevel);

  const runWarningAssessment = useShallowSelector((s) => s.runWarningAssessment);
  const acknowledgeWarning = useShallowSelector((s) => s.acknowledgeWarning);
  const resolveWarning = useShallowSelector((s) => s.resolveWarning);
  const executeDisposal = useShallowSelector((s) => s.executeDisposal);
  const dismissLinkage = useShallowSelector((s) => s.dismissLinkage);
  const generateTheaterReportAction = useShallowSelector((s) => s.generateTheaterReportAction);
  const refreshTheaterZones = useShallowSelector((s) => s.refreshTheaterZones);

  return {
    simulation: {
      start: startSimulation,
      pause: pauseSimulation,
      resume: resumeSimulation,
      stop: stopSimulation,
      reset: resetSimulation,
      advance: advanceSimulation,
    },
    replay: {
      start: startReplay,
      stop: stopReplay,
      setTime: setReplayTime,
      setSpeed: setReplaySpeed,
      seek: seekReplay,
    },
    towers: {
      add: addTower,
      update: updateTower,
      delete: deleteTower,
      select: selectTower,
      move: moveTower,
    },
    settings: {
      setWeather,
      setDynamicWeather,
      setAutoDispatch,
      setShowEvaluation,
      setShowWarningCenter,
      setIsAddingTower,
      setStartTower,
      setEndTower,
      setEnemyLevel,
    },
    enemies: {
      add: addEnemySource,
      remove: removeEnemySource,
      merge: mergeEnemySourcesById,
    },
    dispatches: {
      create: dispatchGarrison,
      cancel: cancelDispatch,
    },
    paths: {
      calculate: calculatePaths,
      select: selectPath,
    },
    warnings: {
      runAssessment: runWarningAssessment,
      acknowledge: acknowledgeWarning,
      resolve: resolveWarning,
      executeDisposal,
      dismissLinkage,
      generateReport: generateTheaterReportAction,
      refreshZones: refreshTheaterZones,
    },
  };
}
