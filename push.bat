@echo off
echo Dang cap nhat code len GitHub...
git add .
set /p msg="Nhap noi dung commit (An Enter de dung mac dinh): "
if "%msg%"=="" set msg="Cap nhat code nhanh"
git commit -m "%msg%"
git push origin main
echo Hoan tat! Code da duoc day len GitHub.
pause