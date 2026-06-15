import { v4 as uuidv4 } from 'uuid';

export type IDNamespace =
  | 'tower'
  | 'path'
  | 'enemy'
  | 'mission'
  | 'dispatch'
  | 'weather'
  | 'event'
  | 'snapshot'
  | 'warning'
  | 'suggestion'
  | 'zone'
  | 'linkage'
  | 'action'
  | 'disposal'
  | 'replay'
  | 'report'
  | 'chain'
  | 'optimization';

export type PrefixedID<NS extends IDNamespace> = `${NS}_${string}`;

export function createId<NS extends IDNamespace>(namespace: NS): PrefixedID<NS> {
  return `${namespace}_${uuidv4().replace(/-/g, '')}` as PrefixedID<NS>;
}

export function createIds<NS extends IDNamespace>(
  namespace: NS,
  count: number
): Array<PrefixedID<NS>> {
  return Array.from({ length: count }, () => createId(namespace));
}

export function isValidId<NS extends IDNamespace>(
  id: string,
  namespace: NS
): id is PrefixedID<NS> {
  return id.startsWith(`${namespace}_`);
}

export function extractNamespace(id: string): IDNamespace | null {
  const match = id.match(/^([a-z]+)_/);
  return match ? (match[1] as IDNamespace) : null;
}

export type TowerID = PrefixedID<'tower'>;
export type PathID = PrefixedID<'path'>;
export type EnemyID = PrefixedID<'enemy'>;
export type MissionID = PrefixedID<'mission'>;
export type DispatchID = PrefixedID<'dispatch'>;
export type WeatherID = PrefixedID<'weather'>;
export type EventID = PrefixedID<'event'>;
export type SnapshotID = PrefixedID<'snapshot'>;
export type WarningID = PrefixedID<'warning'>;
export type SuggestionID = PrefixedID<'suggestion'>;
export type ZoneID = PrefixedID<'zone'>;
export type LinkageID = PrefixedID<'linkage'>;
export type ActionID = PrefixedID<'action'>;
export type DisposalID = PrefixedID<'disposal'>;
export type ReplayID = PrefixedID<'replay'>;
export type ReportID = PrefixedID<'report'>;
export type ChainID = PrefixedID<'chain'>;
export type OptimizationID = PrefixedID<'optimization'>;

export const ID = {
  tower: () => createId('tower'),
  path: () => createId('path'),
  enemy: () => createId('enemy'),
  mission: () => createId('mission'),
  dispatch: () => createId('dispatch'),
  weather: () => createId('weather'),
  event: () => createId('event'),
  snapshot: () => createId('snapshot'),
  warning: () => createId('warning'),
  suggestion: () => createId('suggestion'),
  zone: () => createId('zone'),
  linkage: () => createId('linkage'),
  action: () => createId('action'),
  disposal: () => createId('disposal'),
  replay: () => createId('replay'),
  report: () => createId('report'),
  chain: () => createId('chain'),
  optimization: () => createId('optimization'),
};
