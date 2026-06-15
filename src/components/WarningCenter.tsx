import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Tabs,
  Button,
  Divider,
  Progress,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  Grid,
  SimpleGrid,
  RingProgress,
  List,
  Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';
import { WarningStatus, WarningCategory, RiskLevel } from '../types';
import {
  getRiskColor,
  getRiskLabel,
  getRiskIcon,
  getCategoryLabel,
  getCategoryIcon,
  getStatusLabel,
} from '../utils/warningEngine';
import { ThreatHeatMap } from './ThreatHeatMap';
import { FaultyTowerAnalysis } from './FaultyTowerAnalysis';
import { WarningDetailModal } from './WarningDetailModal';

const statusFilterOptions: { value: WarningStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '活动中' },
  { value: 'acknowledged', label: '已确认' },
  { value: 'resolved', label: '已解决' },
  { value: 'expired', label: '已过期' },
];

const categoryFilterOptions: { value: WarningCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: '全部类别', icon: '📋' },
  { value: 'enemy_threat', label: '敌情威胁', icon: '⚔️' },
  { value: 'weather_risk', label: '天气风险', icon: '🌤️' },
  { value: 'garrison_insufficient', label: '驻军不足', icon: '👥' },
  { value: 'tower_failure', label: '台站故障', icon: '🏚️' },
  { value: 'transmission_risk', label: '传递风险', icon: '📡' },
  { value: 'path_bottleneck', label: '路径瓶颈', icon: '🚧' },
  { value: 'blind_spot', label: '信号盲区', icon: '👁️‍🗨️' },
];

interface WarningCenterProps {
  onClose: () => void;
}

export function WarningCenter({ onClose }: WarningCenterProps) {
  const {
    warnings,
    lastAssessment,
    lastNewWarningIds,
    towers,
    simulation,
    runWarningAssessment,
    acknowledgeWarning,
    resolveWarning,
    dispatchGarrison,
  } = useSimulationStore();

  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [statusFilter, setStatusFilter] = useState<WarningStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<WarningCategory | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(null);
  const notifiedWarningIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    runWarningAssessment();
  }, [runWarningAssessment]);

  useEffect(() => {
    if (lastNewWarningIds.length === 0) return;

    lastNewWarningIds.forEach(warningId => {
      if (notifiedWarningIdsRef.current.has(warningId)) return;
      notifiedWarningIdsRef.current.add(warningId);

      const warning = warnings.find(w => w.id === warningId);
      if (!warning) return;

      const isHighPriority = warning.riskLevel === 'critical' || warning.riskLevel === 'high';
      if (!isHighPriority) return;

      notifications.show({
        id: warning.id,
        title: `${getRiskIcon(warning.riskLevel)} ${warning.title}`,
        message: warning.summary,
        color: getRiskColor(warning.riskLevel),
        autoClose: warning.riskLevel === 'critical' ? false : 5000,
        withCloseButton: true,
        onClick: () => {
          setSelectedWarningId(warning.id);
        },
      });
    });
  }, [lastNewWarningIds, warnings]);

  const filteredWarnings = warnings.filter(w => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
    if (riskFilter !== 'all' && w.riskLevel !== riskFilter) return false;
    return true;
  }).sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    return b.createdAt - a.createdAt;
  });

  const handleAcknowledge = (warningId: string) => {
    acknowledgeWarning(warningId);
    notifications.show({
      title: '预警已确认',
      message: '指挥人员已确认该预警',
      color: 'blue',
    });
  };

  const handleResolve = (warningId: string) => {
    resolveWarning(warningId);
    notifications.show({
      title: '预警已解决',
      message: '该预警已标记为已解决',
      color: 'green',
    });
  };

  const handleExecuteDispatch = (fromTowerId: string, toTowerId: string, count: number) => {
    dispatchGarrison(fromTowerId, toTowerId, count);
    setTimeout(() => {
      runWarningAssessment();
    }, 100);
    notifications.show({
      title: '调度已执行',
      message: `驻军调度指令已下达，正在重新评估预警状态...`,
      color: 'green',
    });
  };

  const formatTime = (timestamp: number) => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = simulation.globalTime - timestamp;
    if (diff < 1) return '刚刚';
    if (diff < 60) return `${Math.floor(diff)}秒前`;
    return `${Math.floor(diff / 60)}分${Math.floor(diff % 60)}秒前`;
  };

  return (
    <Card shadow="lg" p={0} radius="lg" style={{ height: '100%' }} withBorder>
      <Group p="md" justify="space-between" bg="linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)">
        <Group>
          <ThemeIcon size="xl" radius="md" color="red" variant="light">
            🚨
          </ThemeIcon>
          <div>
            <Text fw={700} size="xl" c="dark">综合研判预警中心</Text>
            <Text size="sm" c="dimmed">多源数据融合分析 · 智能风险预警 · 辅助指挥决策</Text>
          </div>
        </Group>
        <Group>
          {lastAssessment && (
            <Group gap="xs">
              <Badge color={getRiskColor(lastAssessment.overallRiskLevel)} size="lg" variant="filled">
                {getRiskIcon(lastAssessment.overallRiskLevel)} {getRiskLabel(lastAssessment.overallRiskLevel)}
              </Badge>
              <Text fw={600}>{lastAssessment.overallRiskScore}分</Text>
            </Group>
          )}
          <Button
            variant="light"
            onClick={runWarningAssessment}
            leftSection="🔄"
          >
            刷新研判
          </Button>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List px="md" pt="xs">
          <Tabs.Tab value="overview" leftSection="📊">态势总览</Tabs.Tab>
          <Tabs.Tab value="warnings" leftSection="⚠️">预警列表</Tabs.Tab>
          <Tabs.Tab value="heatmap" leftSection="🗺️">威胁热度</Tabs.Tab>
          <Tabs.Tab value="faulty" leftSection="🏚️">故障台站</Tabs.Tab>
        </Tabs.List>

        <Divider />

        <Tabs.Panel value="overview" pt="md" px="md" pb="md">
          {lastAssessment && (
            <Stack gap="md">
              <Grid>
                <Grid.Col span={3}>
                  <Card p="md" radius="md" withBorder style={{ textAlign: 'center' }}>
                    <RingProgress
                      size={120}
                      thickness={12}
                      roundCaps
                      sections={[{
                        value: lastAssessment.overallRiskScore,
                        color: getRiskColor(lastAssessment.overallRiskLevel),
                      }]}
                      label={
                        <div style={{ textAlign: 'center' }}>
                          <Text fw={700} size="xl">
                            {lastAssessment.overallRiskScore}
                          </Text>
                          <Text size="xs" c="dimmed">风险评分</Text>
                        </div>
                      }
                    />
                    <Text fw={600} mt="xs" c={getRiskColor(lastAssessment.overallRiskLevel)}>
                      {getRiskIcon(lastAssessment.overallRiskLevel)} {getRiskLabel(lastAssessment.overallRiskLevel)}
                    </Text>
                  </Card>
                </Grid.Col>

                <Grid.Col span={9}>
                  <Card p="md" radius="md" withBorder>
                    <Group justify="space-between" mb="sm">
                      <Text fw={600}>📋 综合研判结论</Text>
                      <Text size="xs" c="dimmed">
                        生成时间：{formatTime(lastAssessment.generatedAt)}
                      </Text>
                    </Group>
                    <Paper p="sm" bg={lastAssessment.overallRiskLevel === 'critical' || lastAssessment.overallRiskLevel === 'high' ? '#fef2f2' : '#f0fdf4'} radius="sm">
                      <Text>{lastAssessment.assessmentSummary}</Text>
                    </Paper>
                    {lastAssessment.topRecommendations.length > 0 && (
                      <>
                        <Text fw={500} size="sm" mt="sm" mb="xs">💡 关键建议</Text>
                        <List withPadding spacing="xs" size="sm">
                          {lastAssessment.topRecommendations.map((rec, idx) => (
                            <List.Item key={idx}>{rec}</List.Item>
                          ))}
                        </List>
                      </>
                    )}
                  </Card>
                </Grid.Col>
              </Grid>

              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="sm">📈 风险因素分解</Text>
                <Stack gap="sm">
                  {Object.entries(lastAssessment.factorBreakdown).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      enemyThreat: '⚔️ 敌情威胁',
                      weatherImpact: '🌤️ 天气影响',
                      garrisonStatus: '👥 驻军状态',
                      networkHealth: '📡 网络健康',
                      historicalPerformance: '📜 历史表现',
                    };
                    return (
                      <div key={key}>
                        <Group justify="space-between" mb={4}>
                          <Text size="sm">{labels[key] || key}</Text>
                          <Text size="sm" fw={600}>{value}分</Text>
                        </Group>
                        <Progress
                          value={value}
                          color={value >= 60 ? 'red' : value >= 35 ? 'yellow' : 'green'}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </Stack>
              </Card>

              <SimpleGrid cols={4}>
                <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #ef4444' }}>
                  <Text size="xs" c="dimmed">🔴 紧急预警</Text>
                  <Text fw={700} size="xl" c="red">{lastAssessment.criticalWarnings}</Text>
                </Card>
                <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #f97316' }}>
                  <Text size="xs" c="dimmed">🟠 高风险预警</Text>
                  <Text fw={700} size="xl" c="orange">{lastAssessment.highWarnings}</Text>
                </Card>
                <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #eab308' }}>
                  <Text size="xs" c="dimmed">🟡 中风险预警</Text>
                  <Text fw={700} size="xl" c="yellow">{lastAssessment.mediumWarnings}</Text>
                </Card>
                <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #22c55e' }}>
                  <Text size="xs" c="dimmed">🟢 低风险预警</Text>
                  <Text fw={700} size="xl" c="green">{lastAssessment.lowWarnings}</Text>
                </Card>
              </SimpleGrid>

              {warnings.filter(w => w.status === 'active').length > 0 && (
                <Card p="md" radius="md" withBorder>
                  <Text fw={600} mb="sm">🔥 最新活动预警</Text>
                  <Stack gap="xs">
                    {warnings
                      .filter(w => w.status === 'active')
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .slice(0, 5)
                      .map(warning => (
                        <Paper
                          key={warning.id}
                          p="sm"
                          radius="sm"
                          withBorder
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedWarningId(warning.id)}
                        >
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Badge color={getRiskColor(warning.riskLevel)}>
                                {getRiskIcon(warning.riskLevel)} {getRiskLabel(warning.riskLevel)}
                              </Badge>
                              <Text fw={500} size="sm">
                                {getCategoryIcon(warning.category)} {warning.title}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">{getTimeAgo(warning.createdAt)}</Text>
                          </Group>
                          <Text size="xs" c="dimmed" mt="xs" lineClamp={1}>
                            {warning.summary}
                          </Text>
                        </Paper>
                      ))}
                  </Stack>
                </Card>
              )}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="warnings" pt="md" px="md" pb="md">
          <Stack gap="md">
            <Group>
              <Group gap="xs">
                <Text size="sm" fw={500}>状态：</Text>
                {statusFilterOptions.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={statusFilter === opt.value ? 'filled' : 'light'}
                    color={statusFilter === opt.value ? 'blue' : 'gray'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </Group>
            </Group>

            <Group>
              <Group gap="xs" wrap="wrap">
                <Text size="sm" fw={500}>类别：</Text>
                {categoryFilterOptions.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={categoryFilter === opt.value ? 'filled' : 'light'}
                    color={categoryFilter === opt.value ? 'blue' : 'gray'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setCategoryFilter(opt.value)}
                  >
                    {opt.icon} {opt.label}
                  </Badge>
                ))}
              </Group>
            </Group>

            <Group>
              <Group gap="xs">
                <Text size="sm" fw={500}>等级：</Text>
                <Badge
                  variant={riskFilter === 'all' ? 'filled' : 'light'}
                  color={riskFilter === 'all' ? 'blue' : 'gray'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setRiskFilter('all')}
                >
                  全部
                </Badge>
                {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map(level => (
                  <Badge
                    key={level}
                    variant={riskFilter === level ? 'filled' : 'light'}
                    color={getRiskColor(level)}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setRiskFilter(level)}
                  >
                    {getRiskIcon(level)} {getRiskLabel(level)}
                  </Badge>
                ))}
              </Group>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                共 {filteredWarnings.length} 条预警
              </Text>
            </Group>

            <ScrollArea h={500} type="auto">
              <Stack gap="sm">
                {filteredWarnings.length === 0 ? (
                  <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                    <Text size="lg" c="dimmed">✅ 暂无符合条件的预警</Text>
                  </Card>
                ) : (
                  filteredWarnings.map(warning => (
                    <Paper
                      key={warning.id}
                      p="md"
                      radius="md"
                      withBorder
                      style={{
                        borderLeft: `4px solid ${
                          warning.riskLevel === 'critical' ? '#ef4444' :
                          warning.riskLevel === 'high' ? '#f97316' :
                          warning.riskLevel === 'medium' ? '#eab308' : '#22c55e'
                        }`,
                      }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Badge color={getRiskColor(warning.riskLevel)} variant="filled">
                            {getRiskIcon(warning.riskLevel)} {getRiskLabel(warning.riskLevel)}
                          </Badge>
                          <Badge variant="light" color="gray">
                            {getCategoryIcon(warning.category)} {getCategoryLabel(warning.category)}
                          </Badge>
                          <Badge variant={warning.status === 'active' ? 'dot' : 'light'}
                            color={warning.status === 'active' ? 'red' : warning.status === 'acknowledged' ? 'blue' : warning.status === 'resolved' ? 'green' : 'gray'}
                          >
                            {getStatusLabel(warning.status)}
                          </Badge>
                        </Group>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            创建 {getTimeAgo(warning.createdAt)}
                          </Text>
                          <Tooltip label="查看详情">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => setSelectedWarningId(warning.id)}
                            >
                              👁️
                            </ActionIcon>
                          </Tooltip>
                          {warning.status === 'active' && (
                            <Tooltip label="确认预警">
                              <ActionIcon
                                variant="light"
                                color="yellow"
                                onClick={() => handleAcknowledge(warning.id)}
                              >
                                ✓
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {(warning.status === 'active' || warning.status === 'acknowledged') && (
                            <Tooltip label="标记解决">
                              <ActionIcon
                                variant="light"
                                color="green"
                                onClick={() => handleResolve(warning.id)}
                              >
                                ✅
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>

                      <Text fw={600} size="md">{warning.title}</Text>
                      <Text size="sm" c="dimmed" mt={4}>{warning.summary}</Text>

                      {warning.suggestions.length > 0 && warning.status === 'active' && (
                        <Group mt="sm" gap="xs">
                          {warning.suggestions.map(suggestion => {
                            const fromTower = towers.find(t => t.id === suggestion.fromTowerId);
                            const toTower = towers.find(t => t.id === suggestion.toTowerId);
                            return (
                              <Button
                                key={suggestion.id}
                                size="xs"
                                variant="light"
                                color="blue"
                                leftSection="👥"
                                onClick={() => handleExecuteDispatch(
                                  suggestion.fromTowerId,
                                  suggestion.toTowerId,
                                  suggestion.count
                                )}
                              >
                                调度 {fromTower?.code}→{toTower?.code} ({suggestion.count}人)
                              </Button>
                            );
                          })}
                        </Group>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="heatmap" pt="md" px="md" pb="md">
          <ThreatHeatMap />
        </Tabs.Panel>

        <Tabs.Panel value="faulty" pt="md" px="md" pb="md">
          <FaultyTowerAnalysis />
        </Tabs.Panel>
      </Tabs>

      {selectedWarningId && (
        <WarningDetailModal
          warningId={selectedWarningId}
          towers={towers}
          onClose={() => setSelectedWarningId(null)}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
          onExecuteDispatch={handleExecuteDispatch}
        />
      )}
    </Card>
  );
}
