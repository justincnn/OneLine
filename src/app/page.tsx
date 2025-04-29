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
import { fetchTimelineData, fetchEventDetails, type ProgressCallback, type StreamCallback } from '@/lib/api';
import { SearchProgress, type SearchProgressStep } from '@/components/SearchProgress';
import { BaiduHotList } from '@/components/BaiduHotList';
import { HotSearchDropdown } from '@/components/HotSearchDropdown';
import { toast } from 'sonner';
import { Settings, SortDesc, SortAsc, Download, Search, ChevronDown, Flame } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  // 新增进度状态
  const [searchProgressVisible, setSearchProgressVisible] = useState(false);
  const [searchProgressSteps, setSearchProgressSteps] = useState<SearchProgressStep[]>([]);
  const [searchProgressActive, setSearchProgressActive] = useState(false);

  // 热搜状态
  const [showHotList, setShowHotList] = useState(false); // 保留原有热搜弹窗
  const [showHotSearch, setShowHotSearch] = useState(true); // 搜索框下方热搜下拉
  const [flyingHotItem, setFlyingHotItem] = useState<{ title: string, startX: number, startY: number } | null>(null);

  // 新增流式输出相关状态
  const [streamingEvents, setStreamingEvents] = useState<TimelineEvent[]>([]);
  const [streamingSummary, setStreamingSummary] = useState<string>('');
  const [isStreamingDetails, setIsStreamingDetails] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState('');

  // 进度回调函数
  const progressCallback: ProgressCallback = (message, status) => {
    if (status === 'start') {
      // 开始新流程时重置进度
      setSearchProgressSteps([{ message, status: 'loading' }]);
      setSearchProgressVisible(true);
      setSearchProgressActive(true);
    } else {
      setSearchProgressSteps(prev => {
        // 更新最后一个步骤的状态
        const updatedSteps = [...prev];
        if (updatedSteps.length > 0) {
          const lastIndex = updatedSteps.length - 1;
          updatedSteps[lastIndex] = { ...updatedSteps[lastIndex], status };
        }

        // 如果是新消息且不是结束状态，添加新步骤
        if (message && status !== 'error' && status !== 'complete') {
          updatedSteps.push({ message, status: 'loading' });
        }

        return updatedSteps;
      });

      if (status === 'complete' || status === 'error') {
        setSearchProgressActive(false);
      }
    }
  };

  // 流式输出回调
  const streamCallback: StreamCallback = useCallback((type, content) => {
    if (type === 'event') {
      try {
        const event = JSON.parse(content);
        setStreamingEvents(prev => [...prev, event]);
      } catch (error) {
        console.error('解析事件数据失败', error);
      }
    } else if (type === 'summary') {
      setStreamingSummary(prev => prev + content);
    } else if (type === 'details') {
      if (!isStreamingDetails) {
        setIsStreamingDetails(true);
        setCurrentStreamingContent('');
      }
      setCurrentStreamingContent(prev => prev + content);
    }
  }, [isStreamingDetails]);

  // 事件流式接收回调，考虑用户偏好
  const handleStreamedEvents = useCallback((events: TimelineEvent[]) => {
    // 只有在用户启用流式输出时才处理流式事件
    if (streamingPreference && events.length > 0) {
      // 将事件合并到时间轴数据中
      setTimelineData(prev => {
        // 防止重复
        const existingIds = new Set(prev.events.map(e => e.id));
        const newEvents = events.filter(e => !existingIds.has(e.id));
        
        if (newEvents.length === 0) return prev;
        
        return {
          ...prev,
          events: [...prev.events, ...newEvents]
        };
      });
    }
  }, [streamingPreference]);

  // 当流式事件更新时处理
  useEffect(() => {
    if (streamingEvents.length > 0) {
      handleStreamedEvents(streamingEvents);
    }
  }, [streamingEvents, handleStreamedEvents]);

  // 流式摘要更新处理
  useEffect(() => {
    if (streamingSummary && streamingPreference) {
      setTimelineData(prev => ({
        ...prev,
        summary: streamingSummary
      }));
    }
  }, [streamingSummary, streamingPreference]);

  // 流式详情更新处理
  useEffect(() => {
    if (isStreamingDetails && currentStreamingContent && streamingPreference) {
      setCurrentStreamingContent(currentStreamingContent);
    }
  }, [currentStreamingContent, isStreamingDetails, streamingPreference]);

  // 处理滚动到时间轴
  const scrollToTimeline = () => {
    if (timelineRef.current) {
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetPosition = rect.top + scrollTop - headerHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  // 处理搜索提交
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query') as string;

    if (!query.trim()) return;

    // 重置状态
    setIsLoading(true);
    setTimelineData({ events: [] });
    setFilteredEvents([]);
    setStreamingEvents([]);
    setStreamingSummary('');
    setIsStreamingDetails(false);
    setCurrentStreamingContent('');

    try {
      const data = await fetchTimelineData(query, progressCallback, streamingPreference ? streamCallback : undefined);
      
      // 如果没有使用流式输出或者流式输出没有提供足够的数据，使用返回的数据
      if (!streamingPreference || streamingEvents.length === 0) {
        setTimelineData(data);
      }

      // 设置时间轴可见
      setTimelineVisible(true);
      setTimeout(scrollToTimeline, 100);
    } catch (error) {
      console.error('获取时间轴数据失败:', error);
      progressCallback('获取数据失败，请重试', 'error');
    } finally {
      setIsLoading(false);
      // 在结束搜索后，过一段时间隐藏进度
      setTimeout(() => {
        setSearchProgressVisible(false);
      }, 3000);
    }
  };

  // 处理查看事件详情
  const handleViewEventDetails = async (eventId: string) => {
    if (!eventId || streamingEvents.some(e => e.id === eventId) && currentStreamingContent) return;

    try {
      // 从当前事件列表中查找事件详情
      const event = [...timelineData.events, ...streamingEvents].find(e => e.id === eventId);
      if (!event) throw new Error('找不到事件信息');

      // 获取详细信息
      const details = await fetchEventDetails(
        event.id,
        event, 
        progressCallback,
        streamingPreference ? streamCallback : undefined
      );

      // 如果没有使用流式输出，使用返回的数据
      if (!streamingPreference || !isStreamingDetails) {
        setCurrentStreamingContent(details);
      }
    } catch (error) {
      console.error('获取事件详情失败:', error);
      setCurrentStreamingContent('获取事件详情失败，请重试');
    }
  };

  // 监听滚动以适应固定标题
  useEffect(() => {
    const handleScroll = () => {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const shouldFix = rect.top <= 60;
        timelineRef.current.classList.toggle('timeline-scrolled', shouldFix);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 筛选事件的逻辑
  useEffect(() => {
    // 合并常规事件和流式事件（如果有）
    const allEvents = [
      ...timelineData.events,
      ...(streamingPreference ? streamingEvents : [])
    ];

    // 如果没有事件，清空筛选结果
    if (allEvents.length === 0) {
      setFilteredEvents([]);
      return;
    }

    // 辅助函数：按方向排序事件
    const sortEvents = (events: TimelineEvent[]) => {
      return [...events].sort((a, b) => {
        const dateA = new Date(a.date.replace(/-/g, '/'));
        const dateB = new Date(b.date.replace(/-/g, '/'));
        return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
    };

    // 如果是"全部"选项，直接返回排序后的事件
    if (dateFilter.option === 'all') {
      setFilteredEvents(sortEvents(allEvents));
      return;
    }

    // 确定筛选的起始日期
    let startDate: Date | undefined;
    switch (dateFilter.option) {
      case 'last7days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last30days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'last90days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'custom':
        startDate = dateFilter.startDate ? new Date(dateFilter.startDate.replace(/-/g, '/')) : undefined;
        break;
      default:
        setFilteredEvents(sortEvents(allEvents));
        return;
    }

    const endDate = dateFilter.option === 'custom' ? dateFilter.endDate : undefined;

    const filtered = allEvents.filter(event => {
      const dateParts = event.date.split('-').map(Number);
      let eventDate: Date;
      
      // 根据日期格式创建Date对象
      if (dateParts.length === 3) {
        // 完整日期: YYYY-MM-DD
        eventDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      } else if (dateParts.length === 2) {
        // 只有年月: YYYY-MM
        eventDate = new Date(dateParts[0], dateParts[1] - 1, 1);
      } else {
        // 只有年份: YYYY
        eventDate = new Date(dateParts[0], 0, 1);
      }

      // 检查是否在起始日期之后
      if (startDate && eventDate < startDate) {
        return false;
      }

      // 检查是否在结束日期之前
      if (endDate) {
        const endDateObj = new Date(endDate.replace(/-/g, '/'));
        if (eventDate > endDateObj) {
          return false;
        }
      }

      return true;
    });

    setFilteredEvents(sortEvents(filtered));
  }, [timelineData.events, streamingEvents, dateFilter, sortDirection, streamingPreference]);

  // 热搜飞行动画效果
  useEffect(() => {
    if (flyingHotItem && inputRef.current) {
      // 获取输入框的位置
      const inputRect = inputRef.current.getBoundingClientRect();
      const targetX = inputRect.left + inputRect.width / 2;
      const targetY = inputRect.top + inputRect.height / 2;

      // 创建飞行元素
      const flyingEl = document.createElement('div');
      flyingEl.className = 'flying-hot-item';
      flyingEl.textContent = flyingHotItem.title;
      flyingEl.style.position = 'fixed';
      flyingEl.style.left = `${flyingHotItem.startX}px`;
      flyingEl.style.top = `${flyingHotItem.startY}px`;
      flyingEl.style.background = 'rgba(255, 99, 71, 0.8)';
      flyingEl.style.color = 'white';
      flyingEl.style.padding = '4px 8px';
      flyingEl.style.borderRadius = '4px';
      flyingEl.style.zIndex = '1000';
      flyingEl.style.pointerEvents = 'none';
      flyingEl.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      
      document.body.appendChild(flyingEl);

      // 开始动画
      setTimeout(() => {
        flyingEl.style.transform = 'scale(0.8)';
        flyingEl.style.left = `${targetX}px`;
        flyingEl.style.top = `${targetY}px`;
        flyingEl.style.opacity = '0.8';
      }, 10);

      // 动画结束后处理
      setTimeout(() => {
        document.body.removeChild(flyingEl);
        if (inputRef.current) {
          inputRef.current.value = flyingHotItem.title;
          inputRef.current.focus();
        }
        setFlyingHotItem(null);
      }, 500);
    }
  }, [flyingHotItem]);

  // 处理热搜点击
  const handleHotItemClick = (title: string, event: React.MouseEvent) => {
    // 记录点击位置
    setFlyingHotItem({
      title,
      startX: event.clientX,
      startY: event.clientY
    });
  };

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

  const sortEvents = (events: TimelineEvent[]): TimelineEvent[] => {
    return [...events].sort((a, b) => {
      const dateA = a.date.replace(/\D/g, '');
      const dateB = b.date.replace(/\D/g, '');
      return sortDirection === 'asc'
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
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

  const handleRequestDetails = async (event: TimelineEvent, streamCallback?: StreamCallback): Promise<string> => {
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
      const detailedQuery = `事件：${event.title}（${event.date}）\n\n请提供该事件的详细分析，包括事件背景、主要过程、关键人物、影响与意义。请尽可能提供多方观点，并分析该事件在"${query}"整体发展中的位置与作用。`;

      const detailsContent = await fetchEventDetails(
        event.id,
        detailedQuery,
        apiConfig,
        progressCallback,
        streamCallback
      );

      if (streamingPreference) {
        if (inputRef.current) {
          inputRef.current.value = detailsContent;
          inputRef.current.focus();
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

  // 保留弹窗热搜榜切换函数（兼容旧逻辑）
  const toggleHotList = () => {
    setShowHotList(prev => !prev);
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
              ref={inputRef}
              type="text"
              placeholder="输入关键词，如：俄乌冲突、中美贸易..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/70"
              onFocus={() => { if (!query.trim()) setShowHotSearch(true); }}
              // 取消onBlur事件，避免用户无法点击热搜项
            />

            <div className="flex items-center">
              {/* 移除热搜榜按钮，热搜自动显示在下方 */}
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

          {/* 热搜下拉列表 - 在搜索框下方显示 */}
          <div className="w-full max-w-3xl mx-auto relative z-30">
            <HotSearchDropdown
              visible={searchPosition === 'center' && showHotSearch && !isLoading}
              onSelectHotItem={handleHotItemClick}
            />
          </div>
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
              events={filteredEvents}
              selectedEventId={streamingEvents.length > 0 ? streamingEvents[0].id : null}
              onSelectEvent={handleViewEventDetails}
              showSortDirection={false}
              sortDirection={sortDirection}
              onChangeSortDirection={(direction) => setSortDirection(direction)}
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
