import json, subprocess, sys, os
os.environ["PYTHONIOENCODING"] = "utf-8"
q = sys.argv[1]
r = subprocess.run(
    ["python", "-m", "notebooklm", "ask", q, "--json"],
    capture_output=True, text=True, encoding="utf-8",
)
if r.returncode != 0:
    sys.stderr.write(r.stderr)
    sys.exit(r.returncode)
data = json.loads(r.stdout)
print("=== ANSWER ===")
print(data.get("answer", ""))
print()
print("=== REFS (deduped by source_id) ===")
seen = {}
for ref in data.get("references", []):
    sid = ref["source_id"]
    seen.setdefault(sid, []).append(ref["citation_number"])
for sid, nums in seen.items():
    print(f"- {sid[:8]}: citations {nums[:6]}{'...' if len(nums) > 6 else ''}")
