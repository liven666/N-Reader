#!/usr/bin/env python3
"""
N-Reader APK 自动下载脚本
需要: pip install requests
"""

import subprocess
import sys
import time
import zipfile
from pathlib import Path

REPO = "liven666/N-Reader"
WORKFLOW_NAME = "Build Android APK"
ARTIFACT_NAME = "n-reader-apk"


def print_green(text: str) -> None:
    print(f"\033[92m{text}\033[0m")


def print_yellow(text: str) -> None:
    print(f"\033[93m{text}\033[0m")


def print_red(text: str) -> None:
    print(f"\033[91m{text}\033[0m")


def check_gh_cli() -> bool:
    try:
        subprocess.run(
            ["gh", "--version"],
            capture_output=True,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def check_gh_auth() -> bool:
    try:
        subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True,
            check=True
        )
        return True
    except subprocess.CalledProcessError:
        return False


def get_latest_run_id() -> str | None:
    try:
        result = subprocess.run(
            [
                "gh", "run", "list",
                "--repo", REPO,
                "--workflow", WORKFLOW_NAME,
                "--limit", "1",
                "--json", "databaseId",
                "--jq", ".[0].databaseId"
            ],
            capture_output=True,
            text=True,
            check=True
        )
        run_id = result.stdout.strip()
        if run_id and run_id != "null":
            return run_id
        return None
    except subprocess.CalledProcessError:
        return None


def get_run_status(run_id: str) -> str:
    try:
        result = subprocess.run(
            [
                "gh", "run", "view", run_id,
                "--repo", REPO,
                "--json", "status",
                "--jq", ".status"
            ],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return "unknown"


def get_run_conclusion(run_id: str) -> str:
    try:
        result = subprocess.run(
            [
                "gh", "run", "view", run_id,
                "--repo", REPO,
                "--json", "conclusion",
                "--jq", ".conclusion"
            ],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return "unknown"


def download_artifact(run_id: str, output_dir: str = ".") -> Path | None:
    try:
        Path(output_dir).mkdir(exist_ok=True)
        subprocess.run(
            [
                "gh", "run", "download", run_id,
                "--repo", REPO,
                "--name", ARTIFACT_NAME,
                "--dir", output_dir
            ],
            check=True
        )
        return Path(output_dir) / f"{ARTIFACT_NAME}.zip"
    except subprocess.CalledProcessError:
        return None


def main() -> int:
    print_green("========================================")
    print_green("  N-Reader APK 自动下载工具")
    print_green("========================================")
    print()

    if not check_gh_cli():
        print_red("错误: 未找到 GitHub CLI (gh)")
        print("请先安装: https://cli.github.com/")
        return 1

    if not check_gh_auth():
        print_yellow("请先登录 GitHub:")
        try:
            subprocess.run(["gh", "auth", "login"], check=True)
        except subprocess.CalledProcessError:
            print_red("登录失败")
            return 1

    print()
    print_yellow("正在检查最新的工作流运行...")

    run_id = get_latest_run_id()
    if not run_id:
        print_red("未找到工作流运行")
        print(f"请先在 GitHub 上触发构建: https://github.com/{REPO}/actions")
        return 1

    print_green(f"找到工作流运行 ID: {run_id}")
    print()

    print_yellow("正在等待构建完成...")
    print("按 Ctrl+C 可以随时停止等待")
    print()

    try:
        while True:
            status = get_run_status(run_id)
            
            if status == "completed":
                break
            elif status in ["failure", "cancelled"]:
                print_red(f"构建 {status}! 请查看 GitHub Actions 日志")
                subprocess.run(["gh", "run", "view", run_id, "--repo", REPO])
                return 1
            
            print_yellow(f"当前状态: {status}... (每 10 秒检查一次)")
            time.sleep(10)
    except KeyboardInterrupt:
        print()
        print_yellow("已停止等待")
        return 130

    print()
    print_green("构建完成! 正在检查结果...")

    conclusion = get_run_conclusion(run_id)
    if conclusion != "success":
        print_red(f"构建失败! 结论: {conclusion}")
        subprocess.run(["gh", "run", "view", run_id, "--repo", REPO])
        return 1

    print_green("构建成功! 正在下载 APK...")

    output_dir = "."
    zip_path = download_artifact(run_id, output_dir)
    
    if not zip_path or not zip_path.exists():
        print_red("下载失败")
        return 1

    print()
    print_green("========================================")
    print_green("  APK 下载成功!")
    print_green("========================================")
    print()
    print(f"文件位置: {zip_path.absolute()}")
    print()
    print("解压命令:")
    print(f"  unzip {zip_path}")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
