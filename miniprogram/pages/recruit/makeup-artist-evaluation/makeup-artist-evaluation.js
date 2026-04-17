import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'makeup_artist',
  pageTitle: '化妆师评价',
  roleTitle: '化妆师盲评',
  roleSubtitle: '从上镜妆感、整体风格与包装潜力角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #FA709A, #FEE140);',
  pageClass: 'makeup-evaluation-page',
  pagePath: '/pages/recruit/makeup-artist-evaluation/makeup-artist-evaluation'
}));
