import { NextResponse } from 'next/server';
import axios from 'axios';

// 设置较短的超时时间，避免 Netlify 504 错误
const TIMEOUT_MS = 45000; // 45 秒，低于 Netlify 的 60 秒限制
const MAX_RETRIES = 3; // 增加最大重试次数
const RETRY_DELAYS = [1000, 2000, 4000]; // 指数退避延迟

// 新增函数：创建流式响应
function createStreamResponse(readable: ReadableStream) {
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: Request) {
  try {
    // 从环境变量中获取 API 密钥和端点
    const apiKey = process.env.API_KEY;
    const apiEndpoint = process.env.API_ENDPOINT;
    const apiModel = process.env.API_MODEL || 'gemini-2.0-flash-exp-search';

    console.log('API路由环境变量检测:', {
      apiEndpoint: apiEndpoint ? '已设置' : '未设置',
      apiKey: apiKey ? '已设置' : '未设置',
      apiModel: apiModel
    });

    // 解析请求体
    const requestData = await request.json();

    // 检查请求中是否要求流式输出
    const streamMode = requestData.stream === true;

    // 检查请求中是否使用环境变量配置的标记
    const isUsingEnvConfig =
      requestData.model === "使用环境变量配置" ||
      requestData.endpoint === "使用环境变量配置" ||
      requestData.apiKey === "使用环境变量配置";

    // 如果请求表明要使用环境变量配置，但环境变量没有配置
    if (isUsingEnvConfig && (!apiKey || !apiEndpoint)) {
      return NextResponse.json(
        { error: '服务器端API配置缺失，请手动配置API参数' },
        { status: 500 }
      );
    }

    // 如果没有配置 API 密钥或端点，返回错误
    if (!isUsingEnvConfig && (!requestData.apiKey || !requestData.endpoint)) {
      return NextResponse.json(
        { error: 'API key or endpoint not configured in request' },
        { status: 400 }
      );
    }

    // 如果请求中包含 model 参数，则使用请求中的 model，否则使用环境变量中的 model
    const model = isUsingEnvConfig ? apiModel : (requestData.model || apiModel);

    // 使用正确的API端点和密钥
    const finalEndpoint = isUsingEnvConfig ? apiEndpoint : requestData.endpoint;
    const finalApiKey = isUsingEnvConfig ? apiKey : requestData.apiKey;

    // 检查是否请求流式输出
    const stream = requestData.stream === true;

    // 构建实际发送给 API 的请求体
    const payload = {
      ...requestData,
      model,
<<<<<<< HEAD
      stream // 添加流式输出参数
=======
      // 如果客户端请求流式输出，确保在API请求中启用
      stream: streamMode
>>>>>>> upstream/main
    };

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${finalApiKey}`
    };

    console.log('Sending request to API:', {
      endpoint: finalEndpoint,
      model: model,
      usingEnvConfig: isUsingEnvConfig,
<<<<<<< HEAD
      stream: stream,
      apiKeyConfigured: finalApiKey ? '已配置' : '未配置'
    });

    // 流式响应的处理
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          let lastError;
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              // 使用fetch API直接处理流式响应，避免axios中间层
              const response = await fetch(finalEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
              });
=======
      apiKeyConfigured: finalApiKey ? '已配置' : '未配置',
      streamMode: streamMode ? '已启用' : '未启用'
    });

    // 如果启用了流式模式，使用流式响应
    if (streamMode) {
      try {
        // 创建一个TransformStream来处理API响应
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // 发送请求到API端点，使用stream响应模式
        const apiResponse = await fetch(finalEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`API responded with status ${apiResponse.status}: ${errorText}`);
        }

        if (!apiResponse.body) {
          throw new Error('API response body is null');
        }

        // 处理API响应流
        const reader = apiResponse.body.getReader();

        // 开始处理流数据
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                await writer.close();
                break;
              }

              // 将数据块直接传递给客户端
              await writer.write(value);
            }
          } catch (e) {
            console.error('Error processing stream:', e);
            // 写入错误消息到流
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`));
            await writer.close();
          }
        })();

        // 返回流式响应
        return createStreamResponse(readable);
      } catch (error) {
        console.error('Stream API request failed:', error);
        // 如果流式请求失败，回退到常规响应
        return NextResponse.json(
          { error: 'Stream request failed', message: error.message },
          { status: 500 }
        );
      }
    }

    // 非流式模式下的原始实现（保留原来的重试逻辑）
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 发送请求到实际的 API 端点，使用较短的超时设置
        const response = await axios.post(finalEndpoint, payload, {
          headers,
          timeout: TIMEOUT_MS
        });
>>>>>>> upstream/main

              if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${await response.text()}`);
              }

              const reader = response.body?.getReader();
              if (!reader) {
                throw new Error('无法获取响应流');
              }

              // 处理流式数据
              const decoder = new TextDecoder('utf-8');
              let buffer = '';

              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  // 处理缓冲区中可能的最后数据
                  if (buffer.trim()) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                      if (line.trim() && !line.includes('data: [DONE]')) {
                        const jsonLine = line.replace(/^data: /, '').trim();
                        if (jsonLine) {
                          controller.enqueue(encoder.encode(jsonLine + '\n'));
                        }
                      }
                    }
                  }
                  break;
                }

                // 解码新数据并添加到缓冲区
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // 处理完整的行
                const lines = buffer.split('\n');
                // 保留最后一行，它可能不完整
                buffer = lines.pop() || '';

                // 处理所有完整的行
                for (const line of lines) {
                  if (line.trim() && !line.includes('data: [DONE]')) {
                    try {
                      // 移除SSE前缀 (如果有)
                      const jsonLine = line.replace(/^data: /, '').trim();
                      if (jsonLine) {
                        controller.enqueue(encoder.encode(jsonLine + '\n'));
                      }
                    } catch (e) {
                      console.error('处理行数据失败:', e);
                    }
                  }
                }
              }

              // 成功完成，跳出重试循环
              controller.close();
              return;
            } catch (error: any) {
              console.error(`流式API请求失败 (attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);
              lastError = error;

              if (attempt === MAX_RETRIES - 1) {
                break;
              }

              const delay = RETRY_DELAYS[attempt] || 5000;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          // 所有重试都失败，发送错误信息
          if (lastError) {
            const errorDetails = {
              error: 'Stream API request failed after multiple attempts',
              message: lastError?.message,
              status: lastError?.response?.status,
              statusText: lastError?.response?.statusText,
              isTimeout: lastError?.code === 'ECONNABORTED'
            };
            controller.enqueue(encoder.encode(JSON.stringify(errorDetails) + '\n'));
            controller.close();
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // 非流式请求的重试逻辑（保留原有的实现，但改进重试机制）
      let lastError;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // 发送请求到实际的 API 端点，使用较短的超时设置
          const response = await axios.post(finalEndpoint, payload, {
            headers,
            timeout: TIMEOUT_MS
          });

          // 请求成功，返回 API 响应
          return NextResponse.json(response.data);
        } catch (error: any) {
          console.error(`API请求失败 (attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);
          lastError = error;

          if (attempt === MAX_RETRIES - 1) {
            break;
          }

          const delay = RETRY_DELAYS[attempt] || 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.error('所有API请求尝试均失败:', lastError);

      const errorDetails = {
        error: 'API request failed after multiple attempts',
        message: lastError?.message,
      };

      if (lastError?.response) {
        errorDetails.status = lastError.response.status;
        errorDetails.statusText = lastError.response.statusText;
        errorDetails.data = lastError.response.data;
      } else if (lastError?.request) {
        errorDetails.request = 'Request was made but no response was received';
        errorDetails.timeout = lastError.code === 'ECONNABORTED';
      }

      return NextResponse.json(
        errorDetails,
        { status: lastError?.response?.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('API route error:', error);

    const errorDetails = {
      error: 'API request failed',
      message: error.message,
    };

    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.statusText = error.response.statusText;
      errorDetails.data = error.response.data;
    } else if (error.request) {
      errorDetails.request = 'Request was made but no response was received';
      errorDetails.timeout = error.code === 'ECONNABORTED';
    }

    return NextResponse.json(
      errorDetails,
      { status: error.response?.status || 500 }
    );
  }
}
