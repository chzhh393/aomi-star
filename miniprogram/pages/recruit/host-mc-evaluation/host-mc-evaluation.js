import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'host_mc',
  pageTitle: '主持/MC评价',
  roleTitle: '主持/MC盲评',
  roleSubtitle: '从控场表达、互动节奏与镜头沟通角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #ff7043, #ffa726);',
  pageClass: 'host-mc-evaluation-page',
  pagePath: '/pages/recruit/host-mc-evaluation/host-mc-evaluation'
}));
