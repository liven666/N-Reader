# APK 自动下载指南

本项目提供了两个自动化脚本来等待 GitHub Actions 构建完成并自动下载 APK。

## 前置要求

### 1. 安装 GitHub CLI (gh)

**macOS:**
```bash
brew install gh
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install gh

# Fedora
sudo dnf install gh
```

**Windows:**
```powershell
winget install GitHub.cli
```

### 2. 登录 GitHub

```bash
gh auth login
```

按照提示完成登录。

---

## 脚本一：Shell 脚本 (download-apk.sh)

### 使用方法

```bash
# 赋予执行权限（如果还没有）
chmod +x download-apk.sh

# 运行脚本
./download-apk.sh
```

### 功能

- 自动检测最新的 GitHub Actions 工作流运行
- 实时监控构建状态
- 构建成功后自动下载 APK
- 彩色输出，友好的用户界面

### 依赖

- GitHub CLI (gh)
- jq (JSON 解析工具)

**安装 jq:**
```bash
# macOS
brew install jq

# Linux
sudo apt install jq  # Ubuntu/Debian
sudo dnf install jq  # Fedora
```

---

## 脚本二：Python 脚本 (download_apk.py)

### 使用方法

```bash
# 赋予执行权限（可选）
chmod +x download_apk.py

# 运行脚本
python3 download_apk.py

# 或者
./download_apk.py
```

### 功能

- 自动检测最新的 GitHub Actions 工作流运行
- 实时监控构建状态
- 构建成功后自动下载 APK
- 彩色输出，友好的用户界面
- 更好的跨平台兼容性

### 依赖

- GitHub CLI (gh)
- Python 3.6+

---

## 使用流程

### 完整步骤

1. **在 GitHub 上触发构建**
   - 访问你的仓库: https://github.com/liven666/N-Reader
   - 点击 **Actions** 标签
   - 选择 **"Build Android APK"** 工作流
   - 点击 **"Run workflow"** 按钮
   - 选择分支，点击绿色的 **"Run workflow"**

2. **运行下载脚本**
   ```bash
   # 使用 Shell 脚本
   ./download-apk.sh
   
   # 或者使用 Python 脚本
   python3 download_apk.py
   ```

3. **等待构建完成**
   - 脚本会自动等待构建完成
   - 每 10 秒检查一次状态
   - 可以随时按 Ctrl+C 停止

4. **下载并解压**
   - 构建成功后自动下载
   - 文件会保存为 `n-reader-apk.zip`
   - 解压即可获得 APK:
     ```bash
     unzip n-reader-apk.zip
     ```

---

## 故障排除

### 问题：`gh: command not found`

**解决：** 安装 GitHub CLI
```bash
# macOS
brew install gh

# Linux
sudo apt install gh
```

### 问题：未认证

**解决：** 登录 GitHub
```bash
gh auth login
```

### 问题：未找到工作流运行

**解决：** 先在 GitHub 上手动触发一次构建，然后再运行脚本。

### 问题：构建失败

**解决：** 查看 GitHub Actions 日志了解详细错误信息。

---

## 快捷命令

```bash
# 一键触发构建并下载（需要先手动在 GitHub 触发）
./download-apk.sh

# 或者
python3 download_apk.py
```
