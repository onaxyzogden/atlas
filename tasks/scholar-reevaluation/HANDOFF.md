# Scholar Re-evaluation — Auth Blocker & Handoff

**Status:** Phases 1–2 complete. Phase 3 blocked on NotebookLM
re-authentication.

## The blocker

`python C:/Temp/ask.py` failed on first call with:

```
ValueError: Authentication expired or invalid. Redirected to:
https://accounts.google.com/v3/signin/identifier?…
Run 'notebooklm login' to re-authenticate.
```

`~/.notebooklm/storage_state.json` was last refreshed 2026-04-28
(matches the original dialogue date). The Scholar notebook
(`5aa3dcf3-…`) lives on a separate Google account per the global
CLAUDE.md note:

> Source notebook is on a separate Google account from the project's
> primary NotebookLM auth. Set `NOTEBOOKLM_HOME` per-account or
> re-`notebooklm login` to switch.

## To unblock

Run **one** of the following on the Scholar-owning Google account:

```
notebooklm login
```

or, if the project NotebookLM auth (the BBOS/MAQASID account) is in
`~/.notebooklm/` and the Scholar lives elsewhere:

```
$env:NOTEBOOKLM_HOME = "C:\Users\MY OWN AXIS\.notebooklm-scholar"  # PowerShell
notebooklm login
```

Then verify with:

```
python C:/Temp/ask.py - - -   # any small test prompt
```

## Once re-auth lands

Fire the six calls in this order (R1.A first on both threads, then
R1.B, then R1.C — R1.B/C continued threads must re-use the
conversation ID returned by R1.A-continued for the Scholar to carry
frame).

From `atlas/tasks/scholar-reevaluation/`:

```bash
bash run-round.sh 1A fresh
bash run-round.sh 1A continued     # uses the 2026-04-28 conv ID

# Read output/r1A-continued.json, copy its conversation_id.
# If it differs from 48a34396-… (NotebookLM sometimes branches),
# re-use the new ID for B + C continued:

CONV_ID=$(jq -r .conversation_id output/r1A-continued.json)

bash run-round.sh 1B fresh
bash run-round.sh 1B "$CONV_ID"

bash run-round.sh 1C fresh
bash run-round.sh 1C "$CONV_ID"
```

Six JSON files will land in `output/`. Then resume the plan at
**Phase 4** (digest).

## What's ready offline

- `2026-05-13-round1-description.md` — canonical updated Atlas
  description block (~1100 words).
- `2026-05-13-round1A-reaudit.md` — Round 1.A prompt.
- `2026-05-13-round1B-gap-verification.md` — Round 1.B prompt.
- `2026-05-13-round1C-fresh-recs.md` — Round 1.C prompt.
- `run-round.sh` — wrapper that concatenates description + round
  prompt and invokes `ask.py`.
- This handoff doc.

Skeleton files for the digest, ADR, and conditional backlog-v2 are
**not** pre-written — they need the Scholar's actual answers to be
useful. Phase 4–6 commences once `output/r1*-{fresh,continued}.json`
exist.
