#!/bin/bash

# N-Reader APK 自动下载脚本
# 需要安装: gh (GitHub CLI), jq

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO="liven666/N-Reader"
WORKFLOW_NAME="Build Android APK"
ARTIFACT_NAME="n-reader-apk"
OUTPUT_DIR="."

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  N-Reader APK 自动下载工具${NC}"
echo -e "${GREEN}========================================${NC}"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}错误: 未找到 GitHub CLI (gh)${NC}"
    echo "请先安装: https://cli.github.com/"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}错误: 未找到 jq${NC}"
    echo "请先安装: brew install jq 或 sudo apt install jq"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}请先登录 GitHub:${NC}"
    gh auth login
fi

echo ""
echo -e "${YELLOW}正在检查最新的工作流运行...${NC}"

RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW_NAME" --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" == "null" ]; then
    echo -e "${RED}未找到工作流运行${NC}"
    echo "请先在 GitHub 上触发构建: https://github.com/$REPO/actions"
    exit 1
fi

echo -e "${GREEN}找到工作流运行 ID: $RUN_ID${NC}"

echo ""
echo -e "${YELLOW}正在等待构建完成...${NC}"
echo "按 Ctrl+C 可以随时停止等待"

while true; do
    STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq '.status')
    
    if [ "$STATUS" == "completed" ]; then
        break
    elif [ "$STATUS" == "failure" ] || [ "$STATUS" == "cancelled" ]; then
        echo -e "${RED}构建 $STATUS! 请查看 GitHub Actions 日志${NC}"
        gh run view "$RUN_ID" --repo "$REPO"
        exit 1
    fi
    
    echo -e "${YELLOW}当前状态: $STATUS... (每 10 秒检查一次)${NC}"
    sleep 10
done

echo ""
echo -e "${GREEN}构建完成! 正在检查结果...${NC}"

CONCLUSION=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq '.conclusion')

if [ "$CONCLUSION" != "success" ]; then
    echo -e "${RED}构建失败! 结论: $CONCLUSION${NC}"
    gh run view "$RUN_ID" --repo "$REPO"
    exit 1
fi

echo -e "${GREEN}构建成功! 正在下载 APK...${NC}"

mkdir -p "$OUTPUT_DIR"

gh run download "$RUN_ID" --repo "$REPO" --name "$ARTIFACT_NAME" --dir "$OUTPUT_DIR"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  APK 下载成功!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "文件位置: $OUTPUT_DIR/$ARTIFACT_NAME.zip"
echo ""
echo "解压命令: unzip $OUTPUT_DIR/$ARTIFACT_NAME.zip"
echo ""
