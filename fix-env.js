#!/usr/bin/env node

// 这个脚本用于在Docker容器启动时将环境变量写入.env.local文件
// 这样Next.js应用就能正确读取到这些环境变量

const fs = require('fs');
const path = require('path');

// 需要处理的环境变量列表
const ENV_VARS = [
  'NEXT_PUBLIC_API_ENDPOINT',
  'NEXT_PUBLIC_API_MODEL',
  'NEXT_PUBLIC_API_KEY',
  'NEXT_PUBLIC_ALLOW_USER_CONFIG',
  'NEXT_PUBLIC_ACCESS_PASSWORD',
  'NEXT_PUBLIC_SEARXNG_URL',
  'NEXT_PUBLIC_SEARXNG_ENABLED',
  'API_ENDPOINT',
  'API_MODEL',
  'API_KEY'
];

// 创建.env.local文件的路径
const envFilePath = path.resolve(process.cwd(), '.env.local');

// 收集环境变量
let envContent = '';
ENV_VARS.forEach(varName => {
  if (process.env[varName]) {
    envContent += `${varName}=${process.env[varName]}\n`;
  }
});

// 如果有服务器端API配置，设置标志位
if (process.env.API_ENDPOINT && process.env.API_KEY) {
  envContent += 'NEXT_PUBLIC_HAS_SERVER_CONFIG=true\n';
}

// 写入文件
if (envContent) {
  console.log('将环境变量写入.env.local文件...');
  fs.writeFileSync(envFilePath, envContent);
  console.log('环境变量配置成功写入!');
} else {
  console.log('未检测到环境变量，跳过.env.local文件创建');
} 