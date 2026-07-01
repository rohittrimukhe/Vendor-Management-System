@echo off
if "%1"=="setup" (
  start "" "http://localhost:8080/setup"
) else (
  start "" "http://localhost:8080"
)
