import { NextResponse } from 'next/server';
import axios from 'axios';
import { getEnvConfig } from '@/lib/env';
import type { ApiConfig } from '@/types';

export const maxDuration = 60; // Set maximum duration to 60 seconds (Vercel hobby plan limit)
export const dynamic = 'force-dynamic';

// Impact assessment system prompt
const IMPACT_ASSESSMENT_PROMPT = `
你是一位专业的商业分析师。根据用户提供的公司信息，你需要分析以下几个方面，并严格按照指定格式返回：

===关于行业产品===
分析该公司所在行业（主要针对其主营产品）的最新动态、技术趋势、市场规模和竞争格局。

===关于公司===
分析该公司最近发生了哪些重要事件，例如产品发布、管理层变动、财务状况、市场策略调整等。

===跨境电商客户分析===
如果用户指明这是电商客户，请根据其模式（B2C, B2B, 或两者皆是）分析其客户的产品在跨境电商领域的竞争和趋势。
- 对于B2C，重点分析消费者市场、流行趋势、社交媒体影响和主流平台（如Amazon, Shopify, Temu, Shein）。
- 对于B2B，重点分析企业采购趋势、供应链、批发市场和主流平台（如Alibaba, Global Sources）。
如果不是电商客户，请忽略此部分。
`;

// 处理POST请求
export async function POST(req: Request) {
  try {
    const { model, endpoint, apiKey, query, searchResults } = await req.json();

    // 获取配置
    const config = getEnvConfig();

    // 根据请求参数或环境变量构建API配置
    const apiConfig: ApiConfig = {
      endpoint: endpoint === "使用环境变量配置" ? config.API_ENDPOINT || "" : endpoint,
      model: model === "使用环境变量配置" ? config.API_MODEL || "" : model,
      apiKey: apiKey === "使用环境变量配置" ? config.API_KEY || "" : apiKey,
    };

    // 构建消息
    const messages = [
      { role: "system", content: IMPACT_ASSESSMENT_PROMPT },
    ];

    // 添加搜索结果（如果有）
    if (searchResults) {
      messages.push({ role: "system", content: searchResults });
    }

    // 添加用户查询
    messages.push({ role: "user", content: `请对以下事件进行影响评估分析：${query}` });

    // 构建API请求参数
    const requestPayload = {
      model: apiConfig.model,
      messages: messages,
      temperature: 0.7,
      stream: true // 启用流式输出
    };

    // 根据endpoint构建完整的API URL
    let apiUrl = apiConfig.endpoint;

    // 如果是Azure OpenAI，需要特殊处理URL
    if (apiUrl.includes('openai.azure.com')) {
      // 从model中提取deployment名称，格式通常为"deployment@model"
      const deploymentName = apiConfig.model.split('@')[0];
      if (!apiUrl.endsWith('/')) apiUrl += '/';
      apiUrl += `openai/deployments/${deploymentName}/chat/completions?api-version=2023-05-15`;
    } else if (!apiUrl.endsWith('/chat/completions')) {
      // 对于OpenAI API和兼容的API，确保URL指向chat/completions
      if (!apiUrl.endsWith('/')) apiUrl += '/';
      apiUrl += 'chat/completions';
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 设置API密钥头部，根据是否为Azure OpenAI选择正确的头部名称
    if (apiUrl.includes('openai.azure.com')) {
      headers['api-key'] = apiConfig.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
    }

    // 进行API请求，并将结果流式传输到客户端
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload),
    });

    // 如果响应不成功，抛出错误
    if (!response.ok) {
      // 尝试读取错误信息
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.error?.message || errorText;
      } catch (e) {
        // 如果解析失败，使用原始错误文本
      }

      // 返回错误响应
      return NextResponse.json(
        { error: `AI API responded with status ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    // 直接将AI服务的流式响应传递给客户端
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in impact assessment API:', error);

    // 构建错误响应
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
