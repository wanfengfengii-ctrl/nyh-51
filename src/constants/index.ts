import { Weather, EnemyLevel } from '../types';

export const WEATHER_TYPES: Weather[] = [
  {
    id: 'clear',
    name: '晴天',
    visibilityFactor: 1.0,
    description: '视野开阔，可视距离不受影响',
    icon: '☀️',
  },
  {
    id: 'cloudy',
    name: '多云',
    visibilityFactor: 0.85,
    description: '云层遮挡，可视距离略有下降',
    icon: '⛅',
  },
  {
    id: 'fog',
    name: '大雾',
    visibilityFactor: 0.5,
    description: '浓雾弥漫，可视距离大幅下降',
    icon: '🌫️',
  },
  {
    id: 'rain',
    name: '雨天',
    visibilityFactor: 0.6,
    description: '雨水遮挡，烟火信号受影响',
    icon: '🌧️',
  },
  {
    id: 'snow',
    name: '雪天',
    visibilityFactor: 0.45,
    description: '大雪纷飞，可视距离严重下降',
    icon: '❄️',
  },
];

export const ENEMY_LEVELS: EnemyLevel[] = [
  {
    id: 'scout',
    name: '斥候',
    signalType: 'smoke',
    priority: 1,
    description: '小股敌军侦察，一炷烟',
    delayFactor: 1.2,
    smokeCount: 1,
    fireIntensity: 0,
    pathStrategy: 'fastest',
  },
  {
    id: 'small',
    name: '小股敌军',
    signalType: 'smoke',
    priority: 2,
    description: '百人以下敌军，两炷烟',
    delayFactor: 1.0,
    smokeCount: 2,
    fireIntensity: 0,
    pathStrategy: 'fastest',
  },
  {
    id: 'medium',
    name: '中股敌军',
    signalType: 'both',
    priority: 3,
    description: '千人以下敌军，三炷烟+火炬',
    delayFactor: 0.8,
    smokeCount: 3,
    fireIntensity: 1,
    pathStrategy: 'mostReliable',
  },
  {
    id: 'large',
    name: '大军压境',
    signalType: 'fire',
    priority: 4,
    description: '万人以上敌军，持续烽火',
    delayFactor: 0.6,
    smokeCount: 0,
    fireIntensity: 3,
    pathStrategy: 'redundant',
  },
];

export const ENEMY_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

export const WEATHER_CHANGE_INTERVAL = 30;
export const WEATHER_TRANSITION_DURATION = 5;

export const GARRISON_DISPATCH_TIME = 3;
export const GARRISON_MIN_REMAINING = 2;

export const TOWER_FAILURE_PROBABILITY = 0.02;
export const TOWER_RECOVERY_TIME = 10;

export const SNAPSHOT_INTERVAL = 2;

export const SIGNAL_CONFLICT_DISTANCE = 100;
export const SIGNAL_MERGE_TIME_WINDOW = 5;

export const DEFAULT_TOWER_CONFIG = {
  visualRange: 200,
  garrisonCount: 10,
  signalDelay: 2,
};

export const MAP_CONFIG = {
  width: 800,
  height: 600,
  gridSize: 50,
  backgroundColor: 0xf5e6c8,
  gridColor: 0xd4c4a0,
};

export const COLORS = {
  tower: {
    normal: 0x8b4513,
    active: 0xff4500,
    selected: 0x4169e1,
    disabled: 0x808080,
    start: 0x32cd32,
  },
  line: {
    normal: 0x654321,
    active: 0xff6347,
    optimal: 0xffd700,
    alternative: 0x9370db,
  },
  signal: 0xff4500,
};
