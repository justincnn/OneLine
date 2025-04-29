"use client";

import React, { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { timeAgo } from '@/lib/utils';
import { TimelineEvent } from '@/types';
import { StreamingText } from '@/components/StreamingText';
import { StreamCallback } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Timeline.module.css';

// 组件定义和类型
export interface TimelineProps {
  events: TimelineEvent[];
  isLoading: boolean;
  isSearching: boolean;
  query: string;
  isStreamingActive?: boolean;
  onSelectEvent: (eventId: string) => void;
  selectedEventId?: string;
  onNewEvents?: (events: TimelineEvent[]) => void;
}

export interface TimelineRefHandle {
  scrollToLatestEvent: () => void;
  scrollToEvent: (eventId: string) => void;
}

// 使用forwardRef来保持本地功能
const Timeline = forwardRef<TimelineRefHandle, TimelineProps>(
  ({ events, isLoading, isSearching, query, isStreamingActive, onSelectEvent, selectedEventId, onNewEvents }, ref) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
    const timelineRef = useRef<HTMLDivElement>(null);
    const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Reset new event indicators when query changes
    useEffect(() => {
      setNewEventIds(new Set());
    }, [query]);

    // Track which events are new when events array updates
    useEffect(() => {
      if (events.length > 0 && onNewEvents) {
        // Only mark events as new if we're streaming
        if (isStreamingActive) {
          const currentIds = new Set(events.map(e => e.id));
          const previousIds = new Set(
            Array.from(eventRefs.current).map(([id]) => id)
          );
          
          // Find events that weren't in the previous set
          const newIds = new Set<string>();
          currentIds.forEach(id => {
            if (!previousIds.has(id)) {
              newIds.add(id);
            }
          });
          
          if (newIds.size > 0) {
            setNewEventIds(prev => {
              const updated = new Set(prev);
              newIds.forEach(id => updated.add(id));
              return updated;
            });
            
            // Notify parent about new events
            const newEvents = events.filter(e => newIds.has(e.id));
            if (newEvents.length > 0) {
              onNewEvents(newEvents);
            }
          }
        }
      }
    }, [events, isStreamingActive, onNewEvents]);

    // Register refs for all current events
    useEffect(() => {
      // Clean up refs for events that no longer exist
      const currentIds = new Set(events.map(e => e.id));
      Object.keys(eventRefs.current).forEach(id => {
        if (!currentIds.has(id)) {
          delete eventRefs.current[id];
        }
      });
    }, [events]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      scrollToLatestEvent: () => {
        if (events.length > 0) {
          const latestEvent = events[events.length - 1];
          scrollToEvent(latestEvent.id);
        }
      },
      scrollToEvent: (eventId: string) => {
        scrollToEvent(eventId);
      }
    }));

    const scrollToEvent = (eventId: string) => {
      const eventElement = eventRefs.current[eventId];
      if (eventElement) {
        eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the event briefly
        setActiveId(eventId);
        setTimeout(() => setActiveId(null), 2000);
      }
    };

    const handleEventClick = (eventId: string) => {
      onSelectEvent(eventId);
      // Remove from new events
      setNewEventIds(prev => {
        const updated = new Set(prev);
        updated.delete(eventId);
        return updated;
      });
    };

    // 显示事件相关人物
    const renderPeople = (event: TimelineEvent) => {
      if (!event.people || event.people.length === 0) return null;
      
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {event.people.map((person, index) => (
            <span
              key={index}
              style={{ backgroundColor: person.color || '#3b82f6' }}
              className="px-2 py-1 text-xs rounded-full text-white font-medium"
            >
              {person.name}
              {person.role && ` (${person.role})`}
            </span>
          ))}
        </div>
      );
    };

    // 使用ReactMarkdown渲染描述内容
    const renderDescription = (text: string) => {
      return (
        <ReactMarkdown 
          className={styles.markdownContent}
          remarkPlugins={[remarkGfm]}
        >
          {text}
        </ReactMarkdown>
      );
    };

    return (
      <div 
        ref={timelineRef}
        className="relative h-full overflow-y-auto p-4"
      >
        {events.length > 0 ? (
          <div className="space-y-6">
            {events.map((event) => (
              <div
                key={event.id}
                ref={el => eventRefs.current[event.id] = el}
                className={`
                  relative p-4 rounded-lg transition-all duration-300
                  ${selectedEventId === event.id ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}
                  ${activeId === event.id ? 'shadow-lg ring-2 ring-blue-500' : 'shadow hover:shadow-md'}
                  ${newEventIds.has(event.id) ? 'animate-pulse-once' : ''}
                `}
                onClick={() => handleEventClick(event.id)}
              >
                {/* 新事件指示器 */}
                {newEventIds.has(event.id) && (
                  <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-500 animate-ping"></div>
                )}
                
                <div className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>{event.date}</span>
                  <span className="text-xs">{timeAgo(event.date)}</span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {event.title}
                </h3>
                
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {isStreamingActive && newEventIds.has(event.id) ? (
                    <StreamingText content={event.description} />
                  ) : (
                    renderDescription(event.description)
                  )}
                </div>
                
                {renderPeople(event)}
                
                {event.source && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>来源: </span>
                    {typeof event.source === 'string' ? (
                      <span>{event.source}</span>
                    ) : (
                      <a 
                        href={event.source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.source.title}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            {isLoading || isSearching ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">
                  {isSearching ? '正在搜索相关信息...' : '正在生成时间轴...'}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                {query 
                  ? '没有找到相关事件，请尝试其他关键词' 
                  : '请输入一个事件或主题以生成时间轴'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Timeline.displayName = 'Timeline';

export default Timeline;
