#!/usr/bin/env sh
# 下載建置字表需要的原始資料到 raw/（這些檔案不進 git）
set -e
cd "$(dirname "$0")/../raw"
curl -fsSL -o mmah.txt https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt
curl -fsSL -o cedict.gz https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
curl -fsSL -o tsai.html https://technology.chtsai.org/charfreq/sorted.html
echo "raw/ 下載完成"
