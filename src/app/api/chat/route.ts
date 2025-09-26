import { NextResponse } from 'next/server';
import { proxyChatCompletions } from '@/lib/server/llmProxy';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const envApiKey = process.env.API_KEY;
    const envApiEndpoint = process.env.API_ENDPOINT;
    const envApiModel = process.env.API_MODEL || 'gemini-2.5-pro';

    const requestData = await request.json();
    const streamMode = requestData.stream !== false; // 默认流式

    const isUsingEnvConfig =
      requestData.model === '使用环境变量配置' ||
      requestData.endpoint === '使用环境变量配置' ||
      requestData.apiKey === '使用环境变量配置';

    if (isUsingEnvConfig && (!envApiKey || !envApiEndpoint)) {
      return NextResponse.json(
        { error: '服务器端API配置缺失，请手动配置API参数' },
        { status: 500 },
      );
    }

    if (!isUsingEnvConfig && (!requestData.apiKey || !requestData.endpoint)) {
      return NextResponse.json(
        { error: 'API key or endpoint not configured in request' },
        { status: 400 },
      );
    }

    const model: string = isUsingEnvConfig ? envApiModel : (requestData.model || envApiModel);
    const endpoint: string = isUsingEnvConfig ? (envApiEndpoint as string) : requestData.endpoint;
    const apiKey: string = isUsingEnvConfig ? (envApiKey as string) : requestData.apiKey;

    // 仅白名单上游需要的字段，避免把 endpoint/apiKey 透传给上游
    const payload = {
      model,
      messages: requestData.messages || [],
      temperature: requestData.temperature ?? 0.7,
      stream: streamMode,
    };

    const res = await proxyChatCompletions(
      { endpoint, model, apiKey },
      payload,
      { timeoutMs: 60000, responseMode: streamMode ? 'stream' : 'json' },
    );

    if (res instanceof Response) {
      return res;
    }

    if (res.ok) {
      return NextResponse.json(res.data);
    }

    return NextResponse.json(res.error, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'API request failed', message: error?.message },
      { status: 500 },
    );
  }
}
