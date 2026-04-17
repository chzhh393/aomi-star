import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'stylist',
  pageTitle: '造型师评价',
  roleTitle: '造型师盲评',
  roleSubtitle: '从外型风格、镜头可塑性与人设匹配角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #8E44AD, #3498DB);',
  pageClass: 'stylist-evaluation-page',
  pagePath: '/pages/recruit/stylist-evaluation/stylist-evaluation'
}));
