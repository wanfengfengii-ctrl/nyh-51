import { v4 as uuidv4 } from 'uuid';
import { EnemySource, EnemyLevel, BeaconTower, SignalMission, SignalPath, HistoryEvent } from '../types';
import { ENEMY_COLORS, SIGNAL_CONFLICT_DISTANCE, SIGNAL_MERGE_TIME_WINDOW } from '../constants';
import { getDistance } from './pathfinding';

export function createEnemySource(
  level: EnemyLevel,
  startTowerId: string,
  endTowerId: string,
  _towers: BeaconTower[],
  existingSources: EnemySource[]
): EnemySource {
  const colorIndex = existingSources.length % ENEMY_COLORS.length;
  
  const source: EnemySource = {
    id: uuidv4(),
    name: `敌情-${existingSources.length + 1}`,
    level,
    startTowerId,
    endTowerId,
    createdAt: Date.now(),
    priority: level.priority,
    status: 'pending',
    color: ENEMY_COLORS[colorIndex],
  };

  return source;
}

export function detectConflicts(
  newSource: EnemySource,
  existingSources: EnemySource[],
  towers: BeaconTower[]
): EnemySource[] {
  const conflicts: EnemySource[] = [];
  const newStartTower = towers.find(t => t.id === newSource.startTowerId);

  if (!newStartTower) return conflicts;

  existingSources.forEach(source => {
    if (source.status === 'merged' || source.status === 'completed' || source.status === 'failed') {
      return;
    }

    const startTower = towers.find(t => t.id === source.startTowerId);
    if (!startTower) return;

    const distance = getDistance(newStartTower.x, newStartTower.y, startTower.x, startTower.y);
    const timeDiff = Math.abs(newSource.createdAt - source.createdAt) / 1000;

    if (distance <= SIGNAL_CONFLICT_DISTANCE && timeDiff <= SIGNAL_MERGE_TIME_WINDOW) {
      conflicts.push(source);
    }
  });

  return conflicts;
}

export function mergeEnemySources(
  sources: EnemySource[],
  _currentTime: number
): { mergedSource: EnemySource; mergedIds: string[] } | null {
  if (sources.length < 2) return null;

  const highestPriority = sources.reduce((max, s) => Math.max(max, s.priority), 0);
  const highestLevelSource = sources.find(s => s.priority === highestPriority)!;
  const mergedIds = sources.map(s => s.id);

  const mergedSource: EnemySource = {
    ...highestLevelSource,
    id: uuidv4(),
    name: `合并敌情-${highestLevelSource.name}`,
    status: 'active',
    mergedFrom: mergedIds,
    priority: highestPriority + 0.5,
  };

  return { mergedSource, mergedIds };
}

export function getPriorityQueue(sources: EnemySource[]): EnemySource[] {
  return [...sources]
    .filter(s => s.status === 'pending' || s.status === 'active')
    .sort((a, b) => b.priority - a.priority);
}

export function createSignalMission(
  enemySource: EnemySource,
  path: SignalPath
): SignalMission {
  return {
    id: uuidv4(),
    enemySourceId: enemySource.id,
    path,
    currentStep: 0,
    currentTime: 0,
    status: 'pending',
    activeTowers: [path.towers[0]],
    signalProgress: 0,
    interruptions: 0,
  };
}

export function shouldUsePathStrategy(
  level: EnemyLevel,
  _availableTowers: BeaconTower[]
): { strategy: string; description: string } {
  const strategyDescriptions: Record<string, string> = {
    fastest: '追求最快传递速度，选择时间最短的路径',
    shortest: '选择经过站点最少的路径',
    mostReliable: '选择驻军最多、状态最稳定的路径',
    redundant: '同时启用多条路径，确保至少一条成功',
  };

  return {
    strategy: level.pathStrategy,
    description: strategyDescriptions[level.pathStrategy],
  };
}

export function getEffectiveDelay(
  baseDelay: number,
  level: EnemyLevel,
  garrisonCount: number,
  baseGarrison: number
): number {
  const garrisonFactor = baseGarrison > 0 ? Math.max(0.5, Math.min(2, baseGarrison / garrisonCount)) : 1;
  return baseDelay * level.delayFactor * garrisonFactor;
}

export function getSignalVisualType(level: EnemyLevel): {
  primary: 'smoke' | 'fire';
  secondary?: 'smoke' | 'fire';
  smokeColumns: number;
  fireIntensity: number;
  color: string;
} {
  const priorityColors: Record<number, string> = {
    1: '#22c55e',
    2: '#eab308',
    3: '#f97316',
    4: '#ef4444',
    4.5: '#dc2626',
  };

  if (level.signalType === 'smoke') {
    return {
      primary: 'smoke',
      smokeColumns: level.smokeCount,
      fireIntensity: 0,
      color: priorityColors[level.priority] || '#808080',
    };
  } else if (level.signalType === 'fire') {
    return {
      primary: 'fire',
      smokeColumns: 0,
      fireIntensity: level.fireIntensity,
      color: priorityColors[level.priority] || '#808080',
    };
  } else {
    return {
      primary: 'fire',
      secondary: 'smoke',
      smokeColumns: level.smokeCount,
      fireIntensity: level.fireIntensity,
      color: priorityColors[level.priority] || '#808080',
    };
  }
}

export function createHistoryEvent(
  type: HistoryEvent['type'],
  data: Record<string, unknown>,
  description: string,
  timestamp: number
): HistoryEvent {
  return {
    id: uuidv4(),
    timestamp,
    type,
    data,
    description,
  };
}

export function findWeakTowers(
  towers: BeaconTower[],
  missions: SignalMission[]
): Array<{ towerId: string; reason: string; riskLevel: number }> {
  const towerMissionCount = new Map<string, number>();
  missions.forEach(mission => {
    if (mission.status === 'running' || mission.status === 'pending') {
      mission.path.towers.forEach(towerId => {
        towerMissionCount.set(towerId, (towerMissionCount.get(towerId) || 0) + 1);
      });
    }
  });

  const weakTowers: Array<{ towerId: string; reason: string; riskLevel: number }> = [];

  towers.forEach(tower => {
    if (!tower.isActive || tower.isDisabled) return;

    const missionCount = towerMissionCount.get(tower.id) || 0;
    const garrisonRatio = tower.garrisonCount / Math.max(1, tower.baseGarrisonCount);

    if (tower.garrisonCount <= 3) {
      weakTowers.push({
        towerId: tower.id,
        reason: '驻军不足',
        riskLevel: garrisonRatio < 0.3 ? 3 : 2,
      });
    } else if (missionCount >= 3 && garrisonRatio < 0.7) {
      weakTowers.push({
        towerId: tower.id,
        reason: '负载过高',
        riskLevel: 2,
      });
    } else if (tower.signalDelay >= 4) {
      weakTowers.push({
        towerId: tower.id,
        reason: '延迟过高',
        riskLevel: 1,
      });
    }
  });

  return weakTowers.sort((a, b) => b.riskLevel - a.riskLevel);
}
