import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Divider,
  List,
  ThemeIcon,
  Button,
} from '@mantine/core';
import { EvaluationResult, BeaconTower } from '../types';
import { getNetworkStatus } from '../utils/evaluationEngine';

interface EvaluationPanelProps {
  result: EvaluationResult;
  towers: BeaconTower[];
  missions: any[];
  blindSpots: any[];
  onClose: () => void;
  onReset: () => void;
}

export function EvaluationPanel({ result, towers, missions, blindSpots, onClose, onReset }: EvaluationPanelProps) {
  const networkStatus = getNetworkStatus(towers, missions, blindSpots);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const getTowerCode = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    return tower?.code || '未知';
  };

  const getSignalTypeLabel = (type: string) => {
    switch (type) {
      case 'smoke': return '🌫️ 烟';
      case 'fire': return '🔥 火';
      case 'both': return '🔥🌫️ 烟火';
      default: return type;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    const labels: Record<string, string> = {
      fastest: '⚡ 最快路径',
      shortest: '📍 最短路径',
      mostReliable: '🛡️ 最可靠',
      redundant: '🔄 冗余路径',
    };
    return labels[strategy] || strategy;
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">📊 综合评估结果</Text>
        <Group gap="xs">
          <Badge color={getScoreColor(result.successRate)}>
            成功率 {result.successRate.toFixed(1)}%
          </Badge>
          <Badge color={getScoreColor(networkStatus.overallHealth)}>
            网络健康 {networkStatus.overallHealth.toFixed(0)}%
          </Badge>
        </Group>
      </Group>

      <ScrollArea h={500} type="auto">
        <Stack gap="md">
          <Card p="md" radius="md" bg="#f0fdf4">
            <Group grow>
              <div>
                <Text size="xs" c="dimmed" mb={4}>总模拟时间</Text>
                <Text fw={700} size="xl">{result.totalSimulationTime.toFixed(1)}s</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" mb={4}>敌情总数</Text>
                <Text fw={700} size="xl">{result.totalEnemySources}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" mb={4}>完成/失败</Text>
                <Text fw={700} size="xl">
                  <Text c="green">{result.completedMissions}</Text>
                  <Text c="dimmed" mx="xs">/</Text>
                  <Text c="red">{result.failedMissions}</Text>
                </Text>
              </div>
            </Group>
          </Card>

          <Divider />

          <div>
            <Text fw={500} size="sm" mb="xs">⏱️ 传递时间分析</Text>
            <Group grow>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">平均耗时</Text>
                <Text fw={600}>{result.averageDeliveryTime.toFixed(1)}s</Text>
              </Card>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">最快</Text>
                <Text fw={600} c="green">{result.minDeliveryTime.toFixed(1)}s</Text>
              </Card>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">最慢</Text>
                <Text fw={600} c="red">{result.maxDeliveryTime.toFixed(1)}s</Text>
              </Card>
            </Group>
          </div>

          <Divider />

          <div>
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">🔥 信号类型统计</Text>
            </Group>
            <Group gap="xs">
              {result.signalTypes.map((item) => (
                <Badge key={item.type} color="orange" variant="light" size="lg">
                  {getSignalTypeLabel(item.type)} × {item.count}
                </Badge>
              ))}
            </Group>
          </div>

          <Divider />

          <div>
            <Text fw={500} size="sm" mb="xs">📍 路径策略效果</Text>
            <Stack gap="xs">
              {result.pathStrategyEffectiveness.map((item) => (
                <Card key={item.strategy} p="xs" radius="sm" withBorder>
                  <Group justify="space-between">
                    <Text fw={500} size="sm">{getStrategyLabel(item.strategy)}</Text>
                    <Group gap="xs">
                      <Badge color={item.successRate >= 80 ? 'green' : item.successRate >= 60 ? 'yellow' : 'red'}>
                        成功率 {item.successRate.toFixed(0)}%
                      </Badge>
                      <Badge color="blue" variant="light">
                        平均 {item.avgTime.toFixed(1)}s
                      </Badge>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          </div>

          <Divider />

          <div>
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">⚠️ 关键瓶颈台站</Text>
              <Badge color="orange">{result.bottleneckTowers.length} 个</Badge>
            </Group>
            {result.bottleneckTowers.length > 0 ? (
              <Stack gap="xs">
                {result.bottleneckTowers.map((item, index) => (
                  <Card key={item.towerId} p="xs" radius="sm" withBorder>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Badge color={index === 0 ? 'red' : 'orange'}>
                          #{index + 1}
                        </Badge>
                        <Text fw={500} size="sm">{getTowerCode(item.towerId)}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">延迟 {item.delay.toFixed(1)}s</Text>
                        <Text size="xs" c="dimmed">负载 {item.missionCount}次</Text>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text size="xs" c="green">✓ 无明显瓶颈</Text>
            )}
          </div>

          <Divider />

          {result.criticalTowers.length > 0 && (
            <div>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">🎯 关键节点</Text>
                <Badge color="red">{result.criticalTowers.length} 个</Badge>
              </Group>
              <Group gap="xs" wrap="wrap">
                {result.criticalTowers.map((towerId) => (
                  <Badge key={towerId} color="red" variant="light">
                    {getTowerCode(towerId)}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          <Divider />

          <div>
            <Text fw={500} size="sm" mb="xs">📈 事件统计</Text>
            <Group grow>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">驻军调度</Text>
                <Text fw={600}>{result.totalDispatches} 次</Text>
              </Card>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">天气变化</Text>
                <Text fw={600}>{result.weatherChanges} 次</Text>
              </Card>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">台站故障</Text>
                <Text fw={600} c="red">{result.towerFailures} 次</Text>
              </Card>
              <Card p="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">故障恢复</Text>
                <Text fw={600} c="green">{result.towerRecoveries} 次</Text>
              </Card>
            </Group>
          </div>

          <Divider />

          {result.recommendations.length > 0 && (
            <div>
              <Text fw={500} size="sm" mb="xs">💡 优化建议</Text>
              <List withPadding spacing="xs">
                {result.recommendations.map((rec, index) => (
                  <List.Item
                    key={index}
                    icon={
                      <ThemeIcon color="blue" size={16} radius="xl">
                        💡
                      </ThemeIcon>
                    }
                  >
                    <Text size="sm">{rec}</Text>
                  </List.Item>
                ))}
              </List>
            </div>
          )}
        </Stack>
      </ScrollArea>

      <Divider my="md" />

      <Group grow>
        <Button variant="light" onClick={onClose}>关闭</Button>
        <Button color="blue" onClick={onReset}>重新模拟</Button>
      </Group>
    </Card>
  );
}
