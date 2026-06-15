import { Group, Button, Tooltip, Badge } from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { getRiskColor, getRiskLabel, getRiskIcon } from '../utils/warningEngine';

export function Toolbar() {
  const { isAddingTower, setIsAddingTower, showWarningCenter, setShowWarningCenter, warnings, lastAssessment } = useSimulationStore();

  const activeWarningCount = warnings.filter(w => w.status === 'active').length;

  return (
    <Group gap="xs">
      <Tooltip label="综合研判预警中心">
        <Button
          variant={showWarningCenter ? 'filled' : 'light'}
          color={lastAssessment ? getRiskColor(lastAssessment.overallRiskLevel) : 'orange'}
          onClick={() => setShowWarningCenter(!showWarningCenter)}
          leftSection="🚨"
          rightSection={
            activeWarningCount > 0 ? (
              <Badge size="xs" color="white" variant="filled" circle>
                {activeWarningCount}
              </Badge>
            ) : null
          }
        >
          {lastAssessment
            ? `${getRiskIcon(lastAssessment.overallRiskLevel)} ${getRiskLabel(lastAssessment.overallRiskLevel)}`
            : '预警中心'}
        </Button>
      </Tooltip>
      <Tooltip label={isAddingTower ? '取消添加' : '点击地图添加烽火台'}>
        <Button
          variant={isAddingTower ? 'filled' : 'light'}
          color={isAddingTower ? 'green' : 'blue'}
          onClick={() => setIsAddingTower(!isAddingTower)}
          leftSection={isAddingTower ? '✕' : '➕'}
        >
          {isAddingTower ? '取消添加' : '添加烽火台'}
        </Button>
      </Tooltip>
    </Group>
  );
}
