"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { TavilyConfig } from '@/types';

interface ApiSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiSettings({ open, onOpenChange }: ApiSettingsProps) {
  const {
    apiConfig,
    updateApiConfig,
    isConfigured,
    allowUserConfig,
    isPasswordProtected,
    isPasswordValidated,
    validatePassword,
    setPasswordValidated,
    hasEnvConfig,
    useEnvConfig,
    setUseEnvConfig
  } = useApi();

  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isEnvConfigActive, setIsEnvConfigActive] = useState(useEnvConfig);

  const [tavilyConfig, setTavilyConfig] = useState<TavilyConfig>({
    apiKey: '',
  });

  // 当前选中的设置标签
  const [activeTab, setActiveTab] = useState('api');

  // 确保组件已挂载（客户端渲染）
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update local state when apiConfig changes or dialog opens
  useEffect(() => {
    if (open) {
      // 从 localStorage 获取最新的环境变量配置选择状态
      if (typeof window !== 'undefined') {
        const storedUseEnvConfig = localStorage.getItem('oneLine_useEnvConfig');
        // 如果存在存储的状态，使用它；否则使用当前上下文中的状态
        if (storedUseEnvConfig !== null) {
          const shouldUseEnvConfig = storedUseEnvConfig === 'true';
          setIsEnvConfigActive(shouldUseEnvConfig);
        } else {
          setIsEnvConfigActive(useEnvConfig);
        }
      } else {
        setIsEnvConfigActive(useEnvConfig);
      }

      if (useEnvConfig && hasEnvConfig) {
        setEndpoint('');
        setModel('');
        setApiKey('');
      } else {
        setEndpoint(apiConfig.endpoint === "使用环境变量配置" ? "" : apiConfig.endpoint);
        setModel(apiConfig.model === "使用环境变量配置" ? "" : apiConfig.model);
        setApiKey(apiConfig.apiKey === "使用环境变量配置" ? "" : apiConfig.apiKey);
      }
      setPassword('');
      setPasswordError('');
      setError('');

      if (apiConfig.tavily) {
        setTavilyConfig(apiConfig.tavily);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiConfig, open, useEnvConfig, hasEnvConfig]);

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setPasswordError('请输入访问密码');
      return;
    }

    const isValid = validatePassword(password);
    if (isValid) {
      setPasswordError('');
      setPassword('');
    } else {
      setPasswordError('密码错误，请重试');
    }
  };

  const handleToggleEnvConfig = () => {
    const newState = !isEnvConfigActive;
    setIsEnvConfigActive(newState);
    setUseEnvConfig(newState);

    // 直接保存到localStorage，确保设置持久化
    if (typeof window !== 'undefined') {
      localStorage.setItem('oneLine_useEnvConfig', newState.toString());
    }

    setError('');
  };

  const handleTavilyChange = (key: keyof TavilyConfig, value: string) => {
    setTavilyConfig((prev: TavilyConfig) => ({
      ...prev,
      [key]: value
    }));
  };

  // 更新保存函数以包含SearXNG配置
  const handleSave = () => {
    if (!allowUserConfig) {
      onOpenChange(false);
      return;
    }

    if (isEnvConfigActive && hasEnvConfig) {
      // 确保保存SearXNG配置的同时也更新环境变量配置选择
      updateApiConfig({
        tavily: tavilyConfig
      });

      // 确保两边设置都是同步的
      setUseEnvConfig(true);

      // 直接存储到localStorage，以防ApiContext中的逻辑未执行
      if (typeof window !== 'undefined') {
        localStorage.setItem('oneLine_useEnvConfig', 'true');
      }

      onOpenChange(false);
      return;
    }

    if (!endpoint.trim()) {
      setError('API端点不能为空');
      return;
    }

    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      setError('API端点需要以http://或https://开头');
      return;
    }

    if (!model.trim()) {
      setError('模型名称不能为空');
      return;
    }

    if (!apiKey.trim()) {
      setError('API密钥不能为空');
      return;
    }


    setError('');

    updateApiConfig({
      endpoint: endpoint.trim(),
      model: model.trim(),
      apiKey: apiKey.trim(),
      tavily: tavilyConfig
    });

    // 确保两边设置都是同步的
    setUseEnvConfig(false);

    // 直接存储到localStorage，以防ApiContext中的逻辑未执行
    if (typeof window !== 'undefined') {
      localStorage.setItem('oneLine_useEnvConfig', 'false');
    }

    onOpenChange(false);
  };

  // 重置密码验证状态
  const handleResetPasswordValidation = () => {
    if (isMounted) {
      setPasswordValidated(false);
      setPassword('');
    }
  };

  if (!isMounted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md backdrop-blur-lg bg-background/90 border border-border/30 rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle>API 设置</DialogTitle>
            <DialogDescription>
              加载中...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>正在加载设置界面，请稍候...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md backdrop-blur-lg bg-background/90 border border-border/30 rounded-xl shadow-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>
            {isPasswordProtected && !isPasswordValidated
              ? '请输入访问密码以继续'
              : allowUserConfig
                ? '配置API和搜索设置'
                : '当前使用环境变量配置，可以配置SearXNG搜索'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="grid gap-4 py-2">
            {isPasswordProtected && !isPasswordValidated ? (
              <>
                <div className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 mb-2">
                  此应用受密码保护，请输入访问密码以继续使用。
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="password" className="sm:text-right">
                    访问密码
                  </Label>
                  <div className="sm:col-span-3">
                    <Input
                      id="password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      placeholder="请输入访问密码"
                      type="password"
                      className="rounded-lg"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                    {passwordError && (
                      <div className="text-sm text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                        {passwordError}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="api" className="flex-1">API设置</TabsTrigger>
                    <TabsTrigger value="search" className="flex-1">搜索设置</TabsTrigger>
                  </TabsList>

                  <TabsContent value="api" className="mt-4">
                    {!allowUserConfig ? (
                      <div className="text-sm bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                        管理员已通过环境变量配置API设置，不允许用户修改。如需更改，请联系管理员。
                      </div>
                    ) : (
                      <>
                        {hasEnvConfig && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                            <div className="flex flex-col">
                              <label htmlFor="use-env-config" className="font-medium text-blue-800 dark:text-blue-200">
                                使用环境变量中的API配置
                              </label>
                              <span className="text-sm text-blue-600 dark:text-blue-300">
                                推荐选择此选项，无需手动填写API配置
                              </span>
                            </div>
                            <Switch
                              id="use-env-config"
                              checked={isEnvConfigActive}
                              onCheckedChange={handleToggleEnvConfig}
                            />
                          </div>
                        )}

                        <div className={isEnvConfigActive && hasEnvConfig ? "opacity-50" : ""}>
                          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4 mt-2">
                            <Label htmlFor="endpoint" className="sm:text-right">
                              API端点
                            </Label>
                            <Input
                              id="endpoint"
                              value={endpoint}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndpoint(e.target.value)}
                              placeholder="例如: https://example.com/v1/chat/completions"
                              className="sm:col-span-3 rounded-lg"
                              disabled={!allowUserConfig || (isEnvConfigActive && hasEnvConfig)}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4 mt-2">
                            <Label htmlFor="model" className="sm:text-right">
                              模型名称
                            </Label>
                            <Input
                              id="model"
                              value={model}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value)}
                              placeholder="例如: gemini-2.0-pro-exp-search"
                              className="sm:col-span-3 rounded-lg"
                              disabled={!allowUserConfig || (isEnvConfigActive && hasEnvConfig)}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4 mt-2">
                            <Label htmlFor="api-key" className="sm:text-right">
                              API密钥
                            </Label>
                            <Input
                              id="api-key"
                              value={apiKey}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                              placeholder="请输入API密钥"
                              type="password"
                              className="sm:col-span-3 rounded-lg"
                              disabled={!allowUserConfig || (isEnvConfigActive && hasEnvConfig)}
                              autoComplete="off"
                            />
                          </div>
                        </div>

                        {isEnvConfigActive && hasEnvConfig && (
                          <div className="text-sm bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-3 rounded-lg border border-green-200 dark:border-green-800/50 mt-4">
                            <p className="font-medium">已启用环境变量API配置</p>
                            <p className="mt-1">系统将使用服务器端配置的API信息，您无需手动填写。</p>
                            <p className="mt-1">此选项的配置已保存到本地，下次访问将自动使用。</p>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="search" className="mt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4 mt-2">
                        <Label htmlFor="tavily-api-key" className="sm:text-right">
                          Tavily API 密钥
                        </Label>
                        <Input
                          id="tavily-api-key"
                          value={tavilyConfig.apiKey}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTavilyChange('apiKey', e.target.value)}
                          placeholder="请输入Tavily API密钥"
                          type="password"
                          className="sm:col-span-3 rounded-lg"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {error && (
                  <div className={`text-sm mt-4 text-center p-2 rounded-lg ${
                    error.includes('成功')
                      ? 'text-green-500 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50'
                      : 'text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                  }`}>
                    {error}
                  </div>
                )}

                {isPasswordProtected && isPasswordValidated && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetPasswordValidation}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      重置密码验证
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4 border-t pt-4">
          {isPasswordProtected && !isPasswordValidated ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="sm:order-1 rounded-full">
                取消
              </Button>
              <Button type="button" onClick={handlePasswordSubmit} className="sm:order-2 rounded-full">
                验证
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="sm:order-1 rounded-full">
                关闭
              </Button>
              <Button type="button" onClick={handleSave} className="sm:order-2 rounded-full">
                保存
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
