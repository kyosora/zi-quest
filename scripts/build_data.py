"""
建置 public/data/chars.json：常用繁體字 3500 字的學習資料。

來源（raw/ 底下）：
  tsai.html  蔡志浩繁體中文字頻表（Big5 語料）
  mmah.txt   Make Me a Hanzi dictionary.txt（字形拆解、聲旁、義符）
  cedict.gz  CC-CEDICT（繁體詞條與拼音）
另外用 wordfreq 的中文詞頻來排序例詞、校正字頻。

用法：python scripts/build_data.py
"""

import gzip
import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from opencc import OpenCC
from wordfreq import get_frequency_dict, top_n_list

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "public" / "data" / "chars.json"

TOP_N = 3500
MAX_WORDS = 4
MIN_WORD_FREQ = 3e-7
MAX_SIMILAR = 8
IDS_OPERATORS = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻？")

# 義符的口語提示：只寫常見、對讀字真的有幫助的
SEMANTIC_HINTS = {
    "氵": "水", "水": "水", "扌": "手", "手": "手", "亻": "人", "人": "人",
    "忄": "心", "心": "心", "口": "嘴巴", "目": "眼睛", "木": "樹木", "艹": "草",
    "言": "說話", "訁": "說話", "糸": "線", "糹": "線", "金": "金屬", "釒": "金屬",
    "足": "腳", "⻊": "腳", "辶": "走路", "⻌": "走路", "彳": "走路", "宀": "房子",
    "广": "房子", "日": "太陽", "月": "身體／月亮", "女": "女生", "土": "土地",
    "火": "火", "灬": "火", "雨": "天氣", "食": "吃", "飠": "吃", "衣": "衣服",
    "衤": "衣服", "示": "祭拜", "礻": "祭拜", "竹": "竹子", "⺮": "竹子",
    "貝": "錢", "車": "車", "馬": "馬", "魚": "魚", "鳥": "鳥", "虫": "蟲",
    "犬": "動物", "犭": "動物", "石": "石頭", "山": "山", "疒": "生病",
    "刀": "刀", "刂": "刀", "力": "力氣", "王": "玉石", "玉": "玉石", "門": "門",
    "頁": "頭", "耳": "耳朵", "米": "米", "酉": "酒", "肉": "身體", "走": "走路",
    "雨": "天氣", "阝": "地方", "邑": "地方", "阜": "地方", "禾": "稻米",
    "田": "田地", "網": "網子", "皿": "器皿", "欠": "張嘴", "歹": "死亡",
    "攵": "動作", "攴": "動作", "髟": "頭髮", "骨": "骨頭", "牛": "牛", "羊": "羊",
    "舟": "船", "弓": "弓", "矢": "箭", "戈": "武器", "冫": "冰", "穴": "洞",
    "厂": "山崖", "巾": "布", "革": "皮革", "鬼": "鬼", "風": "風", "口": "嘴巴",
}


def parse_tsai(path):
    text = re.sub(r"<[^>]+>", " ", path.read_text(encoding="utf-8"))
    rows = {}
    for m in re.finditer(r"^\s*(\S)\s+(\d+)\s+(\d+)\s*$", text, re.M):
        ch, freq, strokes = m.group(1), int(m.group(2)), int(m.group(3))
        if "一" <= ch <= "鿿" and ch not in rows:
            rows[ch] = (freq, strokes)
    if len(rows) < 5000:
        sys.exit(f"字頻表只解析到 {len(rows)} 字，tsai.html 格式可能變了")
    return rows


def parse_mmah(path):
    rows = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            entry = json.loads(line)
            rows[entry["character"]] = entry
    return rows


def normalize_pinyin(syllable):
    return syllable.lower().replace("u:", "v")


VARIANT_DEF = re.compile(r"^(old |Japanese |archaic |erroneous )?variant of|^used in ")


def is_variant_entry(defs):
    """所有釋義都只是「某字的異體」才算異體字條目；妳 有自己的意思，不算。"""
    return all(VARIANT_DEF.search(d.strip()) for d in defs.split("/") if d.strip())


def parse_cedict(path):
    """回傳 ({繁體詞: (簡體詞, [拼音音節])}, 只有異體字條目的單字集合)。
    同詞多讀音時保留第一個正式讀音。"""
    words = {}
    line_re = re.compile(r"^(\S+) (\S+) \[([^\]]+)\] /(.*)/$")
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            m = line_re.match(line.strip())
            if not m:
                continue
            trad, simp, pinyin, defs = m.groups()
            syllables = [normalize_pinyin(s) for s in pinyin.split()]
            if len(syllables) != len(trad) or pinyin[:1].isupper():
                continue  # 拼音大寫開頭是專有名詞或姓氏讀音
            is_variant = is_variant_entry(defs)
            # 先出現的正式讀音優先；異體字條目只在沒有別的讀音時才用
            if trad not in words or (words[trad][2] and not is_variant):
                words[trad] = (simp, syllables, is_variant)
    variants = {k for k, v in words.items() if len(k) == 1 and v[2]}
    return {k: (v[0], v[1]) for k, v in words.items()}, variants


def rank_chars(tsai, wf, cedict):
    """蔡志浩字頻偏網路語料（「資」「交」排很前面），和 wordfreq 取對數平均。
    wordfreq 的 key 是簡體字，繁體字要先經 CEDICT 轉成簡體才查得到。
    本身就是別字簡體形的字（后、机、与）在 wordfreq 裡頻率是借來的，只信蔡志浩。"""
    total = sum(f for f, _ in tsai.values())
    borrowed = {simp for trad, (simp, _) in cedict.items() if simp != trad and len(simp) == 1}
    scored = []
    for ch, (freq, _) in tsai.items():
        simp = cedict[ch][0] if ch in cedict else ch
        wf_freq = freq / total if simp in borrowed and simp == ch else wf.get(simp, 1e-9)
        scored.append((math.log(freq / total) + math.log(wf_freq), ch))
    scored.sort(reverse=True)
    return [ch for _, ch in scored]


def flatten_ids(decomposition):
    return [c for c in (decomposition or "") if c not in IDS_OPERATORS]


def toneless(pinyin):
    return re.sub(r"\d", "", pinyin)


def pick_words(ch, words_by_char, wf, top_set):
    candidates = []
    for trad, (simp, syllables) in words_by_char.get(ch, []):
        freq = wf.get(simp, 0.0)
        if freq < MIN_WORD_FREQ:
            continue
        # 例詞裡的其他字最好也是常用字，學的人才念得出整個詞
        others_common = all(c in top_set for c in trad)
        candidates.append((others_common, freq, trad, syllables))
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    picked = []
    for _, _, trad, syllables in candidates:
        if len(picked) >= MAX_WORDS:
            break
        picked.append([trad, " ".join(syllables)])
    return picked


def char_reading(ch, words, cedict):
    """以例詞裡最常出現的讀音當主要讀音，沒有例詞時退回字典單字讀音。"""
    readings = Counter()
    for word, pinyin in words:
        syllables = pinyin.split()
        if not syllables:
            continue
        for i, c in enumerate(word):
            if c == ch:
                readings[syllables[i]] += 1
    own = cedict[ch][1][0] if ch in cedict else ""
    if not readings:
        return own
    best = readings.most_common(1)[0][0]
    if not best.endswith("5"):
        return best
    # 輕聲只是詞裡的弱讀：「眼睛」的睛要教 jing1；「的」本身就念 de5，保留
    same_base = [r for r in list(readings) + [own] if r and toneless(r) == toneless(best) and not r.endswith("5")]
    return same_base[0] if same_base else best


def wordfreq_words(chars_needing, wf):
    """CEDICT 沒收的常用組合（很多、您好）從 wordfreq 詞表補，簡體轉台灣繁體。"""
    s2tw = OpenCC("s2tw")
    found = defaultdict(list)
    for simp in top_n_list("zh", 200000):
        if not 2 <= len(simp) <= 3:
            continue
        trad = s2tw.convert(simp)
        for c in set(trad) & chars_needing:
            if len(found[c]) < MAX_WORDS:
                found[c].append([trad, ""])
    return found


def similarity(a, b):
    score = 0
    if a["ph"] and a["ph"] == b["ph"]:
        score += 3
    if a["c"] == b["ph"] or b["c"] == a["ph"]:
        score += 3
    shared = set(a["parts"]) & set(b["parts"])
    score += len(shared)
    if a["rad"] and a["rad"] == b["rad"]:
        score += 1
    if abs(a["st"] - b["st"]) <= 2:
        score += 1
    return score


def build_similar(entries):
    by_part = defaultdict(set)
    for e in entries:
        for p in set(e["parts"]) | {e["ph"], e["c"]}:
            if p:
                by_part[p].add(e["c"])
    index = {e["c"]: e for e in entries}
    for e in entries:
        pool = set()
        for p in set(e["parts"]) | {e["ph"], e["c"]}:
            pool |= by_part.get(p, set())
        pool.discard(e["c"])
        scored = []
        for other_c in pool:
            other = index[other_c]
            # 讀音一樣的字當干擾選項，聽音題就分不出對錯
            if toneless(other["py"]) == toneless(e["py"]):
                continue
            s = similarity(e, other)
            if s >= 2:
                rank_gap = abs(e["r"] - other["r"]) / TOP_N
                scored.append((s - rank_gap, other_c))
        scored.sort(reverse=True)
        e["sim"] = [c for _, c in scored[:MAX_SIMILAR]]


def main():
    tsai = parse_tsai(RAW / "tsai.html")
    mmah = parse_mmah(RAW / "mmah.txt")
    cedict, variants = parse_cedict(RAW / "cedict.gz")
    wf = get_frequency_dict("zh")
    borrowed = {simp for trad, (simp, _) in cedict.items() if simp != trad and len(simp) == 1}

    ranked = [ch for ch in rank_chars(tsai, wf, cedict)
              if (ch in cedict or ch in mmah) and ch not in variants]
    # 多抓一些候選，後面剔除沒有例詞的簡體／異體字後再補滿 TOP_N
    candidates = ranked[:TOP_N + 300]
    top_set = set(candidates)

    words_by_char = defaultdict(list)
    for trad, value in cedict.items():
        if 2 <= len(trad) <= 3:
            for c in set(trad):
                if c in top_set:
                    words_by_char[c].append((trad, value))

    picked = {ch: pick_words(ch, words_by_char, wf, top_set) for ch in candidates}
    extra = wordfreq_words({ch for ch, w in picked.items() if len(w) < 2}, wf)
    for ch in candidates:
        known = {w for w, _ in picked[ch]}
        picked[ch] = (picked[ch] + [w for w in extra.get(ch, []) if w[0] not in known])[:MAX_WORDS]

    # 沒有任何例詞又是別字的簡體形（机、体），台灣不會這樣寫，剔除
    top = [ch for ch in candidates if picked[ch] or ch not in borrowed][:TOP_N]

    entries = []
    for rank, ch in enumerate(top, start=1):
        info = mmah.get(ch, {})
        ety = info.get("etymology") or {}
        # 嗯、喔、牠這類字本身就是一個詞，直接念單字
        words = picked[ch] or [[ch, ""]]
        phonetic = ety.get("phonetic", "") if ety.get("type") == "pictophonetic" else ""
        semantic = ety.get("semantic", "") if ety.get("type") == "pictophonetic" else ""
        entries.append({
            "c": ch,
            "r": rank,
            "py": char_reading(ch, words, cedict),
            "st": tsai[ch][1],
            "w": words,
            "ph": phonetic,
            "se": semantic,
            "hint": SEMANTIC_HINTS.get(semantic, ""),
            "rad": info.get("radical", ""),
            "parts": flatten_ids(info.get("decomposition")),
        })

    build_similar(entries)

    no_words = sum(1 for e in entries if not e["w"])
    no_sim = sum(1 for e in entries if len(e["sim"]) < 3)
    print(f"字數 {len(entries)}；沒有例詞 {no_words}；相似字少於 3 個 {no_sim}")

    for e in entries:
        del e["rad"]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(entries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"已寫入 {OUT}（{OUT.stat().st_size // 1024} KB）")


if __name__ == "__main__":
    main()
