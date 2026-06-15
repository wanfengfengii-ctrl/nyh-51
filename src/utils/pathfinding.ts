import { BeaconTower, SignalPath, BlindSpot, TowerDelayInfo } from '../types';

export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function getEffectiveVisualRange(baseRange: number, visibilityFactor: number): number {
  return baseRange * visibilityFactor;
}

export function canTransmit(
  from: BeaconTower,
  to: BeaconTower,
  visibilityFactor: number
): boolean {
  if (!from.isActive || !to.isActive) return false;
  if (from.garrisonCount <= 0 || to.garrisonCount <= 0) return false;

  const distance = getDistance(from.x, from.y, to.x, to.y);
  const effectiveRange = getEffectiveVisualRange(from.visualRange, visibilityFactor);

  return distance <= effectiveRange;
}

export function buildAdjacencyList(
  towers: BeaconTower[],
  visibilityFactor: number,
  delayFactor: number = 1.0
): Map<string, { towerId: string; distance: number; delay: number }[]> {
  const adjacency = new Map<string, { towerId: string; distance: number; delay: number }[]>();

  towers.forEach((tower) => {
    adjacency.set(tower.id, []);
  });

  for (let i = 0; i < towers.length; i++) {
    for (let j = i + 1; j < towers.length; j++) {
      const towerA = towers[i];
      const towerB = towers[j];

      if (canTransmit(towerA, towerB, visibilityFactor)) {
        const distance = getDistance(towerA.x, towerA.y, towerB.x, towerB.y);
        const delayAB = towerB.signalDelay * delayFactor;
        const delayBA = towerA.signalDelay * delayFactor;

        adjacency.get(towerA.id)?.push({
          towerId: towerB.id,
          distance,
          delay: delayAB,
        });

        adjacency.get(towerB.id)?.push({
          towerId: towerA.id,
          distance,
          delay: delayBA,
        });
      }
    }
  }

  return adjacency;
}

interface PathResult {
  path: string[];
  totalTime: number;
  totalDistance: number;
}

export function findShortestPath(
  startId: string,
  endId: string,
  adjacency: Map<string, { towerId: string; distance: number; delay: number }[]>
): PathResult | null {
  const times = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const distances = new Map<string, number>();
  const visited = new Set<string>();

  adjacency.forEach((_, towerId) => {
    times.set(towerId, Infinity);
    previous.set(towerId, null);
    distances.set(towerId, 0);
  });
  times.set(startId, 0);

  while (visited.size < adjacency.size) {
    let minTowerId: string | null = null;
    let minTime = Infinity;

    adjacency.forEach((_, towerId) => {
      if (!visited.has(towerId)) {
        const time = times.get(towerId) ?? Infinity;
        if (time < minTime) {
          minTime = time;
          minTowerId = towerId;
        }
      }
    });

    if (minTowerId === null || minTime === Infinity) break;

    visited.add(minTowerId);

    const neighbors = adjacency.get(minTowerId) || [];
    const currentTime = times.get(minTowerId) ?? 0;
    const currentDistance = distances.get(minTowerId) ?? 0;

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.towerId)) {
        const newTime = currentTime + neighbor.delay;
        const newDistance = currentDistance + neighbor.distance;

        if (newTime < (times.get(neighbor.towerId) ?? Infinity)) {
          times.set(neighbor.towerId, newTime);
          distances.set(neighbor.towerId, newDistance);
          previous.set(neighbor.towerId, minTowerId);
        }
      }
    }
  }

  if (times.get(endId) === Infinity) return null;

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  return {
    path,
    totalTime: times.get(endId) ?? 0,
    totalDistance: distances.get(endId) ?? 0,
  };
}

export function calculatePathReliability(
  path: string[],
  towers: BeaconTower[],
  _adjacency: Map<string, { towerId: string; distance: number; delay: number }[]>
): number {
  if (path.length < 2) return 0;

  let minReliability = 1;
  let totalReliability = 0;

  for (let i = 0; i < path.length; i++) {
    const towerId = path[i];
    const tower = towers.find(t => t.id === towerId);
    if (!tower || !tower.isActive || tower.isDisabled) return 0;

    const garrisonReliability = Math.min(1, tower.garrisonCount / Math.max(1, tower.baseGarrisonCount));
    const delayReliability = Math.max(0.5, 1 - (tower.signalDelay - 2) * 0.1);
    const towerReliability = garrisonReliability * 0.6 + delayReliability * 0.4;

    minReliability = Math.min(minReliability, towerReliability);
    totalReliability += towerReliability;
  }

  const avgReliability = totalReliability / path.length;
  const redundancyBonus = path.length > 3 ? 0.1 : 0;

  return Math.min(1, avgReliability * 0.7 + minReliability * 0.3 + redundancyBonus);
}

export function findPathByStrategy(
  startId: string,
  endId: string,
  adjacency: Map<string, { towerId: string; distance: number; delay: number }[]>,
  towers: BeaconTower[],
  strategy: 'fastest' | 'shortest' | 'mostReliable' | 'redundant',
  maxPaths: number = 3
): SignalPath[] {
  const allPaths = findMultiplePaths(startId, endId, adjacency, Math.max(5, maxPaths));
  
  if (allPaths.length === 0) return [];

  const pathsWithMetrics = allPaths.map(path => ({
    ...path,
    reliability: calculatePathReliability(path.towers, towers, adjacency),
    stationCount: path.towers.length - 1,
  }));

  let sortedPaths: typeof pathsWithMetrics;

  switch (strategy) {
    case 'fastest':
      sortedPaths = [...pathsWithMetrics].sort((a, b) => a.totalTime - b.totalTime);
      break;
    case 'shortest':
      sortedPaths = [...pathsWithMetrics].sort((a, b) => a.stationCount - b.stationCount);
      break;
    case 'mostReliable':
      sortedPaths = [...pathsWithMetrics].sort((a, b) => b.reliability - a.reliability);
      break;
    case 'redundant':
      sortedPaths = [...pathsWithMetrics].sort((a, b) => {
        const reliabilityScore = b.reliability - a.reliability;
        const stationScore = b.stationCount - a.stationCount;
        return reliabilityScore * 0.7 + stationScore * 0.3;
      });
      break;
    default:
      sortedPaths = pathsWithMetrics;
  }

  return sortedPaths.slice(0, maxPaths).map((p, i) => ({
    ...p,
    id: `path-${i}`,
    isOptimal: i === 0,
  }));
}

export function findMultiplePaths(
  startId: string,
  endId: string,
  adjacency: Map<string, { towerId: string; distance: number; delay: number }[]>,
  maxPaths: number = 3
): SignalPath[] {
  const paths: SignalPath[] = [];
  const shortestPath = findShortestPath(startId, endId, adjacency);

  if (!shortestPath) return [];

  paths.push({
    id: 'path-0',
    towers: shortestPath.path,
    totalTime: shortestPath.totalTime,
    totalDistance: shortestPath.totalDistance,
    isOptimal: true,
    reliability: 0.8,
  });

  const candidates: { path: string[]; totalTime: number; totalDistance: number }[] = [];

  for (let i = 0; i < shortestPath.path.length - 1; i++) {
    const spurNode = shortestPath.path[i];
    const rootPath = shortestPath.path.slice(0, i + 1);

    const tempAdjacency = new Map(adjacency);
    const removedEdges: Map<string, { towerId: string; distance: number; delay: number }[]> =
      new Map();

    paths.forEach((p) => {
      if (p.towers.length > i && p.towers.slice(0, i + 1).join(',') === rootPath.join(',')) {
        const nextTower = p.towers[i + 1];
        const neighbors = tempAdjacency.get(spurNode) || [];
        const filtered = neighbors.filter((n) => n.towerId !== nextTower);
        removedEdges.set(spurNode, neighbors);
        tempAdjacency.set(spurNode, filtered);
      }
    });

    const spurPath = findShortestPath(spurNode, endId, tempAdjacency);

    if (spurPath) {
      const fullPath = [...rootPath.slice(0, -1), ...spurPath.path];
      const totalTime =
        spurPath.totalTime +
        rootPath
          .slice(0, -1)
          .reduce((acc, _, idx) => {
            const towerId = rootPath[idx];
            const nextId = rootPath[idx + 1];
            const edge = (adjacency.get(towerId) || []).find((n) => n.towerId === nextId);
            return acc + (edge?.delay || 0);
          }, 0);

      const totalDistance =
        spurPath.totalDistance +
        rootPath
          .slice(0, -1)
          .reduce((acc, _, idx) => {
            const towerId = rootPath[idx];
            const nextId = rootPath[idx + 1];
            const edge = (adjacency.get(towerId) || []).find((n) => n.towerId === nextId);
            return acc + (edge?.distance || 0);
          }, 0);

      const exists = candidates.some(
        (c) => c.path.join(',') === fullPath.join(',')
      );

      if (!exists) {
        candidates.push({ path: fullPath, totalTime, totalDistance });
      }
    }
  }

  candidates.sort((a, b) => a.totalTime - b.totalTime);

  for (let i = 0; i < Math.min(maxPaths - 1, candidates.length); i++) {
    paths.push({
      id: `path-${i + 1}`,
      towers: candidates[i].path,
      totalTime: candidates[i].totalTime,
      totalDistance: candidates[i].totalDistance,
      isOptimal: false,
      reliability: 0.7,
    });
  }

  return paths;
}

export function findBlindSpots(
  towers: BeaconTower[],
  startId: string,
  adjacency: Map<string, { towerId: string; distance: number; delay: number }[]>
): BlindSpot[] {
  const blindSpots: BlindSpot[] = [];
  const reachable = new Set<string>();
  const queue: string[] = [startId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    reachable.add(current);

    const neighbors = adjacency.get(current) || [];
    neighbors.forEach((n) => {
      if (!visited.has(n.towerId)) {
        queue.push(n.towerId);
      }
    });
  }

  towers.forEach((tower) => {
    if (!tower.isActive) {
      blindSpots.push({ towerId: tower.id, reason: '烽火台未启用', firstDetected: 0 });
    } else if (tower.garrisonCount <= 0) {
      blindSpots.push({ towerId: tower.id, reason: '无人驻守', firstDetected: 0 });
    } else if (!reachable.has(tower.id)) {
      blindSpots.push({ towerId: tower.id, reason: '信号无法到达', firstDetected: 0 });
    }
  });

  return blindSpots;
}

export function analyzeTowerDelays(
  towers: BeaconTower[],
  paths: SignalPath[],
  severeThreshold: number = 5
): TowerDelayInfo[] {
  const delayMap = new Map<string, number>();

  paths.forEach((path) => {
    path.towers.forEach((towerId, index) => {
      if (index > 0) {
        const tower = towers.find((t) => t.id === towerId);
        if (tower) {
          const currentDelay = delayMap.get(towerId) || 0;
          delayMap.set(towerId, Math.max(currentDelay, tower.signalDelay));
        }
      }
    });
  });

  const result: TowerDelayInfo[] = [];
  delayMap.forEach((delay, towerId) => {
    result.push({
      towerId,
      delay,
      isSevere: delay >= severeThreshold,
      missionCount: 0,
    });
  });

  result.sort((a, b) => b.delay - a.delay);
  return result;
}

export function isCodeUnique(
  code: string,
  towers: BeaconTower[],
  excludeId?: string
): boolean {
  return !towers.some((t) => t.code === code && t.id !== excludeId);
}
