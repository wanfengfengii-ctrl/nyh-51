import {
  BeaconTower,
  SignalMission,
  EnemySource,
  GarrisonDispatch,
  WeatherEvent,
  HistoryEvent,
  EvaluationResult,
  StateSnapshot,
  BlindSpot,
} from '../types';
import { getWeatherSeverity } from './weatherEngine';

export function createStateSnapshot(
  timestamp: number,
  towers: BeaconTower[],
  missions: SignalMission[],
  weather: any,
  dispatches: GarrisonDispatch[],
  activePaths: any[]
): StateSnapshot {
  return {
    timestamp,
    towers: JSON.parse(JSON.stringify(towers)),
    missions: JSON.parse(JSON.stringify(missions)),
    weather: { ...weather },
    dispatches: JSON.parse(JSON.stringify(dispatches)),
    activePaths: JSON.parse(JSON.stringify(activePaths)),
  };
}

export function findNearestSnapshot(
  snapshots: StateSnapshot[],
  targetTime: number
): StateSnapshot | null {
  if (snapshots.length === 0) return null;
  
  let nearest = snapshots[0];
  let minDiff = Math.abs(snapshots[0].timestamp - targetTime);
  
  for (const snapshot of snapshots) {
    const diff = Math.abs(snapshot.timestamp - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = snapshot;
    }
    if (snapshot.timestamp > targetTime) break;
  }
  
  return nearest;
}

export function calculateEvaluationResult(
  totalSimulationTime: number,
  enemySources: EnemySource[],
  missions: SignalMission[],
  towers: BeaconTower[],
  dispatches: GarrisonDispatch[],
  weatherEvents: WeatherEvent[],
  historyEvents: HistoryEvent[],
  blindSpots: BlindSpot[],
  snapshots: StateSnapshot[]
): EvaluationResult {
  const completedMissions = missions.filter(m => m.status === 'completed');
  const failedMissions = missions.filter(m => m.status === 'failed');

  const successRate = missions.length > 0 
    ? (completedMissions.length / missions.length) * 100 
    : 0;

  const deliveryTimes = completedMissions
    .map(m => (m.endTime || 0) - (m.startTime || 0))
    .filter(t => t > 0);

  const averageDeliveryTime = deliveryTimes.length > 0
    ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
    : 0;

  const minDeliveryTime = deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : 0;
  const maxDeliveryTime = deliveryTimes.length > 0 ? Math.max(...deliveryTimes) : 0;

  const towerFailures = historyEvents.filter(e => e.type === 'tower_disabled').length;
  const towerRecoveries = historyEvents.filter(e => e.type === 'tower_recovered').length;

  const blindSpotHistory = snapshots
    .filter((_, i) => i % 5 === 0)
    .map(snapshot => {
      const bs = blindSpots.filter(b => 
        b.firstDetected <= snapshot.timestamp && 
        (!b.resolvedAt || b.resolvedAt > snapshot.timestamp)
      );
      return { time: snapshot.timestamp, count: bs.length };
    });

  const towerMissionCounts = new Map<string, number>();
  const towerDelays = new Map<string, number>();
  
  missions.forEach(mission => {
    mission.path.towers.forEach((towerId, index) => {
      if (index > 0) {
        towerMissionCounts.set(towerId, (towerMissionCounts.get(towerId) || 0) + 1);
        const tower = towers.find(t => t.id === towerId);
        if (tower) {
          const currentDelay = towerDelays.get(towerId) || 0;
          towerDelays.set(towerId, Math.max(currentDelay, tower.signalDelay));
        }
      }
    });
  });

  const bottleneckTowers = Array.from(towerMissionCounts.entries())
    .map(([towerId, missionCount]) => ({
      towerId,
      delay: towerDelays.get(towerId) || 0,
      missionCount,
    }))
    .filter(t => t.missionCount >= 2 || t.delay >= 4)
    .sort((a, b) => (b.delay * b.missionCount) - (a.delay * a.missionCount))
    .slice(0, 5);

  const criticalTowers = Array.from(towerMissionCounts.entries())
    .filter(([_, count]) => count >= 3)
    .map(([towerId]) => towerId);

  const signalTypes = [
    { type: 'smoke', count: enemySources.filter(e => e.level.signalType === 'smoke').length },
    { type: 'fire', count: enemySources.filter(e => e.level.signalType === 'fire').length },
    { type: 'both', count: enemySources.filter(e => e.level.signalType === 'both').length },
  ].filter(s => s.count > 0);

  const strategies = ['fastest', 'shortest', 'mostReliable', 'redundant'];
  const pathStrategyEffectiveness = strategies.map(strategy => {
    const strategyMissions = missions.filter(m => {
      const source = enemySources.find(e => e.id === m.enemySourceId);
      return source?.level.pathStrategy === strategy;
    });
    const strategyCompleted = strategyMissions.filter(m => m.status === 'completed');
    const strategySuccessRate = strategyMissions.length > 0
      ? (strategyCompleted.length / strategyMissions.length) * 100
      : 0;
    const strategyTimes = strategyCompleted
      .map(m => (m.endTime || 0) - (m.startTime || 0))
      .filter(t => t > 0);
    const strategyAvgTime = strategyTimes.length > 0
      ? strategyTimes.reduce((a, b) => a + b, 0) / strategyTimes.length
      : 0;
    
    return {
      strategy,
      successRate: strategySuccessRate,
      avgTime: strategyAvgTime,
    };
  }).filter(s => {
    const source = enemySources.find(e => e.level.pathStrategy === s.strategy);
    return source !== undefined;
  });

  const recommendations: string[] = [];

  if (successRate < 80) {
    recommendations.push('信号传递成功率较低，建议检查关键路径上的烽火台状态');
  }

  if (bottleneckTowers.length > 0) {
    const bottleneckTower = towers.find(t => t.id === bottleneckTowers[0].towerId);
    if (bottleneckTower) {
      recommendations.push(`关键瓶颈：${bottleneckTower.code} 延迟较高且负载重，建议增派驻军或增设中继台`);
    }
  }

  if (towerFailures > towerRecoveries) {
    recommendations.push('烽火台故障频发，建议检查天气影响并准备备用传递路线');
  }

  if (blindSpotHistory.some(b => b.count > 0)) {
    recommendations.push('存在信号盲区，建议调整烽火台位置或增加中继台');
  }

  const severeWeatherEvents = weatherEvents.filter(w => 
    getWeatherSeverity(w.weather) === 'high' || getWeatherSeverity(w.weather) === 'critical'
  );
  if (severeWeatherEvents.length > 0) {
    recommendations.push(`模拟期间出现 ${severeWeatherEvents.length} 次恶劣天气，建议制定天气应急预案`);
  }

  const lowGarrisonTowers = towers.filter(t => t.isActive && !t.isDisabled && t.garrisonCount < 5);
  if (lowGarrisonTowers.length > 0) {
    recommendations.push(`${lowGarrisonTowers.length} 座烽火台驻军不足，建议及时调度增援`);
  }

  return {
    totalSimulationTime,
    totalEnemySources: enemySources.length,
    completedMissions: completedMissions.length,
    failedMissions: failedMissions.length,
    successRate,
    averageDeliveryTime,
    minDeliveryTime,
    maxDeliveryTime,
    totalDispatches: dispatches.length,
    weatherChanges: weatherEvents.length,
    towerFailures,
    towerRecoveries,
    blindSpotHistory,
    bottleneckTowers,
    criticalTowers,
    signalTypes,
    pathStrategyEffectiveness,
    recommendations,
  };
}

export function getEventTimeline(
  events: HistoryEvent[],
  startTime: number,
  endTime: number
): HistoryEvent[] {
  return events
    .filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getMissionProgress(
  mission: SignalMission,
  towers: BeaconTower[]
): {
  progress: number;
  currentTower: BeaconTower | null;
  nextTower: BeaconTower | null;
  timeRemaining: number;
} {
  const totalSteps = mission.path.towers.length - 1;
  const progress = totalSteps > 0 ? mission.currentStep / totalSteps : 0;
  
  const currentTower = towers.find(t => t.id === mission.path.towers[mission.currentStep]) || null;
  const nextTower = mission.currentStep < totalSteps
    ? towers.find(t => t.id === mission.path.towers[mission.currentStep + 1]) || null
    : null;

  const nextDelay = nextTower ? nextTower.signalDelay : 0;
  const timeRemaining = (totalSteps - mission.currentStep) * nextDelay - mission.currentTime;

  return {
    progress,
    currentTower,
    nextTower,
    timeRemaining: Math.max(0, timeRemaining),
  };
}

export function getNetworkStatus(
  towers: BeaconTower[],
  missions: SignalMission[],
  blindSpots: BlindSpot[]
): {
  totalTowers: number;
  activeTowers: number;
  disabledTowers: number;
  runningMissions: number;
  completedMissions: number;
  failedMissions: number;
  blindSpotCount: number;
  overallHealth: number;
} {
  const totalTowers = towers.length;
  const activeTowers = towers.filter(t => t.isActive && !t.isDisabled).length;
  const disabledTowers = towers.filter(t => t.isDisabled).length;
  const runningMissions = missions.filter(m => m.status === 'running').length;
  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const failedMissions = missions.filter(m => m.status === 'failed').length;
  const blindSpotCount = blindSpots.filter(b => !b.resolvedAt).length;

  const healthComponents = [
    (activeTowers / Math.max(1, totalTowers)) * 100,
    missions.length > 0 ? (completedMissions / missions.length) * 100 : 100,
    Math.max(0, 100 - blindSpotCount * 20),
  ];
  const overallHealth = healthComponents.reduce((a, b) => a + b, 0) / healthComponents.length;

  return {
    totalTowers,
    activeTowers,
    disabledTowers,
    runningMissions,
    completedMissions,
    failedMissions,
    blindSpotCount,
    overallHealth,
  };
}
