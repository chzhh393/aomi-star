import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'operations',
  pageTitle: '运营评价',
  roleTitle: '运营盲评',
  roleSubtitle: '从内容包装、账号表现与运营可塑性角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #00838f, #26c6da);',
  pageClass: 'operations-evaluation-page',
  pagePath: '/pages/recruit/operations-evaluation/operations-evaluation'
}));
