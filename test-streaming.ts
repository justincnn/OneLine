#!/usr/bin/env bun

/**
 * 流式输出测试脚本
 *
 * 测试流式响应的解析和输出，模拟生产环境中的流式输出
 */

import { parsePartialTimelineText } from './src/lib/api';
import type { TimelineEvent } from './src/types';

// 模拟流式响应
const simulateStreamingResponse = async (callback: (chunk: string, index: number) => void, delay = 50) => {
  const chunks = [
    '===总结===\n这是',
    '一个AI生成的',
    '测试总结',
    '，用于验证流式',
    '输出功能。\n\n',
    '===事件列表===\n\n',
    '--事件1--\n',
    '日期：2023-01-01\n',
    '标题：测试事件1\n',
    '描述：这是第一个测试事件，用于验证流式输出的功能是否正常工作。\n',
    '相关人物：张三(测试人员,#ff5500);李四(开发者,#3366ff)\n',
    '来源：测试来源(https://example.com)\n\n',
    '--事件2--\n',
    '日期：2023-02-15\n',
    '标题：测试事件2\n',
    '描述：这是第二个测试事件，继续验证解析功能。\n',
    '相关人物：王五(测试人员,#44cc00)\n',
    '来源：另一个来源 https://example.org\n\n'
  ];

  let content = '';
  for (let i = 0; i < chunks.length; i++) {
    await new Promise(resolve => setTimeout(resolve, delay));
    content += chunks[i];
    callback(content, i);
  }

  return content;
};

// 输出事件信息
const printEventDetails = (event: TimelineEvent) => {
  console.log(`  日期: ${event.date}`);
  console.log(`  标题: ${event.title}`);
  console.log(`  描述: ${event.description.substring(0, 30)}${event.description.length > 30 ? '...' : ''}`);
  console.log(`  相关人物: ${event.people.map(p => `${p.name}(${p.role})`).join(', ')}`);
  console.log(`  来源: ${event.source}${event.sourceUrl ? ` - ${event.sourceUrl}` : ''}`);
  console.log('');
};

// 测试解析功能
const testStreamingParsing = async () => {
  console.log('=== 流式输出解析测试 ===\n');

  let previousSummary = '';
  let previousEventsCount = 0;
  let chunkCount = 0;
  const startTime = Date.now();

  await simulateStreamingResponse((content, index) => {
    chunkCount++;
    const parseStartTime = performance.now();
    const { events, summary } = parsePartialTimelineText(content);
    const parseEndTime = performance.now();
    const parseTime = (parseEndTime - parseStartTime).toFixed(2);

    console.log(`\n[Chunk ${index + 1}] 解析时间: ${parseTime}ms, 内容长度: ${content.length} 字符`);

    // 只在总结有变化时输出
    if (summary && summary !== previousSummary) {
      console.log(`📋 总结更新: "${summary}"`);
      previousSummary = summary;
    }

    // 只在事件数量变化时输出
    if (events.length > previousEventsCount) {
      const newEventCount = events.length - previousEventsCount;
      console.log(`🔔 检测到 ${events.length} 个事件 (新增 ${newEventCount} 个):`);

      for (let i = previousEventsCount; i < events.length; i++) {
        console.log(`\n✨ 事件 #${i+1}:`);
        printEventDetails(events[i]);
      }

      previousEventsCount = events.length;
    }
  });

  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;

  console.log('\n=== 测试结果 ===');
  console.log(`总处理时间: ${totalTime.toFixed(2)}秒`);
  console.log(`处理的数据块: ${chunkCount} 个`);
  console.log(`平均每块处理时间: ${(totalTime * 1000 / chunkCount).toFixed(2)}ms`);
  console.log('\n测试完成！');
};

// 运行测试
testStreamingParsing();
