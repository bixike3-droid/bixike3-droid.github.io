# 夜樱庭院

bixike3-droid 的场景式个人网站。六个全屏空间通过点击切换：入口、庭院中央、作品展室、月下书桌、爱好与技能、庭院访客簿。每个空间使用独立插画，支持场景网址、浏览器前进后退、键盘导航及减少动态效果。

## 内容填写

当前个人介绍、作品、爱好与技能保留待填写位置。在 app/components/SceneGarden.tsx 中填写文字与项目内容，场景样式位于 app/components/scene-garden.css。插画记录与生成提示见 SCENE-ART.md。

## 留言

访客通过昵称和留言表单提交内容，留言保存在 Cloudflare D1 数据库。GET /api/guestbook 返回最近 50 封公开留言，POST /api/guestbook 保存一封信。默认先审核再展示；提交成功后会显示待审核提示。支持长度限制、来源校验、重复提交间隔和失败重试。网页以普通文字渲染留言。

主人登录后可在 /admin/guestbook 审核、公开、隐藏、删除或恢复留言，并切换新留言的展示方式。删除会移入回收站；恢复后回到待审核。管理权限在服务端与数据库中已绑定的庭院主人身份校验。管理列表支持分类、数量和分页，更新冲突会提示刷新。

## 本地预览

需要 Node.js 22.13 或更新版本。安装依赖后执行：

    node scripts/run-framework.mjs build
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_even_northstar.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_guest_messages.sql
    node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_guestbook_moderation.sql
    node scripts/run-framework.mjs dev

默认预览地址 http://localhost:5173。类型检查：node node_modules/typescript/bin/tsc --noEmit --incremental false。留言集成检查：node scripts/check-guestbook.mjs。审核与权限检查：node scripts/check-guestbook-moderation.mjs。检查仅连接本机，验证后清理创建的记录并恢复展示设置；请在本机没有同时编辑时运行。

## 发布

项目使用 Vinext 和 Cloudflare D1，留言功能需要服务端运行环境。Sites 负责部署与数据库迁移；GitHub 保存第一版源代码。访问范围沿用当前站点设置。

## 素材

场景图片位于 public/assets；网站图标与装饰由 SVG 绘制。字体使用本机中文宋体与黑体。浏览器只将动态偏好保存在本机，留言由数据库持久保存。
