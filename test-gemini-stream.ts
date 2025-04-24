import fetch from 'node-fetch';

const API_MODEL = 'gemini-2.0-flash-exp-search';
const API_KEY = 'sk-oneline';
const API_ENDPOINT = 'https://chengtx809-gemini-balance.hf.space/hf/v1/chat/completions';

async function testStreamingOutput() {
  console.log('测试Gemini API流式输出功能');
  console.log(`使用模型: ${API_MODEL}`);
  console.log(`API端点: ${API_ENDPOINT}`);
  console.log('==================');

  const payload = {
    model: API_MODEL,
    messages: [
      {
        role: "system",
        content: "你是一个专业的历史事件分析助手。请以时间轴的方式提供信息，格式如下：\n===总结===\n简短总结\n\n===事件列表===\n--事件1--\n日期：YYYY-MM-DD\n标题：事件标题\n描述：详细描述\n相关人物：人物1(角色1,#颜色代码1);人物2(角色2,#颜色代码2)\n来源：来源信息\n\n--事件2--\n..."
      },
      {
        role: "user",
        content: "请为中美贸易摩擦创建时间轴"
      }
    ],
    stream: true
  };

  try {
    console.log('发送请求中...');
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API返回错误: ${response.status} ${response.statusText}`);
    }

    console.log('开始接收流式响应:');
    console.log('==================');

    // 获取文本数据
    const text = await response.text();
    console.log('收到完整响应数据:');

    // 尝试分析SSE响应
    let fullResponse = '';
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim() && !line.includes('data: [DONE]')) {
        try {
          // 移除SSE前缀
          const jsonLine = line.replace(/^data: /, '').trim();
          if (jsonLine) {
            const parsedChunk = JSON.parse(jsonLine);
            if (parsedChunk.choices && parsedChunk.choices[0] && parsedChunk.choices[0].delta && parsedChunk.choices[0].delta.content) {
              const content = parsedChunk.choices[0].delta.content;
              fullResponse += content;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 打印解析出的响应
    console.log('解析后的内容:');
    console.log(fullResponse);
    console.log('==================');
    console.log(`完整响应长度: ${fullResponse.length} 字符`);

  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 执行测试
testStreamingOutput();
