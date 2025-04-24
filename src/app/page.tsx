"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Timeline } from '@/components/Timeline';
import { ApiSettings } from '@/components/ApiSettings';
import { ApiProvider, useApi } from '@/contexts/ApiContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { TimelineData, TimelineEvent, DateFilterOption, DateFilterConfig } from '@/types';
import { fetchTimelineData, fetchEventDetails, type ProgressCallback, type TimelineEventCallback, type SummaryCallback, type EventDetailsChunkCallback } from '@/lib/api';
import { SearchProgress, type SearchProgressStep } from '@/components/SearchProgress';
import { toast } from 'sonner';
import { Settings, SortDesc, SortAsc, Download, Search, ChevronDown } from 'lucide-react';

function MainContent() {
  const { apiConfig, isConfigured, isPasswordProtected, isPasswordValidated, streamingPreference } = useApi();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineData>({ events: [] });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterConfig>({ option: 'all' });
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 新增的状态用于控制搜索框位置和时间轴可见性
  const [searchPosition, setSearchPosition] = useState<'center' | 'top'>('center');
  const [timelineVisible, setTimelineVisible] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineComponentRef = useRef<any>(null);

  // 新增进度状态
  const [searchProgressVisible, setSearchProgressVisible] = useState(false);
  const [searchProgressSteps, setSearchProgressSteps] = useState<SearchProgressStep[]>([]);
  const [searchProgressActive, setSearchProgressActive] = useState(false);

  // 新增流式输出相关状态
  const [streamingEvents, setStreamingEvents] = useState<TimelineEvent[]>([]);
  const [streamingSummary, setStreamingSummary] = useState<string>('');
  const [isStreamingDetails, setIsStreamingDetails] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState('');

  // 进度回调函数
  const progressCallback: ProgressCallback = (message, status) => {
    const newStep: SearchProgressStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      message,
      status,
      timestamp: new Date()
    };

    setSearchProgressSteps(prev => [...prev, newStep]);

    // 如果是错误或完成状态，不再激活
    if (status !== 'pending') {
      // 但只更新这一步的状态，不改变整体进度条的激活状态
    } else {
      setSearchProgressActive(true);
    }
  };

  // 事件流式接收回调，考虑用户偏好
  const eventReceivedCallback: TimelineEventCallback = useCallback((event) => {
    // 只有在用户启用流式输出时才处理流式事件
    if (streamingPreference) {
      setStreamingEvents(prev => {
        const exists = prev.some(e => e.id === event.id || (e.title === event.title && e.date === event.date));
        if (exists) return prev;
        const newEvents = [...prev, event];
        return sortEvents(newEvents);
      });
    }
  }, [streamingPreference]);

  // 总结流式接收回调，考虑用户偏好
  const summaryReceivedCallback: SummaryCallback = useCallback((summary) => {
    if (streamingPreference) {
      setStreamingSummary(summary);
    }
  }, [streamingPreference]);

  // 事件详情流式接收回调，考虑用户偏好
  const detailsChunkCallback: EventDetailsChunkCallback = useCallback((chunk) => {
    if (streamingPreference) {
      setCurrentStreamingContent(prev => {
        const newContent = prev + chunk;
        if (timelineComponentRef.current) {
          timelineComponentRef.current.updateDetailsContent(newContent);
        }
        return newContent;
      });
    }
  }, [streamingPreference]);

  // 处理滚动到时间轴
  const scrollToTimeline = () => {
    if (timelineRef.current) {
      const header = document.querySelector('header');
      const headerHeight = header?.offsetHeight || 0;
      const yOffset = -headerHeight - 20; // 额外空间
      const y = timelineRef.current.getBoundingClientRect().top + window.scrollY + yOffset;

      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  };

  // Effect to show/hide the floating button when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShowFloatingButton(true);
      } else {
        setShowFloatingButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 当流式事件更新时，更新过滤后的事件列表
  useEffect(() => {
    if (streamingEvents.length > 0) {
      filterAndSortEvents(streamingEvents);
    }
  }, [streamingEvents, dateFilter, sortDirection]);

  // Effect to filter events based on date filter
  useEffect(() => {
    if (timelineData.events.length === 0 && streamingEvents.length === 0) {
      setFilteredEvents([]);
      return;
    }
    const events = timelineData.events.length > 0 ? timelineData.events : streamingEvents;
    filterAndSortEvents(events);
  }, [timelineData.events, dateFilter, sortDirection]);

  // 过滤并排序事件
  const filterAndSortEvents = (events: TimelineEvent[]) => {
    if (events.length === 0) {
      setFilteredEvents([]);
      return;
    }

    const now = new Date();
    let startDate: Date | undefined;

    switch (dateFilter.option) {
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'halfYear':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        startDate = dateFilter.startDate;
        break;
      default:
        setFilteredEvents(sortEvents(events));
        return;
    }

    const endDate = dateFilter.option === 'custom' ? dateFilter.endDate : undefined;

    const filtered = events.filter(event => {
      const dateParts = event.date.split('-').map(Number);
      let eventDate: Date;

      if (dateParts.length === 3) {
        eventDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      } else if (dateParts.length === 2) {
        eventDate = new Date(dateParts[0], dateParts[1] - 1, 1);
      } else if (dateParts.length === 1) {
        eventDate = new Date(dateParts[0], 0, 1);
      } else {
        return true;
      }

      if (startDate && eventDate < startDate) {
        return false;
      }
      if (endDate && eventDate > endDate) {
        return false;
      }

      return true;
    });

    setFilteredEvents(sortEvents(filtered));
  };

  // Function to sort events based on sort direction
  const sortEvents = (events: TimelineEvent[]): TimelineEvent[] => {
    return [...events].sort((a, b) => {
      const dateA = a.date.replace(/\D/g, '');
      const dateB = b.date.replace(/\D/g, '');
      return sortDirection === 'asc'
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.warning('请输入搜索关键词');
      return;
    }

    if (!isConfigured) {
      toast.info('请先配置API设置');
      setShowSettings(true);
      return;
    }

    if (isPasswordProtected && !isPasswordValidated) {
      toast.info('请先验证访问密码');
      setShowSettings(true);
      return;
    }

    setStreamingEvents([]);
    setStreamingSummary('');
    setSearchProgressSteps([]);
    setSearchProgressActive(true);
    setSearchProgressVisible(true);
    setError('');

    if (searchPosition === 'center') {
      setSearchPosition('top');
      setTimeout(() => {
        fetchData();
      }, 700);
    } else {
      fetchData();
    }
  };

  // 更新fetchData函数，使用用户的流式输出偏好
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    setTimelineData({ events: [] });
    setTimelineVisible(true);

    try {
      let queryWithDateFilter = query;

      if (dateFilter.option !== 'all') {
        let dateRangeText = '';
        const now = new Date();

        switch(dateFilter.option) {
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            dateRangeText = `，请主要搜索 ${formatDate(monthAgo)} 至 ${formatDate(now)} 这段时间的内容`;
            break;
          case 'halfYear':
            const halfYearAgo = new Date(now);
            halfYearAgo.setMonth(now.getMonth() - 6);
            dateRangeText = `，请主要搜索 ${formatDate(halfYearAgo)} 至 ${formatDate(now)} 这段时间的内容`;
            break;
          case 'year':
            const yearAgo = new Date(now);
            yearAgo.setFullYear(now.getFullYear() - 1);
            dateRangeText = `，请主要搜索 ${formatDate(yearAgo)} 至 ${formatDate(now)} 这段时间的内容`;
            break;
          case 'custom':
            if (dateFilter.startDate && dateFilter.endDate) {
              dateRangeText = `，请主要搜索 ${formatDate(dateFilter.startDate)} 至 ${formatDate(dateFilter.endDate)} 这段时间的内容`;
            }
            break;
        }

        queryWithDateFilter += dateRangeText;
      }

      // 使用流式回调获取数据，根据用户偏好决定是否传递回调
      const data = await fetchTimelineData(
        queryWithDateFilter,
        apiConfig,
        progressCallback,
        streamingPreference ? eventReceivedCallback : undefined,
        streamingPreference ? summaryReceivedCallback : undefined
      );

      // 如果没有通过流式获取到事件，或者用户禁用了流式输出，则使用传统方式获取的事件
      if (streamingEvents.length === 0 || !streamingPreference) {
        setTimelineData(data);
      }

      if (data.events.length > 0 || streamingEvents.length > 0) {
        setTimeout(scrollToTimeline, 300);
      }

      setSearchProgressActive(false);

      setTimeout(() => {
        setSearchProgressVisible(false);
      }, 3000);

      if (data.events.length === 0 && streamingEvents.length === 0) {
        toast.warning('未找到相关事件，请尝试其他关键词');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生错误，请稍后再试';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching timeline data:', err);

      setSearchProgressActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for API query
  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleDateFilterChange = (value: DateFilterOption) => {
    if (value === 'custom') {
      setDateFilter({
        option: value,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });
    } else {
      setDateFilter({ option: value });
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    if (dateFilter.option === 'custom' && e.target.value) {
      setDateFilter({
        ...dateFilter,
        startDate: new Date(e.target.value)
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    if (dateFilter.option === 'custom' && e.target.value) {
      setDateFilter({
        ...dateFilter,
        endDate: new Date(e.target.value)
      });
    }
  };

  // 更新handleRequestDetails，使用用户的流式输出偏好
  const handleRequestDetails = async (event: TimelineEvent): Promise<string> => {
    if (!isConfigured) {
      toast.info('请先配置API设置');
      setShowSettings(true);
      return '请先配置API设置';
    }

    if (isPasswordProtected && !isPasswordValidated) {
      toast.info('请先验证访问密码');
      setShowSettings(true);
      return '请先验证访问密码';
    }

    setSearchProgressSteps([]);
    setSearchProgressActive(true);
    setSearchProgressVisible(true);

    setIsStreamingDetails(streamingPreference);
    setCurrentStreamingContent('');

    try {
      const detailedQuery = `事件：${event.title}（${event.date}）\n\n请提供该事件的详细分析，包括事件背景、主要过程、关键人物、影响与意义。请尽可能提供多方观点，并分析该事件在${query}整体发展中的位置与作用。`;

      const detailsContent = await fetchEventDetails(
        event.id,
        detailedQuery,
        apiConfig,
        progressCallback,
        streamingPreference ? detailsChunkCallback : undefined
      );

      if (streamingPreference) {
        if (timelineComponentRef.current) {
          timelineComponentRef.current.completeStreamingDetails();
        }
      } else {
        setCurrentStreamingContent(detailsContent);
      }

      setTimeout(() => {
        setSearchProgressVisible(false);
        setSearchProgressActive(false);
        setIsStreamingDetails(false);
      }, 3000);

      return detailsContent;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '获取详细信息失败';
      toast.error(errorMessage);
      console.error('Error fetching event details:', err);

      setSearchProgressActive(false);
      setIsStreamingDetails(false);

      return '获取详细信息失败，请稍后再试';
    }
  };

  // Function to export timeline as image
  const exportAsImage = () => {
    if (filteredEvents.length === 0) {
      toast.warning('没有可导出的内容');
      return;
    }

    import('html2canvas').then(({ default: html2canvas }) => {
      const timelineElement = document.querySelector('.timeline-container') as HTMLElement;
      if (!timelineElement) {
        toast.error('找不到时间轴元素');
        return;
      }

      toast.info('正在生成图片，请稍候...');

      html2canvas(timelineElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const fileName = `一线-${query.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.png`;
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast.success('图片已导出');
      }).catch(err => {
        console.error('Error exporting image:', err);
        toast.error('导出图片失败');
      });
    }).catch(err => {
      console.error('Error loading html2canvas:', err);
      toast.error('加载导出功能失败');
    });
  };

  return (
    <main className="flex min-h-screen flex-col relative">
      <div className="bg-gradient-purple" />
      <div className="bg-gradient-blue" />

      <header className="fixed top-0 left-0 w-full z-20 flex justify-end items-center p-4 md:px-8">
        <div className="flex gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="rounded-full"
          >
            <Settings size={20} />
          </Button>
        </div>
      </header>

      <form
        ref={searchRef}
        onSubmit={handleSubmit}
        className={searchPosition === 'center' ? 'search-container-center' : 'search-container-top'}
      >
        {searchPosition === 'center' && (
          <div className="flex flex-col items-center mb-8 animate-slideDown">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center page-title">一线</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 text-center max-w-xl mx-auto">
              AI驱动的热点事件时间轴 · 洞察历史脉络
            </p>
          </div>
        )}

        <div className="p-4 w-full">
          <div className="glass-card rounded-full overflow-hidden flex items-center p-1 pr-2">
            <Input
              type="text"
              placeholder="输入关键词，如：俄乌冲突、中美贸易..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/70"
            />

            <div className="flex items-center">
              <Select
                value={dateFilter.option}
                onValueChange={handleDateFilterChange as (value: string) => void}
                defaultValue="all"
              >
                <SelectTrigger className="w-auto border-0 bg-transparent mr-2 focus:ring-0">
                  <div className="flex items-center">
                    <ChevronDown size={14} className="mr-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {dateFilter.option === 'all' && '所有时间'}
                      {dateFilter.option === 'month' && '近一个月'}
                      {dateFilter.option === 'halfYear' && '近半年'}
                      {dateFilter.option === 'year' && '近一年'}
                      {dateFilter.option === 'custom' && '自定义'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-0">
                  <SelectItem value="all">所有时间</SelectItem>
                  <SelectItem value="month">近一个月</SelectItem>
                  <SelectItem value="halfYear">近半年</SelectItem>
                  <SelectItem value="year">近一年</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="submit"
                size="icon"
                disabled={isLoading}
                className="rounded-full aspect-square h-9 w-9 bg-primary hover:bg-primary/90"
              >
                {isLoading ?
                  <div className="loading-spinner" /> :
                  <Search size={16} />
                }
              </Button>
            </div>
          </div>

          {dateFilter.option === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3 glass p-3 rounded-xl">
              <div className="flex-1 flex gap-2 items-center">
                <label htmlFor="start-date" className="text-sm whitespace-nowrap">开始日期:</label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="flex-1 glass-input text-sm h-8"
                />
              </div>
              <div className="flex-1 flex gap-2 items-center">
                <label htmlFor="end-date" className="text-sm whitespace-nowrap">结束日期:</label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="flex-1 glass-input text-sm h-8"
                />
              </div>
            </div>
          )}
        </div>
      </form>

      <div className={`w-full max-w-3xl mx-auto px-4 transition-opacity duration-300 ${searchProgressVisible ? 'opacity-100' : 'opacity-0'}`}
           style={{marginTop: searchPosition === 'center' ? "calc(50vh + 180px)" : "80px", zIndex: 15}}>
        <SearchProgress
          steps={searchProgressSteps}
          visible={searchProgressVisible}
          isActive={searchProgressActive}
        />
      </div>

      <div className="flex-1 pt-24 pb-12 px-4 md:px-8 w-full max-w-6xl mx-auto">
        {(timelineVisible || isLoading) && (
          <div
            ref={timelineRef}
            className={`timeline-container ${timelineVisible ? 'timeline-container-visible' : ''}`}
          >
            {error && (
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 glass text-red-500 dark:text-red-300 rounded-lg text-sm sm:text-base">
                {error}
              </div>
            )}

            {filteredEvents.length > 0 && (
              <div className="flex justify-between mb-4 glass rounded-lg p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSortDirection}
                  className="flex items-center gap-1 rounded-full text-xs"
                >
                  {sortDirection === 'asc' ? (
                    <>
                      <SortAsc size={14} /> 从远到近
                    </>
                  ) : (
                    <>
                      <SortDesc size={14} /> 从近到远
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportAsImage}
                  className="flex items-center gap-1 rounded-full text-xs"
                >
                  <Download size={14} /> 导出图片
                </Button>
              </div>
            )}

            <Timeline
              ref={timelineComponentRef}
              events={filteredEvents}
              isLoading={isLoading}
              onRequestDetails={handleRequestDetails}
              summary={streamingSummary || timelineData.summary}
              streamingDetails={isStreamingDetails}
            />
          </div>
        )}
      </div>

      <ApiSettings
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      {showFloatingButton && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 right-4 z-50 rounded-full p-3 shadow-md sm:hidden glass"
          onClick={() => setShowSettings(true)}
        >
          <Settings size={20} />
        </Button>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <ApiProvider>
      <MainContent />
    </ApiProvider>
  );
}
