@echo off
REM One-click wrapper (edit ONLY the variables below once).
REM Usage:
REM   1) Double-click this .bat
REM   2) It will run: clone system config + build app for the target client.

set FROM_SLUG=ten-spa
set TO_SLUG=shop-2
set WIPE=1

if "%WIPE%"=="1" (
  call npm run oneclick:client-config -- --fromSlug=%FROM_SLUG% --toSlug=%TO_SLUG% --wipe
) else (
  call npm run oneclick:client-config -- --fromSlug=%FROM_SLUG% --toSlug=%TO_SLUG%
)

