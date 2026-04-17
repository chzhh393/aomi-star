import { createEvaluationPage } from '../../interviewer/evaluation-shared.js';

Page(createEvaluationPage({
  pageRole: 'admin',
  pageTitle: '管理员评价',
  roleTitle: '管理员面试评价',
  roleSubtitle: '你可以作为面试官提交完整五维评价，也可以返回汇总页直接终裁。',
  heroStyle: 'background: linear-gradient(135deg, #17212b, #30445a);',
  pageClass: 'admin-evaluation-page',
  pagePath: '/pages/recruit/admin-evaluation/admin-evaluation'
}));
