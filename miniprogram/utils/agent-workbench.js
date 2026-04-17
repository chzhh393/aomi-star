import { mockAgentWorkbench, mockAnchors, mockSchedules } from '../mock/data.js';

function getSignalClass(signal) {
  if (signal === 'red') {
    return 'signal-red';
  }

  if (signal === 'yellow') {
    return 'signal-yellow';
  }

  return 'signal-green';
}

export function getAgentWorkbenchData() {
  const managedAnchors = mockAnchors.slice(0, 7);
  const anchorMap = new Map(mockAnchors.map((item) => [item.id, item]));
  const battleBoard = mockAgentWorkbench.battleBoard.map((item) => ({
    ...item,
    skillSummary: item.skills.map((skill) => `${skill.name} ${skill.progress}%`).join(' / ')
  }));
  const todaySchedules = mockSchedules.slice(0, 3);
  const monthRevenue = managedAnchors.reduce((sum, item) => sum + Number(item.monthRevenue || 0), 0);
  const averageLiveHours = managedAnchors.length
    ? Math.round(managedAnchors.reduce((sum, item) => sum + Number(item.liveHours || 0), 0) / managedAnchors.length)
    : 0;

  return {
    overview: {
      managedCount: managedAnchors.length,
      todayLiveCount: todaySchedules.length,
      monthRevenue,
      monthRevenueText: (monthRevenue / 10000).toFixed(1),
      averageLiveHours,
      ...mockAgentWorkbench.mentalitySummary
    },
    talkTasks: mockAgentWorkbench.talkTasks.map((item) => {
      const anchor = anchorMap.get(item.anchorId) || {};
      const anchorName = item.anchorName || anchor.name || '';

      return {
        ...item,
        anchorName,
        avatar: item.avatar || anchor.avatar || '',
        nameInitial: anchorName.slice(0, 1),
        signalClass: getSignalClass(item.signal)
      };
    }),
    battleBoard,
    fanAssets: mockAgentWorkbench.fanAssets,
    schedulePreview: todaySchedules
  };
}
