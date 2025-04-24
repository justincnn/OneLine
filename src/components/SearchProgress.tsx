"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckIcon } from 'lucide-react';

export interface SearchProgressStep {
  id: string;
  message: string;
  status: 'pending' | 'completed' | 'error';
  timestamp: Date;
}

interface SearchProgressProps {
  steps: SearchProgressStep[];
  visible: boolean;
  isActive: boolean;
}

export function SearchProgress({ steps, visible, isActive }: SearchProgressProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (steps.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps]);

  if (!visible) return null;

  return (
    <Card className="search-progress-card">
      <CardContent className="p-3 sm:p-4">
        <h3 className="text-sm font-medium mb-2 flex items-center">
          <span className="mr-2">搜索进度</span>
          {isActive && (
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          )}
        </h3>
        <div
          className="space-y-2 max-h-[200px] overflow-y-auto pr-2"
          ref={containerRef}
        >
          {steps.map((step) => (
            <div key={step.id} className="flex items-start text-xs">
              <div className="mr-2 mt-1">
                {step.status === 'pending' && (
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></div>
                )}
                {step.status === 'completed' && (
                  <div className="h-3 w-3 rounded-full text-green-500 flex items-center justify-center">
                    <CheckIcon className="h-2 w-2" />
                  </div>
                )}
                {step.status === 'error' && (
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-xs ${step.status === 'error' ? 'text-red-500' : ''}`}>
                  {step.message}
                </p>
                {step.status === 'pending' && (
                  <Skeleton className="h-2 w-full mt-1 rounded-sm" />
                )}
              </div>
              <div className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
