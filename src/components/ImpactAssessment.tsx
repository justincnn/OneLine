"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { StreamCallback } from '@/lib/api';
import { BarChart3, TrendingUp, Globe2, FileText, AlertCircle, Building, ShoppingCart, Package } from 'lucide-react';
import { formatMarkdownText } from '@/lib/markdown';

interface ImpactAssessmentProps {
  query: string;
  isLoading?: boolean;
  onRequestImpact: (query: string, streamCallback?: StreamCallback) => Promise<string>;
  onSummaryExtracted?: (summary: string) => void;
}

export function ImpactAssessment({ query, isLoading = false, onRequestImpact, onSummaryExtracted }: ImpactAssessmentProps) {
  const [impactContent, setImpactContent] = useState<string>('');
  const [showImpact, setShowImpact] = useState<boolean>(false);
  const [isLoadingImpact, setIsLoadingImpact] = useState<boolean>(false);
  const [isStreamingImpact, setIsStreamingImpact] = useState<boolean>(false);
  const [currentStreaming, setCurrentStreaming] = useState<'industryAndProduct' | 'company' | 'crossBorderECommerce' | null>(null);

  const streamContentRef = useRef<string>('');

  const [parsedImpact, setParsedImpact] = useState<{
    industryAndProduct: string;
    company: string;
    crossBorderECommerce: string;
  }>({
    industryAndProduct: '',
    company: '',
    crossBorderECommerce: ''
  });

  useEffect(() => {
    if (!showImpact) {
      streamContentRef.current = '';
    }
  }, [showImpact]);

  useEffect(() => {
    if (query && !impactContent && !isLoadingImpact) {
      handleRequestImpact();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, impactContent, isLoadingImpact]);

  useEffect(() => {
    if (!impactContent) return;

    const industryAndProductMatch = impactContent.match(/===关于行业产品===\s*([\s\S]*?)(?=\s*===关于公司===|$)/);
    const companyMatch = impactContent.match(/===关于公司===\s*([\s\S]*?)(?=\s*===跨境电商客户分析===|$)/);
    const crossBorderECommerceMatch = impactContent.match(/===跨境电商客户分析===\s*([\s\S]*?)(?=$)/);

    const industryAndProduct = industryAndProductMatch?.[1]?.trim() || '';
    const company = companyMatch?.[1]?.trim() || '';
    const crossBorderECommerce = crossBorderECommerceMatch?.[1]?.trim() || '';

    setParsedImpact({
      industryAndProduct,
      company,
      crossBorderECommerce
    });

    if (isStreamingImpact) {
      if (crossBorderECommerceMatch) {
        setCurrentStreaming('crossBorderECommerce');
      } else if (companyMatch) {
        setCurrentStreaming('company');
      } else if (industryAndProductMatch) {
        setCurrentStreaming('industryAndProduct');
      } else {
        setCurrentStreaming(null);
      }
    }
  }, [impactContent, isStreamingImpact]);

  const handleRequestImpact = async () => {
    setIsLoadingImpact(true);
    setIsStreamingImpact(true);
    setShowImpact(true);
    setImpactContent('');
    streamContentRef.current = '';
    setCurrentStreaming('industryAndProduct');

    try {
      const streamCallback: StreamCallback = (chunk, isDone) => {
        streamContentRef.current += chunk;
        setImpactContent(streamContentRef.current);

        if (isDone) {
          setIsStreamingImpact(false);
          setIsLoadingImpact(false);
          setCurrentStreaming(null);
        }
      };

      await onRequestImpact(query, streamCallback);
    } catch (error) {
      console.error('Failed to fetch impact assessment:', error);
      setIsStreamingImpact(false);
      setIsLoadingImpact(false);
      setCurrentStreaming(null);
    }
  };

  const renderMarkdown = (content: string) => {
    return (
      <div className="space-y-3 animate-fade-in"
           dangerouslySetInnerHTML={{ __html: formatMarkdownText(content.replace(/\n/g, '<br />')) }}
      />
    );
  };

  if (!query) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mb-2 sm:mb-4 impact-assessment-container">
      <Card className="glass-card rounded-xl overflow-hidden">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-xl flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            影响评估
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            分析公司、行业及相关趋势
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {!showImpact && (
            <div className="flex justify-center">
              <Button
                onClick={handleRequestImpact}
                disabled={isLoading || isLoadingImpact}
                className="rounded-full"
              >
                {isLoadingImpact && <div className="loading-spinner mr-2" />}
                {isLoadingImpact ? '分析中...' : '生成影响评估'}
              </Button>
            </div>
          )}

          {showImpact && (
            <div className="w-full flex flex-col gap-4 mt-2">
              {(parsedImpact.industryAndProduct || isLoadingImpact) && (
                <Card className={`glass-card border-0 transition-all duration-300 animate-fade-in shadow-md ${currentStreaming === 'industryAndProduct' ? 'ring-2 ring-primary/40' : ''}`} style={{animationDelay: '0.1s'}}>
                  <CardHeader className="p-2 sm:p-3 pb-0 flex flex-row items-center space-y-0 bg-orange-500/10 dark:bg-orange-500/5 rounded-t-xl">
                    <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                      <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                      关于行业产品
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3 pt-2">
                    {isLoadingImpact && !parsedImpact.industryAndProduct ? (
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full rounded-md" />
                        <Skeleton className="h-3 w-5/6 rounded-md" />
                      </div>
                    ) : (
                      <div className="relative">
                        {renderMarkdown(parsedImpact.industryAndProduct)}
                        {currentStreaming === 'industryAndProduct' && <div className="stream-cursor"></div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(parsedImpact.company || isLoadingImpact) && (
                <Card className={`glass-card border-0 transition-all duration-300 animate-fade-in shadow-md ${currentStreaming === 'company' ? 'ring-2 ring-primary/40' : ''}`} style={{animationDelay: '0.2s'}}>
                  <CardHeader className="p-2 sm:p-3 pb-0 flex flex-row items-center space-y-0 bg-blue-500/10 dark:bg-blue-500/5 rounded-t-xl">
                    <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Building className="h-3 w-3 sm:h-4 sm:w-4" />
                      关于公司
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3 pt-2">
                    {isLoadingImpact && !parsedImpact.company ? (
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full rounded-md" />
                        <Skeleton className="h-3 w-5/6 rounded-md" />
                      </div>
                    ) : (
                      <div className="relative">
                        {renderMarkdown(parsedImpact.company)}
                        {currentStreaming === 'company' && <div className="stream-cursor"></div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(parsedImpact.crossBorderECommerce) && (
                <Card className={`glass-card border-0 transition-all duration-300 animate-fade-in shadow-md ${currentStreaming === 'crossBorderECommerce' ? 'ring-2 ring-primary/40' : ''}`} style={{animationDelay: '0.3s'}}>
                  <CardHeader className="p-2 sm:p-3 pb-0 flex flex-row items-center space-y-0 bg-green-500/10 dark:bg-green-500/5 rounded-t-xl">
                    <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                      跨境电商客户分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3 pt-2">
                    {isLoadingImpact && !parsedImpact.crossBorderECommerce ? (
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full rounded-md" />
                        <Skeleton className="h-3 w-5/6 rounded-md" />
                      </div>
                    ) : (
                      <div className="relative">
                        {renderMarkdown(parsedImpact.crossBorderECommerce)}
                        {currentStreaming === 'crossBorderECommerce' && <div className="stream-cursor"></div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        .stream-cursor {
          display: inline-block;
          width: 0.5ch;
          height: 1.15em;
          vertical-align: text-bottom;
          background: none;
          color: inherit;
          animation: stream-cursor-blink 1s steps(1) infinite;
          font-size: 1.1em;
          line-height: 1;
          margin-left: 1px;
        }
        .stream-cursor::after {
          content: "▌";
          display: inline-block;
        }
        @keyframes stream-cursor-blink {
          0% { opacity: 1; }
          49% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
