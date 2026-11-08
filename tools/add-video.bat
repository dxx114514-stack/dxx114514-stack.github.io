@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0.."

where python >nul 2>nul
if errorlevel 1 (
  echo 未找到 Python，请先安装 Python 3 并加入 PATH。
  pause
  exit /b 1
)

python "%~dp0video.py" %*
if "%~1"=="" pause
