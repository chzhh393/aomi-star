import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'hr',
  pageTitle: 'HR评价',
  roleTitle: 'HR盲评',
  roleSubtitle: '从综合素质、团队适配与发展潜力角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #2e7d32, #66bb6a);',
  pageClass: 'hr-evaluation-page',
  pagePath: '/pages/recruit/hr-evaluation/hr-evaluation'
}));
