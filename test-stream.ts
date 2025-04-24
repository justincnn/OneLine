/**
 * 测试流式输出
 * 运行方式：bun OneLine/test-stream.ts
 */

async function testStreamingApi() {
  const apiEndpoint = "https://chengtx809-gemini-balance.hf.space/hf/v1/chat/completions";
  const apiKey = "chengtx809";
  const model = "gemini-2.0-flash-exp-search";

  console.log("开始测试流式输出API...");
  console.log(`API端点: ${apiEndpoint}`);
  console.log(`模型: ${model}`);

  const requestBody = {
    model: model,
    stream: true,
    messages: [
      { role: 'user', content: '请分析一下2024年全球经济形势' }
    ],
    temperature: 0.7
  };

  try {
    // 发送流式API请求
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API请求失败, 状态码: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("响应没有可读的流");
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullOutput = '';

    console.log("\n=== 开始接收流式响应 ===\n");

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // 处理缓冲区中可能还有的最后一条数据
          if (buffer.trim()) {
            try {
              const chunk = buffer.replace(/^data: /, '').trim();
              if (chunk && chunk !== '[DONE]') {
                const data = JSON.parse(chunk);
                if (data.choices?.[0]?.delta?.content) {
                  process.stdout.write(data.choices[0].delta.content);
                  fullOutput += data.choices[0].delta.content;
                }
              }
            } catch (e) {
              console.error('解析最后的数据块失败:', buffer);
            }
          }
          console.log("\n\n=== 流式响应接收完成 ===");
          break;
        }

        // 将新接收的数据添加到缓冲区
        const text = decoder.decode(value, { stream: true });
        buffer += text;

        // 处理完整的行
        const lines = buffer.split('\n');
        // 保留最后一行，它可能是不完整的
        buffer = lines.pop() || '';

        // 处理完整的行
        for (const line of lines) {
          if (line.trim() && line.trim() !== 'data: [DONE]') {
            try {
              // 移除SSE前缀 (如果有)
              const jsonData = line.replace(/^data: /, '').trim();
              if (jsonData) {
                const data = JSON.parse(jsonData);
                if (data.choices?.[0]?.delta?.content) {
                  process.stdout.write(data.choices[0].delta.content);
                  fullOutput += data.choices[0].delta.content;
                }
              }
            } catch (e) {
              console.error('处理行失败:', line, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('处理流失败:', error);
    }

    console.log("\n总字符数:", fullOutput.length);
    console.log("测试完成!");
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testStreamingApi();
