@echo off
echo Clearing Vite cache and optimizing startup...
cd /d "%~dp0"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist "dist" rmdir /s /q "dist"
echo Cache cleared!
echo Starting development server...
npm run dev