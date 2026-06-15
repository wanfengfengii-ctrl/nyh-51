import {
  BeaconTower,
  SignalMission,
  EnemySource,
  GarrisonDispatch,
  Weather,
  HistoryEvent,
  StateSnapshot,
  BlindSpot,
  Warning,
  LinkageTrigger,
  DisposalRecord,
  TheaterZone,
} from '../types';

export interface DomainContext {
  readonly towers: BeaconTower[];
  readonly missions: SignalMission[];
  readonly enemySources: EnemySource[];
  readonly dispatches: GarrisonDispatch[];
  readonly weather: Weather;
  readonly historyEvents: HistoryEvent[];
  readonly snapshots: StateSnapshot[];
  readonly blindSpots: BlindSpot[];
  readonly currentTime: number;
}

export interface WarningContext extends DomainContext {
  readonly existingWarnings: Warning[];
}

export interface LinkageContext extends DomainContext {
  readonly warnings: Warning[];
}

export interface DisposalContext extends DomainContext {
  readonly warnings: Warning[];
  readonly linkageTriggers: LinkageTrigger[];
}

export interface ReplayContext extends DomainContext {
  readonly warnings: Warning[];
  readonly linkageTriggers: LinkageTrigger[];
  readonly disposalRecords: DisposalRecord[];
}

export interface TheaterContext extends DomainContext {
  readonly warnings: Warning[];
  readonly disposalRecords: DisposalRecord[];
  readonly theaterZones: TheaterZone[];
}

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export function createDomainContext(
  partial: Partial<DomainContext> & Pick<DomainContext, 'towers' | 'currentTime'>
): DomainContext {
  return {
    towers: partial.towers,
    missions: partial.missions ?? [],
    enemySources: partial.enemySources ?? [],
    dispatches: partial.dispatches ?? [],
    weather: partial.weather ?? { id: 'clear', name: '晴天', visibilityFactor: 1.0, description: '', icon: '☀️' },
    historyEvents: partial.historyEvents ?? [],
    snapshots: partial.snapshots ?? [],
    blindSpots: partial.blindSpots ?? [],
    currentTime: partial.currentTime,
  };
}

export function createWarningContext(
  domain: DomainContext,
  existingWarnings: Warning[] = []
): WarningContext {
  return { ...domain, existingWarnings };
}

export function createLinkageContext(
  domain: DomainContext,
  warnings: Warning[] = []
): LinkageContext {
  return { ...domain, warnings };
}

export function createDisposalContext(
  domain: DomainContext,
  warnings: Warning[] = [],
  linkageTriggers: LinkageTrigger[] = []
): DisposalContext {
  return { ...domain, warnings, linkageTriggers };
}

export function createReplayContext(
  domain: DomainContext,
  warnings: Warning[] = [],
  linkageTriggers: LinkageTrigger[] = [],
  disposalRecords: DisposalRecord[] = []
): ReplayContext {
  return { ...domain, warnings, linkageTriggers, disposalRecords };
}

export function createTheaterContext(
  domain: DomainContext,
  warnings: Warning[] = [],
  disposalRecords: DisposalRecord[] = [],
  theaterZones: TheaterZone[] = []
): TheaterContext {
  return { ...domain, warnings, disposalRecords, theaterZones };
}
