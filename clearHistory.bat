git checkout --orphan clean_branch
git add -A
git commit -m "Initial commit: Clean repository history"
git branch -D main
git branch -m main
git push -f origin main