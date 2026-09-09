@echo off
setlocal
cd /d "%~dp0"
title LUMEN - Les chemins oublies
set "LUMEN_PYTHON="

rem Prefer the known working bundled interpreter on this computer.
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
  set "LUMEN_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
  goto :launch
)

rem Validate commands: Windows may expose non-working Python aliases.
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 (
  set "LUMEN_PYTHON=python"
  goto :launch
)
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 goto :launch_py

echo Python 3.10 ou plus recent est necessaire.
echo Installez Python en cochant "Add Python to PATH", puis relancez ce fichier.
pause
exit /b 1

:launch
"%LUMEN_PYTHON%" "%~dp0start.py" %*
goto :finished

:launch_py
py -3 "%~dp0start.py" %*

:finished
set "LUMEN_EXIT=%ERRORLEVEL%"
if not "%LUMEN_EXIT%"=="0" pause
exit /b %LUMEN_EXIT%
