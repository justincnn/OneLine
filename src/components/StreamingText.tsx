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
}

export function StreamingText({
  content,
  isStreaming,
  className,
  withTypingEffect = true,
  typingSpeed = 20,
  scrollToBottom = true,
}: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedContent, setDisplayedContent] = useState(content);
  const [isTyping, setIsTyping] = useState(false);
  const lastContentRef = useRef('');
  const contentToTypeRef = useRef('');

  // 处理新内容到达的情况
  useEffect(() => {
    if (!withTypingEffect) {
      setDisplayedContent(content);
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
      setTimeout(typeNextChar, typingSpeed);
    }
  }, [content, withTypingEffect, typingSpeed]);

  // 逐字符打印效果
  const typeNextChar = () => {
    if (contentToTypeRef.current.length > 0) {
      // 截取一个字符
      const char = contentToTypeRef.current.charAt(0);
      contentToTypeRef.current = contentToTypeRef.current.substring(1);

      setDisplayedContent(prev => prev + char);

      // 计划下一个字符
      const nextDelay = char === '.' || char === '。' || char === '!' || char === '！' || char === '?' || char === '？' || char === '\n'
        ? typingSpeed * 3  // 标点和换行后停顿时间更长
        : typingSpeed;

      setTimeout(typeNextChar, nextDelay);
    } else {
      setIsTyping(false);
    }
  };

  // 滚动到底部效果
  useEffect(() => {
    if (scrollToBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedContent, scrollToBottom]);

  // 格式化文本内容，添加Markdown支持
  const formatContent = (text: string) => {
    // 处理Markdown格式
    const formattedContent = text
      // 处理粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 处理斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 处理行内代码
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // 处理链接
      .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
        // 移除URL中可能的尾部括号
        const cleanUrl = url.replace(/[\)\\]]$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">${text}</a>`;
      })
      // 处理换行
      .replace(/\n/g, '<br />');

    return formattedContent;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "streaming-text-container relative",
        isStreaming && "after:content-[''] after:animate-blink after:h-4 after:w-[2px] after:bg-primary after:inline-block after:align-middle after:ml-0.5",
        className
      )}
    >
      <div
        dangerouslySetInnerHTML={{ __html: formatContent(displayedContent) }}
        className="streaming-text-content"
      />
    </div>
  );
}
