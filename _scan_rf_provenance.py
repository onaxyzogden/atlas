import json, re

PATH = r"C:\Users\MY OWN AXIS\.claude\projects\C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas\45e7bc5a-4e0e-4eea-a952-6a3068d06a30.jsonl"

# Distinctive strings that exist verbatim in the encoded regenFarm.ts.
needles = [
    "List all intended enterprises with a brief description",
    "Assign priority tier to each enterprise",
    "Survey existing land health",
    "waste-to-input matrix",
    "RF-T0.4",
]

def blocks(rec):
    msg = rec.get("message") or {}
    content = msg.get("content")
    out = []  # (kind, text)
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
                out.append(("tool_use:" + str(b.get("name")), json.dumps(b.get("input", {}))))
            elif ty == "tool_result":
                c = b.get("content")
                if isinstance(c, str):
                    out.append(("tool_result", c))
                elif isinstance(c, list):
                    for cc in c:
                        if isinstance(cc, dict) and cc.get("type") == "text":
                            out.append(("tool_result", cc.get("text", "")))
    return out

with open(PATH, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except Exception:
            continue
        role = rec.get("type") or (rec.get("message", {}) or {}).get("role")
        for kind, text in blocks(rec):
            for n in needles:
                if n in text:
                    print(f"idx={i} role={role} block={kind} needle={n!r} blocklen={len(text)}")
