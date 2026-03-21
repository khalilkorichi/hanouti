@echo off
title Hanouti System Launcher
color 0A

echo ===================================================
echo           Starting Hanouti POS System
echo ===================================================
echo.

:: 1. Start Backend Server
echo [1/3] Starting Backend Server...
start "Hanouti Backend API" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: 2. Start Frontend Server
echo [2/3] Starting Frontend Interface...
start "Hanouti Frontend UI" cmd /k "cd frontend && npm run dev"

:: 3. Wait and Open Browser
echo [3/3] Waiting for servers to initialize...
timeout /t 8 /nobreak >nul

echo.
echo Opening application in your default browser...
start http://localhost:5173

echo.
echo ===================================================
echo      System is Running Successfully!
echo ===================================================
echo.
echo * Keep the two black windows open while using the program.
echo * To stop the program, close all windows.
echo.
pause
