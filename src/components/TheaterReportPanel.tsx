import { useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Paper,
  Button,
  ScrollArea,
  SimpleGrid,
  Progress,
  ThemeIcon,
  RingProgress,
  Divider,
  Table,
} from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { getRiskColor, getRiskLabel, getRiskIcon, getCategoryLabel } from '../utils/warningEngine';

export function TheaterReportPanel() {
  const {
    theaterReport,
    theaterZones,
    generateTheaterReportAction,
  } = useSimulationStore();

  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const report = theaterReport;

  const handleGenerate = () => {
    generateTheaterReportAction();
  };

  if (!report) {
    return (
      <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed" mb="md">📋 尚未生成战区综合报告</Text>
        <Button onClick={handleGenerate} leftSection="📊">
          生成战区综合报告
        </Button>
      </Card>
    );
  }

  const getOptCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'garrison': return '👥';
      case 'route': return '🔄';
      case 'relay': return '📡';
      case 'structure': return '🏗️';
      default: return '💡';
    }
  };

  const getOptCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'garrison': return '驻军优化';
      case 'route': return '路线优化';
      case 'relay': return '中继优化';
      case 'structure': return '结构优化';
      default: return cat;
    }
  };

  return (
    <ScrollArea h="100%" type="auto">
      <Stack gap="md" p="md">
        <Group justify="space-between">
          <Group>
            <ThemeIcon size="xl" radius="md" color="red" variant="light">📋</ThemeIcon>
            <div>
              <Text fw={700} size="xl">战区综合报告</Text>
              <Text size="sm" c="dimmed">
                报告周期：{report.periodStart.toFixed(0)}s - {report.periodEnd.toFixed(0)}s · 生成于 {report.periodEnd.toFixed(0)}s
              </Text>
            </div>
          </Group>
          <Button onClick={handleGenerate} variant="light" leftSection="🔄">
            刷新报告
          </Button>
        </Group>

        <SimpleGrid cols={4}>
          <Card p="md" radius="md" withBorder style={{ textAlign: 'center' }}>
            <RingProgress
              size={100}
              thickness={10}
              roundCaps
              sections={[{
                value: report.overallRiskScore,
                color: getRiskColor(report.overallRiskLevel),
              }]}
              label={
                <div style={{ textAlign: 'center' }}>
                  <Text fw={700} size="lg">{report.overallRiskScore}</Text>
                  <Text size="xs" c="dimmed">风险评分</Text>
                </div>
              }
            />
            <Badge color={getRiskColor(report.overallRiskLevel)} mt="xs">
              {getRiskIcon(report.overallRiskLevel)} {getRiskLabel(report.overallRiskLevel)}
            </Badge>
          </Card>

          <Card p="md" radius="md" withBorder style={{ textAlign: 'center' }}>
            <RingProgress
              size={100}
              thickness={10}
              roundCaps
              sections={[{
                value: report.disposalSuccessRate,
                color: report.disposalSuccessRate >= 60 ? 'green' : 'orange',
              }]}
              label={
                <div style={{ textAlign: 'center' }}>
                  <Text fw={700} size="lg">{report.disposalSuccessRate}%</Text>
                  <Text size="xs" c="dimmed">处置成功率</Text>
                </div>
              }
            />
            <Text size="xs" c="dimmed" mt="xs">
              {report.successfulDisposals}/{report.totalDisposals} 成功
            </Text>
          </Card>

          <Card p="md" radius="md" withBorder>
            <Text size="xs" c="dimmed" mb="xs">响应效率</Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs">平均确认时间</Text>
                <Text size="xs" fw={600}>{report.responseEfficiency.avgAckTime.toFixed(1)}s</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs">平均解决时间</Text>
                <Text size="xs" fw={600}>{report.responseEfficiency.avgResolveTime.toFixed(1)}s</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs">紧急响应率</Text>
                <Text size="xs" fw={600} c={report.responseEfficiency.criticalResponseRate >= 80 ? 'green' : 'red'}>
                  {report.responseEfficiency.criticalResponseRate}%
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs">高级响应率</Text>
                <Text size="xs" fw={600} c={report.responseEfficiency.highResponseRate >= 70 ? 'green' : 'orange'}>
                  {report.responseEfficiency.highResponseRate}%
                </Text>
              </Group>
            </Stack>
          </Card>

          <Card p="md" radius="md" withBorder>
            <Text size="xs" c="dimmed" mb="xs">整体响应率</Text>
            <Progress
              value={report.responseEfficiency.overallResponseRate}
              color={report.responseEfficiency.overallResponseRate >= 70 ? 'green' : 'orange'}
              size="lg"
              mb="sm"
            />
            <Text fw={700} size="xl" ta="center">{report.responseEfficiency.overallResponseRate}%</Text>

            <Divider my="sm" />

            <Text size="xs" c="dimmed" mb="xs">关键失效链路</Text>
            <Text fw={700} size="xl" ta="center" c={report.criticalFailureChains.length > 0 ? 'red' : 'green'}>
              {report.criticalFailureChains.length}
            </Text>
          </Card>
        </SimpleGrid>

        <Card p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">🗺️ 战区风险分布</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>战区</Table.Th>
                <Table.Th>风险等级</Table.Th>
                <Table.Th>预警数</Table.Th>
                <Table.Th>平均响应</Table.Th>
                <Table.Th>处置数</Table.Th>
                <Table.Th>处置成功率</Table.Th>
                <Table.Th>主导类型</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.theaterZoneSummaries.map(zone => (
                <Table.Tr key={zone.zoneId}>
                  <Table.Td><Text fw={600} size="sm">{zone.zoneName}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={getRiskColor(zone.riskLevel)} variant="filled" size="sm">
                      {getRiskLabel(zone.riskLevel)} {zone.riskScore}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{zone.warningCount}</Table.Td>
                  <Table.Td>{zone.avgResponseTime.toFixed(1)}s</Table.Td>
                  <Table.Td>{zone.disposalCount}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Progress
                        value={zone.disposalSuccessRate * 100}
                        color={zone.disposalSuccessRate >= 0.6 ? 'green' : 'orange'}
                        size="sm"
                        style={{ flex: 1 }}
                      />
                      <Text size="xs" fw={600}>{(zone.disposalSuccessRate * 100).toFixed(0)}%</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray" size="sm">
                      {getCategoryLabel(zone.dominantCategory)}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {report.criticalFailureChains.length > 0 && (
          <Card p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={600}>🔗 关键失效链路</Text>
              <Badge color="red" variant="light">{report.criticalFailureChains.length} 条链路</Badge>
            </Group>
            <Stack gap="sm">
              {report.criticalFailureChains.map(chain => {
                const isExpanded = expandedChain === chain.chainId;
                return (
                  <Paper
                    key={chain.chainId}
                    p="sm"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpandedChain(isExpanded ? null : chain.chainId)}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Badge color="red" variant="filled" size="sm">影响度 {chain.impactScore}</Badge>
                        <Text size="sm" fw={500}>{chain.description}</Text>
                      </Group>
                      <Badge color="red" variant="light" size="sm">
                        根因：{chain.rootCause}
                      </Badge>
                    </Group>
                    {isExpanded && (
                      <Stack gap="xs" mt="sm">
                        <Text size="xs" c="dimmed">
                          涉及台站：{chain.towerIds.length} · 波及任务：{chain.missionIds.length} · 关联预警：{chain.warningIds.length}
                        </Text>
                      </Stack>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Card>
        )}

        {report.optimizationSuggestions.length > 0 && (
          <Card p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={600}>💡 优化建议</Text>
              <Badge color="blue" variant="light">{report.optimizationSuggestions.length} 条建议</Badge>
            </Group>
            <Stack gap="sm">
              {report.optimizationSuggestions.map(suggestion => (
                <Paper key={suggestion.id} p="sm" radius="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Badge color={suggestion.priority === 1 ? 'red' : 'orange'} variant="filled" size="sm">
                        优先级 {suggestion.priority}
                      </Badge>
                      <Text size="sm">
                        {getOptCategoryIcon(suggestion.category)} {getOptCategoryLabel(suggestion.category)}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      {suggestion.affectedZoneIds.map(zid => {
                        const zone = theaterZones.find(z => z.id === zid);
                        return zone ? (
                          <Badge key={zid} variant="light" color="gray" size="sm">
                            {zone.name}
                          </Badge>
                        ) : null;
                      })}
                    </Group>
                  </Group>
                  <Text size="sm" fw={500} mb={4}>{suggestion.description}</Text>
                  <Text size="xs" c="green">✅ {suggestion.expectedBenefit}</Text>
                </Paper>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </ScrollArea>
  );
}
