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
  const charIndexRef = useRef(0);

  // 处理新内容到达的情况
  useEffect(() => {
    if (!withTypingEffect) {
      setDisplayedContent(content);
      lastContentRef.current = content;
      contentToTypeRef.current = '';
      setIsTyping(false);
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
      setDisplayedContent('');
    } else if (content.startsWith(lastContentRef.current)) {
      // 追加新内容
      const newPart = content.substring(lastContentRef.current.length);
      contentToTypeRef.current += newPart;
    } else {
      // 内容发生变化，重置全部内容
      contentToTypeRef.current = content;
      setDisplayedContent('');
    }

    lastContentRef.current = content;

    if (!isTyping) {
      setIsTyping(true);
      charIndexRef.current = 0;
      typeNextChunk();
    }
  }, [content, withTypingEffect, typingSpeed]);

  // 优化：批量处理字符以提高性能
  const typeNextChunk = () => {
    if (contentToTypeRef.current.length > 0) {
      // 一次处理多个字符，提高性能
      const chunkSize = Math.min(5, contentToTypeRef.current.length);
      const chunk = contentToTypeRef.current.substring(0, chunkSize);
      contentToTypeRef.current = contentToTypeRef.current.substring(chunkSize);

      setDisplayedContent(prev => prev + chunk);

      // 计算下一次更新的延迟
      // 检查是否有标点符号或换行符来决定停顿时间
      const hasPunctuation = /[.。!！?？\n]/.test(chunk);
      const nextDelay = hasPunctuation
        ? typingSpeed * 3 // 标点和换行后停顿时间更长
        : typingSpeed / 2; // 普通字符快速打印

      setTimeout(typeNextChunk, nextDelay);
    } else {
      setIsTyping(false);
    }
  };

  // 滚动到底部效果
  useEffect(() => {
    if (scrollToBottom && containerRef.current) {
      const scrollElement = containerRef.current;
      // 使用平滑滚动效果
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [displayedContent, scrollToBottom]);

  // 格式化文本内容，添加Markdown支持
  const formatContent = (text: string) => {
    // 处理Markdown格式
    const formattedContent = text
      // 处理标题，匹配1-6个#号开头的标题
      .replace(/#{1,6}\s+(.*?)(?:\n|$)/g, (match) => {
        const levelMatch = match.match(/^#{1,6}/);
        const level = levelMatch ? levelMatch[0].length : 1;
        const title = match.replace(/^#{1,6}\s+/, '').trim();
        // 限制字体大小，简单映射
        const sizeMap = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
        const sizeClass = sizeMap[Math.min(level - 1, sizeMap.length - 1)];
        return `<h${level} class="font-bold my-2 ${sizeClass}">${title}</h${level}>`;
      })
      // 处理粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 处理斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 处理行内代码
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-800 px-1 rounded text-sm">$1</code>')
      // 处理链接
      .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
        // 移除URL中可能的尾部括号
        const cleanUrl = url.replace(/[\)\\]]$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">${text}</a>`;
      })
      // 处理段落，双换行分段
      .replace(/\n\n/g, '</p><p class="my-2">')
      // 处理换行，单换行转为 <br />
      .replace(/\n/g, '<br />');

    return `<p class="my-2">${formattedContent}</p>`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "streaming-text-container relative max-h-full overflow-auto",
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
