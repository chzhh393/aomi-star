import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'agent',
  pageTitle: '经纪人评价',
  roleTitle: '经纪人盲评',
  roleSubtitle: '从业务匹配与直播适配度角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #667eea, #764ba2);',
  pageClass: 'agent-evaluation-page',
  pagePath: '/pages/recruit/agent-evaluation/agent-evaluation'
}));
