@echo off
cd /d "%~dp0..\apps\web"
node node_modules\vite\bin\vite.js --host --port 5173
