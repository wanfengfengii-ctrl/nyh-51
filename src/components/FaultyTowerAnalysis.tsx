import { useMemo, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Paper,
  Progress,
  ThemeIcon,
  SimpleGrid,
  Divider,
  List,
  Tabs,
} from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useSimulationStore } from '../store/useSimulationStore';
import { FaultyTowerStats, FailurePrediction } from '../types';
import {
  calculateFaultyTowerStats,
  predictFailures,
  getRiskColor,
  getRiskLevel,
  getRiskLabel,
} from '../utils/warningEngine';

export function FaultyTowerAnalysis() {
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

  const [activeTab, setActiveTab] = useState<string | null>('stats');

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

  const faultyStats = useMemo(() => calculateFaultyTowerStats(ctx), [ctx]);
  const predictions = useMemo(() => predictFailures(ctx, 60), [ctx]);

  const chartData = useMemo(() => {
    return faultyStats.slice(0, 8).map(stat => ({
      code: stat.towerCode,
      故障次数: stat.failureCount,
      影响任务: stat.affectedMissionCount,
      总停机: Math.round(stat.totalDowntime),
    }));
  }, [faultyStats]);

  if (faultyStats.length === 0 && predictions.length === 0) {
    return (
      <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed">✅ 当前无故障台站记录</Text>
        <Text size="sm" c="dimmed" mt="xs">运行模拟后，系统将自动统计故障数据并进行预测</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={3}>
        <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #ef4444' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">🏚️ 故障台站总数</Text>
              <Text fw={700} size="xl">{faultyStats.length}</Text>
            </div>
            <ThemeIcon size="xl" color="red" variant="light">🏚️</ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #f97316' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">⏱️ 累计停机时间</Text>
              <Text fw={700} size="xl">
                {faultyStats.reduce((sum, s) => sum + s.totalDowntime, 0).toFixed(0)}s
              </Text>
            </div>
            <ThemeIcon size="xl" color="orange" variant="light">⏱️</ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #eab308' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">🔮 待预测台站</Text>
              <Text fw={700} size="xl">{predictions.length}</Text>
            </div>
            <ThemeIcon size="xl" color="yellow" variant="light">🔮</ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="stats" leftSection="📊">故障统计</Tabs.Tab>
          <Tabs.Tab value="prediction" leftSection="🔮">故障预测</Tabs.Tab>
          <Tabs.Tab value="chart" leftSection="📈">数据图表</Tabs.Tab>
        </Tabs.List>

        <Divider my="sm" />

        <Tabs.Panel value="stats" pt="xs">
          <ScrollArea h={380} type="auto">
            <Stack gap="sm">
              {faultyStats.length === 0 ? (
                <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                  <Text c="dimmed">暂无故障记录</Text>
                </Card>
              ) : (
                faultyStats.map((stat, index) => (
                  <TowerFaultCard key={stat.towerId} stat={stat} rank={index + 1} />
                ))
              )}
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="prediction" pt="xs">
          <ScrollArea h={380} type="auto">
            <Stack gap="sm">
              {predictions.length === 0 ? (
                <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                  <Text c="dimmed">✅ 未来 60 秒内无高风险故障预测</Text>
                </Card>
              ) : (
                predictions.map(pred => (
                  <PredictionCard key={pred.towerId} prediction={pred} />
                ))
              )}
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="chart" pt="xs">
          {chartData.length === 0 ? (
            <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
              <Text c="dimmed">暂无数据可展示</Text>
            </Card>
          ) : (
            <SimpleGrid cols={1}>
              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="sm">📊 台站故障次数统计 Top 8</Text>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="故障次数" fill="#ef4444" />
                      <Bar dataKey="影响任务" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="sm">📈 累计停机时间对比 (秒)</Text>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="总停机" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function TowerFaultCard({ stat, rank }: { stat: FaultyTowerStats; rank: number }) {
  const riskLevel = getRiskLevel(stat.riskScore);

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Badge color={rank === 1 ? 'red' : rank === 2 ? 'orange' : rank === 3 ? 'yellow' : 'gray'}>
            #{rank}
          </Badge>
          <Text fw={600}>{stat.towerCode}</Text>
          <Text size="sm" c="dimmed">{stat.towerName}</Text>
        </Group>
        <Badge color={getRiskColor(riskLevel)} variant="filled">
          {getRiskLabel(riskLevel)} {stat.riskScore}分
        </Badge>
      </Group>

      <SimpleGrid cols={4}>
        <div>
          <Text size="xs" c="dimmed">故障次数</Text>
          <Text fw={600} c="red">{stat.failureCount} 次</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">累计停机</Text>
          <Text fw={600}>{stat.totalDowntime.toFixed(0)}s</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">平均恢复</Text>
          <Text fw={600}>{stat.avgRecoveryTime.toFixed(1)}s</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">影响任务</Text>
          <Text fw={600} c="orange">{stat.affectedMissionCount}</Text>
        </div>
      </SimpleGrid>

      {stat.failureReasons.length > 0 && (
        <>
          <Divider my="sm" />
          <Text size="sm" fw={500} mb="xs">故障原因分布：</Text>
          <Group gap="xs" wrap="wrap">
            {stat.failureReasons.map((reason, idx) => (
              <Badge key={idx} variant="light" color="red">
                {reason.reason} × {reason.count}
              </Badge>
            ))}
          </Group>
        </>
      )}
    </Paper>
  );
}

function PredictionCard({ prediction }: { prediction: FailurePrediction }) {
  const riskLevel = prediction.failureProbability >= 60 ? 'high' : prediction.failureProbability >= 30 ? 'medium' : 'low';

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ThemeIcon color={getRiskColor(riskLevel as any)} variant="light">🔮</ThemeIcon>
          <Text fw={600}>{prediction.towerCode}</Text>
          <Text size="sm" c="dimmed">未来 {prediction.timeWindowEnd - prediction.timeWindowStart}s 内</Text>
        </Group>
        <Badge color={getRiskColor(riskLevel as any)} variant="filled">
          故障概率 {prediction.failureProbability}%
        </Badge>
      </Group>

      <Progress
        value={prediction.failureProbability}
        color={getRiskColor(riskLevel as any)}
        size="md"
        mb="sm"
      />

      <Group justify="space-between" mb="xs">
        <Text size="sm">
          🎯 预测置信度：<Text fw={600}>{prediction.confidence}%</Text>
        </Text>
      </Group>

      {prediction.contributingFactors.length > 0 && (
        <List withPadding size="sm" spacing={4}>
          <Text size="sm" fw={500}>风险因素：</Text>
          {prediction.contributingFactors.map((factor, idx) => (
            <List.Item key={idx} c="dimmed">
              {factor}
            </List.Item>
          ))}
        </List>
      )}
    </Paper>
  );
}
