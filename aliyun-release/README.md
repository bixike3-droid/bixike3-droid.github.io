# 阿里云独立运行版本

域名：sakura.baodaoxiaoyuan.cn。适配上海轻量服务器、Alibaba Cloud Linux 4、Node.js 22.18 及以上版本。

网站使用 React 静态构建、Node.js HTTP 后端和 SQLite。六个场景与留言管理沿用主项目组件。后台使用独立主人账号，密码经 scrypt 哈希后保存；会话使用 HttpOnly、SameSite=Strict Cookie。管理接口核验登录与请求来源，新留言默认审核后公开。

## 本机验证

在主项目目录运行：

    node aliyun/build.mjs
    node aliyun/test.mjs

临时预览时设置 SAKURA_ORIGIN=http://localhost:3210、SAKURA_DATA_DIR 为独立测试目录，再运行 node aliyun/server.mjs。不要把测试初始化码或账号用于生产。

## 服务器准备

构建输出和 server.mjs 打包在仓库 aliyun-release 中，服务器无需安装项目依赖或重新构建页面。运行 aliyun-release/deploy/stage.sh 会安装 Nginx、独立 Certbot 环境和专用服务账号，并放好服务配置。此步骤不启动应用、网关或定时器。

公网启用前核实阿里云防火墙允许 TCP 80/443，完成发布与证书订户协议确认，再运行：

    /opt/sakura-garden/activate.sh --approved-publication-and-acme-terms

应用仅监听 127.0.0.1:3210，Nginx 提供 HTTPS。数据库在 /var/lib/sakura-garden/garden.sqlite，自动备份位于该目录的 backups 子目录。

## 首次主人设置

服务器首次启动应用后，初始化码保存在 /var/lib/sakura-garden/setup-code，文件仅允许服务账号与服务器管理员读取。主人自行在服务器终端读取初始化码，打开 https://sakura.baodaoxiaoyuan.cn/setup，输入初始化码并设置用户名和密码。设置完成后初始化码失效，使用 /login 登录，留言管理位于 /admin/guestbook。

初始化码、密码、数据库和备份都不进入 GitHub。页面不会自动展示初始化码。既有留言与展示设置需在启用前完成导出与导入核对。
