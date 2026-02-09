# 生成管理器

基于 Electron + Vite + React + TypeScript 的桌面应用。

## 本地开发

环境要求：Node.js（建议 18+）

```bash
npm install
npm run dev
```

## 构建与打包

```bash
npm run lint
npm run typecheck
npm run test:shared
```

```bash
npm run build
```

构建输出：

- 渲染进程：`dist/`
- Electron 主进程/预加载：`dist-electron/`
- 安装包/产物：`release/<version>/`

## 上传到 GitHub（最常用流程）

1. 在 GitHub 新建一个空仓库（不要勾选添加 README / .gitignore）。
2. 在项目根目录执行：

```bash
git init
git add .
git commit -m "chore: init"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

如果你使用 HTTPS，GitHub 需要使用 Personal Access Token（PAT）替代密码。

## 文档怎么写（建议结构）

如果只写一个主文档，优先维护本 README：

- 项目是什么（1 句话）
- 主要功能（要点列表）
- 怎么跑起来（安装/开发/构建）
- 常见问题（FAQ）

如果文档会变多，放到 `docs/` 下，按主题拆分：

- `docs/usage/`：使用说明
- `docs/dev/`：开发与架构
- `docs/troubleshooting/`：排障记录
