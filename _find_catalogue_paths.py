import json, re

PATH = r"C:\Users\MY OWN AXIS\.claude\projects\C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas\45e7bc5a-4e0e-4eea-a952-6a3068d06a30.jsonl"
rx = re.compile(r"(Apricot|Objective Catalogue|Regenerative Farm|Ecovillage|Agritourism|Intentional Community|catalogue|\.docx|_dump)", re.I)

def iter_tooluse(rec):
    msg = rec.get("message") or {}
    content = msg.get("content")
    if isinstance(content, list):
        for b in content:
            if isinstance(b, dict) and b.get("type") == "tool_use":
                yield b.get("name"), b.get("input", {})

with open(PATH, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except Exception:
            continue
        for name, inp in iter_tooluse(rec):
            fp = inp.get("file_path") or inp.get("path") or ""
            cmd = inp.get("command") or ""
            pat = inp.get("pattern") or ""
            blob = " ".join(str(x) for x in [fp, cmd, pat])
            if name in ("Read", "Glob", "Bash", "Grep") and rx.search(blob):
                short = blob if len(blob) < 240 else blob[:240] + "..."
                print(f"idx={i} {name}: {short}")
