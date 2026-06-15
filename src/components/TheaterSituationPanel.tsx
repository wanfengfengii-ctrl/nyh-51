import { useState, useMemo } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  SimpleGrid,
  Paper,
  Progress,
  ThemeIcon,
  Box,
  ScrollArea,
  Tabs,
  List,
  Divider,
} from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { TheaterZone } from '../types';
import { getRiskColor, getRiskLabel, getCategoryLabel, predictMissionFailure } from '../utils/warningEngine';

export function TheaterSituationPanel() {
  const {
    towers,
    missions,
    enemySources,
    dispatches,
    weather,
    historyEvents,
    snapshots,
    blindSpots,
    simulation,
    warnings,
    theaterZones,
  } = useSimulationStore();

  const [selectedZoneId, setSelectedZone] = useState<string | null>(null);

  const ctx = useMemo(() => ({
    towers,
    missions,
    enemySources,
    dispatches,
    weather,
    historyEvents,
    snapshots,
    blindSpots,
    currentTime: simulation.globalTime,
  }), [towers, missions, enemySources, dispatches, weather, historyEvents, snapshots, blindSpots, simulation.globalTime]);

  const missionPredictions = useMemo(() => predictMissionFailure(ctx), [ctx]);

  const selectedZone = selectedZoneId ? theaterZones.find(z => z.id === selectedZoneId) : null;

  const minX = towers.length > 0 ? Math.min(...towers.map(t => t.x)) : 0;
  const maxX = towers.length > 0 ? Math.max(...towers.map(t => t.x)) : 800;
  const minY = towers.length > 0 ? Math.min(...towers.map(t => t.y)) : 0;
  const maxY = towers.length > 0 ? Math.max(...towers.map(t => t.y)) : 600;
  const width = Math.max(400, maxX - minX + 100);
  const height = Math.max(300, maxY - minY + 100);

  const getZoneColor = (zone: TheaterZone, alpha: number = 0.5) => {
    if (zone.riskScore >= 70) return `rgba(239, 68, 68, ${alpha})`;
    if (zone.riskScore >= 45) return `rgba(249, 115, 22, ${alpha})`;
    if (zone.riskScore >= 25) return `rgba(234, 179, 8, ${alpha})`;
    return `rgba(34, 197, 94, ${alpha})`;
  };

  if (theaterZones.length === 0) {
    return (
      <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed">🗺️ 暂无战区数据，请先添加烽火台</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Card p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" color="red" variant="light">⚔️</ThemeIcon>
            <Text fw={600}>战区风险态势图</Text>
          </Group>
          <Group gap="xs">
            <Badge color="green" variant="light">低风险 0-25</Badge>
            <Badge color="yellow" variant="light">中风险 25-45</Badge>
            <Badge color="orange" variant="light">高风险 45-70</Badge>
            <Badge color="red" variant="light">紧急 70+</Badge>
          </Group>
        </Group>

        <Box
          style={{
            position: 'relative',
            width: '100%',
            height: 320,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #2a3a5c',
          }}
        >
          <svg width="100%" height="100%" viewBox={`${minX - 50} ${minY - 50} ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            {theaterZones.map(zone => {
              const rw = zone.bounds.maxX - zone.bounds.minX;
              const rh = zone.bounds.maxY - zone.bounds.minY;
              const isSelected = selectedZoneId === zone.id;
              return (
                <g key={zone.id}>
                  <rect
                    x={zone.bounds.minX}
                    y={zone.bounds.minY}
                    width={rw}
                    height={rh}
                    fill={getZoneColor(zone, 0.4)}
                    stroke={isSelected ? '#ffd700' : '#4a6fa5'}
                    strokeWidth={isSelected ? 3 : 1}
                    strokeDasharray={isSelected ? '' : '5,3'}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                  />
                  <text
                    x={zone.bounds.minX + rw / 2}
                    y={zone.bounds.minY + rh / 2 - 16}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="bold"
                    fill="#e0e0e0"
                    pointerEvents="none"
                  >
                    {zone.name}
                  </text>
                  <text
                    x={zone.bounds.minX + rw / 2}
                    y={zone.bounds.minY + rh / 2 + 6}
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="bold"
                    fill={zone.riskScore >= 70 ? '#ff4444' : zone.riskScore >= 45 ? '#ff9944' : '#44ff44'}
                    pointerEvents="none"
                  >
                    {zone.riskScore}
                  </text>
                  <text
                    x={zone.bounds.minX + rw / 2}
                    y={zone.bounds.minY + rh / 2 + 22}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#aaaaaa"
                    pointerEvents="none"
                  >
                    {getRiskLabel(zone.riskLevel)}
                  </text>
                </g>
              );
            })}

            {towers.map(tower => {
              const isDisabled = tower.isDisabled;
              const zone = theaterZones.find(z => z.towerIds.includes(tower.id));
              const isZoneSelected = zone ? selectedZoneId === zone.id : false;
              return (
                <g key={tower.id}>
                  <circle
                    cx={tower.x}
                    cy={tower.y}
                    r={8}
                    fill={isDisabled ? '#666' : '#ff6b35'}
                    stroke={isZoneSelected ? '#ffd700' : '#333'}
                    strokeWidth={isZoneSelected ? 3 : 1.5}
                  />
                  <text
                    x={tower.x}
                    y={tower.y - 14}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#e0e0e0"
                  >
                    {tower.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>
      </Card>

      <SimpleGrid cols={theaterZones.length}>
        {theaterZones.map(zone => {
          const isSelected = selectedZoneId === zone.id;
          return (
            <Paper
              key={zone.id}
              p="sm"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid #ffd700' : undefined,
                background: isSelected ? '#1a1a2e' : undefined,
              }}
              onClick={() => setSelectedZone(isSelected ? null : zone.id)}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">{zone.name}</Text>
                <Badge color={getRiskColor(zone.riskLevel)}>
                  {zone.riskScore}分
                </Badge>
              </Group>
              <Progress value={zone.riskScore} color={getRiskColor(zone.riskLevel)} size="sm" mb="xs" />
              <Group grow>
                <div>
                  <Text size="xs" c="dimmed">敌情</Text>
                  <Text fw={600} size="sm" c="orange">{zone.activeEnemyCount}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">失败</Text>
                  <Text fw={600} size="sm" c="red">{zone.failedMissionCount}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">故障</Text>
                  <Text fw={600} size="sm" c="yellow">{zone.disabledTowerCount}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">薄弱</Text>
                  <Text fw={600} size="sm" c="grape">{zone.lowGarrisonCount}</Text>
                </div>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>

      {selectedZone && (
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>📍 {selectedZone.name} 详细态势</Text>
            <Badge color={getRiskColor(selectedZone.riskLevel)} size="lg">
              {getRiskLabel(selectedZone.riskLevel)} {selectedZone.riskScore}分
            </Badge>
          </Group>

          <Tabs defaultValue="hotspot">
            <Tabs.List>
              <Tabs.Tab value="hotspot">失败热点</Tabs.Tab>
              <Tabs.Tab value="bottleneck">关键瓶颈</Tabs.Tab>
              <Tabs.Tab value="weakbelt">驻军薄弱带</Tabs.Tab>
              <Tabs.Tab value="prediction">传递预测</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="hotspot" pt="sm">
              {selectedZone.failureHotspots.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">✅ 本战区暂无失败热点</Text>
              ) : (
                <Stack gap="xs">
                  {selectedZone.failureHotspots.map((hs, idx) => (
                    <Paper key={hs.towerId} p="sm" radius="sm" withBorder>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Badge color="red" variant="filled">#{idx + 1}</Badge>
                          <Text fw={600} size="sm">{hs.towerCode}</Text>
                        </Group>
                        <Badge color="red" variant="light">
                          故障 {hs.failureCount} 次 · 失败率 {(hs.failureRate * 100).toFixed(0)}%
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="bottleneck" pt="sm">
              {selectedZone.bottleneckTowers.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">✅ 本战区暂无关键瓶颈台站</Text>
              ) : (
                <Stack gap="xs">
                  {selectedZone.bottleneckTowers.map((tid) => {
                    const tower = towers.find(t => t.id === tid);
                    if (!tower) return null;
                    const towerWarnings = warnings.filter(w =>
                      w.affectedScope.towerIds.includes(tid) && w.status === 'active'
                    );
                    return (
                      <Paper key={tid} p="sm" radius="sm" withBorder>
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Badge color="orange" variant="filled">瓶颈</Badge>
                            <Text fw={600} size="sm">{tower.code}</Text>
                          </Group>
                          <Group gap="xs">
                            {towerWarnings.map(w => (
                              <Badge key={w.id} color={getRiskColor(w.riskLevel)} variant="light" size="sm">
                                {getCategoryLabel(w.category)}
                              </Badge>
                            ))}
                          </Group>
                        </Group>
                        <Text size="xs" c="dimmed" mt="xs">
                          驻军 {tower.garrisonCount}/{tower.baseGarrisonCount} · 延迟 {tower.signalDelay}s
                          {tower.isDisabled && ' · 故障中'}
                        </Text>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="weakbelt" pt="sm">
              {selectedZone.garrisonWeakBelt.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">✅ 本战区驻军分布较均衡</Text>
              ) : (
                <Stack gap="xs">
                  {selectedZone.garrisonWeakBelt.map((belt, idx) => (
                    <Paper key={idx} p="sm" radius="sm" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <ThemeIcon size="sm" color="grape" variant="light">⚠️</ThemeIcon>
                          <Text fw={600} size="sm">驻军薄弱带 - {belt.direction}</Text>
                        </Group>
                        <Badge color="grape" variant="light">
                          平均驻军比 {(belt.avgGarrisonRatio * 100).toFixed(0)}%
                        </Badge>
                      </Group>
                      <Group gap="xs">
                        {belt.towerIds.map(tid => {
                          const t = towers.find(tw => tw.id === tid);
                          return t ? (
                            <Badge key={tid} variant="light" color="grape">
                              {t.code} ({t.garrisonCount}/{t.baseGarrisonCount})
                            </Badge>
                          ) : null;
                        })}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="prediction" pt="sm">
              {missionPredictions.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">✅ 本战区无高风险传递任务</Text>
              ) : (
                <ScrollArea h={300} type="auto">
                  <Stack gap="xs">
                    {missionPredictions
                      .filter(p => {
                        const mission = missions.find(m => m.id === p.missionId);
                        return mission && mission.path.towers.some(tid => selectedZone.towerIds.includes(tid));
                      })
                      .map(pred => {
                        const mission = missions.find(m => m.id === pred.missionId);
                        const source = mission ? enemySources.find(e => e.id === mission.enemySourceId) : null;
                        return (
                          <Paper key={pred.missionId} p="sm" radius="sm" withBorder>
                            <Group justify="space-between" mb="xs">
                              <Text fw={600} size="sm">
                                传递任务 {source?.name || '未知'}
                              </Text>
                              <Badge color={pred.failureProbability >= 60 ? 'red' : pred.failureProbability >= 30 ? 'orange' : 'yellow'} variant="filled">
                                失败概率 {pred.failureProbability}%
                              </Badge>
                            </Group>
                            <Progress
                              value={pred.failureProbability}
                              color={pred.failureProbability >= 60 ? 'red' : pred.failureProbability >= 30 ? 'orange' : 'yellow'}
                              size="sm"
                              mb="xs"
                            />
                            <List withPadding size="xs" spacing={2}>
                              {pred.contributingFactors.map((f, i) => (
                                <List.Item key={i} c="dimmed">{f.description}</List.Item>
                              ))}
                            </List>
                            {pred.recommendedActions.length > 0 && (
                              <>
                                <Divider my="xs" />
                                <Text size="xs" fw={500} mb={4}>💡 建议措施：</Text>
                                {pred.recommendedActions.map((a, i) => (
                                  <Text key={i} size="xs" c="blue">• {a.description}</Text>
                                ))}
                              </>
                            )}
                          </Paper>
                        );
                      })}
                  </Stack>
                </ScrollArea>
              )}
            </Tabs.Panel>
          </Tabs>
        </Card>
      )}
    </Stack>
  );
}
