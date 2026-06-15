import { Card, Text, Group, Stack, Badge, ScrollArea, Box } from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { ENEMY_COLORS } from '../constants';

export function PathInfoPanel() {
  const { paths, selectedPathId, selectPath, towers, enemySources } = useSimulationStore();

  const getTowerCode = (towerId: string) => {
    const tower = towers.find((t) => t.id === towerId);
    return tower?.code || towerId;
  };

  const getSourceName = (enemySourceId?: string) => {
    if (!enemySourceId) return '通用';
    const source = enemySources.find(s => s.id === enemySourceId);
    return source?.name || '未知';
  };

  const getPathStrategyLabel = (path: typeof paths[0]) => {
    const source = enemySources.find(s => s.id === path.enemySourceId);
    if (source) {
      const strategyLabels: Record<string, string> = {
        fastest: '最快路线',
        shortest: '最短路线',
        mostReliable: '最可靠路线',
        redundant: '冗余路线',
      };
      return strategyLabels[source.level.pathStrategy] || '常规路线';
    }
    return path.isOptimal ? '最快路线' : '备用路线';
  };

  if (paths.length === 0) {
    return (
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">传递路线</Text>
        <Text c="dimmed" ta="center" py="xl" size="sm">
          暂无可用路线，请添加敌情源
        </Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">传递路线</Text>
        <Text size="sm" c="dimmed">共 {paths.length} 条</Text>
      </Group>

      <Stack gap="xs">
        {paths.map((path) => {
          const source = enemySources.find(s => s.id === path.enemySourceId);
          const color = source ? ENEMY_COLORS[enemySources.indexOf(source) % ENEMY_COLORS.length] : undefined;
          
          return (
            <Card
              key={path.id}
              p="xs"
              radius="sm"
              withBorder
              style={{
                cursor: 'pointer',
                borderColor: path.id === selectedPathId ? (color || '#ffd700') : undefined,
                backgroundColor: path.id === selectedPathId ? (color ? `${color}15` : '#fffbe6') : undefined,
              }}
              onClick={() => selectPath(path.id)}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs" wrap="nowrap">
                  {color && (
                    <div 
                      style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: color 
                      }} 
                    />
                  )}
                  <Badge color={path.id === selectedPathId ? 'yellow' : 'violet'}>
                    {getPathStrategyLabel(path)}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {path.towers.length - 1} 段
                  </Text>
                </Group>
                <Stack gap={0} align="flex-end">
                  <Text fw={500} size="sm">
                    {path.totalTime.toFixed(1)} 秒
                  </Text>
                  {path.reliability !== undefined && (
                    <Text size="xs" c="dimmed">
                      可靠性: {Math.round(path.reliability * 100)}%
                    </Text>
                  )}
                </Stack>
              </Group>

              <Group gap={4} wrap="nowrap">
                <Text size="xs" c="dimmed">路径：</Text>
                <ScrollArea type="auto" scrollbarSize={4} h={28} style={{ flex: 1 }}>
                  <Box style={{ whiteSpace: 'nowrap' }}>
                    {path.towers.map((towerId, i) => (
                      <span key={towerId}>
                        <Badge
                          size="xs"
                          color={
                            i === 0
                              ? 'green'
                              : i === path.towers.length - 1
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {getTowerCode(towerId)}
                        </Badge>
                        {i < path.towers.length - 1 && (
                          <Text component="span" mx={4} size="xs">
                            →
                          </Text>
                        )}
                      </span>
                    ))}
                  </Box>
                </ScrollArea>
              </Group>

              {path.enemySourceId && (
                <Text size="xs" c="dimmed" mt="xs">
                  关联任务: {getSourceName(path.enemySourceId)}
                </Text>
              )}
            </Card>
          );
        })}
      </Stack>
    </Card>
  );
}

export function AnalysisPanel() {
  const { blindSpots, towerDelays, towers, missions, dispatches, weatherEvents, enemySources } = useSimulationStore();

  const getTowerCode = (towerId: string) => {
    const tower = towers.find((t) => t.id === towerId);
    return tower?.code || towerId;
  };

  const stats = {
    totalTowers: towers.length,
    activeTowers: towers.filter(t => t.isActive && t.garrisonCount > 0 && !t.isDisabled).length,
    disabledTowers: towers.filter(t => t.isDisabled).length,
    noGarrison: towers.filter(t => t.isActive && t.garrisonCount <= 0).length,
    activeMissions: missions.filter(m => m.status === 'running').length,
    completedMissions: missions.filter(m => m.status === 'completed').length,
    failedMissions: missions.filter(m => m.status === 'failed').length,
    activeDispatches: dispatches.filter(d => d.status !== 'completed').length,
    weatherChanges: weatherEvents.length,
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">联防分析</Text>
        <Badge color="blue">
          {enemySources.length} 敌情源
        </Badge>
      </Group>

      <Stack gap="md">
        <Group grow>
          <Card p="xs" radius="sm" bg="green.0" withBorder>
            <Text size="xs" c="dimmed">正常台站</Text>
            <Text fw={700} size="lg" c="green">
              {stats.activeTowers}/{stats.totalTowers}
            </Text>
          </Card>
          <Card p="xs" radius="sm" bg="red.0" withBorder>
            <Text size="xs" c="dimmed">故障/无防</Text>
            <Text fw={700} size="lg" c="red">
              {stats.disabledTowers + stats.noGarrison}
            </Text>
          </Card>
          <Card p="xs" radius="sm" bg="blue.0" withBorder>
            <Text size="xs" c="dimmed">任务状态</Text>
            <Text fw={700} size="lg" c="blue">
              {stats.completedMissions}/{missions.length}
            </Text>
          </Card>
        </Group>

        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>盲区检测</Text>
            <Badge color={blindSpots.length > 0 ? 'red' : 'green'}>
              {blindSpots.length} 处
            </Badge>
          </Group>

          {blindSpots.length > 0 ? (
            <ScrollArea h={100} type="auto">
              <Stack gap="xs">
                {blindSpots.map((spot) => (
                  <Group key={spot.towerId} justify="space-between">
                    <Group gap="xs">
                      <Badge color="red" variant="light">
                        {getTowerCode(spot.towerId)}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        首次发现: {spot.firstDetected.toFixed(1)}s
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">{spot.reason}</Text>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Text size="xs" c="green">✓ 无盲区，信号全覆盖</Text>
          )}
        </div>

        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>瓶颈台站</Text>
            <Badge color={towerDelays.some((d) => d.isSevere) ? 'orange' : 'green'}>
              {towerDelays.filter((d) => d.isSevere).length} 个严重
            </Badge>
          </Group>

          {towerDelays.length > 0 ? (
            <ScrollArea h={100} type="auto">
              <Stack gap="xs">
                {towerDelays.map((delay) => (
                  <Group key={delay.towerId} justify="space-between">
                    <Group gap="xs">
                      <Badge
                        color={delay.isSevere ? 'orange' : 'blue'}
                        variant="light"
                      >
                        {getTowerCode(delay.towerId)}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        承担 {delay.missionCount} 个任务
                      </Text>
                    </Group>
                    <Text size="xs" fw={500}>
                      {delay.delay.toFixed(1)} 秒
                    </Text>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Text size="xs" c="dimmed">暂无延迟数据</Text>
          )}
        </div>

        {stats.activeDispatches > 0 && (
          <Card p="xs" radius="sm" bg="green.0" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>驻军调度</Text>
              <Badge color="green">{stats.activeDispatches} 进行中</Badge>
            </Group>
            <ScrollArea h={80} type="auto">
              <Stack gap="xs">
                {dispatches.filter(d => d.status !== 'completed').map((dispatch) => (
                  <Group key={dispatch.id} justify="space-between">
                    <Text size="xs">
                      {getTowerCode(dispatch.fromTowerId)} → {getTowerCode(dispatch.toTowerId)}
                    </Text>
                    <Group gap="xs">
                      <Badge size="xs" color="green">+{dispatch.count}</Badge>
                      <Badge size="xs" color={dispatch.status === 'active' ? 'orange' : 'gray'}>
                        {dispatch.status === 'active' ? '途中' : '待发'}
                      </Badge>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
        )}

        {stats.weatherChanges > 0 && (
          <Group justify="space-between">
            <Text size="sm" fw={500}>天气变化</Text>
            <Badge color="blue">{stats.weatherChanges} 次</Badge>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
