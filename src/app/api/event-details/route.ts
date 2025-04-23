import { NextResponse } from 'next/server';
import axios from 'axios';

// 设置较短的超时时间，避免 Netlify 504 错误
const TIMEOUT_MS = 45000; // 45 秒，低于 Netlify 的 60 秒限制
const MAX_RETRIES = 3; // 增加最大重试次数
const RETRY_DELAYS = [1000, 2000, 4000]; // 指数退避延迟

export async function POST(request: Request) {
  try {
    // 从环境变量中获取 API 密钥和端点
    const apiKey = process.env.API_KEY;
    const apiEndpoint = process.env.API_ENDPOINT;
    const apiModel = process.env.API_MODEL || 'gemini-2.0-pro-exp-search';

    // 解析请求体
    const requestData = await request.json();

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
      stream // 添加流式输出参数
    };

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${finalApiKey}`
    };

    console.log('Sending event details request to API:', {
      endpoint: finalEndpoint,
      model: model,
      usingEnvConfig: isUsingEnvConfig,
      stream: stream,
      apiKeyConfigured: finalApiKey ? '已配置' : '未配置'
    });

    // 流式响应的处理
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          // 流式请求重试逻辑
          let lastError;
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              // 发送流式请求
              const response = await axios.post(finalEndpoint, payload, {
                headers,
                timeout: TIMEOUT_MS,
                responseType: 'stream'
              });

              // 设置响应处理
              if (response.data) {
                response.data.on('data', (chunk: Buffer) => {
                  try {
                    const textChunk = chunk.toString('utf-8');

                    // 如果是JSON格式的数据块，解析它们
                    if (textChunk.trim().startsWith('{')) {
                      textChunk.split('\n').forEach(line => {
                        if (line.trim() && line.trim() !== 'data: [DONE]') {
                          try {
                            // 移除SSE前缀 (如果有)
                            const jsonData = line.replace(/^data: /, '').trim();
                            if (jsonData) {
                              controller.enqueue(encoder.encode(jsonData + '\n'));
                            }
                          } catch (e) {
                            console.error('无法解析JSON块:', line, e);
                            controller.enqueue(encoder.encode(line + '\n'));
                          }
                        }
                      });
                    } else {
                      // 对于非JSON格式的块，直接传递
                      controller.enqueue(encoder.encode(textChunk));
                    }
                  } catch (chunkError) {
                    console.error('处理数据块时出错:', chunkError);
                    controller.enqueue(encoder.encode(JSON.stringify({ error: 'Error processing chunk' }) + '\n'));
                  }
                });

                response.data.on('end', () => {
                  controller.close();
                });

                response.data.on('error', (error: Error) => {
                  console.error('流响应错误:', error);
                  controller.error(error);
                });

                // 成功建立流式连接，跳出重试循环
                return;
              }
            } catch (error: any) {
              console.error(`事件详情流式API请求失败 (attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);
              lastError = error;

              // 如果已经是最后一次尝试，准备发送错误响应
              if (attempt === MAX_RETRIES - 1) {
                break;
              }

              // 使用指数退避等待一段时间后重试
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
            controller.enqueue(encoder.encode(JSON.stringify(errorDetails)));
            controller.close();
          }
        }
      });

      // 返回流式响应
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
          console.error(`事件详情API请求失败 (attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);
          lastError = error;

          // 如果已经是最后一次尝试，则不再重试
          if (attempt === MAX_RETRIES - 1) {
            break;
          }

          // 使用指数退避等待一段时间后重试
          const delay = RETRY_DELAYS[attempt] || 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // 所有重试均失败，返回错误响应
      console.error('所有事件详情API请求尝试均失败:', lastError);

      // 构建更详细的错误信息
      const errorDetails = {
        error: 'API request failed after multiple attempts',
        message: lastError?.message,
      };

      // 如果有响应数据，添加到错误中
      if (lastError?.response) {
        errorDetails.status = lastError.response.status;
        errorDetails.statusText = lastError.response.statusText;
        errorDetails.data = lastError.response.data;
      } else if (lastError?.request) {
        // 请求已发出但没有收到响应
        errorDetails.request = 'Request was made but no response was received';
        errorDetails.timeout = lastError.code === 'ECONNABORTED';
      }

      // 返回错误响应
      return NextResponse.json(
        errorDetails,
        { status: lastError?.response?.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('Event details API route error:', error);

    // 构建更详细的错误信息
    const errorDetails = {
      error: 'API request failed',
      message: error.message,
    };

    // 如果有响应数据，添加到错误中
    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.statusText = error.response.statusText;
      errorDetails.data = error.response.data;
    } else if (error.request) {
      // 请求已发出但没有收到响应
      errorDetails.request = 'Request was made but no response was received';
      errorDetails.timeout = error.code === 'ECONNABORTED';
    }

    // 返回错误响应
    return NextResponse.json(
      errorDetails,
      { status: error.response?.status || 500 }
    );
  }
}
