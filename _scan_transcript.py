import json, re, sys

PATH = r"C:\Users\MY OWN AXIS\.claude\projects\C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas\45e7bc5a-4e0e-4eea-a952-6a3068d06a30.jsonl"
markers = re.compile(r"(EV-T\d|AG-T\d|AT-T\d|Ecovillage|Agritourism|T3\.8|T6\.5|Enterprise Mix)", re.I)

def text_of(rec):
    msg = rec.get("message") or {}
    content = msg.get("content")
    parts = []
    if isinstance(content, str):
        parts.append(content)
    elif isinstance(content, list):
        for b in content:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "text":
                parts.append(b.get("text", ""))
            elif b.get("type") == "tool_result":
                c = b.get("content")
                if isinstance(c, str):
                    parts.append(c)
                elif isinstance(c, list):
                    for cc in c:
                        if isinstance(cc, dict) and cc.get("type") == "text":
                            parts.append(cc.get("text", ""))
            elif b.get("type") == "tool_use":
                parts.append("[TOOL_USE " + str(b.get("name")) + "] " + json.dumps(b.get("input", {}))[:400])
    return "\n".join(parts)

rows = []
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
        t = text_of(rec)
        if markers.search(t):
            # count markers, note if EV-T / AG-T present (ref codes => granular catalogue)
            ev = len(re.findall(r"EV-T\d", t))
            ag = len(re.findall(r"(AG|AT)-T\d", t))
            eco = len(re.findall(r"Ecovillage", t, re.I))
            agri = len(re.findall(r"Agritourism", t, re.I))
            rows.append((i, role, ev, ag, eco, agri, len(t)))

print("idx  role            EV-T  AG/AT-T  Eco  Agri  len")
for r in rows:
    print(f"{r[0]:<5}{str(r[1]):<16}{r[2]:<6}{r[3]:<9}{r[4]:<5}{r[5]:<6}{r[6]}")
print("TOTAL matching records:", len(rows))
