"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { TimelineEvent, Person } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StreamingText } from './StreamingText';

interface TimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  onRequestDetails: (event: TimelineEvent) => Promise<string>;
  summary?: string;
  streamingDetails?: boolean;
}

// 定义可被父组件访问的方法
export interface TimelineHandle {
  updateDetailsContent: (content: string) => void;
  completeStreamingDetails: () => void;
}

export const Timeline = forwardRef<TimelineHandle, TimelineProps>(
  function Timeline({ events, isLoading = false, onRequestDetails, summary, streamingDetails = false }: TimelineProps, ref) {
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [detailsContent, setDetailsContent] = useState<string>('');
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
    const [animateNewEvents, setAnimateNewEvents] = useState<Set<string>>(new Set());
    const detailsDialogRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      updateDetailsContent: (content: string) => {
        setDetailsContent(content);
      },
      completeStreamingDetails: () => {
        setIsLoadingDetails(false);
      }
    }));

    // 处理新事件到达时的动画效果
    useEffect(() => {
      // 找出新事件
      const newEventIds = new Set<string>();
      events.forEach(event => {
        if (event.id.startsWith('stream-')) {
          newEventIds.add(event.id);
        }
      });

      setAnimateNewEvents(newEventIds);

      if (newEventIds.size > 0 && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (newEventIds.size > 0) {
        timeoutRef.current = setTimeout(() => {
          setAnimateNewEvents(new Set());
        }, 2000);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [events]);

    // 滚动到底部效果，用于事件详情流式滚动
    useEffect(() => {
      if (detailsDialogRef.current && isLoadingDetails && streamingDetails) {
        const contentElement = detailsDialogRef.current.querySelector('.max-h-\\[60vh\\]');
        if (contentElement) {
          contentElement.scrollTop = contentElement.scrollHeight;
        }
      }
    }, [detailsContent, isLoadingDetails, streamingDetails]);

    const toggleExpand = (eventId: string) => {
      setExpandedEvents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(eventId)) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
        return newSet;
      });
    };

    const handleShowDetails = async (event: TimelineEvent) => {
      setSelectedEvent(event);
      setDetailsContent('');
      setShowDetails(true);
      setIsLoadingDetails(true);

      try {
        const details = await onRequestDetails(event);
        if (!streamingDetails) {
          setDetailsContent(details);
        }
      } catch (error) {
        console.error('Failed to fetch details:', error);
      } finally {
        if (!streamingDetails) {
          setIsLoadingDetails(false);
        }
      }
    };

    const renderPeople = (people: Person[]) => {
      return (
        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
          {people.map((person, index) => (
            <div
              key={`${person.name}-${index}`}
              className="flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs backdrop-blur-md"
              style={{
                backgroundColor: `${person.color}20`,
                borderLeft: `3px solid ${person.color}`,
                boxShadow: `0 0 10px ${person.color}10`
              }}
            >
              <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                <div
                  className="h-full w-full rounded-full"
                  style={{ backgroundColor: person.color }}
                />
              </Avatar>
              <span style={{ color: person.color }} className="text-xs">
                {person.name}
              </span>
              {person.role && (
                <span className="text-xs opacity-70 hidden sm:inline"> - {person.role}</span>
              )}
            </div>
          ))}
        </div>
      );
    };

    const renderMarkdown = (content: string) => {
      const formatMarkdownText = (text: string) => {
        const boldRegex = /\*\*(.*?)\*\*/g;
        let formatted = text.replace(boldRegex, '<strong>$1</strong>');

        const italicRegex = /\*(.*?)\*/g;
        formatted = formatted.replace(italicRegex, '<em>$1</em>');

        const codeRegex = /`(.*?)`/g;
        formatted = formatted.replace(codeRegex, '<code>$1</code>');

        const linkRegex = /\[(.*?)\]\((.*?)\)/g;
        formatted = formatted.replace(linkRegex, (match, text, url) => {
          const cleanUrl = url.replace(/[\)\]]$/, '');
          return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">${text}</a>`;
        });

        return formatted;
      };

      const sectionsRegex = /===(.*?)===(?:\r?\n|$)/g;
      const sections = [];
      const titleMatches = [...content.matchAll(sectionsRegex)];

      for (let i = 0; i < titleMatches.length; i++) {
        const titleMatch = titleMatches[i];
        const sectionTitle = titleMatch[1].trim();

        const contentStartIndex = titleMatch.index! + titleMatch[0].length;
        const contentEndIndex = i < titleMatches.length - 1 ? titleMatches[i + 1].index! : content.length;

        const sectionContent = content.substring(contentStartIndex, contentEndIndex).trim();

        sections.push({ title: sectionTitle, isTitle: true });
        sections.push({ content: sectionContent, isTitle: false });
      }

      if (sections.length === 0) {
        return (
          <div className="space-y-4">
            {content.split("\n\n").map((paragraph, index) => (
              <div
                key={`paragraph-${index}`}
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdownText(paragraph.replace(/\n/g, '<br />'))
                }}
              />
            ))}
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {sections.map((section, index) => {
            if (section.isTitle) {
              return (
                <div key={`section-title-${index}`} className="mt-6 first:mt-0">
                  <h3 className="text-base font-semibold mb-2">{section.title}</h3>
                </div>
              );
            } else {
              return (
                <div key={`section-content-${index}`} className="space-y-3">
                  {section.content.split("\n\n").map((paragraph, pIndex) => (
                    <div
                      key={`p-${index}-${pIndex}`}
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdownText(paragraph.replace(/\n/g, '<br />'))
                      }}
                    />
                  ))}
                </div>
              );
            }
          })}
        </div>
      );
    };

    const isStreamingEvent = (event: TimelineEvent): boolean => {
      return event.id.startsWith('stream-');
    };

    const renderEventCard = (event: TimelineEvent, index: number) => {
      const isExpanded = expandedEvents.has(event.id);
      const isNewEvent = animateNewEvents.has(event.id);
      const isStreaming = isStreamingEvent(event);

      const cardClasses = isStreaming
        ? `timeline-card-streaming ${isNewEvent ? 'timeline-card-new' : ''}`
        : 'animate-slide-up';

      return (
        <div
          key={event.id}
          className={`flex gap-2 sm:gap-4 ${cardClasses}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex flex-col items-center">
            <div className="event-date">
              {event.date}
            </div>
            <div className="w-px grow bg-border/50 mx-auto rounded-full" />
            {index < events.length - 1 && (
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <div className="flex-1 pb-3 sm:pb-4">
            <Card className={`event-card ${isNewEvent ? 'border-l-4 border-primary' : ''}`}>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center">
                  {event.title}
                  {isNewEvent && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full animate-pulse">
                      New
                    </span>
                  )}
                </CardTitle>
                {event.source && (
                  <CardDescription className="text-xs mt-1">
                    来源: {event.sourceUrl ? (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-blue-500 dark:text-blue-400"
                      >
                        {event.source}
                      </a>
                    ) : event.source}
                  </CardDescription>
                )}
                {renderPeople(event.people)}
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <p className={`text-sm sm:text-base ${isExpanded ? '' : 'line-clamp-3'}`}>
                  {event.description}
                </p>
              </CardContent>
              <CardFooter className="p-3 sm:p-6 pt-0 sm:pt-0 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(event.id)}
                  className="text-xs sm:text-sm rounded-full"
                >
                  {isExpanded ? '收起' : '展开'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShowDetails(event)}
                  className="text-xs sm:text-sm rounded-full"
                >
                  AI分析
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      );
    };

    if (events.length === 0 && !isLoading) {
      return null;
    }

    if (isLoading) {
      const skeletonItems = [
        { id: 'skeleton-1' },
        { id: 'skeleton-2' },
        { id: 'skeleton-3' },
        { id: 'skeleton-4' },
        { id: 'skeleton-5' }
      ];

      return (
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex flex-col gap-4 sm:gap-6 py-4 sm:py-8">
            {skeletonItems.map((item) => (
              <div key={item.id} className="flex gap-2 sm:gap-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-5 sm:h-6 w-16 sm:w-24 mb-2 rounded-lg" />
                  <div className="w-px h-full bg-border/50 rounded-full" />
                </div>
                <div className="flex-1">
                  <Card className="glass-card rounded-lg">
                    <CardHeader className="p-3 sm:p-6">
                      <Skeleton className="h-5 sm:h-6 w-3/4 mb-2 rounded-lg" />
                      <Skeleton className="h-3 sm:h-4 w-1/2 rounded-lg" />
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                      <Skeleton className="h-16 sm:h-20 w-full rounded-lg" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-3xl mx-auto">
        {summary && (
          <Card className="mb-6 sm:mb-8 glass-card rounded-xl">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">事件总结</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {streamingDetails ? (
                <StreamingText
                  content={summary}
                  isStreaming={false}
                  className="text-sm sm:text-base"
                />
              ) : (
                <p className="text-sm sm:text-base">{summary}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-4 sm:gap-6 py-4 sm:py-8">
          {events.map((event, index) => renderEventCard(event, index))}
        </div>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent ref={detailsDialogRef} className="max-w-md sm:max-w-2xl p-4 sm:p-6 glass-card rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedEvent?.title}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {selectedEvent?.date}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 sm:mt-4 max-h-[60vh] overflow-y-auto">
              {!isLoadingDetails && detailsContent && !streamingDetails ? (
                renderMarkdown(detailsContent)
              ) : (
                <div className="space-y-2">
                  {detailsContent && streamingDetails ? (
                    <StreamingText
                      content={detailsContent}
                      isStreaming={isLoadingDetails}
                      withTypingEffect={true}
                      typingSpeed={10}
                      scrollToBottom={true}
                      className="text-sm space-y-2 px-1"
                    />
                  ) : detailsContent ? (
                    renderMarkdown(detailsContent)
                  ) : (
                    <>
                      <Skeleton className="h-3 sm:h-4 w-full rounded-md" />
                      <Skeleton className="h-3 sm:h-4 w-full rounded-md" />
                      <Skeleton className="h-3 sm:h-4 w-5/6 rounded-md" />
                      <Skeleton className="h-3 sm:h-4 w-4/5 rounded-md" />
                    </>
                  )}
                  {isLoadingDetails && streamingDetails && (
                    <div className="mt-4 flex justify-center">
                      <div className="loading-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);
