yamato-portal で staging の内容をコピペして bpに保存したいとき、staging にいる状態から
git checkout bp
git merge staging
Vim がでたら escキーのあとに:wqでエンター
git push origin bp
git checkout staging


api で main の内容をコピペして bpに保存したいとき、main にいる状態から
git checkout bp
git merge main
git push origin bp
git checkout main


ToolPageWrapper.tsx でつつまれたページはDataErrorState.tsxも有効になる。　20261106