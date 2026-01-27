/**
 * Mock测试数据生成器
 * 用于测试完整的招聘流程
 *
 * 包含6个不同阶段的测试候选人，每个候选人都有完整的流程数据
 */

import { CANDIDATE_STATUS } from './candidates.js';

/**
 * 生成测试候选人数据
 * 覆盖招聘流程的6个阶段
 */
export function generateTestCandidates() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    // ==================== 阶段1：待审核 ====================
    {
      id: 'C20250102001',
      status: CANDIDATE_STATUS.PENDING,

      // 基本信息
      basicInfo: {
        name: '张小美',
        artName: '美美',
        age: 22,
        gender: '女',
        height: 168,
        weight: 52,
        phone: '138****0001',
        wechat: 'xiaomei_zhang',
        city: '北京',
        idCard: '110101********1234'
      },

      // 形象资料
      images: {
        lifePhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQjZDMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+55Sf5rS755WnPC90ZXh0Pjwvc3ZnPg==',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGOTA5MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5L6n6Z2i54WnPC90ZXh0Pjwvc3ZnPg==',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQzBDQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5YWo6Lqr54WnPC90ZXh0Pjwvc3ZnPg=='
        ],
        artPhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGOEVBRCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv54WnMTwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGNkU5RiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv54WnMjwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0U5MUU2MyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv54WnMzwvdGV4dD48L3N2Zz4='
        ],
        videoUrl: '/mock/videos/intro_C20250102001.mp4'
      },

      // 才艺信息
      talent: {
        mainTalents: ['唱歌', '聊天'],
        level: 7,
        works: ['抖音@美美子', '小红书@张小美'],
        description: '擅长流行歌曲演唱，声音甜美'
      },

      // 经验信息
      experience: {
        hasExperience: true,
        platforms: ['抖音', '快手'],
        maxFans: 50000,
        maxMonthlyIncome: 8000,
        contentLinks: ['https://douyin.com/user/xiaomei']
      },

      // 性格特质
      personality: {
        mbti: 'ENFP',
        stressResistance: 4,
        teamWork: 5,
        goals: '希望成为头部主播，打造个人IP，月收入达到3万以上'
      },

      // 期望条件
      expectation: {
        salaryRange: '8000-12000',
        timeCommitment: '全职',
        hoursPerWeek: 40,
        contentPreference: '唱歌、聊天、才艺展示'
      },

      // AI评分（报名时自动生成）
      aiScore: {
        faceScore: 82,
        talentScore: 75,
        overallScore: 79,
        tags: ['有经验', '声音好听', '亲和力强'],
        recommendation: '推荐录用',
        analysis: {
          strengths: ['有直播经验', '粉丝基础好', '形象佳'],
          weaknesses: ['才艺需提升'],
          potential: '中等偏上'
        }
      },

      // 提交时间
      appliedAt: `${today} 10:30:00`,
      source: '官网报名'
    },

    // ==================== 阶段2：已安排面试 ====================
    {
      id: 'C20250102002',
      status: CANDIDATE_STATUS.INTERVIEW_SCHEDULED,

      basicInfo: {
        name: '李佳琪',
        artName: '琪琪',
        age: 21,
        gender: '女',
        height: 165,
        weight: 48,
        phone: '138****0002',
        wechat: 'jiaqi_lee',
        city: '上海',
        idCard: '310101********5678'
      },

      images: {
        lifePhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzlCRDdGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+55Sf5rS744GXMjwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzg0QzVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5L6n6Z2i44GXMjwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzZCQUVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5YWo6Lqr44GXMjwvdGV4dD48L3N2Zz4='
        ],
        artPhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzRGQTZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXMi0xPC90ZXh0Pjwvc3ZnPg==',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzMzOUFGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXMi0yPC90ZXh0Pjwvc3ZnPg==',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzE4N0RGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXMi0zPC90ZXh0Pjwvc3ZnPg=='
        ],
        videoUrl: '/mock/videos/intro_C20250102002.mp4'
      },

      talent: {
        mainTalents: ['舞蹈', '唱歌'],
        level: 9,
        works: ['抖音舞蹈视频10万+播放'],
        description: '韩舞、现代舞功底扎实，协调性好'
      },

      experience: {
        hasExperience: false,
        platforms: [],
        maxFans: 0,
        maxMonthlyIncome: 0,
        contentLinks: []
      },

      personality: {
        mbti: 'ISFP',
        stressResistance: 3,
        teamWork: 4,
        goals: '想尝试直播，学习新技能，体验不同的工作方式'
      },

      expectation: {
        salaryRange: '5000-8000',
        timeCommitment: '全职',
        hoursPerWeek: 35,
        contentPreference: '舞蹈、运动、生活分享'
      },

      aiScore: {
        faceScore: 88,
        talentScore: 90,
        overallScore: 89,
        tags: ['高颜值', '舞蹈功底好', '形象佳', '有潜力'],
        recommendation: '强烈推荐',
        analysis: {
          strengths: ['舞蹈能力突出', '形象气质佳', '年轻有活力'],
          weaknesses: ['无直播经验', '抗压能力待观察'],
          potential: '非常高'
        }
      },

      // HR审核记录
      hrReview: {
        result: 'pass',
        reviewerId: 'HR001',
        reviewerName: 'HR001',
        comment: '形象气质佳，舞蹈功底扎实，虽无直播经验但潜力很大，强烈建议安排面试',
        suggestedSalary: '6000-8000',
        interviewDate: today,
        reviewAt: `${yesterday} 16:00:00`
      },

      // 面试安排
      interviewSchedule: {
        date: today,
        time: '14:00',
        location: '公司会议室A',
        address: '北京市朝阳区xx大厦8层',
        interviewers: [
          { id: 'PH001', role: 'photographer', name: '王摄影', phone: '138****1001' },
          { id: 'DT001', role: 'dance_teacher', name: '刘舞蹈', phone: '138****1002' },
          { id: 'MA001', role: 'makeup_artist', name: '陈化妆', phone: '138****1003' },
          { id: 'ST001', role: 'stylist', name: '林造型', phone: '138****1004' },
          { id: 'AG001', role: 'agent', name: '经纪人A', phone: '138****3001' }
        ],
        scheduledBy: 'HR001',
        scheduledAt: `${yesterday} 16:15:00`,
        notes: '请候选人提前15分钟到达，自备舞蹈服装'
      },

      appliedAt: `${yesterday} 14:20:00`,
      source: '朋友推荐'
    },

    // ==================== 阶段3：线上测试完成 ====================
    {
      id: 'C20250102003',
      status: CANDIDATE_STATUS.ONLINE_TEST_COMPLETED,

      basicInfo: {
        name: '王思思',
        artName: '思思',
        age: 23,
        gender: '女',
        height: 170,
        weight: 53,
        phone: '138****0003',
        wechat: 'sisi_wang',
        city: '广州',
        idCard: '440101********9012'
      },

      images: {
        lifePhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGRDBFQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXMy3nlJ88L3RleHQ+PC9zdmc+',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQjZENiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXMy3lgagnPC90ZXh0Pjwvc3ZnPg==',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGOUNDMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXMy3lhajourrjgZc8L3RleHQ+PC9zdmc+'
        ],
        artPhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGODJBQSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXMzwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGNjg5NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXMy0yPC90ZXh0Pjwvc3ZnPg==',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGNEU3RSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXMy0zPC90ZXh0Pjwvc3ZnPg=='
        ],
        videoUrl: '/mock/videos/intro_C20250102003.mp4'
      },

      talent: {
        mainTalents: ['聊天', '游戏'],
        level: 6,
        works: ['B站游戏实况'],
        description: '善于与粉丝互动，游戏实况经验丰富'
      },

      experience: {
        hasExperience: true,
        platforms: ['B站', '斗鱼'],
        maxFans: 30000,
        maxMonthlyIncome: 6000,
        contentLinks: ['https://space.bilibili.com/xxxxx']
      },

      personality: {
        mbti: 'ENFP',
        stressResistance: 5,
        teamWork: 5,
        goals: '扩大粉丝基础，提升收入水平，成为知名主播'
      },

      expectation: {
        salaryRange: '7000-10000',
        timeCommitment: '全职',
        hoursPerWeek: 40,
        contentPreference: '聊天、游戏、才艺展示'
      },

      aiScore: {
        faceScore: 84,
        talentScore: 70,
        overallScore: 77,
        tags: ['有经验', '互动能力强', '稳定性好'],
        recommendation: '推荐录用',
        analysis: {
          strengths: ['有直播经验', '互动能力强', '粉丝基础稳定'],
          weaknesses: ['才艺相对单一'],
          potential: '中等偏上'
        }
      },

      hrReview: {
        result: 'pass',
        reviewerId: 'HR001',
        reviewerName: 'HR001',
        comment: '有游戏直播经验，互动能力强，可以考虑聊天类主播方向',
        suggestedSalary: '7000-9000',
        interviewDate: yesterday,
        reviewAt: `${twoDaysAgo} 11:00:00`
      },

      interviewSchedule: {
        date: yesterday,
        time: '10:00',
        location: '公司会议室B',
        address: '北京市朝阳区xx大厦8层',
        interviewers: [
          { id: 'PH001', role: 'photographer', name: '王摄影', phone: '138****1001' },
          { id: 'DT001', role: 'dance_teacher', name: '刘舞蹈', phone: '138****1002' },
          { id: 'AG001', role: 'agent', name: '经纪人A', phone: '138****3001' }
        ],
        scheduledBy: 'HR001',
        scheduledAt: `${twoDaysAgo} 11:30:00`,
        notes: ''
      },

      // 线上测试结果（16PF性格测试）
      onlineTest: {
        completedAt: `${yesterday} 20:30:00`,
        totalQuestions: 50,
        completionTime: 28,  // 分钟
        score: 85,
        personalityType: 'ENFP-活动家',
        personality: {
          type: 'ENFP',
          label: '活动家',
          description: '充满热情和创造力的自由精神，总能找到理由微笑',
          dimensions: {
            // 16PF人格测试维度（卡特尔16种人格因素）
            warmth: 8.5,          // 乐群性（A）
            reasoning: 7.5,       // 聪慧性（B）
            emotionalStability: 7.0, // 稳定性（C）
            dominance: 8.0,       // 恃强性（E）
            liveliness: 9.0,      // 兴奋性（F）
            ruleConsciousness: 6.5, // 有恒性（G）
            socialBoldness: 8.5,  // 敢为性（H）
            sensitivity: 8.0,     // 敏感性（I）
            vigilance: 5.5,       // 怀疑性（L）
            abstractedness: 7.5,  // 幻想性（M）
            privateness: 5.0,     // 世故性（N）
            apprehension: 6.0,    // 忧虑性（O）
            openness: 8.5,        // 实验性（Q1）
            selfReliance: 7.0,    // 独立性（Q2）
            perfectionism: 6.5,   // 自律性（Q3）
            tension: 6.0          // 紧张性（Q4）
          }
        },
        traits: [
          { name: '外向性', score: 88, description: '非常外向，善于社交' },
          { name: '直觉', score: 82, description: '喜欢新鲜事物，富有想象力' },
          { name: '情感', score: 85, description: '重视人际关系，善解人意' },
          { name: '感知', score: 84, description: '灵活应变，适应能力强' }
        ],
        suitableTypes: ['互动主播', '聊天主播', '游戏主播'],
        strengths: [
          '善于沟通交流，能快速与观众建立联系',
          '热情开朗，能带动直播间气氛',
          '适应能力强，能应对各种突发情况'
        ],
        risks: [
          '可能过于关注他人反馈，需注意情绪管理',
          '计划性稍弱，需要团队支持'
        ],
        report: '综合测试结果显示，该候选人性格外向开朗，善于与人沟通，具有很强的感染力。适合从事互动类、聊天类直播。在直播过程中能够调动观众情绪，营造良好的直播氛围。建议在培训中加强情绪管理和时间管理能力。',
        recommendations: [
          '适合互动型直播，多与观众交流',
          '可以尝试聊天+才艺的组合形式',
          '培训重点：情绪管理、时间管理'
        ]
      },

      appliedAt: `${twoDaysAgo} 09:15:00`,
      source: '官网报名'
    },

    // ==================== 阶段4：待评级（面试素材已上传）====================
    {
      id: 'C20250102004',
      status: CANDIDATE_STATUS.PENDING_RATING,

      basicInfo: {
        name: '赵雅雅',
        artName: '雅雅',
        age: 20,
        gender: '女',
        height: 172,
        weight: 51,
        phone: '138****0004',
        wechat: 'yaya_zhao',
        city: '深圳',
        idCard: '440301********3456'
      },

      images: {
        lifePhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0QwRjBGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNOeUn+a0uzwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0I2RTZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNOS+p+mdojwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzlDREVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNOWFqOi6qjwvdGV4dD48L3N2Zz4='
        ],
        artPhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzgyRDZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNDwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzY4Q0VGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNDwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzRFQzZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNDwvdGV4dD48L3N2Zz4='
        ],
        videoUrl: '/mock/videos/intro_C20250102004.mp4'
      },

      talent: {
        mainTalents: ['舞蹈', '唱歌', '聊天'],
        level: 8,
        works: ['抖音舞蹈视频50万+播放', '参加过校园歌唱比赛'],
        description: '才艺全面，舞蹈和唱歌都不错，镜头表现力强'
      },

      experience: {
        hasExperience: false,
        platforms: [],
        maxFans: 0,
        maxMonthlyIncome: 0,
        contentLinks: ['https://douyin.com/user/yaya_dance']
      },

      personality: {
        mbti: 'ESFJ',
        stressResistance: 4,
        teamWork: 5,
        goals: '成为优秀主播，帮助家庭改善生活条件'
      },

      expectation: {
        salaryRange: '6000-10000',
        timeCommitment: '全职',
        hoursPerWeek: 40,
        contentPreference: '舞蹈、唱歌、才艺展示'
      },

      aiScore: {
        faceScore: 90,
        talentScore: 85,
        overallScore: 88,
        tags: ['高颜值', '才艺全面', '镜头感强', '潜力巨大'],
        recommendation: '强烈推荐',
        analysis: {
          strengths: ['形象气质佳', '才艺全面', '镜头表现力强'],
          weaknesses: ['无直播经验'],
          potential: '非常高'
        }
      },

      hrReview: {
        result: 'pass',
        reviewerId: 'HR001',
        reviewerName: 'HR001',
        comment: '综合素质优秀，形象气质佳，才艺全面，强烈推荐',
        suggestedSalary: '7000-10000',
        interviewDate: twoDaysAgo,
        reviewAt: `${twoDaysAgo} 10:00:00`
      },

      interviewSchedule: {
        date: twoDaysAgo,
        time: '15:00',
        location: '公司会议室C',
        address: '北京市朝阳区xx大厦8层',
        interviewers: [
          { id: 'PH001', role: 'photographer', name: '王摄影', phone: '138****1001' },
          { id: 'DT001', role: 'dance_teacher', name: '刘舞蹈', phone: '138****1002' },
          { id: 'MA001', role: 'makeup_artist', name: '陈化妆', phone: '138****1003' },
          { id: 'ST001', role: 'stylist', name: '林造型', phone: '138****1004' },
          { id: 'AG001', role: 'agent', name: '经纪人A', phone: '138****3001' }
        ],
        scheduledBy: 'HR001',
        scheduledAt: `${twoDaysAgo} 10:15:00`,
        notes: '重点候选人，所有面试官务必到场'
      },

      onlineTest: {
        completedAt: `${twoDaysAgo} 12:00:00`,
        totalQuestions: 50,
        completionTime: 25,
        score: 90,
        personalityType: 'ESFJ-执政官',
        personality: {
          type: 'ESFJ',
          label: '执政官',
          description: '热情友好，善于照顾他人，注重和谐',
          dimensions: {
            warmth: 9.0,
            reasoning: 7.5,
            emotionalStability: 8.0,
            dominance: 7.0,
            liveliness: 8.5,
            ruleConsciousness: 8.5,
            socialBoldness: 8.0,
            sensitivity: 8.5,
            vigilance: 5.0,
            abstractedness: 6.5,
            privateness: 5.5,
            apprehension: 6.0,
            openness: 7.5,
            selfReliance: 6.0,
            perfectionism: 8.5,
            tension: 5.5
          }
        },
        traits: [
          { name: '外向性', score: 92, description: '非常外向，乐于助人' },
          { name: '实感', score: 88, description: '注重实际，关注细节' },
          { name: '情感', score: 90, description: '感情丰富，善解人意' },
          { name: '判断', score: 89, description: '有条理，执行力强' }
        ],
        suitableTypes: ['才艺主播', '互动主播', '舞蹈主播'],
        strengths: [
          '责任心强，能按计划完成直播',
          '善于照顾粉丝感受，粉丝粘性高',
          '执行力强，培训效果好'
        ],
        risks: [
          '可能过于在意他人评价',
          '面对负面评论时需要心理疏导'
        ],
        report: '综合测试结果显示，该候选人性格外向友好，责任心强，执行力高。非常适合从事才艺展示类直播，能够稳定输出高质量内容。建议重点培养，有成为头部主播的潜力。',
        recommendations: [
          '重点培养对象，建议配备优秀经纪人',
          '适合才艺+互动的直播形式',
          '培训重点：镜头表现力、情绪管理'
        ]
      },

      // 面试素材（摄像师上传）
      interviewMaterials: {
        videos: [
          {
            path: '/mock/videos/interview_C20250102004_dance.mp4',
            type: 'dance',
            duration: '5:30',
            description: '舞蹈展示：韩舞+现代舞',
            quality: '1080p',
            size: '126MB'
          },
          {
            path: '/mock/videos/interview_C20250102004_talk.mp4',
            type: 'interview',
            duration: '18:45',
            description: '经纪人面谈录像',
            quality: '1080p',
            size: '420MB'
          }
        ],
        photos: {
          beforeMakeup: [
            '/mock/photos/C20250102004_before_1.jpg',
            '/mock/photos/C20250102004_before_2.jpg',
            '/mock/photos/C20250102004_before_3.jpg'
          ],
          afterMakeup: [
            '/mock/photos/C20250102004_after_1.jpg',
            '/mock/photos/C20250102004_after_2.jpg',
            '/mock/photos/C20250102004_after_3.jpg',
            '/mock/photos/C20250102004_after_4.jpg'
          ]
        },
        notes: '候选人表现优秀，镜头感非常好，舞蹈功底扎实，妆前妆后对比明显，上镜效果佳',
        uploadedBy: 'PH001',
        uploadedByName: '王摄影',
        uploadedAt: `${twoDaysAgo} 16:30:00`
      },

      // 各角色评价
      evaluations: {
        // 舞蹈导师评价
        danceTeacher: {
          scores: {
            basicSkills: 8.5,    // 基础功底 /10
            rhythm: 9.0,         // 节奏感 /10
            coordination: 8.5,   // 身体协调性 /10
            expression: 9.0,     // 表现力 /10
            potential: 8.5       // 可塑性 /10
          },
          totalScore: 8.7,       // 总分 /10
          gradeScore: 8.7 * 6,   // 换算成60分制 = 52.2
          comments: '基本功扎实，节奏感强，舞蹈表现力好，肢体协调性佳。韩舞和现代舞都有一定基础，动作到位，富有感染力。建议加强爵士舞训练，可塑性很强，预计2周内可达到开播标准。',
          recommendation: 'recommend',
          evaluatorId: 'DT001',
          evaluatorName: '刘舞蹈',
          evaluatedAt: `${twoDaysAgo} 16:00:00`
        },

        // 经纪人评价
        agent: {
          scores: {
            appearance: 9.0,      // 形象 /10
            communication: 8.5,   // 沟通能力 /10
            attitude: 9.0,        // 配合度 /10
            stability: 8.5,       // 稳定性评估 /10
            potential: 9.0        // 商业潜力 /10
          },
          totalScore: 8.8,        // 总分 /10
          comments: '形象气质佳，沟通能力强，配合度高，态度积极。有明确的职业目标，责任心强。家庭情况稳定，可以全职投入。商业潜力很大，建议签约A级主播合同。',
          recommendation: 'recommend',  // recommend/pending/reject
          suggestedContract: 'A级主播合约',
          suggestedSalary: '7000-10000',
          evaluatorId: 'AG001',
          evaluatorName: '经纪人A',
          evaluatedAt: `${twoDaysAgo} 17:00:00`
        },

        // 化妆师评估
        makeupArtist: {
          skinType: '中性偏干',
          skinCondition: '皮肤状态良好，无明显瑕疵',
          facialFeatures: {
            eyes: '大而有神，双眼皮，适合多种眼妆',
            nose: '鼻梁挺直，鼻型秀气',
            lips: '唇形饱满，适合多种唇色',
            face: '瓜子脸，轮廓分明，上镜效果好'
          },
          beforeAfterComparison: {
            score: 9.0,  // 妆前妆后对比效果 /10
            improvement: '妆后提升明显，气质更加突出',
            photogenic: '上镜效果非常好，镜头表现力强'
          },
          suitableStyles: ['清新', '甜美', '性感', '韩系'],
          dailyMakeup: '建议日常以清新、甜美妆容为主',
          liveMakeup: '直播妆容可适当加强，突出五官立体感',
          recommendations: '肤质好，妆容适配度高，建议多尝试不同风格。眼妆可以作为重点，凸显眼部优势。',
          evaluatorId: 'MA001',
          evaluatorName: '陈化妆',
          evaluatedAt: `${twoDaysAgo} 15:45:00`
        },

        // 造型师评估
        stylist: {
          bodyType: '标准型',
          bodyProportion: '身材比例好，腿长',
          height: 172,
          weight: 51,
          measurements: '良好',
          suitableStyles: ['韩系', '甜美', '街头', '运动'],
          colorAnalysis: {
            season: '春季型',
            suitableColors: ['粉色系', '蓝色系', '浅紫色', '米白色'],
            avoidColors: ['深色系', '暗色调']
          },
          styleRecommendations: {
            daily: '建议韩系、甜美风格为主',
            stage: '可尝试性感、酷飒风格',
            variety: '多样化尝试，塑造个人风格'
          },
          clothingSuggestions: [
            '韩系连衣裙适合日常直播',
            '运动套装适合舞蹈直播',
            '小礼服适合特殊活动',
            '街头风适合户外直播'
          ],
          accessories: '建议佩戴简约饰品，不宜过于繁复',
          recommendations: '身材条件好，可塑性强，建议建立个人风格服装库。重点打造2-3个主要风格，形成差异化。',
          evaluatorId: 'ST001',
          evaluatorName: '林造型',
          evaluatedAt: `${twoDaysAgo} 16:15:00`
        }
      },

      appliedAt: `${twoDaysAgo} 08:00:00`,
      source: '官网报名'
    },

    // ==================== 阶段5：已评级 ====================
    {
      id: 'C20250102005',
      status: CANDIDATE_STATUS.RATED,

      basicInfo: {
        name: '孙娜娜',
        artName: '娜娜',
        age: 24,
        gender: '女',
        height: 166,
        weight: 49,
        phone: '138****0005',
        wechat: 'nana_sun',
        city: '杭州',
        idCard: '330101********7890'
      },

      images: {
        lifePhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGRTRFMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNeWjv+e0oTwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGRDBDQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNeWjv+S+pzwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQkNCNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNeWFqOi6qjwvdGV4dD48L3N2Zz4='
        ],
        artPhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQTg5RSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNTwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGOTQ4OCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNTwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGODA3MiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNTwvdGV4dD48L3N2Zz4='
        ],
        videoUrl: '/mock/videos/intro_C20250102005.mp4'
      },

      talent: {
        mainTalents: ['舞蹈', '聊天'],
        level: 8,
        works: ['抖音舞蹈合集'],
        description: '舞蹈基础好，表现力强，善于与人交流'
      },

      experience: {
        hasExperience: true,
        platforms: ['抖音'],
        maxFans: 80000,
        maxMonthlyIncome: 12000,
        contentLinks: ['https://douyin.com/user/nana_dance']
      },

      personality: {
        mbti: 'ENFJ',
        stressResistance: 4,
        teamWork: 5,
        goals: '成为知名主播，扩大影响力'
      },

      expectation: {
        salaryRange: '8000-15000',
        timeCommitment: '全职',
        hoursPerWeek: 45,
        contentPreference: '舞蹈、才艺、互动'
      },

      aiScore: {
        faceScore: 87,
        talentScore: 82,
        overallScore: 85,
        tags: ['有经验', '高颜值', '舞蹈好', '粉丝基础好'],
        recommendation: '强烈推荐',
        analysis: {
          strengths: ['有成功经验', '粉丝基础扎实', '表现力强'],
          weaknesses: ['需要系统培训'],
          potential: '高'
        }
      },

      hrReview: {
        result: 'pass',
        reviewerId: 'HR001',
        reviewerName: 'HR001',
        comment: '有成功的直播经验，粉丝基础好，综合素质优秀',
        suggestedSalary: '8000-12000',
        interviewDate: twoDaysAgo,
        reviewAt: `${twoDaysAgo} 08:00:00`
      },

      interviewSchedule: {
        date: twoDaysAgo,
        time: '10:00',
        location: '公司会议室A',
        address: '北京市朝阳区xx大厦8层',
        interviewers: [
          { id: 'PH001', role: 'photographer', name: '王摄影', phone: '138****1001' },
          { id: 'DT001', role: 'dance_teacher', name: '刘舞蹈', phone: '138****1002' },
          { id: 'AG001', role: 'agent', name: '经纪人A', phone: '138****3001' }
        ],
        scheduledBy: 'HR001',
        scheduledAt: `${twoDaysAgo} 08:30:00`,
        notes: ''
      },

      onlineTest: {
        completedAt: `${twoDaysAgo} 09:00:00`,
        totalQuestions: 50,
        completionTime: 26,
        score: 88,
        personalityType: 'ENFJ-主人公',
        personality: {
          type: 'ENFJ',
          label: '主人公',
          description: '富有魅力的领导者，能激励他人',
          dimensions: {
            warmth: 9.0,
            reasoning: 8.0,
            emotionalStability: 8.0,
            dominance: 8.5,
            liveliness: 8.5,
            ruleConsciousness: 7.5,
            socialBoldness: 9.0,
            sensitivity: 8.0,
            vigilance: 5.5,
            abstractedness: 7.5,
            privateness: 5.0,
            apprehension: 6.0,
            openness: 8.0,
            selfReliance: 7.0,
            perfectionism: 8.0,
            tension: 6.0
          }
        },
        traits: [
          { name: '外向性', score: 90, description: '非常外向，富有魅力' },
          { name: '直觉', score: 86, description: '有远见，善于规划' },
          { name: '情感', score: 88, description: '感情丰富，善解人意' },
          { name: '判断', score: 87, description: '有条理，执行力强' }
        ],
        suitableTypes: ['才艺主播', '互动主播', '带货主播'],
        strengths: [
          '领导力强，能带动直播间氛围',
          '目标明确，执行力强',
          '善于激励粉丝，粉丝粘性高'
        ],
        risks: [
          '可能对自己要求过高，需注意情绪调节',
          '需要平衡工作和休息'
        ],
        report: '综合测试结果显示，该候选人具有很强的领导力和感染力，适合成为头部主播。有清晰的职业规划，执行力强。建议配备资深经纪人，制定长期发展计划。',
        recommendations: [
          '头部主播培养对象',
          '适合才艺展示+粉丝互动',
          '培训重点：IP打造、粉丝运营'
        ]
      },

      interviewMaterials: {
        videos: [
          {
            path: '/mock/videos/interview_C20250102005_dance.mp4',
            type: 'dance',
            duration: '6:20',
            description: '舞蹈展示：现代舞+爵士舞',
            quality: '1080p',
            size: '145MB'
          },
          {
            path: '/mock/videos/interview_C20250102005_talk.mp4',
            type: 'interview',
            duration: '22:10',
            description: '经纪人面谈录像',
            quality: '1080p',
            size: '498MB'
          }
        ],
        photos: {
          beforeMakeup: [
            '/mock/photos/C20250102005_before_1.jpg',
            '/mock/photos/C20250102005_before_2.jpg'
          ],
          afterMakeup: [
            '/mock/photos/C20250102005_after_1.jpg',
            '/mock/photos/C20250102005_after_2.jpg',
            '/mock/photos/C20250102005_after_3.jpg'
          ]
        },
        notes: '候选人经验丰富，镜头感很好，表现自然',
        uploadedBy: 'PH001',
        uploadedByName: '王摄影',
        uploadedAt: `${twoDaysAgo} 11:00:00`
      },

      evaluations: {
        danceTeacher: {
          scores: {
            basicSkills: 8.5,
            rhythm: 9.0,
            coordination: 8.5,
            expression: 9.0,
            potential: 8.5
          },
          totalScore: 8.7,
          gradeScore: 52.2,  // 8.7 * 6
          comments: '舞蹈功底扎实，表现力强，节奏感好。动作规范，舞台经验丰富。建议继续提升技术难度。',
          recommendation: 'recommend',
          evaluatorId: 'DT001',
          evaluatorName: '刘舞蹈',
          evaluatedAt: `${twoDaysAgo} 11:30:00`
        },

        agent: {
          scores: {
            appearance: 9.0,
            communication: 8.5,
            attitude: 9.0,
            stability: 8.5,
            potential: 9.0
          },
          totalScore: 8.8,
          comments: '有成功的直播经验，沟通能力强，职业规划清晰。建议签约A级合约，重点培养。',
          recommendation: 'recommend',
          suggestedContract: 'A级主播合约',
          suggestedSalary: '8000-12000',
          evaluatorId: 'AG001',
          evaluatorName: '经纪人A',
          evaluatedAt: `${twoDaysAgo} 13:00:00`
        }
      },

      // 系统评级（阶段5）
      rating: {
        grade: 'A',
        totalScore: 88,
        breakdown: {
          danceScore: 52.2,   // 舞蹈评分（60分满分）
          makeupAIScore: 36.0  // 妆容AI评分（40分满分）
        },
        calculation: {
          // 舞蹈评分计算（60%权重）
          danceBase: 8.7,              // 舞蹈导师总分
          danceWeighted: 8.7 * 6,      // 换算成60分 = 52.2

          // 妆容AI评分计算（40%权重）
          makeupAIBase: 9.0,           // AI妆容评分
          makeupAIWeighted: 9.0 * 4,   // 换算成40分 = 36.0

          // 总分
          total: 52.2 + 36.0           // = 88.2
        },
        gradeInfo: {
          level: 'A',
          range: '85-100分',
          label: 'A级（优秀）',
          description: '综合素质优秀，舞蹈功底扎实，镜头表现力强，快速上手，高潜力'
        },
        suggestedSalary: '8000-12000',
        trainingDuration: 2,  // 周
        expectedPerformance: '快速上手，高潜力，预计3个月内进入头部主播行列',
        isPass: true,
        generatedAt: twoDaysAgo,
        generatedBy: 'SYSTEM_AI',
        confirmedBy: 'HR001',
        confirmedByName: 'HR001',
        confirmedAt: `${twoDaysAgo} 15:00:00`,
        confirmNotes: '同意系统评级，建议签约'
      },

      appliedAt: `${twoDaysAgo} 07:00:00`,
      source: '官网报名'
    },

    // ==================== 阶段6：已签约 ====================
    {
      id: 'C20250102006',
      status: CANDIDATE_STATUS.SIGNED,

      basicInfo: {
        name: '周婷婷',
        artName: '婷婷',
        age: 22,
        gender: '女',
        height: 169,
        weight: 50,
        phone: '138****0006',
        wechat: 'tingting_zhou',
        city: '成都',
        idCard: '510101********2345'
      },

      images: {
        lifePhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGRjBGNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNueUn+a0uzwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGRTFGMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNuWPtOmdojwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGRDJFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44GXNuWFqOi6qjwvdGV4dD48L3N2Zz4='
        ],
        artPhotos: [
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQzNFNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNjwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQjREMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNjwvdGV4dD48L3N2Zz4=',
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI0ZGQTVCQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6Im65pyv44GXNjwvdGV4dD48L3N2Zz4='
        ],
        videoUrl: '/mock/videos/intro_C20250102006.mp4'
      },

      talent: {
        mainTalents: ['舞蹈', '唱歌'],
        level: 9,
        works: ['抖音爆款舞蹈视频200万+播放'],
        description: '才艺出众，表现力强，有爆款潜力'
      },

      experience: {
        hasExperience: true,
        platforms: ['抖音', '快手'],
        maxFans: 150000,
        maxMonthlyIncome: 20000,
        contentLinks: ['https://douyin.com/user/tingting_star']
      },

      personality: {
        mbti: 'ESFP',
        stressResistance: 5,
        teamWork: 5,
        goals: '成为头部主播，打造个人品牌，月入10万+'
      },

      expectation: {
        salaryRange: '10000-20000',
        timeCommitment: '全职',
        hoursPerWeek: 45,
        contentPreference: '舞蹈、才艺、互动、带货'
      },

      aiScore: {
        faceScore: 92,
        talentScore: 90,
        overallScore: 91,
        tags: ['高颜值', '才艺出众', '有经验', '爆款潜力'],
        recommendation: '强烈推荐',
        analysis: {
          strengths: ['有成功案例', '粉丝基础扎实', '爆款能力强'],
          weaknesses: ['期望较高，需要匹配资源'],
          potential: '极高'
        }
      },

      hrReview: {
        result: 'pass',
        reviewerId: 'HR001',
        reviewerName: 'HR001',
        comment: '顶级候选人，有成功的直播和短视频经验，综合素质极佳，强烈建议签约',
        suggestedSalary: '10000-15000',
        interviewDate: twoDaysAgo,
        reviewAt: `${twoDaysAgo} 07:00:00`
      },

      interviewSchedule: {
        date: twoDaysAgo,
        time: '09:00',
        location: '公司会议室B',
        address: '北京市朝阳区xx大厦8层',
        interviewers: [
          { id: 'PH001', role: 'photographer', name: '王摄影', phone: '138****1001' },
          { id: 'DT001', role: 'dance_teacher', name: '刘舞蹈', phone: '138****1002' },
          { id: 'AG001', role: 'agent', name: '经纪人A', phone: '138****3001' }
        ],
        scheduledBy: 'HR001',
        scheduledAt: `${twoDaysAgo} 07:15:00`,
        notes: 'VIP候选人，务必重点关注'
      },

      onlineTest: {
        completedAt: `${twoDaysAgo} 08:00:00`,
        totalQuestions: 50,
        completionTime: 22,
        score: 92,
        personalityType: 'ESFP-表演者',
        personality: {
          type: 'ESFP',
          label: '表演者',
          description: '充满活力的表演者，热爱生活',
          dimensions: {
            warmth: 9.5,
            reasoning: 7.5,
            emotionalStability: 8.5,
            dominance: 8.0,
            liveliness: 9.5,
            ruleConsciousness: 7.0,
            socialBoldness: 9.5,
            sensitivity: 8.0,
            vigilance: 5.0,
            abstractedness: 6.5,
            privateness: 4.5,
            apprehension: 5.5,
            openness: 9.0,
            selfReliance: 7.5,
            perfectionism: 7.5,
            tension: 5.0
          }
        },
        traits: [
          { name: '外向性', score: 94, description: '极度外向，富有表演天赋' },
          { name: '实感', score: 90, description: '活在当下，享受生活' },
          { name: '情感', score: 92, description: '感情丰富，热情洋溢' },
          { name: '感知', score: 91, description: '灵活应变，即兴发挥能力强' }
        ],
        suitableTypes: ['才艺主播', '表演主播', '带货主播'],
        strengths: [
          '天生的表演者，镜头表现力极强',
          '感染力强，能快速调动气氛',
          '即兴发挥能力出色，应变能力强'
        ],
        risks: [
          '可能过于追求即时反馈',
          '需要经纪人协助做好长期规划'
        ],
        report: '综合测试结果显示，该候选人是天生的表演者，极具表演天赋和感染力。适合成为顶级主播，建议配备资深经纪团队，制定明星级培养计划。',
        recommendations: [
          '明星主播培养计划',
          '适合才艺展示+粉丝互动+带货',
          '培训重点：IP打造、商业变现'
        ]
      },

      interviewMaterials: {
        videos: [
          {
            path: '/mock/videos/interview_C20250102006_dance.mp4',
            type: 'dance',
            duration: '8:15',
            description: '舞蹈展示：韩舞+爵士舞+现代舞',
            quality: '1080p',
            size: '189MB'
          },
          {
            path: '/mock/videos/interview_C20250102006_talent.mp4',
            type: 'talent',
            duration: '5:30',
            description: '才艺展示：唱歌+即兴表演',
            quality: '1080p',
            size: '125MB'
          },
          {
            path: '/mock/videos/interview_C20250102006_talk.mp4',
            type: 'interview',
            duration: '25:40',
            description: '经纪人面谈录像',
            quality: '1080p',
            size: '578MB'
          }
        ],
        photos: {
          beforeMakeup: [
            '/mock/photos/C20250102006_before_1.jpg',
            '/mock/photos/C20250102006_before_2.jpg'
          ],
          afterMakeup: [
            '/mock/photos/C20250102006_after_1.jpg',
            '/mock/photos/C20250102006_after_2.jpg',
            '/mock/photos/C20250102006_after_3.jpg',
            '/mock/photos/C20250102006_after_4.jpg',
            '/mock/photos/C20250102006_after_5.jpg'
          ]
        },
        notes: '顶级候选人，表现力极强，镜头感出色，妆前妆后都非常上镜',
        uploadedBy: 'PH001',
        uploadedByName: '王摄影',
        uploadedAt: `${twoDaysAgo} 10:00:00`
      },

      evaluations: {
        danceTeacher: {
          scores: {
            basicSkills: 9.0,
            rhythm: 9.5,
            coordination: 9.0,
            expression: 9.5,
            potential: 9.0
          },
          totalScore: 9.2,
          gradeScore: 55.2,  // 9.2 * 6
          comments: '顶级水平！舞蹈功底扎实，表现力出色，节奏感极强。多种舞蹈风格都能驾驭，舞台经验丰富。建议直接开播，无需过多培训。',
          recommendation: 'recommend',
          evaluatorId: 'DT001',
          evaluatorName: '刘舞蹈',
          evaluatedAt: `${twoDaysAgo} 11:00:00`
        },

        agent: {
          scores: {
            appearance: 9.5,
            communication: 9.0,
            attitude: 9.5,
            stability: 9.0,
            potential: 9.5
          },
          totalScore: 9.3,
          comments: '顶级候选人！有成功的直播和短视频经验，综合素质极佳，商业价值高。强烈建议签约A级合约，配备资深团队，重点培养。预计3个月内可进入头部主播行列。',
          recommendation: 'recommend',
          suggestedContract: 'A级明星主播合约',
          suggestedSalary: '10000-15000',
          evaluatorId: 'AG001',
          evaluatorName: '经纪人A',
          evaluatedAt: `${twoDaysAgo} 12:00:00`
        }
      },

      rating: {
        grade: 'A',
        totalScore: 92,
        breakdown: {
          danceScore: 55.2,   // 9.2 * 6 = 55.2
          makeupAIScore: 37.0  // 9.25 * 4 = 37.0
        },
        calculation: {
          danceBase: 9.2,
          danceWeighted: 55.2,
          makeupAIBase: 9.25,
          makeupAIWeighted: 37.0,
          total: 92.2
        },
        gradeInfo: {
          level: 'A',
          range: '85-100分',
          label: 'A级（优秀）',
          description: '顶级候选人，综合素质极佳，表现力出色，明星潜质，建议重点培养'
        },
        suggestedSalary: '10000-15000',
        trainingDuration: 1,  // 周（快速通道）
        expectedPerformance: '无需过多培训，可直接开播。预计3个月内进入头部主播行列，6个月内月收入突破10万',
        isPass: true,
        generatedAt: twoDaysAgo,
        generatedBy: 'SYSTEM_AI',
        confirmedBy: 'HR001',
        confirmedByName: 'HR001',
        confirmedAt: `${twoDaysAgo} 13:00:00`,
        confirmNotes: '同意系统评级，顶级候选人，强烈建议签约并重点培养'
      },

      // 合同信息（阶段6）
      contract: {
        contractNo: 'CON-20251102-001',
        type: 'A级明星主播合约',
        duration: 12,  // 月
        startDate: `${twoDaysAgo}`,
        endDate: new Date(new Date(twoDaysAgo).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

        // 薪资结构
        salary: {
          baseSalary: 10000,      // 底薪
          fullAttendance: 1000,   // 全勤奖（直播≥22天/月）
          hourlyRate: 30,         // 超时补贴（超过基础120小时/月）
          commission: {
            tier1: { range: '0-30000', rate: '40%', description: '月打赏0-3万，分成40%' },
            tier2: { range: '30000-50000', rate: '45%', description: '月打赏3-5万，分成45%' },
            tier3: { range: '50000+', rate: '50%', description: '月打赏5万以上，分成50%' }
          },
          bonus: {
            monthly: '完成月度目标可获得1000-5000元奖金',
            quarterly: '季度排名前3可获得额外奖金',
            annual: '年度优秀主播可获得10万元奖金'
          }
        },

        // 合同条款
        terms: [
          '每周至少直播5次，每次至少3小时',
          '每月直播总时长不少于120小时',
          '服从公司统一安排和培训',
          '配合公司宣传和商业活动',
          '保守商业秘密，不得私下接单',
          '违约需支付违约金'
        ],

        // 特殊条款
        specialTerms: [
          '公司提供专属经纪人和运营团队',
          '公司承担直播设备和场地费用',
          '享有优先参与公司重大活动的权利',
          '年度收入达到100万元可升级为S级合约'
        ],

        // 文件信息
        filePath: '/mock/contracts/contract_C20250102006.pdf',
        signedDate: `${twoDaysAgo}`,
        signedBy: 'AG001',
        signedByName: '经纪人A',
        signedAt: `${twoDaysAgo} 14:30:00`,
        witnessBy: 'HR001',
        witnessName: 'HR001',

        // 签约备注
        notes: '顶级候选人，按A级明星主播合约签署，配备资深经纪团队，预期3个月内进入头部主播行列'
      },

      // 角色升级记录（签约后自动）
      roleUpgrade: {
        from: 'candidate',
        to: 'streamer',
        upgradedAt: `${twoDaysAgo} 14:31:00`,
        reason: '签约完成，自动升级为主播',
        agentId: 'AG001',
        agentName: '经纪人A',
        initialLevel: 'A',
        welcomeMessage: '恭喜您正式成为主播！欢迎加入我们的大家庭！'
      },

      appliedAt: `${twoDaysAgo} 06:00:00`,
      source: '星探推荐'
    }
  ];
}

/**
 * 测试数据使用说明
 */
export const TEST_DATA_GUIDE = {
  description: '完整招聘流程测试数据（6个阶段）',
  version: '2.0',
  lastUpdate: '2025-11-03',

  stages: [
    {
      stage: 1,
      status: 'pending',
      candidateId: 'C20250102001',
      candidateName: '张小美',
      description: '待HR审核 - 刚提交报名表单',
      actions: ['HR审核通过', 'HR拒绝'],
      testAccount: { role: 'hr', id: 'HR001' }
    },
    {
      stage: 2,
      status: 'interview_scheduled',
      candidateId: 'C20250102002',
      candidateName: '李佳琪',
      description: '已安排面试 - HR已分配面试官，待候选人完成线上测试',
      actions: ['候选人完成线上测试'],
      testAccount: { role: 'candidate', id: 'CAN001' }
    },
    {
      stage: 3,
      status: 'online_test_completed',
      candidateId: 'C20250102003',
      candidateName: '王思思',
      description: '线上测试完成 - 待线下面试和素材上传',
      actions: ['摄像师上传素材', '舞蹈导师评价', '经纪人评价'],
      testAccounts: [
        { role: 'photographer', id: 'PH001' },
        { role: 'dance_teacher', id: 'DT001' },
        { role: 'agent', id: 'AG001' }
      ]
    },
    {
      stage: 4,
      status: 'pending_rating',
      candidateId: 'C20250102004',
      candidateName: '赵雅雅',
      description: '待评级 - 素材和评价已完成，等待系统评级',
      actions: ['系统自动评级', 'HR确认评级'],
      testAccount: { role: 'hr', id: 'HR001' }
    },
    {
      stage: 5,
      status: 'rated',
      candidateId: 'C20250102005',
      candidateName: '孙娜娜',
      description: '已评级 - 评级完成，待经纪人上传合同',
      actions: ['经纪人上传合同'],
      testAccount: { role: 'agent', id: 'AG001' }
    },
    {
      stage: 6,
      status: 'signed',
      candidateId: 'C20250102006',
      candidateName: '周婷婷',
      description: '已签约 - 合同签署完成，角色已升级为主播',
      actions: ['进入主播工作台', '开始培训'],
      testAccount: { role: 'candidate', id: 'CAN001' },
      note: '此候选人角色已从candidate升级为streamer'
    }
  ],

  testAccounts: {
    hr: { id: 'HR001', name: 'HR001', description: 'HR管理员，负责审核和面试官分配' },
    photographer: { id: 'PH001', name: '王摄影', description: '摄像师，负责拍摄和上传面试素材' },
    danceTeacher: { id: 'DT001', name: '刘舞蹈', description: '舞蹈导师，负责舞蹈评价' },
    makeupArtist: { id: 'MA001', name: '陈化妆', description: '化妆师，负责妆容评估' },
    stylist: { id: 'ST001', name: '林造型', description: '造型师，负责造型评估' },
    agent: { id: 'AG001', name: '经纪人A', description: '经纪人，负责面试评价和合同签署' },
    candidate: { id: 'CAN001', name: '测试候选人', description: '候选人账号，可查看进度和完成测试' }
  },

  dataStructure: {
    basicInfo: '基本信息：姓名、年龄、身高、体重、电话、城市等',
    images: '形象资料：生活照3张、艺术照3张、视频1个',
    talent: '才艺信息：主修才艺、等级、代表作品',
    experience: '经验信息：直播经验、平台、粉丝数、收入',
    personality: '性格特质：MBTI、抗压能力、团队协作、职业目标',
    expectation: '期望条件：薪资范围、时间投入、内容偏好',
    aiScore: 'AI评分：颜值分、才艺分、综合分、标签、建议',
    hrReview: 'HR审核：结果、意见、建议薪资、审核时间',
    interviewSchedule: '面试安排：时间、地点、面试官列表',
    onlineTest: '线上测试：16PF性格测试详细结果',
    interviewMaterials: '面试素材：视频、照片、摄像师备注',
    evaluations: '角色评价：舞蹈导师、经纪人、化妆师、造型师评价',
    rating: '系统评级：A/B/C/D等级、详细评分、建议薪资',
    contract: '合同信息：合同类型、薪资结构、条款、签署信息'
  }
};
