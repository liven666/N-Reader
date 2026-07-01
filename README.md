# N-Reader

N-Reader 是一个面向移动端体验重构的 NGA 阅读器，目标是把常用的浏览、关注、消息、签到和回复流程做成更顺手的安装版 App，同时保留本地 Web 预览能力，方便快速调试。

当前支持两种运行形态：

- Web 本地预览：通过 `server.ts` 的本地代理访问 NGA，用于开发和桌面调试。
- Android 安装版：通过 Capacitor 打包，App 内原生网络层直连 NGA，不依赖自建业务服务器。

## 功能

- UID/CID 登录凭证保存，仅保存在本机。
- 板块列表、帖子列表、帖子详情和楼层翻页。
- 关注、消息、签到、回复等常用论坛操作。
- NGA BBCode 与 AC 娘表情解析展示，回复时可插入常用表情。
- App 内部浏览器打开 NGA 链接，减少跳出外部浏览器的打断。

## 架构

前端仍然只调用 `src/services/ngaApi.ts`。这个入口会自动选择网络通道：

- 浏览器环境：调用 `/api/nga`，由本地 Express 代理处理 Cookie、GBK、跳转和 NGA 输出解析。
- Android App：调用 `NgaHttpPlugin`，由 Android 原生代码直接请求 NGA、携带 Cookie、处理 GBK 编解码和跳转。

这样保留了网页开发效率，同时让安装版 App 可以纯客户端运行。

## 本地开发

本项目使用 pnpm。

```bash
pnpm install
pnpm run dev
```

打开：

```text
http://localhost:3000
```

网页预览仍需要本地代理服务，不能直接静态打开。

## Android 安装版

同步 Android 工程：

```bash
pnpm run mobile:sync
```

用 Android Studio 打开：

```bash
pnpm run mobile:open
```

构建 debug APK：

```bash
pnpm run android:debug
```

输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

构建 APK 需要本机安装 JDK 和 Android SDK。推荐直接安装 Android Studio，然后让它管理 JDK、SDK、模拟器和签名配置。

## 登录

NGA 官方限制第三方客户端直接登录流程。当前需要手动填入：

- `ngaPassportUid`
- `ngaPassportCid`

Android 安装版会把这两个值保存在本机，并由 App 直连 NGA 使用；不会发送到自建服务器。
