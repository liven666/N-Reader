# APK 构建指南 - GitHub Actions

## 已配置的功能

✅ GitHub Actions 工作流已创建: `.github/workflows/build-apk.yml`

## 使用步骤

### 1. 推送代码到 GitHub

将项目推送到你的 GitHub 仓库：

```bash
git add .
git commit -m "Add GitHub Actions for APK building"
git push origin main
```

### 2. 触发构建

有三种方式可以触发 APK 构建：

#### 方式 A: 推送代码到 main/master 分支
每次推送到 main 或 master 分支时，会自动触发构建。

#### 方式 B: 提交 Pull Request
创建 Pull Request 时会自动触发构建。

#### 方式 C: 手动触发（推荐）
1. 访问你的 GitHub 仓库
2. 点击 **Actions** 标签页
3. 选择 **"Build Android APK"** 工作流
4. 点击 **"Run workflow"** 按钮
5. 选择分支，点击 **"Run workflow"**

### 3. 下载 APK

构建完成后：

1. 在 Actions 页面找到已完成的工作流
2. 滚动到页面底部的 **"Artifacts"** 部分
3. 点击 **"n-reader-apk"** 下载 ZIP 文件
4. 解压 ZIP 文件即可获得 `app-debug.apk`

## 工作流配置说明

工作流会自动执行以下步骤：

1. 检出代码
2. 设置 Node.js 20 环境
3. 安装 npm 依赖
4. 构建 React 应用
5. 同步到 Capacitor Android 项目
6. 设置 JDK 17
7. 构建 Debug APK
8. 上传 APK 作为 Artifact（保留 30 天）

## 文件说明

- `.github/workflows/build-apk.yml` - GitHub Actions 工作流配置
- `android/` - Capacitor Android 项目目录
- `dist/` - 构建后的 Web 应用（构建时生成）

## 注意事项

- 这是 Debug 版本的 APK，适合测试使用
- 如果需要 Release 版本，需要配置签名
- APK Artifacts 会在 GitHub 上保留 30 天
