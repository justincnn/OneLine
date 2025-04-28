"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Flame } from 'lucide-react';
import axios from 'axios';

interface HotItem {
  title: string;
  url: string;
  hot: string;
}

interface HotSearchDropdownProps {
  onSelectHotItem: (title: string) => void;
  visible: boolean;
}

export function HotSearchDropdown({ onSelectHotItem, visible }: HotSearchDropdownProps) {
  const [hotItems, setHotItems] = useState<HotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [expanded, setExpanded] = useState<boolean>(false);

  // 默认显示数量为20
  const defaultDisplayCount = 20;

  useEffect(() => {
    const fetchHotSearches = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await axios.get('/api/baidu-hot');
        setHotItems(response.data.hotItems || []);
      } catch (err) {
        console.error('Failed to fetch Baidu hot searches:', err);
        setError('获取热搜失败，请稍后再试');
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) {
      fetchHotSearches();
    }
  }, [visible]);

  // 重置展开状态
  useEffect(() => {
    if (!visible) {
      setExpanded(false);
    }
  }, [visible]);

  if (!visible) return null;

  // 根据展开状态决定显示多少条
  const displayedItems = expanded ? hotItems : hotItems.slice(0, defaultDisplayCount);

  return (
    <div className="hot-search-dropdown w-full rounded-lg glass-card mt-2 overflow-hidden animate-fade-in">
      <div className="p-2.5 flex items-center justify-between border-b border-muted/20">
        <h3 className="text-sm font-medium flex items-center">
          <Flame size={14} className="text-red-500 mr-1.5" />
          百度热搜榜
        </h3>
        {hotItems.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {expanded ? `显示全部${hotItems.length}条` : `前${Math.min(defaultDisplayCount, hotItems.length)}条`}
          </div>
        )}
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="loading-spinner mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {displayedItems.map((item, index) => (
              <div
                key={index}
                className="hot-item cursor-pointer p-1.5 rounded-md hover:bg-primary/10 transition-colors"
                onClick={() => onSelectHotItem(item.title)}
              >
                <div className="flex items-center">
                  <span className={`hot-rank mr-2 ${index < 3 ? 'top-' + (index + 1) : ''}`}>
                    {index + 1}
                  </span>
                  <span className="hot-title text-xs line-clamp-1">{item.title}</span>
                </div>
                <div className="ml-6 mt-0.5">
                  <span className="hot-value text-[10px] text-muted-foreground">{item.hot}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {hotItems.length > defaultDisplayCount && (
          <div className="text-center mt-3 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full h-8 px-4 mb-4 bg-background/70 shadow-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>收起 <ChevronUp size={14} className="ml-1" /></>
              ) : (
                <>查看更多 <ChevronDown size={14} className="ml-1" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
