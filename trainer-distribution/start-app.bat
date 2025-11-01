@echo off
echo Starting Skill Lab Web App...
echo.
echo Installing dependencies (first time only)...
call npm install express
echo.
echo Starting the application...
echo.
echo The app will open at: http://localhost:3000
echo Login: admin / admin123
echo.
echo Press Ctrl+C to stop the server
echo.
call npm start
pause
