import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Paper,
  Button,
  ScrollArea,
  ThemeIcon,
  SimpleGrid,
  Divider,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';
import { LinkageTrigger, Warning } from '../types';
import { getRiskColor, getRiskLabel, getRiskIcon, getCategoryLabel, getCategoryIcon } from '../utils/warningEngine';

export function WarningLinkagePanel() {
  const {
    linkageTriggers,
    warnings,
    towers,
    dismissLinkage,
    executeDisposal,
    dispatchGarrison,
    runWarningAssessment,
  } = useSimulationStore();

  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTriggers = linkageTriggers.filter(lt => !lt.autoDismissed);
  const displayedTriggers = showActiveOnly ? activeTriggers : linkageTriggers;

  useEffect(() => {
    const unhandledCritical = activeTriggers.filter(lt => lt.soundAlert && !lt.popupShown);
    if (unhandledCritical.length > 0) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIqN/LdkEwP3Oo2dyxYi0jMIGo4tylXTElTpq95bFhMB0jb6Xp5KhlMCFKpcPm8aZdLS5wb6ni8qNlNiVNv8Hs9at5OC9XucLz+K2AOTJjwsPd+7CBPjRky8Xf+bF+QDdkzMjj/fq5AUk7Zc3J4v36uwJQO2jMyuT9+7wCVTtpzMfk/fu8Alc7ac3H5P37vAJXO2nNx+T9+7wCVztpzcYk/fu8A==');
        }
        audioRef.current.play().catch(() => {});
      } catch {}
    }
  }, [activeTriggers]);

  useEffect(() => {
    const unshown = activeTriggers.filter(lt => !lt.popupShown);
    unshown.forEach(trigger => {
      const warning = warnings.find(w => w.id === trigger.warningId);
      if (!warning) return;

      notifications.show({
        id: `linkage-${trigger.id}`,
        title: `${getRiskIcon(trigger.triggerLevel)} 预警联动触发`,
        message: `${warning.title} - ${trigger.actions.map(a => a.description).join('；')}`,
        color: getRiskColor(trigger.triggerLevel),
        autoClose: trigger.triggerLevel === 'critical' ? false : 8000,
        withCloseButton: true,
      });

      set((prev: LinkageTrigger[]) =>
        prev.map(lt => lt.id === trigger.id ? { ...lt, popupShown: true } : lt)
      );
    });
  }, [activeTriggers, warnings]);

  const set = useCallback((updater: (prev: LinkageTrigger[]) => LinkageTrigger[]) => {
    const current = useSimulationStore.getState().linkageTriggers;
    const updated = updater(current);
    useSimulationStore.setState({ linkageTriggers: updated });
  }, []);

  const handleDismiss = (triggerId: string) => {
    dismissLinkage(triggerId);
    notifications.show({
      title: '联动已处理',
      message: '该预警联动已标记为已处理',
      color: 'blue',
    });
  };

  const handleExecuteDispatch = (warning: Warning, fromTowerId: string, toTowerId: string, count: number) => {
    dispatchGarrison(fromTowerId, toTowerId, count);
    executeDisposal(warning.id, 'garrison_dispatch', `调度驻军 ${count}人`);
    setTimeout(() => runWarningAssessment(), 100);
  };

  const handleSwitchRoute = (warning: Warning) => {
    executeDisposal(warning.id, 'route_switch', '切换备用传递路线');
  };

  const handleAddRelay = (warning: Warning) => {
    executeDisposal(warning.id, 'relay_add', '增设中继台');
  };

  const formatTime = (timestamp: number) => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'popup': return '🔔';
      case 'sound': return '🔊';
      case 'dispatch': return '👥';
      case 'route_switch': return '🔄';
      case 'relay_add': return '📡';
      default: return '⚡';
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'popup': return '弹窗告警';
      case 'sound': return '声音告警';
      case 'dispatch': return '驻军调度';
      case 'route_switch': return '路线切换';
      case 'relay_add': return '增设中继';
      default: return type;
    }
  };

  return (
    <Stack gap="md">
      <SimpleGrid cols={3}>
        <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #ef4444' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">🔴 紧急联动</Text>
              <Text fw={700} size="xl">{activeTriggers.filter(lt => lt.triggerLevel === 'critical').length}</Text>
            </div>
            <ThemeIcon size="xl" color="red" variant="light">🚨</ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #f97316' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">🟠 高级联动</Text>
              <Text fw={700} size="xl">{activeTriggers.filter(lt => lt.triggerLevel === 'high').length}</Text>
            </div>
            <ThemeIcon size="xl" color="orange" variant="light">⚠️</ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder style={{ borderLeft: '4px solid #3b82f6' }}>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">📊 总联动次数</Text>
              <Text fw={700} size="xl">{linkageTriggers.length}</Text>
            </div>
            <ThemeIcon size="xl" color="blue" variant="light">📋</ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Group>
        <Button
          size="xs"
          variant={showActiveOnly ? 'filled' : 'light'}
          color="blue"
          onClick={() => setShowActiveOnly(true)}
        >
          活动中 ({activeTriggers.length})
        </Button>
        <Button
          size="xs"
          variant={!showActiveOnly ? 'filled' : 'light'}
          color="gray"
          onClick={() => setShowActiveOnly(false)}
        >
          全部 ({linkageTriggers.length})
        </Button>
      </Group>

      <ScrollArea h={450} type="auto">
        <Stack gap="sm">
          {displayedTriggers.length === 0 ? (
            <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
              <Text size="lg" c="dimmed">✅ 暂无活动预警联动</Text>
              <Text size="sm" c="dimmed" mt="xs">当高风险预警触发时，系统将自动启动联动机制</Text>
            </Card>
          ) : (
            displayedTriggers.map(trigger => {
              const warning = warnings.find(w => w.id === trigger.warningId);
              if (!warning) return null;

              return (
                <Paper
                  key={trigger.id}
                  p="md"
                  radius="md"
                  withBorder
                  style={{
                    borderLeft: `4px solid ${
                      trigger.triggerLevel === 'critical' ? '#ef4444' : '#f97316'
                    }`,
                    background: trigger.autoDismissed ? '#f8f9fa' : undefined,
                  }}
                >
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <Badge color={getRiskColor(trigger.triggerLevel)} variant="filled">
                        {getRiskIcon(trigger.triggerLevel)} {getRiskLabel(trigger.triggerLevel)}联动
                      </Badge>
                      <Badge variant="light" color="gray">
                        {getCategoryIcon(trigger.triggerCategory)} {getCategoryLabel(trigger.triggerCategory)}
                      </Badge>
                      {trigger.soundAlert && (
                        <Badge color="red" variant="light">🔊 声音告警</Badge>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {formatTime(trigger.triggeredAt)}
                      </Text>
                      {!trigger.autoDismissed && (
                        <Tooltip label="标记已处理">
                          <ActionIcon
                            variant="light"
                            color="green"
                            onClick={() => handleDismiss(trigger.id)}
                          >
                            ✅
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>

                  <Text fw={600} size="md" mb="xs">{warning.title}</Text>
                  <Text size="sm" c="dimmed" mb="sm">{warning.summary}</Text>

                  <Text size="xs" fw={500} mb="xs">联动动作：</Text>
                  <Stack gap="xs" mb="sm">
                    {trigger.actions.map(action => (
                      <Paper key={action.id} p="xs" radius="sm" bg="#f8f9fa" withBorder>
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Text size="sm">{getActionIcon(action.type)}</Text>
                            <Text size="sm">{getActionLabel(action.type)}</Text>
                          </Group>
                          <Badge
                            size="sm"
                            color={
                              action.status === 'executed' ? 'green' :
                              action.status === 'failed' ? 'red' :
                              action.status === 'skipped' ? 'gray' : 'blue'
                            }
                            variant="light"
                          >
                            {action.status === 'executed' ? '已执行' :
                             action.status === 'failed' ? '失败' :
                             action.status === 'skipped' ? '已跳过' : '待执行'}
                          </Badge>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>

                  {!trigger.autoDismissed && (
                    <>
                      <Divider my="xs" />
                      <Text size="xs" fw={500} mb="xs">💡 推荐处置方案：</Text>
                      <Group gap="xs" wrap="wrap">
                        {warning.suggestions.slice(0, 2).map(suggestion => {
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
                                warning,
                                suggestion.fromTowerId,
                                suggestion.toTowerId,
                                suggestion.count
                              )}
                            >
                              调度 {fromTower?.code}→{toTower?.code} ({suggestion.count}人)
                            </Button>
                          );
                        })}
                        {(warning.category === 'tower_failure' || warning.category === 'transmission_risk') && (
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection="🔄"
                            onClick={() => handleSwitchRoute(warning)}
                          >
                            切换路线
                          </Button>
                        )}
                        {warning.category === 'blind_spot' && (
                          <Button
                            size="xs"
                            variant="light"
                            color="violet"
                            leftSection="📡"
                            onClick={() => handleAddRelay(warning)}
                          >
                            增设中继
                          </Button>
                        )}
                      </Group>
                    </>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
