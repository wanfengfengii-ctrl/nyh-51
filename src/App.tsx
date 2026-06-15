import { useState, useEffect, useRef } from 'react';
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Badge,
  SimpleGrid,
  ScrollArea,
  Stack,
  Tabs,
  Modal,
} from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { MapCanvas } from './components/MapCanvas';
import { TowerList, TowerEditor } from './components/TowerList';
import { WeatherPanel, EnemyLevelPanel } from './components/SettingsPanel';
import { SimulationPanel } from './components/SimulationPanel';
import { PathInfoPanel, AnalysisPanel } from './components/AnalysisPanel';
import { DataCharts } from './components/DataCharts';
import { Toolbar } from './components/Toolbar';
import { EnemySourcesPanel } from './components/EnemySourcesPanel';
import { GarrisonPanel } from './components/GarrisonPanel';
import { DynamicWeatherPanel } from './components/DynamicWeatherPanel';
import { HistoryReplayPanel } from './components/HistoryReplayPanel';
import { EvaluationPanel } from './components/EvaluationPanel';
import { WarningCenter } from './components/WarningCenter';
import { useSimulationStore } from './store/useSimulationStore';
import { BeaconTower } from './types';

function App() {
  const { isAddingTower, towers, missions, blindSpots, showEvaluation, setShowEvaluation, showWarningCenter, setShowWarningCenter, evaluationResult, resetSimulation } = useSimulationStore();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const sampleLoadedRef = useRef(false);

  useEffect(() => {
    const updateSize = () => {
      const mapContainer = document.getElementById('map-container');
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(600, rect.width - 4),
          height: Math.max(400, Math.min(500, rect.height - 40)),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const addSampleTowers = () => {
    if (sampleLoadedRef.current) return;
    sampleLoadedRef.current = true;

    const sampleTowers: Omit<BeaconTower, 'id'>[] = [
      { x: 80, y: 150, code: 'FT-001', name: '烽火台一号', visualRange: 250, garrisonCount: 15, baseGarrisonCount: 15, signalDelay: 2, isActive: true },
      { x: 230, y: 100, code: 'FT-002', name: '烽火台二号', visualRange: 250, garrisonCount: 12, baseGarrisonCount: 12, signalDelay: 3, isActive: true },
      { x: 380, y: 120, code: 'FT-003', name: '烽火台三号', visualRange: 250, garrisonCount: 10, baseGarrisonCount: 10, signalDelay: 2.5, isActive: true },
      { x: 520, y: 90, code: 'FT-004', name: '烽火台四号', visualRange: 200, garrisonCount: 8, baseGarrisonCount: 8, signalDelay: 4, isActive: true },
      { x: 260, y: 250, code: 'FT-005', name: '烽火台五号', visualRange: 200, garrisonCount: 0, baseGarrisonCount: 10, signalDelay: 2, isActive: true },
      { x: 420, y: 280, code: 'FT-006', name: '烽火台六号', visualRange: 200, garrisonCount: 10, baseGarrisonCount: 10, signalDelay: 3, isActive: true },
      { x: 120, y: 320, code: 'FT-007', name: '烽火台七号', visualRange: 180, garrisonCount: 5, baseGarrisonCount: 5, signalDelay: 5, isActive: true },
      { x: 600, y: 200, code: 'FT-008', name: '烽火台八号', visualRange: 220, garrisonCount: 12, baseGarrisonCount: 12, signalDelay: 2.5, isActive: true },
      { x: 680, y: 350, code: 'FT-009', name: '烽火台九号', visualRange: 200, garrisonCount: 8, baseGarrisonCount: 8, signalDelay: 3, isActive: true },
    ];

    const newTowers: BeaconTower[] = sampleTowers.map((t, index) => ({
      ...t,
      id: `sample-${index}`,
    }));

    useSimulationStore.setState({
      towers: newTowers,
    });

    setTimeout(() => {
      notifications.show({
        title: '示例数据已加载',
        message: '已添加 9 座示例烽火台，请添加敌情源开始模拟',
        color: 'green',
      });
    }, 100);
  };

  useEffect(() => {
    if (towers.length === 0 && !sampleLoadedRef.current) {
      addSampleTowers();
    }
  }, [towers.length]);

  const handleCloseEvaluation = () => {
    setShowEvaluation(false);
  };

  const handleReset = () => {
    resetSimulation();
    setShowEvaluation(false);
    notifications.show({
      title: '已重置',
      message: '系统已重置，可开始新的模拟',
      color: 'blue',
    });
  };

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppShell
        header={{ height: 60 }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Text fw={700} size="xl" c="#8b4513">
                🏯 多源敌情下的自适应烽火台联防调度系统
              </Text>
              <Badge color="orange" variant="light">
                古代军事通信智能模拟
              </Badge>
            </Group>
            <Toolbar />
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <div style={{ height: 'calc(100vh - 80px)', padding: '12px' }}>
            <SimpleGrid
              cols={{ base: 1, xl: 4 }}
              spacing="md"
              style={{ height: '100%' }}
            >
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'hidden' }}>
                <div
                  id="map-container"
                  style={{
                    flex: '0 0 auto',
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>联防地图</Text>
                    {isAddingTower && (
                      <Badge color="green" variant="filled">
                        点击地图添加烽火台
                      </Badge>
                    )}
                  </Group>
                  <MapCanvas width={canvasSize.width} height={canvasSize.height} />
                </div>
                <DataCharts />
              </div>

              <ScrollArea type="auto" style={{ height: '100%' }}>
                <Stack gap="md" pr="xs">
                  <Tabs defaultValue="towers" variant="pills">
                    <Tabs.List grow>
                      <Tabs.Tab value="towers">烽火台</Tabs.Tab>
                      <Tabs.Tab value="enemy">敌情源</Tabs.Tab>
                      <Tabs.Tab value="garrison">驻军</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="towers" pt="xs">
                      <Stack gap="md">
                        <TowerList />
                        <TowerEditor />
                      </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="enemy" pt="xs">
                      <EnemySourcesPanel />
                    </Tabs.Panel>
                    <Tabs.Panel value="garrison" pt="xs">
                      <GarrisonPanel />
                    </Tabs.Panel>
                  </Tabs>
                  <Tabs defaultValue="weather" variant="pills">
                    <Tabs.List grow>
                      <Tabs.Tab value="weather">天气</Tabs.Tab>
                      <Tabs.Tab value="settings">设置</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="weather" pt="xs">
                      <Stack gap="md">
                        <DynamicWeatherPanel />
                        <WeatherPanel />
                      </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="settings" pt="xs">
                      <EnemyLevelPanel />
                    </Tabs.Panel>
                  </Tabs>
                </Stack>
              </ScrollArea>

              <ScrollArea type="auto" style={{ height: '100%' }}>
                <Stack gap="md" pr="xs">
                  <Tabs defaultValue="simulation" variant="pills">
                    <Tabs.List grow>
                      <Tabs.Tab value="simulation">模拟控制</Tabs.Tab>
                      <Tabs.Tab value="replay">历史回放</Tabs.Tab>
                      <Tabs.Tab value="analysis">分析</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="simulation" pt="xs">
                      <Stack gap="md">
                        <SimulationPanel />
                        <PathInfoPanel />
                      </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="replay" pt="xs">
                      <HistoryReplayPanel />
                    </Tabs.Panel>
                    <Tabs.Panel value="analysis" pt="xs">
                      <AnalysisPanel />
                    </Tabs.Panel>
                  </Tabs>
                </Stack>
              </ScrollArea>
            </SimpleGrid>
          </div>
        </AppShell.Main>

        <Modal
          opened={showEvaluation}
          onClose={handleCloseEvaluation}
          title="📊 综合评估报告"
          size="xl"
          centered
          scrollAreaComponent={ScrollArea.Autosize}
        >
          {evaluationResult && (
            <EvaluationPanel 
              result={evaluationResult} 
              towers={towers}
              missions={missions}
              blindSpots={blindSpots}
              onClose={handleCloseEvaluation}
              onReset={handleReset}
            />
          )}
        </Modal>

        <Modal
          opened={showWarningCenter}
          onClose={() => setShowWarningCenter(false)}
          title={null}
          size="85%"
          centered
          withCloseButton={false}
          padding={0}
          styles={{
            content: { maxHeight: '90vh' },
            body: { height: '90vh', padding: 0, overflow: 'hidden' },
          }}
        >
          <WarningCenter onClose={() => setShowWarningCenter(false)} />
        </Modal>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
