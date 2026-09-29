# AGENTS.md - 麻雀助手

## 项目概览
日本麻将（日麻）助手网页，移动端优先响应式设计，日式和风主题。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **LLM**: coze-coding-dev-sdk (doubao-seed-2-0-pro-260215)

## 目录结构
```
src/
├── app/
│   ├── page.tsx              # 首页（导航入口）
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式（和风主题）
│   ├── knowledge/page.tsx    # 基础知识页
│   ├── calculator/page.tsx   # 拍照算点页
│   ├── game/page.tsx         # 一局计分页
│   └── api/recognize/route.ts # LLM牌面识别API
├── components/
│   ├── ui/                   # shadcn/ui组件
│   ├── knowledge/            # 基础知识组件
│   │   ├── WinRules.tsx      # 和牌规则
│   │   ├── YakuTable.tsx     # 役种表
│   │   ├── TermSearch.tsx    # 术语查询
│   │   ├── FuCalc.tsx        # 番符计算
│   │   └── WindInfo.tsx      # 风牌知识
│   └── calculator/           # 算点组件
│       ├── TileDisplay.tsx   # 麻将牌显示
│       └── TilePicker.tsx    # 牌选择器
└── lib/
    └── mahjong/              # 日麻核心逻辑
        ├── types.ts          # 类型定义
        ├── calculator.ts     # 点数计算引擎
        ├── yaku.ts           # 役种数据
        ├── terms.ts          # 术语数据
        └── tile-utils.ts     # 牌工具函数
```

## 核心功能
1. **基础知识** - 和牌规则、役种表、术语查询、番符计算、风牌知识
2. **拍照算点** - LLM多模态识别牌面 + 手动编辑 + 点数计算
3. **一局计分** - 对局记录、点数管理、localStorage持久化

## 开发命令
- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm ts-check` - TypeScript类型检查
- `pnpm lint` - ESLint检查

## 设计文件
- `DESIGN.md` - 日式和风主题设计规范

## 注意事项
- 点数计算逻辑在 `src/lib/mahjong/calculator.ts`
- LLM识别API在 `src/app/api/recognize/route.ts`
- 对局数据使用localStorage存储在浏览器端
- 主题色：深墨绿牌桌背景(#0F1A15) + 朱红强调(#C4463A) + 金色点缀(#C9A24B)
- 设计令牌定义在 `src/app/globals.css` 的 `:root`，优先使用令牌/语义色而非硬编码 hex
