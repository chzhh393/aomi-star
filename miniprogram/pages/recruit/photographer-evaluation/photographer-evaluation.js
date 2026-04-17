import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'photographer',
  pageTitle: '摄影师评价',
  roleTitle: '摄影师盲评',
  roleSubtitle: '从镜头感、上镜表现与素材可塑性角度完成五维等级评分。',
  heroStyle: 'background: linear-gradient(135deg, #111116 0%, #2a241f 48%, #ff6a3d 120%);',
  pageClass: 'photographer-evaluation-page',
  pagePath: '/pages/recruit/photographer-evaluation/photographer-evaluation'
}));
