import axios from 'axios';
import logger from '../shared/logger';
import {
  extractChatMessageText,
  PLAN_GENERATION_MAX_TOKENS,
  PLAN_GENERATION_MIN_TIMEOUT_MS,
} from '../shared/llmChatContent';
import { resolveDefaultLlmRuntime, type ResolvedLlmRuntime } from './runtimeLlmConfigService';

export interface LearningResource {
  type: 'book' | 'article' | 'video' | 'project' | 'other';
  title: string;
  url: string;
  description?: string;
}

export interface WeeklyPlan {
  week: number;
  title: string;
  description: string;
  goals: string[];
  resources?: LearningResource[];
  tasks: Array<{
    day: number;
    title: string;
    description: string;
    estimatedTime: number;
    resources?: LearningResource[];
  }>;
}

export interface LearningPlan {
  title: string;
  description: string;
  durationWeeks: number;
  weeklyPlans: WeeklyPlan[];
  mermaidCode: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface GeneratePlanRequest {
  goal: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  hoursPerWeek: number;
  durationWeeks: number;
  preferredStyle?: 'practical' | 'theoretical' | 'mixed';
  specificRequirements?: string;
}

const RESOURCE_TYPES = new Set(['book', 'article', 'video', 'project', 'other']);

function normalizeResource(raw: unknown): LearningResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;
  const typeRaw = typeof r.type === 'string' ? r.type.trim().toLowerCase() : 'other';
  const type = (RESOURCE_TYPES.has(typeRaw) ? typeRaw : 'other') as LearningResource['type'];
  const url =
    typeof r.url === 'string' && r.url.trim()
      ? r.url.trim()
      : `https://www.google.com/search?q=${encodeURIComponent(title)}`;
  const description = typeof r.description === 'string' ? r.description.trim() : undefined;
  return { type, title, url, description };
}

function normalizeResources(raw: unknown): LearningResource[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeResource).filter((x): x is LearningResource => Boolean(x)).slice(0, 4);
}

function searchResource(title: string, type: LearningResource['type'], query: string): LearningResource {
  return {
    type,
    title,
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    description: '点击打开搜索，自行挑选合适材料',
  };
}

/**
 * AI 学习计划生成服务（运行时配置见 runtimeLlmConfigService / 后台 LLM Profile）
 */
class AIService {
  async generateLearningPlan(request: GeneratePlanRequest): Promise<LearningPlan> {
    const llm = await resolveDefaultLlmRuntime();
    if (!llm?.apiKey) {
      return this.generateFallbackPlan(request, 'AI 服务未配置，已生成模板计划');
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callLlmChat(prompt, llm);
      return this.parsePlanResponse(response, request);
    } catch (error) {
      const aiErrorDetail = this.extractAiErrorDetail(error);
      logger.error('生成学习计划失败，使用模板回退', {
        status: aiErrorDetail.status,
        requestId: aiErrorDetail.requestId,
        message: aiErrorDetail.message,
        code: axios.isAxiosError(error) ? error.code : undefined,
      });

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return this.generateFallbackPlan(request, 'AI 响应超时，已切换为模板计划（含搜索资源）');
        }
        const status = error.response?.status;
        if (status === 401) {
          return this.generateFallbackPlan(request, 'AI 服务认证失败，已切换为模板计划');
        }
        if (status === 403) {
          return this.generateFallbackPlan(request, 'AI 服务无访问权限，已切换为模板计划');
        }
        if (status === 400) {
          const detailMessage = aiErrorDetail.message ? `：${aiErrorDetail.message}` : '';
          return this.generateFallbackPlan(request, `AI 请求参数错误${detailMessage}，已切换为模板计划`);
        }
        if (status === 429) {
          return this.generateFallbackPlan(request, 'AI 服务请求频率过高，已切换为模板计划');
        }
        if (status && status >= 500) {
          return this.generateFallbackPlan(request, 'AI 服务暂时不可用，已切换为模板计划');
        }
        return this.generateFallbackPlan(request, 'AI 服务调用失败，已切换为模板计划');
      }

      return this.generateFallbackPlan(request, '生成学习计划失败，已切换为模板计划');
    }
  }

  private extractAiErrorDetail(error: unknown): {
    status?: number;
    requestId?: string;
    message?: string;
  } {
    if (!axios.isAxiosError(error)) {
      return { message: error instanceof Error ? error.message : undefined };
    }

    const status = error.response?.status;
    const data = error.response?.data;
    const requestId = data?.request_id || data?.requestId;
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data === 'string' ? data : undefined) ||
      error.message;

    return { status, requestId, message };
  }

  private buildPrompt(request: GeneratePlanRequest): string {
    const { goal, currentLevel, hoursPerWeek, durationWeeks, preferredStyle, specificRequirements } =
      request;

    return `你是一位专业的学习规划师，请为用户制定可执行的学习计划。

**学习目标**: ${goal}
**当前水平**: ${currentLevel === 'beginner' ? '初学者' : currentLevel === 'intermediate' ? '中级' : '高级'}
**每周学习时间**: ${hoursPerWeek} 小时
**计划持续时间**: ${durationWeeks} 周
**学习风格偏好**: ${preferredStyle === 'practical' ? '实践为主' : preferredStyle === 'theoretical' ? '理论为主' : '理论实践结合'}
${specificRequirements ? `**特殊要求**: ${specificRequirements}` : ''}

**硬性要求**:
1. 只返回一个 JSON 对象（可用 \`\`\`json 包裹），不要额外解释
2. 每周任务总时长不超过 ${hoursPerWeek} 小时
3. 每个任务必须带 resources（1-2 个），让用户当天就能点开学
4. resources.url 优先给真实可访问链接；若无把握，给 Google 搜索链接，例如 https://www.google.com/search?q=关键词
5. mermaidCode 保持简短（一行 graph TD 即可）

JSON 结构：
{
  "title": "计划标题",
  "description": "整体说明",
  "durationWeeks": ${durationWeeks},
  "weeklyPlans": [
    {
      "week": 1,
      "title": "周标题",
      "description": "本周重点",
      "goals": ["目标1"],
      "resources": [
        { "type": "article|video|book|project|other", "title": "资源名", "url": "https://...", "description": "为何推荐" }
      ],
      "tasks": [
        {
          "day": 1,
          "title": "任务标题",
          "description": "具体做什么、做到什么算完成",
          "estimatedTime": 60,
          "resources": [
            { "type": "video", "title": "资源名", "url": "https://...", "description": "如何使用" }
          ]
        }
      ]
    }
  ],
  "mermaidCode": "graph TD\\nA[开始] --> B[第1周]"
}`;
  }

  private async callLlmChat(prompt: string, llm: ResolvedLlmRuntime): Promise<string> {
    const timeout = Math.max(llm.timeoutMs || 20000, PLAN_GENERATION_MIN_TIMEOUT_MS);
    const response = await axios.post(
      `${llm.baseURL}/chat/completions`,
      {
        model: llm.model,
        messages: [
          {
            role: 'system',
            content:
              '你是专业学习规划师。只输出合法 JSON 学习计划，每个任务必须包含可点击的 resources。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: PLAN_GENERATION_MAX_TOKENS,
      },
      {
        headers: {
          Authorization: `Bearer ${llm.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://learnflow.app',
          'X-Title': 'LearnFlow Learning Platform',
        },
        timeout,
      },
    );

    const content = extractChatMessageText(response.data.choices?.[0]?.message);
    if (!content) {
      throw new Error('AI 服务返回空响应');
    }
    return content;
  }

  private parsePlanResponse(response: string, request: GeneratePlanRequest): LearningPlan {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : response;
      jsonStr = jsonStr.trim().replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');

      const parsed = JSON.parse(jsonStr);
      if (!parsed.title || !parsed.weeklyPlans || !Array.isArray(parsed.weeklyPlans)) {
        throw new Error('AI 响应格式不正确');
      }
      return this.buildPlanFromParsedData(parsed, request);
    } catch (error) {
      logger.warn('解析 AI 计划失败，尝试提取 JSON 对象', {
        message: error instanceof Error ? error.message : String(error),
        head: response.slice(0, 200),
      });

      try {
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const parsed = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
          return this.buildPlanFromParsedData(parsed, request);
        }
      } catch (backupError) {
        logger.warn('备用 JSON 解析也失败', {
          message: backupError instanceof Error ? backupError.message : String(backupError),
        });
      }

      return this.generateFallbackPlan(request, 'AI 输出不可解析，已使用模板计划（含搜索资源）');
    }
  }

  private buildPlanFromParsedData(parsed: any, request: GeneratePlanRequest): LearningPlan {
    if (!parsed.title || !parsed.weeklyPlans || !Array.isArray(parsed.weeklyPlans)) {
      throw new Error('解析数据格式不正确');
    }

    const weeklyPlans: WeeklyPlan[] = parsed.weeklyPlans.map((week: any, index: number) => {
      const weekTitle = week.title || `第${index + 1}周`;
      let resources = normalizeResources(week.resources);
      const tasks = Array.isArray(week.tasks)
        ? week.tasks.map((task: any, dayIndex: number) => {
            let taskResources = normalizeResources(task.resources);
            if (taskResources.length === 0) {
              const q = `${request.goal} ${task.title || weekTitle}`;
              taskResources = [
                searchResource(`${task.title || '本任务'}相关资料`, 'article', q),
              ];
            }
            return {
              day: task.day || dayIndex + 1,
              title: task.title || '学习任务',
              description: task.description || '',
              estimatedTime: task.estimatedTime || 60,
              resources: taskResources,
            };
          })
        : [];

      if (resources.length === 0) {
        resources = [
          searchResource(`${request.goal} 第${index + 1}周资料`, 'article', `${request.goal} 第${index + 1}周`),
          searchResource(`${request.goal} 视频教程`, 'video', `${request.goal} 教程`),
        ];
      }

      return {
        week: index + 1,
        title: weekTitle,
        description: week.description || '',
        goals: Array.isArray(week.goals) ? week.goals : [],
        resources,
        tasks,
      };
    });

    return {
      title: parsed.title,
      description: parsed.description || '系统生成的学习计划',
      durationWeeks: request.durationWeeks,
      weeklyPlans,
      mermaidCode: parsed.mermaidCode
        ? String(parsed.mermaidCode).replace(/\\n/g, '\n').trim()
        : this.generateFallbackMermaid(request.durationWeeks),
    };
  }

  private generateFallbackPlan(request: GeneratePlanRequest, reason?: string): LearningPlan {
    const { goal, durationWeeks, hoursPerWeek } = request;
    const weeklyPlans: WeeklyPlan[] = [];
    const hoursPerDay = Math.ceil(hoursPerWeek / 7);

    for (let week = 1; week <= durationWeeks; week++) {
      const tasks = [];
      for (let day = 1; day <= 7; day++) {
        if (tasks.length < Math.ceil(hoursPerWeek / 2)) {
          const title = `${goal} - 第${week}周第${day}天`;
          tasks.push({
            day,
            title,
            description: `学习 ${goal}：完成本日任务后打卡。可先点下方资源开始。`,
            estimatedTime: hoursPerDay * 60,
            resources: [
              searchResource(`${goal} 入门`, 'article', `${goal} 入门教程`),
              searchResource(`${goal} 视频`, 'video', `${goal} 教程 bilibili`),
            ],
          });
        }
      }

      weeklyPlans.push({
        week,
        title: `第${week}周：${goal}`,
        description: `${goal} 第${week}周学习安排`,
        goals: [`完成本周 ${goal} 相关学习任务`],
        resources: [
          searchResource(`${goal} 系统教程`, 'article', `${goal} 系统学习`),
          searchResource(`${goal} 实践项目`, 'project', `${goal} 练习项目`),
        ],
        tasks,
      });
    }

    return {
      title: `${goal} 学习计划`,
      description: `为期 ${durationWeeks} 周的 ${goal} 学习计划，每周投入 ${hoursPerWeek} 小时。资源为可点击搜索入口，便于立刻开干。`,
      durationWeeks,
      weeklyPlans,
      mermaidCode: this.generateFallbackMermaid(durationWeeks),
      isFallback: true,
      fallbackReason: reason || 'AI 输出不可解析，已使用模板计划',
    };
  }

  private generateFallbackMermaid(durationWeeks: number): string {
    let mermaid = 'graph TD\n    A[开始学习]';
    for (let i = 1; i <= durationWeeks; i++) {
      const prev = i === 1 ? 'A' : `W${i - 1}`;
      mermaid += `\n    ${prev} --> W${i}[第${i}周]`;
    }
    mermaid += `\n    W${durationWeeks} --> E[完成学习]`;
    return mermaid;
  }
}

export const aiService = new AIService();
