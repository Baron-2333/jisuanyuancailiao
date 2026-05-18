@echo off
chcp 65001 >nul
REM Minecraft 配方计算器 - 构建脚本 (Windows)

cd /d "%~dp0"

REM 读取版本号
for /f "tokens=3 delims=' " %%i in ('findstr /C:"VERSION = '" src\utils\version.ts') do set VERSION=%%i

REM 获取当前时间
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set YEAR=%%c
    set MONTH=%%a
    set DAY=%%b
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set HOUR=%%a
    set MINUTE=%%b
)
set BUILD_TIME=%YEAR%-%MONTH%-%DAY% %HOUR%:%MINUTE%

echo ==========================================
echo   Minecraft 配方计算器 - 构建脚本
echo ==========================================
echo   版本: %VERSION%
echo   时间: %BUILD_TIME%
echo ==========================================

echo.
echo [1/4] 安装依赖...
call npm install

echo.
echo [2/4] 构建项目...
call npm run build

if errorlevel 1 (
    echo.
    echo [构建失败]
    pause
    exit /b 1
)

echo.
echo [3/4] Git 提交...
git add -A
git commit -m "%VERSION%: 更新"

echo.
echo [4/4] 推送到 GitHub...
git push

echo.
echo ==========================================
echo   构建完成！
echo   版本: %VERSION%
echo ==========================================

pause
