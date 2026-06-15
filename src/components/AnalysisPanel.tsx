import { Card, Text, Group, Stack, Badge, ScrollArea, Box } from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';

export function PathInfoPanel() {
  const { paths, selectedPathId, selectPath, towers } = useSimulationStore();

  const getTowerCode = (towerId: string) => {
    const tower = towers.find((t) => t.id === towerId);
    return tower?.code || towerId;
  };

  if (paths.length === 0) {
    return (
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">传递路线</Text>
        <Text c="dimmed" ta="center" py="xl" size="sm">
          暂无可用路线
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
        {paths.map((path, index) => (
          <Card
            key={path.id}
            p="xs"
            radius="sm"
            withBorder
            style={{
              cursor: 'pointer',
              borderColor: path.id === selectedPathId ? '#ffd700' : undefined,
              backgroundColor: path.id === selectedPathId ? '#fffbe6' : undefined,
            }}
            onClick={() => selectPath(path.id)}
          >
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Badge color={path.isOptimal ? 'yellow' : 'violet'}>
                  {path.isOptimal ? '最快路线' : `备用路线 ${index}`}
                </Badge>
                <Text size="xs" c="dimmed">
                  {path.towers.length - 1} 段
                </Text>
              </Group>
              <Text fw={500} size="sm">
                {path.totalTime.toFixed(1)} 秒
              </Text>
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
          </Card>
        ))}
      </Stack>
    </Card>
  );
}

export function AnalysisPanel() {
  const { blindSpots, towerDelays, towers } = useSimulationStore();

  const getTowerCode = (towerId: string) => {
    const tower = towers.find((t) => t.id === towerId);
    return tower?.code || towerId;
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Text fw={600} size="lg" mb="md">分析报告</Text>

      <Stack gap="md">
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>盲区检测</Text>
            <Badge color={blindSpots.length > 0 ? 'red' : 'green'}>
              {blindSpots.length} 处
            </Badge>
          </Group>

          {blindSpots.length > 0 ? (
            <ScrollArea h={120} type="auto">
              <Stack gap="xs">
                {blindSpots.map((spot) => (
                  <Group key={spot.towerId} justify="space-between">
                    <Badge color="red" variant="light">
                      {getTowerCode(spot.towerId)}
                    </Badge>
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
            <Text size="sm" fw={500}>延迟节点</Text>
            <Badge color={towerDelays.some((d) => d.isSevere) ? 'orange' : 'green'}>
              {towerDelays.filter((d) => d.isSevere).length} 个严重
            </Badge>
          </Group>

          {towerDelays.length > 0 ? (
            <ScrollArea h={120} type="auto">
              <Stack gap="xs">
                {towerDelays.map((delay) => (
                  <Group key={delay.towerId} justify="space-between">
                    <Badge
                      color={delay.isSevere ? 'orange' : 'blue'}
                      variant="light"
                    >
                      {getTowerCode(delay.towerId)}
                    </Badge>
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
      </Stack>
    </Card>
  );
}
