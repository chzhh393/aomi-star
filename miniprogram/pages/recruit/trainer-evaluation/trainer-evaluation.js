import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'trainer',
  pageTitle: '培训师评价',
  roleTitle: '培训师盲评',
  roleSubtitle: '从训练反馈、学习速度与执行力角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #7b1fa2, #ba68c8);',
  pageClass: 'trainer-evaluation-page',
  pagePath: '/pages/recruit/trainer-evaluation/trainer-evaluation'
}));
