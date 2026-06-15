import {
  Modal,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Divider,
  ThemeIcon,
  Button,
  Paper,
  Timeline,
  List,
  SimpleGrid,
  Progress,
} from '@mantine/core';
import { BeaconTower } from '../types';
import { useSimulationStore } from '../store/useSimulationStore';
import {
  getRiskColor,
  getRiskLabel,
  getRiskIcon,
  getCategoryLabel,
  getCategoryIcon,
  getStatusLabel,
} from '../utils/warningEngine';

interface WarningDetailModalProps {
  warningId: string;
  towers: BeaconTower[];
  onClose: () => void;
  onAcknowledge: (warningId: string) => void;
  onResolve: (warningId: string) => void;
  onExecuteDispatch: (fromTowerId: string, toTowerId: string, count: number) => void;
}

export function WarningDetailModal({
  warningId,
  towers,
  onClose,
  onAcknowledge,
  onResolve,
  onExecuteDispatch,
}: WarningDetailModalProps) {
  const warning = useSimulationStore(state =>
    state.warnings.find(w => w.id === warningId) || null
  );

  if (!warning) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      opened={true}
      onClose={onClose}
      title={
        <Group>
          <ThemeIcon size="lg" color={getRiskColor(warning.riskLevel)}>
            {getCategoryIcon(warning.category)}
          </ThemeIcon>
          <div>
            <Text fw={700}>{warning.title}</Text>
            <Group gap="xs">
              <Badge color={getRiskColor(warning.riskLevel)} variant="filled" size="sm">
                {getRiskIcon(warning.riskLevel)} {getRiskLabel(warning.riskLevel)}
              </Badge>
              <Badge variant="light" color="gray" size="sm">
                {getCategoryIcon(warning.category)} {getCategoryLabel(warning.category)}
              </Badge>
              <Badge
                variant={warning.status === 'active' ? 'dot' : 'light'}
                color={
                  warning.status === 'active' ? 'red' :
                  warning.status === 'acknowledged' ? 'blue' :
                  warning.status === 'resolved' ? 'green' : 'gray'
                }
                size="sm"
              >
                {getStatusLabel(warning.status)}
              </Badge>
            </Group>
          </div>
        </Group>
      }
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <Card p="md" radius="md" withBorder bg={
          warning.riskLevel === 'critical' ? '#fef2f2' :
          warning.riskLevel === 'high' ? '#fff7ed' :
          warning.riskLevel === 'medium' ? '#fefce8' : '#f0fdf4'
        }>
          <Text size="sm" c="dimmed" mb={4}>📋 预警摘要</Text>
          <Text fw={500}>{warning.summary}</Text>
        </Card>

        <SimpleGrid cols={2}>
          <Card p="md" radius="md" withBorder>
            <Text fw={600} size="sm" mb="sm">⏰ 时间信息</Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">创建时间</Text>
                <Text fw={500}>{formatTime(warning.createdAt)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">最后更新</Text>
                <Text fw={500}>{formatTime(warning.updatedAt)}</Text>
              </Group>
              {warning.acknowledgedAt && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">确认时间</Text>
                  <Text fw={500}>{formatTime(warning.acknowledgedAt)}</Text>
                </Group>
              )}
              {warning.resolvedAt && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">解决时间</Text>
                  <Text fw={500}>{formatTime(warning.resolvedAt)}</Text>
                </Group>
              )}
              {warning.expiresAt && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">过期时间</Text>
                  <Text fw={500}>{formatTime(warning.expiresAt)}</Text>
                </Group>
              )}
            </Stack>
          </Card>

          <Card p="md" radius="md" withBorder>
            <Text fw={600} size="sm" mb="sm">📊 触发原因</Text>
            <Stack gap="xs">
              {warning.triggerReasons.map((reason, idx) => (
                <Paper key={idx} p="xs" radius="sm" bg="#f8fafc">
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>{reason.description}</Text>
                    <Badge
                      color={
                        reason.value > reason.threshold * 1.5 ? 'red' :
                        reason.value > reason.threshold ? 'orange' : 'yellow'
                      }
                      size="sm"
                    >
                      {typeof reason.value === 'number' && reason.value < 1
                        ? `${(reason.value * 100).toFixed(0)}%`
                        : reason.value}
                      / {typeof reason.threshold === 'number' && reason.threshold < 1
                        ? `${(reason.threshold * 100).toFixed(0)}%`
                        : reason.threshold}
                    </Badge>
                  </Group>
                  <Progress
                    value={reason.threshold > 0 ? Math.min(100, (reason.value / Math.max(reason.threshold, 0.001)) * 100) : 0}
                    color={
                      reason.value > reason.threshold * 1.5 ? 'red' :
                      reason.value > reason.threshold ? 'orange' : 'yellow'
                    }
                    size="sm"
                  />
                </Paper>
              ))}
            </Stack>
          </Card>
        </SimpleGrid>

        <Card p="md" radius="md" withBorder>
          <Text fw={600} size="sm" mb="sm">🎯 影响范围</Text>

          {warning.affectedScope.towerIds.length > 0 && (
            <>
              <Text size="xs" c="dimmed" mb="xs">受影响台站 ({warning.affectedScope.towerIds.length})：</Text>
              <Group gap="xs" wrap="wrap" mb="sm">
                {warning.affectedScope.towerIds.map(tid => {
                  const t = towers.find(tw => tw.id === tid);
                  return (
                    <Badge key={tid} variant="light" color={t?.isDisabled ? 'gray' : 'blue'}>
                      {t?.code || '未知'}
                    </Badge>
                  );
                })}
              </Group>
            </>
          )}

          {warning.affectedScope.enemySourceIds && warning.affectedScope.enemySourceIds.length > 0 && (
            <>
              <Text size="xs" c="dimmed" mb="xs">关联敌情：</Text>
              <Group gap="xs" wrap="wrap" mb="sm">
                {warning.affectedScope.enemySourceIds.map(eid => (
                  <Badge key={eid} variant="light" color="red">
                    敌情 #{eid.slice(0, 6)}
                  </Badge>
                ))}
              </Group>
            </>
          )}

          {warning.affectedScope.missionIds && warning.affectedScope.missionIds.length > 0 && (
            <>
              <Text size="xs" c="dimmed" mb="xs">影响任务：</Text>
              <Group gap="xs" wrap="wrap">
                {warning.affectedScope.missionIds.map(mid => (
                  <Badge key={mid} variant="light" color="orange">
                    任务 #{mid.slice(0, 6)}
                  </Badge>
                ))}
              </Group>
            </>
          )}
        </Card>

        {warning.suggestions.length > 0 && (
          <Card p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={600} size="sm">💡 建议调度方案</Text>
              <Badge color="blue" variant="light">{warning.suggestions.length} 条建议</Badge>
            </Group>
            <Stack gap="sm">
              {warning.suggestions.map(suggestion => {
                const fromTower = towers.find(t => t.id === suggestion.fromTowerId);
                const toTower = towers.find(t => t.id === suggestion.toTowerId);
                return (
                  <Paper key={suggestion.id} p="sm" radius="sm" withBorder bg="#eff6ff">
                    <Group justify="space-between" mb="xs">
                      <Group>
                        <ThemeIcon color="blue" variant="light" size="sm">👥</ThemeIcon>
                        <Text fw={500} size="sm">
                          {fromTower?.code || '未知'} → {toTower?.code || '未知'}
                          <Badge ml="xs" color="blue" variant="light">
                            调度 {suggestion.count} 人
                          </Badge>
                        </Text>
                      </Group>
                      {warning.status === 'active' && (
                        <Button
                          size="xs"
                          color="blue"
                          onClick={() => onExecuteDispatch(
                            suggestion.fromTowerId,
                            suggestion.toTowerId,
                            suggestion.count
                          )}
                        >
                          执行调度
                        </Button>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">原因：{suggestion.reason}</Text>
                    <Text size="xs" c="dimmed" mt={2}>预计耗时：{suggestion.estimatedDuration}s</Text>
                    <Text size="xs" c="green" mt={2}>✅ {suggestion.expectedImprovement}</Text>
                  </Paper>
                );
              })}
            </Stack>
          </Card>
        )}

        <Card p="md" radius="md" withBorder>
          <Text fw={600} size="sm" mb="sm">📈 预计改善效果</Text>
          <Paper p="sm" radius="sm" bg="#f0fdf4">
            <List withPadding spacing="xs" size="sm">
              <List.Item icon={<ThemeIcon color="green" size={16} radius="xl">✅</ThemeIcon>}>
                {warning.expectedImprovement}
              </List.Item>
              {warning.suggestions.map(s => (
                <List.Item key={s.id} icon={<ThemeIcon color="green" size={16} radius="xl">→</ThemeIcon>}>
                  {s.expectedImprovement}
                </List.Item>
              ))}
            </List>
          </Paper>
        </Card>

        <Card p="md" radius="md" withBorder>
          <Text fw={600} size="sm" mb="sm">🔄 预警演变回溯</Text>
          <Timeline active={warning.evolution.length - 1} bulletSize={20} lineWidth={2}>
            {warning.evolution.map((snapshot, idx) => (
              <Timeline.Item
                key={idx}
                bullet={
                  <ThemeIcon
                    size={20}
                    radius="xl"
                    color={getRiskColor(snapshot.riskLevel)}
                  >
                    {getRiskIcon(snapshot.riskLevel)}
                  </ThemeIcon>
                }
                title={
                  <Group>
                    <Text fw={500} size="sm">
                      {getRiskLabel(snapshot.riskLevel)} · {getStatusLabel(snapshot.status)}
                    </Text>
                    <Badge size="sm" variant="light" color="gray">
                      {formatTime(snapshot.timestamp)}
                    </Badge>
                  </Group>
                }
              >
                <Text size="sm" c="dimmed">{snapshot.summary}</Text>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>

        <Divider />

        <Group justify="flex-end" gap="xs">
          <Button variant="light" onClick={onClose}>
            关闭
          </Button>
          {warning.status === 'active' && (
            <Button color="yellow" onClick={() => onAcknowledge(warning.id)}>
              确认预警
            </Button>
          )}
          {(warning.status === 'active' || warning.status === 'acknowledged') && (
            <Button color="green" onClick={() => onResolve(warning.id)}>
              标记解决
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
