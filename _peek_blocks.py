import json

PATH = r"C:\Users\MY OWN AXIS\.claude\projects\C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas\45e7bc5a-4e0e-4eea-a952-6a3068d06a30.jsonl"
TARGETS = {773, 846, 855, 877}

def blocks(rec):
    msg = rec.get("message") or {}
    content = msg.get("content")
    out = []
    if isinstance(content, str):
        out.append(("text", content))
    elif isinstance(content, list):
        for b in content:
            if not isinstance(b, dict):
                continue
            ty = b.get("type")
            if ty == "text":
                out.append(("text", b.get("text", "")))
            elif ty == "tool_use":
                inp = b.get("input", {})
                fp = inp.get("file_path") or inp.get("path") or inp.get("pattern") or ""
                out.append(("tool_use:" + str(b.get("name")) + " " + str(fp), json.dumps(inp)[:600]))
            elif ty == "tool_result":
                c = b.get("content")
                s = ""
                if isinstance(c, str):
                    s = c
                elif isinstance(c, list):
                    s = "\n".join(cc.get("text", "") for cc in c if isinstance(cc, dict) and cc.get("type") == "text")
                out.append(("tool_result", s))
    return out

with open(PATH, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i not in TARGETS:
            continue
        rec = json.loads(line)
        role = rec.get("type") or (rec.get("message", {}) or {}).get("role")
        print("=" * 80)
        print(f"### idx={i} role={role}")
        for kind, text in blocks(rec):
            print(f"--- block[{kind}] len={len(text)} ---")
            print(text[:1400])
            print("...<truncated>..." if len(text) > 1400 else "")
