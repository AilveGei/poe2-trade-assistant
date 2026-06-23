# 流放之路2 市集交易助手

Path of Exile 2 腾讯服（poe.game.qq.com）网页市集增强 Chrome 扩展。

## 功能

- **📁 书签管理** — 收藏交易搜索链接，文件夹分类管理
- **📜 浏览历史** — 自动记录搜索历史，最多保留 50 条
- **📌 物品固定** — 在搜索结果中暂存物品，跨页面对比
- **📦 相同结果合并** — 自动合并重复结果
- **💰 等价价格计算** — 基于官方 API 计算通货比值
- **🎨 词缀高亮** — 自动匹配搜索面板中的过滤词缀，在结果中高亮显示
- **⌨️ 空格快捷键** — 一键跳转藏身处

## 安装

1. 下载最新版 `poe2-trade-assistant.zip`
2. 解压到本地目录
3. 打开 Chrome 地址栏输入 `chrome://extensions`
4. 开启右上角"开发者模式"
5. 点击"加载已解压的扩展程序"，选择解压后的目录

## 开发

```bash
npm install
npm run build
```

## 技术栈

TypeScript / Vite / Chrome Extension Manifest V3

## 致谢

参考 [Better Trading](https://github.com/exile-center/better-trading) 的设计思路。
