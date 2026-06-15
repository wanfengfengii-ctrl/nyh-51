import { v4 as uuidv4 } from 'uuid';
import { BeaconTower, GarrisonDispatch } from '../types';
import { GARRISON_DISPATCH_TIME, GARRISON_MIN_REMAINING } from '../constants';
import { getDistance } from './pathfinding';

export function findOptimalDispatch(
  fromTowerId: string,
  toTowerId: string,
  count: number,
  towers: BeaconTower[],
  currentTime: number
): GarrisonDispatch | null {
  const fromTower = towers.find(t => t.id === fromTowerId);
  const toTower = towers.find(t => t.id === toTowerId);

  if (!fromTower || !toTower) return null;
  if (fromTower.garrisonCount - count < GARRISON_MIN_REMAINING) return null;

  const distance = getDistance(fromTower.x, fromTower.y, toTower.x, toTower.y);
  const duration = GARRISON_DISPATCH_TIME + distance / 100;

  return {
    id: uuidv4(),
    fromTowerId,
    toTowerId,
    count,
    startTime: currentTime,
    duration,
    status: 'pending',
    reason: '手动调度',
  };
}

export function findAutoDispatchCandidates(
  towers: BeaconTower[],
  weakTowers: Array<{ towerId: string; reason: string; riskLevel: number }>,
  currentTime: number
): GarrisonDispatch[] {
  const dispatches: GarrisonDispatch[] = [];
  const activeTowers = towers.filter(t => t.isActive && !t.isDisabled);

  weakTowers.forEach(weak => {
    if (weak.riskLevel < 2) return;

    const weakTower = towers.find(t => t.id === weak.towerId);
    if (!weakTower) return;

    const needed = Math.max(0, 5 - weakTower.garrisonCount);
    if (needed <= 0) return;

    const potentialDonors = activeTowers
      .filter(t => t.id !== weak.towerId)
      .filter(t => t.garrisonCount > GARRISON_MIN_REMAINING + needed)
      .map(t => ({
        tower: t,
        distance: getDistance(t.x, t.y, weakTower.x, weakTower.y),
        available: t.garrisonCount - GARRISON_MIN_REMAINING,
      }))
      .sort((a, b) => a.distance - b.distance);

    if (potentialDonors.length > 0) {
      const donor = potentialDonors[0];
      const dispatchCount = Math.min(needed, donor.available);
      const duration = GARRISON_DISPATCH_TIME + donor.distance / 100;

      dispatches.push({
        id: uuidv4(),
        fromTowerId: donor.tower.id,
        toTowerId: weak.towerId,
        count: dispatchCount,
        startTime: currentTime,
        duration,
        status: 'pending',
        reason: `自动调度：${weak.reason}`,
      });
    }
  });

  return dispatches;
}

export function applyDispatchEffect(
  towers: BeaconTower[],
  dispatch: GarrisonDispatch,
  globalTime: number
): { towers: BeaconTower[]; completed: boolean } {
  const newTowers = [...towers];
  const elapsed = globalTime - dispatch.startTime;
  const completed = elapsed >= dispatch.duration;

  const fromIndex = newTowers.findIndex(t => t.id === dispatch.fromTowerId);
  const toIndex = newTowers.findIndex(t => t.id === dispatch.toTowerId);

  if (fromIndex === -1 || toIndex === -1) {
    return { towers, completed: false };
  }

  if (completed && dispatch.status !== 'completed') {
    newTowers[fromIndex] = {
      ...newTowers[fromIndex],
      garrisonCount: newTowers[fromIndex].garrisonCount - dispatch.count,
    };
    newTowers[toIndex] = {
      ...newTowers[toIndex],
      garrisonCount: newTowers[toIndex].garrisonCount + dispatch.count,
    };
  }

  return { towers: newTowers, completed };
}

export function revertDispatchEffect(
  towers: BeaconTower[],
  dispatch: GarrisonDispatch
): BeaconTower[] {
  return towers.map(tower => {
    if (tower.id === dispatch.fromTowerId) {
      return {
        ...tower,
        garrisonCount: tower.garrisonCount + dispatch.count,
      };
    }
    if (tower.id === dispatch.toTowerId) {
      return {
        ...tower,
        garrisonCount: Math.max(tower.baseGarrisonCount, tower.garrisonCount - dispatch.count),
      };
    }
    return tower;
  });
}

export function recalculateCoverageWithGarrison(
  towers: BeaconTower[]
): Map<string, { effectiveRange: number; coverageScore: number }> {
  const coverage = new Map<string, { effectiveRange: number; coverageScore: number }>();

  towers.forEach(tower => {
    if (!tower.isActive || tower.isDisabled) {
      coverage.set(tower.id, { effectiveRange: 0, coverageScore: 0 });
      return;
    }

    const garrisonFactor = tower.garrisonCount / Math.max(1, tower.baseGarrisonCount);
    const effectiveRange = tower.visualRange * Math.min(1, Math.max(0.5, garrisonFactor));

    let coverageScore = 0;
    towers.forEach(other => {
      if (other.id === tower.id || !other.isActive || other.isDisabled) return;
      const distance = getDistance(tower.x, tower.y, other.x, other.y);
      if (distance <= effectiveRange) {
        coverageScore++;
      }
    });

    coverage.set(tower.id, { effectiveRange, coverageScore });
  });

  return coverage;
}

export function getDispatchStatus(
  dispatch: GarrisonDispatch,
  globalTime: number
): { status: string; progress: number; eta: number } {
  const elapsed = globalTime - dispatch.startTime;
  const progress = Math.min(1, Math.max(0, elapsed / dispatch.duration));
  const eta = Math.max(0, dispatch.duration - elapsed);

  let status = '调度中';
  if (dispatch.status === 'completed') {
    status = '已完成';
  } else if (progress >= 1) {
    status = '已到达';
  } else if (progress > 0.5) {
    status = '接近目标';
  } else if (progress > 0) {
    status = '行进中';
  }

  return { status, progress, eta };
}
