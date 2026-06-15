import {
  BeaconTower,
  Warning,
  RiskLevel,
  WarningCategory,
  WarningStatus,
  LinkageTrigger,
  SignalMission,
  EnemySource,
  GarrisonDispatch,
  TheaterZone,
  SimulationState,
  SignalPath,
} from '../types';
import { SimulationStore } from './useSimulationStore';
import { compareRiskLevel } from '../domain/riskUtils';

export type StateSelector<T> = (state: SimulationStore) => T;

export const selectTowers: StateSelector<BeaconTower[]> = (s) => s.towers;

export const selectActiveTowers: StateSelector<BeaconTower[]> = (s) =>
  s.towers.filter((t) => t.isActive && !t.isDisabled);

export const selectDisabledTowers: StateSelector<BeaconTower[]> = (s) =>
  s.towers.filter((t) => t.isDisabled);

export const selectSelectedTower: StateSelector<BeaconTower | null> = (s) =>
  s.selectedTowerId ? s.towers.find((t) => t.id === s.selectedTowerId) ?? null : null;

export const selectTowerById = (towerId: string): StateSelector<BeaconTower | null> => (s) =>
  s.towers.find((t) => t.id === towerId) ?? null;

export const selectWarnings: StateSelector<Warning[]> = (s) => s.warnings;

export const selectActiveWarnings: StateSelector<Warning[]> = (s) =>
  s.warnings.filter((w) => w.status === 'active' || w.status === 'acknowledged');

export const selectWarningsByStatus = (
  status: WarningStatus | WarningStatus[]
): StateSelector<Warning[]> => {
  const statuses = Array.isArray(status) ? status : [status];
  return (s) => s.warnings.filter((w) => statuses.includes(w.status));
};

export const selectWarningsByRisk = (risk: RiskLevel | RiskLevel[]): StateSelector<Warning[]> => {
  const risks = Array.isArray(risk) ? risk : [risk];
  return (s) => s.warnings.filter((w) => risks.includes(w.riskLevel));
};

export const selectWarningsByCategory = (
  category: WarningCategory | WarningCategory[]
): StateSelector<Warning[]> => {
  const categories = Array.isArray(category) ? category : [category];
  return (s) => s.warnings.filter((w) => categories.includes(w.category));
};

export const selectWarningById = (warningId: string): StateSelector<Warning | null> => (s) =>
  s.warnings.find((w) => w.id === warningId) ?? null;

export const selectSortedWarnings: StateSelector<Warning[]> = (s) =>
  [...s.warnings].sort((a, b) => {
    const riskCmp = compareRiskLevel(b.riskLevel, a.riskLevel);
    if (riskCmp !== 0) return riskCmp;
    return b.createdAt - a.createdAt;
  });

export const selectNewWarningIds: StateSelector<string[]> = (s) => s.lastNewWarningIds;

export const selectLinkageTriggers: StateSelector<LinkageTrigger[]> = (s) => s.linkageTriggers;

export const selectActiveLinkageTriggers: StateSelector<LinkageTrigger[]> = (s) =>
  s.linkageTriggers.filter((lt) => !lt.autoDismissed);

export const selectSimulation: StateSelector<SimulationState> = (s) => s.simulation;

export const selectSimulationStatus: StateSelector<SimulationState['status']> = (s) =>
  s.simulation.status;

export const selectGlobalTime: StateSelector<number> = (s) => s.simulation.globalTime;

export const selectIsRunning: StateSelector<boolean> = (s) => s.simulation.status === 'running';

export const selectIsReplaying: StateSelector<boolean> = (s) => s.simulation.isReplaying;

export const selectMissions: StateSelector<SignalMission[]> = (s) => s.missions;

export const selectRunningMissions: StateSelector<SignalMission[]> = (s) =>
  s.missions.filter((m) => m.status === 'running');

export const selectCompletedMissions: StateSelector<SignalMission[]> = (s) =>
  s.missions.filter((m) => m.status === 'completed');

export const selectFailedMissions: StateSelector<SignalMission[]> = (s) =>
  s.missions.filter((m) => m.status === 'failed');

export const selectMissionById = (missionId: string): StateSelector<SignalMission | null> => (s) =>
  s.missions.find((m) => m.id === missionId) ?? null;

export const selectEnemySources: StateSelector<EnemySource[]> = (s) => s.enemySources;

export const selectActiveEnemySources: StateSelector<EnemySource[]> = (s) =>
  s.enemySources.filter((e) => e.status === 'active' || e.status === 'pending');

export const selectDispatches: StateSelector<GarrisonDispatch[]> = (s) => s.dispatches;

export const selectActiveDispatches: StateSelector<GarrisonDispatch[]> = (s) =>
  s.dispatches.filter((d) => d.status === 'pending' || d.status === 'active');

export const selectPaths: StateSelector<SignalPath[]> = (s) => s.paths;

export const selectSelectedPath: StateSelector<SignalPath | null> = (s) =>
  s.selectedPathId ? s.paths.find((p) => p.id === s.selectedPathId) ?? null : null;

export const selectTheaterZones: StateSelector<TheaterZone[]> = (s) => s.theaterZones;

export const selectTheaterZoneById = (zoneId: string): StateSelector<TheaterZone | null> => (s) =>
  s.theaterZones.find((z) => z.id === zoneId) ?? null;

export const selectLastAssessment: StateSelector<SimulationStore['lastAssessment']> = (s) =>
  s.lastAssessment;

export const selectEvaluationResult: StateSelector<SimulationStore['evaluationResult']> = (s) =>
  s.evaluationResult;

export const selectTheaterReport: StateSelector<SimulationStore['theaterReport']> = (s) =>
  s.theaterReport;

export const selectWarningCountsByRisk: StateSelector<Record<RiskLevel, number>> = (s) => ({
  critical: s.warnings.filter((w) => w.riskLevel === 'critical' && (w.status === 'active' || w.status === 'acknowledged')).length,
  high: s.warnings.filter((w) => w.riskLevel === 'high' && (w.status === 'active' || w.status === 'acknowledged')).length,
  medium: s.warnings.filter((w) => w.riskLevel === 'medium' && (w.status === 'active' || w.status === 'acknowledged')).length,
  low: s.warnings.filter((w) => w.riskLevel === 'low' && (w.status === 'active' || w.status === 'acknowledged')).length,
});

export const selectWeather: StateSelector<SimulationStore['weather']> = (s) => s.weather;

export const selectSettingsFlags: StateSelector<{
  isDynamicWeather: boolean;
  autoDispatch: boolean;
  showEvaluation: boolean;
  showWarningCenter: boolean;
}> = (s) => ({
  isDynamicWeather: s.isDynamicWeather,
  autoDispatch: s.autoDispatch,
  showEvaluation: s.showEvaluation,
  showWarningCenter: s.showWarningCenter,
});

export const selectBlindSpots: StateSelector<SimulationStore['blindSpots']> = (s) => s.blindSpots;
export const selectTowerDelays: StateSelector<SimulationStore['towerDelays']> = (s) => s.towerDelays;
export const selectDisposalRecords: StateSelector<SimulationStore['disposalRecords']> = (s) => s.disposalRecords;
export const selectWarningReplayEvents: StateSelector<SimulationStore['warningReplayEvents']> = (s) => s.warningReplayEvents;
