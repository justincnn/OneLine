import { TimelineEvent } from "@/types";

// API超时和重试配置
const API_TIMEOUT_MS = 60000;
const STREAM_MAX_RETRIES = 3;

export type ProgressCallback = (progress: number, stage?: string) => void;

// 定义流式回调函数类型
export type StreamCallback = (chunk: string, isDone: boolean) => void;

interface ApiError extends Error {
  status?: number;
  info?: any;
}

interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}

interface SearchTimelineResponse {
  timeline: TimelineEvent[];
  summary?: string;
}

interface SearchEventDetailsResponse {
  content: string;
}

// 系统提示使用分段文本格式而不是JSON
const systemPromptTimeline = `
你是一个专业的历史研究员和时间轴生成助手。用户将提供一个事件或主题，你需要搜索相关信息并生成一个按时间顺序排列的事件时间轴。

对于每个事件，请提供以下信息：
1. 事件的具体日期（尽可能精确到日）
2. 事件的简明标题
3. 详细描述事件的经过、原因和影响
4. 与事件相关的重要人物，包括他们的姓名和角色
5. 信息来源（如果有可靠来源）

请按照以下格式提供响应：

EVENT
日期: {yyyy-mm-dd或其他适当的日期格式}
标题: {事件标题}
描述: {详细描述}
人物: {人物1姓名}|{人物1角色}|{人物1关联颜色，如#3b82f6}; {人物2姓名}|{人物2角色}|{人物2关联颜色，如#10b981}
来源: {来源标题}|{来源URL}
END

EVENT
...（下一个事件）
END

SUMMARY
{对整个时间轴的简要总结，包括关键点和趋势}
END
`;

const systemPromptEventDetails = `
你是一个专业的历史分析师和事件研究员。用户将提供一个历史事件的标题和日期，你需要搜索相关信息并生成该事件的详细分析。

在分析中，请包含以下内容：
1. 事件的背景和前因
2. 事件的详细经过
3. 主要参与者及其动机
4. 事件的短期和长期影响
5. 相关历史评价和争议
6. 历史意义和教训

请用标题分段组织你的分析，使用以下格式：
===标题===
内容段落...

===背景与前因===
内容段落...

===事件经过===
内容段落...

以此类推。

请确保分析全面、客观、准确，并引用可靠的历史资料。
`;

/**
 * 统一的数据获取函数，支持流式响应
 */
export async function fetchData<T>(
  url: string,
  options: RequestInit = {},
  streamCallback?: StreamCallback,
  progressCallback?: ProgressCallback,
  retryCount = 0
): Promise<ApiResponse<T>> {
  try {
    progressCallback?.(0, "开始请求");
    
    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    
    options.signal = controller.signal;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error: ApiError = new Error(`API错误: ${response.status}`);
      error.status = response.status;
      error.info = await response.json().catch(() => ({}));
      throw error;
    }
    
    // 检查是否为流式响应
    if (streamCallback && response.headers.get("content-type")?.includes("text/event-stream")) {
      return handleStreamResponse<T>(response, streamCallback, progressCallback);
    }
    
    progressCallback?.(50, "解析响应");
    const data = await response.json();
    progressCallback?.(100, "完成");
    
    return { data };
  } catch (error: any) {
    // 自动重试流式请求
    if (streamCallback && retryCount < STREAM_MAX_RETRIES && error.name !== "AbortError") {
      console.warn(`流式请求失败，正在重试 (${retryCount + 1}/${STREAM_MAX_RETRIES})...`, error);
      return fetchData<T>(url, options, streamCallback, progressCallback, retryCount + 1);
    }
    
    console.error("API请求失败:", error);
    return {
      data: {} as T,
      error: {
        name: error.name || "Error",
        message: error.message || "未知错误",
        status: error.status,
        info: error.info,
      },
    };
  }
}

/**
 * 处理流式响应
 */
async function handleStreamResponse<T>(
  response: Response,
  streamCallback: StreamCallback,
  progressCallback?: ProgressCallback
): Promise<ApiResponse<T>> {
  if (!response.body) {
    throw new Error("响应没有可读流");
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedData = "";
  let done = false;
  
  progressCallback?.(30, "接收流式数据");
  
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    
    if (value) {
      const chunk = decoder.decode(value, { stream: !readerDone });
      receivedData += chunk;
      streamCallback(chunk, false);
    }
  }
  
  // 通知流完成
  streamCallback("", true);
  progressCallback?.(100, "完成");
  
  // 尝试解析完整数据为JSON
  try {
    const parsedData = JSON.parse(receivedData) as T;
    return { data: parsedData };
  } catch (e) {
    // 如果不是有效的JSON，返回文本形式的数据
    return {
      data: { 
        rawContent: receivedData 
      } as unknown as T
    };
  }
}

/**
 * 获取时间轴数据
 */
export async function fetchTimeline(
  query: string,
  streamCallback?: StreamCallback,
  progressCallback?: ProgressCallback
): Promise<ApiResponse<SearchTimelineResponse>> {
  const response = await fetchData<SearchTimelineResponse>(
    "/api/search",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        systemPrompt: systemPromptTimeline,
        responseFormat: "text"
      }),
    },
    streamCallback,
    progressCallback
  );
  
  // 如果是流式响应且成功完成，解析时间轴文本
  if (streamCallback && !response.error && response.data) {
    const rawContent = (response.data as any).rawContent;
    if (rawContent) {
      const { events, summary } = parseTimelineText(rawContent);
      return {
        data: {
          timeline: events,
          summary,
        },
      };
    }
  }
  
  return response;
}

/**
 * 解析时间轴文本以提取事件和摘要
 */
function parseTimelineText(text: string): { events: TimelineEvent[], summary: string } {
  const eventRegex = /EVENT\s+([\s\S]*?)END/g;
  const summaryRegex = /SUMMARY\s+([\s\S]*?)END/;
  
  // 提取所有事件
  const matches = [...text.matchAll(eventRegex)];
  const events: TimelineEvent[] = matches.map((match, index) => {
    const eventText = match[1].trim();
    const event: Partial<TimelineEvent> = {
      id: `event-${index}`,
    };
    
    // 提取事件属性
    const dateMatch = eventText.match(/日期:\s*(.+)/);
    const titleMatch = eventText.match(/标题:\s*(.+)/);
    const descMatch = eventText.match(/描述:\s*([\s\S]*?)(?=人物:|来源:|$)/);
    const peopleMatch = eventText.match(/人物:\s*(.+?)(?=\n|$)/);
    const sourceMatch = eventText.match(/来源:\s*(.+?)(?=\n|$)/);
    
    if (dateMatch) event.date = dateMatch[1].trim();
    if (titleMatch) event.title = titleMatch[1].trim();
    if (descMatch) event.description = descMatch[1].trim();
    
    // 解析人物信息
    if (peopleMatch) {
      const peopleString = peopleMatch[1].trim();
      event.people = peopleString.split(';').map(personStr => {
        const [name, role, color] = personStr.trim().split('|').map(s => s?.trim() || "");
        return {
          name: name || "",
          role: role || "",
          color: color || "#3b82f6"
        };
      });
    }
    
    // 解析来源信息
    if (sourceMatch) {
      const sourceString = sourceMatch[1].trim();
      const [title, url] = sourceString.split('|').map(s => s?.trim() || "");
      if (url) {
        event.source = title;
        event.sourceUrl = url;
      } else {
        event.source = title;
      }
    }
    
    return event as TimelineEvent;
  });
  
  // 提取摘要
  const summaryMatch = text.match(summaryRegex);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";
  
  // 确保事件按日期排序
  const sortedEvents = events
    .filter(event => event.date && event.title) // 过滤掉不完整的事件
    .sort((a, b) => {
      // 尝试按日期排序，如果日期格式不便于直接比较，可以使用其他策略
      if (!a.date || !b.date) return 0;
      return a.date.localeCompare(b.date);
    });
  
  return {
    events: sortedEvents,
    summary
  };
}

/**
 * 获取事件详细信息
 */
export async function fetchEventDetails(
  eventTitle: string,
  eventDate: string,
  streamCallback?: StreamCallback,
  progressCallback?: ProgressCallback
): Promise<ApiResponse<SearchEventDetailsResponse>> {
  return fetchData<SearchEventDetailsResponse>(
    "/api/search",
    {
      method: "POST",
      body: JSON.stringify({
        query: `详细分析事件: "${eventTitle}" (${eventDate})`,
        systemPrompt: systemPromptEventDetails,
        responseFormat: "text"
      }),
    },
    streamCallback,
    progressCallback
  );
}
