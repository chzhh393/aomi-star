import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'dance_teacher',
  pageTitle: '舞蹈评分',
  roleTitle: '舞蹈老师盲评',
  roleSubtitle: '从动作理解、教学反馈与镜头表现角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #f093fb, #f5576c);',
  pageClass: 'dance-evaluation-page',
  pagePath: '/pages/recruit/dance-evaluation/dance-evaluation'
}));
