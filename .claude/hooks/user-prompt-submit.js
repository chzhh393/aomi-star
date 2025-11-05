#!/usr/bin/env node

/**
 * User Prompt Submit Hook
 *
 * 在用户提交 prompt 之前自动检测并激活相关 Skill
 *
 * 工作流程：
 * 1. 读取用户输入的 prompt
 * 2. 根据 skill-rules.json 检查是否应该激活某个 Skill
 * 3. 如果匹配，读取对应的 SKILL.md 内容
 * 4. 将 Skill 内容注入到 prompt 前面作为系统指令
 *
 * 使用方法：
 * - 此 Hook 由 Claude Code 自动调用
 * - 在 .claude/settings.local.json 中配置启用
 */

const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================

const PROJECT_ROOT = path.join(__dirname, '../..');
const SKILL_RULES_PATH = path.join(__dirname, '../skill-rules.json');
const SKILLS_DIR = path.join(__dirname, '../skills');

// ==================== 工具函数 ====================

/**
 * 读取 JSON 文件
 */
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 读取文本文件
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 记录日志
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// ==================== 主要逻辑 ====================

/**
 * 检查关键词匹配
 */
function checkKeywordMatch(prompt, keywords, rules) {
  const caseSensitive = rules?.keywordMatching?.caseSensitive || false;
  const searchPrompt = caseSensitive ? prompt : prompt.toLowerCase();

  for (const keyword of keywords) {
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
    if (searchPrompt.includes(searchKeyword)) {
      return {
        matched: true,
        keyword: keyword,
        confidence: 1.0
      };
    }
  }

  return { matched: false };
}

/**
 * 检查文件路径匹配（简化版）
 */
function checkFileMatch(prompt, filePatterns) {
  // 简单检查 prompt 中是否提到文件路径
  for (const pattern of filePatterns) {
    // 将 glob 模式转换为关键词
    const keywords = pattern
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .split('/')
      .filter(p => p.length > 0);

    for (const keyword of keywords) {
      if (prompt.includes(keyword)) {
        return {
          matched: true,
          pattern: pattern,
          confidence: 0.8
        };
      }
    }
  }

  return { matched: false };
}

/**
 * 检查上下文模式匹配
 */
function checkContextMatch(prompt, contextPatterns, rules) {
  if (!rules?.contextMatching?.enabled) {
    return { matched: false };
  }

  for (const pattern of contextPatterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(prompt)) {
        return {
          matched: true,
          pattern: pattern,
          confidence: 0.9
        };
      }
    } catch (error) {
      log('warn', `无效的正则表达式: ${pattern}`, error);
    }
  }

  return { matched: false };
}

/**
 * 评估是否应该激活某个 Skill
 */
function evaluateSkill(skill, prompt, rules) {
  const triggers = skill.triggers || {};
  const autoActivate = skill.autoActivate || {};
  const results = [];

  // 检查关键词匹配
  if (autoActivate.onKeywordMatch && triggers.keywords) {
    const keywordResult = checkKeywordMatch(prompt, triggers.keywords, rules);
    if (keywordResult.matched) {
      results.push({
        type: 'keyword',
        ...keywordResult
      });
    }
  }

  // 检查文件路径匹配
  if (autoActivate.onFileMatch && triggers.filePatterns) {
    const fileResult = checkFileMatch(prompt, triggers.filePatterns);
    if (fileResult.matched) {
      results.push({
        type: 'file',
        ...fileResult
      });
    }
  }

  // 检查上下文模式匹配
  if (autoActivate.onContextMatch && triggers.contextPatterns) {
    const contextResult = checkContextMatch(prompt, triggers.contextPatterns, rules);
    if (contextResult.matched) {
      results.push({
        type: 'context',
        ...contextResult
      });
    }
  }

  // 计算总体置信度
  if (results.length > 0) {
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const minConfidence = autoActivate.minConfidence || 0.7;

    if (totalConfidence >= minConfidence) {
      return {
        shouldActivate: true,
        confidence: totalConfidence,
        matches: results
      };
    }
  }

  return { shouldActivate: false };
}

/**
 * 读取 Skill 内容
 */
function loadSkill(skill) {
  const skillPath = path.join(PROJECT_ROOT, skill.path);
  const content = readFile(skillPath);

  if (!content) {
    log('error', `无法读取 Skill: ${skill.name}`, { path: skillPath });
    return null;
  }

  return {
    id: skill.id,
    name: skill.name,
    content: content,
    priority: skill.priority || 0
  };
}

/**
 * 主处理函数
 */
function processPrompt(prompt) {
  // 读取配置
  const config = readJSON(SKILL_RULES_PATH);
  if (!config) {
    log('error', '无法读取 skill-rules.json，跳过 Skill 自动激活');
    return prompt;
  }

  if (!config.globalSettings?.enableAutoActivation) {
    log('info', 'Skill 自动激活已禁用');
    return prompt;
  }

  log('info', '开始检查 Skill 自动激活条件');

  // 评估所有 Skills
  const activeSkills = [];
  for (const skill of config.skills || []) {
    if (!skill.enabled) {
      continue;
    }

    const evaluation = evaluateSkill(skill, prompt, config.rules);
    if (evaluation.shouldActivate) {
      const loadedSkill = loadSkill(skill);
      if (loadedSkill) {
        activeSkills.push({
          ...loadedSkill,
          evaluation: evaluation
        });
        log('info', `✓ 匹配 Skill: ${skill.name}`, {
          confidence: evaluation.confidence.toFixed(2),
          matches: evaluation.matches.map(m => `${m.type}:${m.keyword || m.pattern || ''}`)
        });
      }
    }
  }

  // 如果没有匹配的 Skill，直接返回原始 prompt
  if (activeSkills.length === 0) {
    log('info', '未匹配到任何 Skill');
    return prompt;
  }

  // 按优先级排序
  activeSkills.sort((a, b) => b.priority - a.priority);

  // 限制激活的 Skill 数量
  const maxActiveSkills = config.globalSettings?.maxActiveSkills || 3;
  const selectedSkills = activeSkills.slice(0, maxActiveSkills);

  // 构建增强后的 prompt
  let enhancedPrompt = '';

  // 添加 Skill 内容作为系统指令
  enhancedPrompt += '# 🎯 自动激活的 Skills\n\n';
  enhancedPrompt += '> 以下 Skills 已根据您的请求自动激活，请遵循这些规范进行开发。\n\n';

  for (const skill of selectedSkills) {
    enhancedPrompt += `---\n\n`;
    enhancedPrompt += `## Skill: ${skill.name}\n\n`;
    enhancedPrompt += skill.content;
    enhancedPrompt += '\n\n';
  }

  enhancedPrompt += '---\n\n';
  enhancedPrompt += '# 用户请求\n\n';
  enhancedPrompt += prompt;

  // 显示激活通知
  if (config.notifications?.showActivationNotice) {
    const skillNames = selectedSkills.map(s => s.name).join(', ');
    console.log('\n' + config.notifications.noticeFormat.replace('{skillName}', skillNames) + '\n');
  }

  return enhancedPrompt;
}

// ==================== 入口 ====================

function main() {
  try {
    // 从标准输入读取 prompt
    const stdinBuffer = fs.readFileSync(0, 'utf-8');
    const prompt = stdinBuffer.trim();

    if (!prompt) {
      log('warn', '收到空的 prompt');
      return;
    }

    // 处理 prompt
    const enhancedPrompt = processPrompt(prompt);

    // 输出增强后的 prompt
    process.stdout.write(enhancedPrompt);
  } catch (error) {
    log('error', 'Hook 执行失败', error);
    // 出错时返回原始输入
    process.stdout.write(fs.readFileSync(0, 'utf-8'));
  }
}

// 仅在直接运行时执行
if (require.main === module) {
  main();
}

module.exports = {
  processPrompt,
  evaluateSkill,
  checkKeywordMatch,
  checkFileMatch,
  checkContextMatch
};
