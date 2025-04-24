"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  withTypingEffect?: boolean;
  typingSpeed?: number;
  scrollToBottom?: boolean;
  formatMarkdown?: boolean; // 新增：是否格式化Markdown
}

export function StreamingText({
  content,
  isStreaming,
  className,
  withTypingEffect = true,
  typingSpeed = 20,
  scrollToBottom = true,
  formatMarkdown = true, // 默认格式化Markdown
}: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedContent, setDisplayedContent] = useState(content);
  const [isTyping, setIsTyping] = useState(false);
  const lastContentRef = useRef('');
  const contentToTypeRef = useRef('');
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 增加一个视觉指示器状态，在流式接收但没有打字效果时使用
  const [showStreamIndicator, setShowStreamIndicator] = useState(isStreaming && !withTypingEffect);

  // 处理新内容到达的情况
  useEffect(() => {
    // 如果只是想显示流式指示器而非打字效果
    if (!withTypingEffect) {
      setDisplayedContent(content);
      setShowStreamIndicator(isStreaming);
      return;
    }

    // 如果内容相同或为空，不需要处理
    if (content === lastContentRef.current || !content) {
      return;
    }

    // 确定需要添加哪部分新文本
    if (lastContentRef.current.length === 0) {
      // 首次加载内容
      contentToTypeRef.current = content;
    } else {
      // 寻找新内容
      const newPart = content.substring(lastContentRef.current.length);
      contentToTypeRef.current += newPart;
    }

    lastContentRef.current = content;

    if (!isTyping) {
      setIsTyping(true);
      // 使用引用来存储定时器，以便在组件卸载时清除
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
      typingIntervalRef.current = setTimeout(typeNextChar, typingSpeed);
    }
  }, [content, withTypingEffect, typingSpeed]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
    };
  }, []);

  // 逐字符打印效果，改进了速度和流畅度
  const typeNextChar = () => {
    if (contentToTypeRef.current.length > 0) {
      // 确定每次打印的字符数，加快速度
      const chunkSize = Math.min(3, contentToTypeRef.current.length);
      const chunk = contentToTypeRef.current.substring(0, chunkSize);
      contentToTypeRef.current = contentToTypeRef.current.substring(chunkSize);

      setDisplayedContent(prev => prev + chunk);

      // 计算下一次打字延迟，根据标点符号调整
      const lastChar = chunk[chunk.length - 1];
      const nextDelay =
        ['。', '！', '？', '.', '!', '?', '\n'].includes(lastChar)
          ? typingSpeed * 3  // 标点和换行后停顿时间更长
          : ['，', '、', ',', ';', '；', '：', ':'].includes(lastChar)
            ? typingSpeed * 1.5 // 次级停顿
            : typingSpeed;

      typingIntervalRef.current = setTimeout(typeNextChar, nextDelay);
    } else {
      setIsTyping(false);
      typingIntervalRef.current = null;
    }
  };

  // 滚动到底部效果，优化为更平滑的滚动
  useEffect(() => {
    if (scrollToBottom && containerRef.current) {
      const scrollElement = containerRef.current;
      // 平滑滚动
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [displayedContent, scrollToBottom]);

  // 格式化文本内容，添加Markdown支持
  const formatContent = (text: string) => {
    if (!formatMarkdown) return text.replace(/\n/g, '<br />');

    // 增强Markdown格式化
    const formattedContent = text
      // 处理标题
      .replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold mt-3 mb-2">$2</h2>')
      .replace(/^### (.*?)$/gm, '<h3 class="text-base font-bold mt-2 mb-1">$1</h3>')
      // 处理粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 处理斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 处理行内代码
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      // 处理无序列表（简单匹配）
      .replace(/^- (.*?)$/gm, '<li class="ml-4">$1</li>')
      // 处理链接
      .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
        // 移除URL中可能的尾部括号和方括号
        const cleanUrl = url.replace(/[\)\\]]$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">${text}</a>`;
      })
      // 处理引用
      .replace(/^> (.*?)$/gm, '<blockquote class="border-l-2 border-gray-300 dark:border-gray-600 pl-4 py-1 text-gray-600 dark:text-gray-400">$1</blockquote>')
      // 处理换行
      .replace(/\n/g, '<br />');

    return formattedContent;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "streaming-text-container relative max-h-[400px] overflow-auto",
        className
      )}
    >
      <div
        dangerouslySetInnerHTML={{ __html: formatContent(displayedContent) }}
        className="streaming-text-content"
      />
      {(isStreaming || isTyping || showStreamIndicator) && (
        <span
          className="inline-block h-4 w-[2px] bg-primary animate-blink ml-0.5 align-middle"
          aria-hidden="true"
        ></span>
      )}
    </div>
  );
}
