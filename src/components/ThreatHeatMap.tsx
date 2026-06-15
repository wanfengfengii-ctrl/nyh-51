import { useMemo, useState } from 'react';
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
} from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { calculateRegionHeatData, getRiskColor, getRiskLevel, getRiskLabel } from '../utils/warningEngine';

export function ThreatHeatMap() {
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
  } = useSimulationStore();

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const regionData = useMemo(() => {
    const ctx = {
      towers,
      missions,
      enemySources,
      dispatches,
      weather,
      historyEvents,
      snapshots,
      blindSpots,
      currentTime: simulation.globalTime,
    };
    return calculateRegionHeatData(ctx, 4);
  }, [towers, missions, enemySources, dispatches, weather, historyEvents, snapshots, blindSpots, simulation.globalTime]);

  if (regionData.length === 0) {
    return (
      <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed">🗺️ 暂无数据，请先添加烽火台</Text>
      </Card>
    );
  }

  const minX = Math.min(...towers.map(t => t.x));
  const maxX = Math.max(...towers.map(t => t.x));
  const minY = Math.min(...towers.map(t => t.y));
  const maxY = Math.max(...towers.map(t => t.y));
  const width = Math.max(400, maxX - minX + 100);
  const height = Math.max(300, maxY - minY + 100);

  const getHeatColor = (score: number, alpha: number = 0.6) => {
    if (score >= 70) return `rgba(239, 68, 68, ${alpha})`;
    if (score >= 45) return `rgba(249, 115, 22, ${alpha})`;
    if (score >= 25) return `rgba(234, 179, 8, ${alpha})`;
    return `rgba(34, 197, 94, ${alpha})`;
  };

  const selected = selectedRegion ? regionData.find(r => r.regionId === selectedRegion) : null;

  return (
    <Stack gap="md">
      <Card p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" color="orange" variant="light">🗺️</ThemeIcon>
            <Text fw={600}>区域威胁热度分布</Text>
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
            background: 'linear-gradient(135deg, #f5e6c8 0%, #e8d5a0 100%)',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #d4c4a0',
          }}
        >
          <svg width="100%" height="100%" viewBox={`${minX - 50} ${minY - 50} ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            {regionData.map(region => {
              const rw = region.bounds.maxX - region.bounds.minX;
              const rh = region.bounds.maxY - region.bounds.minY;
              const isSelected = selectedRegion === region.regionId;
              return (
                <g key={region.regionId}>
                  <rect
                    x={region.bounds.minX}
                    y={region.bounds.minY}
                    width={rw}
                    height={rh}
                    fill={getHeatColor(region.heatScore, 0.5)}
                    stroke={isSelected ? '#1e40af' : '#8b7355'}
                    strokeWidth={isSelected ? 3 : 1}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setSelectedRegion(isSelected ? null : region.regionId)}
                  />
                  <text
                    x={region.bounds.minX + rw / 2}
                    y={region.bounds.minY + rh / 2 - 10}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill="#3d2914"
                    pointerEvents="none"
                  >
                    {region.regionName}
                  </text>
                  <text
                    x={region.bounds.minX + rw / 2}
                    y={region.bounds.minY + rh / 2 + 12}
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="bold"
                    fill="#3d2914"
                    pointerEvents="none"
                  >
                    {region.heatScore}
                  </text>
                </g>
              );
            })}

            {towers.map(tower => {
              const isDisabled = tower.isDisabled;
              const region = regionData.find(r => r.towerIds.includes(tower.id));
              return (
                <g key={tower.id}>
                  <circle
                    cx={tower.x}
                    cy={tower.y}
                    r={10}
                    fill={isDisabled ? '#808080' : '#8b4513'}
                    stroke="#3d2914"
                    strokeWidth={2}
                  />
                  <text
                    x={tower.x}
                    y={tower.y - 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#3d2914"
                  >
                    {tower.code}
                  </text>
                  {region && selectedRegion === region.regionId && (
                    <circle
                      cx={tower.x}
                      cy={tower.y}
                      r={18}
                      fill="none"
                      stroke="#1e40af"
                      strokeWidth={2}
                      strokeDasharray="3,3"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </Box>
      </Card>

      <SimpleGrid cols={regionData.length}>
        {regionData.map(region => {
          const riskLevel = getRiskLevel(region.heatScore);
          const isSelected = selectedRegion === region.regionId;
          return (
            <Paper
              key={region.regionId}
              p="sm"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid #1e40af' : undefined,
                background: isSelected ? '#eff6ff' : undefined,
              }}
              onClick={() => setSelectedRegion(isSelected ? null : region.regionId)}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">{region.regionName}</Text>
                <Badge color={getRiskColor(riskLevel)}>
                  {region.heatScore}分
                </Badge>
              </Group>
              <Progress
                value={region.heatScore}
                color={getRiskColor(riskLevel)}
                size="sm"
                mb="xs"
              />
              <Group grow>
                <div>
                  <Text size="xs" c="dimmed">台站数</Text>
                  <Text fw={600} size="sm">{region.towerCount}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">敌情</Text>
                  <Text fw={600} size="sm" c="orange">{region.activeEnemyCount}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">失败率</Text>
                  <Text fw={600} size="sm" c="red">{region.failureRate}%</Text>
                </div>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>

      {selected && (
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>
              📍 {selected.regionName} 区域详情
            </Text>
            <Badge color={getRiskColor(getRiskLevel(selected.heatScore))} size="lg">
              {getRiskLabel(getRiskLevel(selected.heatScore))}
            </Badge>
          </Group>

          <SimpleGrid cols={4}>
            <div>
              <Text size="xs" c="dimmed">威胁热度</Text>
              <Text fw={700} size="xl">{selected.heatScore}分</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">烽火台数量</Text>
              <Text fw={700} size="xl">{selected.towerCount}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">活动敌情</Text>
              <Text fw={700} size="xl" c="orange">{selected.activeEnemyCount}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">任务失败率</Text>
              <Text fw={700} size="xl" c="red">{selected.failureRate}%</Text>
            </div>
          </SimpleGrid>

          {selected.avgTransmissionTime > 0 && (
            <Text size="sm" mt="sm" c="dimmed">
              ⏱️ 平均传递时间：{selected.avgTransmissionTime}s
            </Text>
          )}

          {selected.towerIds.length > 0 && (
            <>
              <Text size="sm" fw={500} mt="sm" mb="xs">包含台站：</Text>
              <Group gap="xs" wrap="wrap">
                {selected.towerIds.map(tid => {
                  const t = towers.find(tw => tw.id === tid);
                  if (!t) return null;
                  return (
                    <Badge key={tid} variant="light" color={t.isDisabled ? 'gray' : 'blue'}>
                      {t.code}
                    </Badge>
                  );
                })}
              </Group>
            </>
          )}
        </Card>
      )}
    </Stack>
  );
}
