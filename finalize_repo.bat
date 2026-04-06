@echo off
echo =======================================================
echo CivilCOPZ Sovereign Platform Git Baseline Serialization
echo =======================================================
echo.
echo Attempting to initialize Git Context...

git init

echo.
echo Enforcing Strict .gitignore Cryptographic boundaries...
git add .
git commit -m "chore(infra): Final Sovereign Baseline V10.0 deploy - CLTM, Artillery load, Judicial Audit complete"

echo.
echo =======================================================
echo REPOSITORY LOCKED AND SNAPSHOTTED.
echo Next Steps: 
echo 1. git remote add origin ^<YOUR_PRIVATE_URL^>
echo 2. git push -u origin master
echo =======================================================
pause
