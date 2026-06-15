import { v4 as uuidv4 } from 'uuid';
import { Weather, WeatherEvent, BeaconTower, SignalMission } from '../types';
import { WEATHER_TYPES } from '../constants';

export function getRandomWeather(currentWeather?: Weather): Weather {
  const availableWeathers = WEATHER_TYPES.filter(w => w.id !== currentWeather?.id);
  return availableWeathers[Math.floor(Math.random() * availableWeathers.length)];
}

export function createWeatherEvent(
  weather: Weather,
  startTime: number,
  duration: number,
  towers: BeaconTower[],
  triggerType: 'automatic' | 'manual' = 'automatic'
): WeatherEvent {
  const affectedTowers = towers
    .filter(t => t.isActive && !t.isDisabled)
    .filter(() => {
      if (weather.visibilityFactor >= 0.8) return false;
      return Math.random() < (1 - weather.visibilityFactor);
    })
    .map(t => t.id);

  return {
    id: uuidv4(),
    weather,
    startTime,
    duration,
    affectedTowers,
    triggerType,
  };
}

export function getWeatherForecast(
  count: number,
  currentWeather: Weather,
  startTime: number,
  interval: number
): WeatherEvent[] {
  const forecast: WeatherEvent[] = [];
  let lastWeather = currentWeather;

  for (let i = 0; i < count; i++) {
    const nextWeather = getRandomWeather(lastWeather);
    const eventTime = startTime + (i + 1) * interval;
    const duration = 20 + Math.random() * 40;

    forecast.push(createWeatherEvent(nextWeather, eventTime, duration, [], 'automatic'));
    lastWeather = nextWeather;
  }

  return forecast;
}

export function applyWeatherEffect(
  towers: BeaconTower[],
  weather: Weather,
  affectedTowers: string[]
): BeaconTower[] {
  return towers.map(tower => {
    if (!affectedTowers.includes(tower.id)) return tower;

    let updatedTower = { ...tower };

    if (weather.id === 'fog' || weather.id === 'snow') {
      const visibilityReduction = (1 - weather.visibilityFactor) * 0.3;
      updatedTower.visualRange = tower.visualRange * (1 - visibilityReduction);
      updatedTower.isDisabled = true;
      updatedTower.disabledReason = weather.id === 'fog' ? '浓雾导致无法瞭望' : '大雪导致无法点火';
    } else if (weather.id === 'rain') {
      updatedTower.signalDelay = tower.signalDelay * 1.5;
      updatedTower.isDisabled = Math.random() < 0.3;
      if (updatedTower.isDisabled) {
        updatedTower.disabledReason = '雨水打湿烟火，无法传递信号';
      }
    }

    return updatedTower;
  });
}

export function recoverFromWeather(
  towers: BeaconTower[],
  affectedTowers: string[]
): BeaconTower[] {
  return towers.map(tower => {
    if (!affectedTowers.includes(tower.id)) return tower;
    return {
      ...tower,
      isDisabled: false,
      disabledReason: undefined,
      signalDelay: tower.signalDelay / 1.5,
    };
  });
}

export function recalculatePathsOnWeatherChange(
  missions: SignalMission[],
  towers: BeaconTower[],
  weather: Weather
): { needRecalc: string[]; interrupted: string[] } {
  const needRecalc: string[] = [];
  const interrupted: string[] = [];

  missions.forEach(mission => {
    if (mission.status !== 'running') return;

    const pathTowers = mission.path.towers;
    const currentTowerIndex = mission.currentStep;
    const remainingTowers = pathTowers.slice(currentTowerIndex);

    const affectedRemaining = remainingTowers.some(towerId => {
      const tower = towers.find(t => t.id === towerId);
      return tower?.isDisabled;
    });

    if (affectedRemaining) {
      interrupted.push(mission.id);
    } else if (weather.visibilityFactor < 0.7) {
      needRecalc.push(mission.id);
    }
  });

  return { needRecalc, interrupted };
}

export function findAlternativePathForMission(
  mission: SignalMission,
  towers: BeaconTower[],
  weather: Weather,
  adjacencyBuilder: (towers: BeaconTower[], visibilityFactor: number) => Map<string, { towerId: string; distance: number; delay: number }[]>
): SignalMission | null {
  if (mission.currentStep >= mission.path.towers.length - 1) return null;

  const currentTowerId = mission.path.towers[mission.currentStep];
  const endTowerId = mission.path.towers[mission.path.towers.length - 1];

  const adjacency = adjacencyBuilder(towers, weather.visibilityFactor);
  
  const visited = new Set<string>();
  const queue: { towerId: string; path: string[]; time: number }[] = [
    { towerId: currentTowerId, path: [currentTowerId], time: 0 }
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.towerId)) continue;
    visited.add(current.towerId);

    if (current.towerId === endTowerId && current.path.length > 1) {
      const newPath = {
        ...mission.path,
        id: uuidv4(),
        towers: [...mission.path.towers.slice(0, mission.currentStep), ...current.path.slice(1)],
        totalTime: current.time,
        isOptimal: false,
        reliability: 0.7,
      };

      return {
        ...mission,
        path: newPath,
        status: 'running',
        interruptions: mission.interruptions + 1,
      };
    }

    const neighbors = adjacency.get(current.towerId) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor.towerId)) {
        queue.push({
          towerId: neighbor.towerId,
          path: [...current.path, neighbor.towerId],
          time: current.time + neighbor.delay,
        });
      }
    });
  }

  return null;
}

export function getWeatherImpactDescription(weather: Weather): string {
  const impacts: Record<string, string> = {
    clear: '视野良好，信号传递不受影响',
    cloudy: '云层较厚，可视距离略有下降',
    fog: '浓雾弥漫，部分烽火台可能无法瞭望',
    rain: '雨水可能打湿烟火，信号延迟增加',
    snow: '大雪纷飞，烽火可能无法点燃，可视距离严重下降',
  };
  return impacts[weather.id] || '天气状况未知';
}

export function getWeatherSeverity(weather: Weather): 'low' | 'medium' | 'high' | 'critical' {
  const factor = weather.visibilityFactor;
  if (factor >= 0.8) return 'low';
  if (factor >= 0.6) return 'medium';
  if (factor >= 0.45) return 'high';
  return 'critical';
}
