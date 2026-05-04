"""Strip dead shell/rail CSS rules from atlas-ui/src/styles.css.

A 'rule' is a brace-balanced block whose selector contains any of the dead
tokens. @media blocks are walked recursively: their inner rules are scrubbed,
and the @media itself is dropped if it ends up empty.
"""
import re
import sys
from pathlib import Path

DEAD = {
    "olos-shell",
    "side-rail",
    "swot-suite-shell", "swot-suite-rail", "swot-suite-logo",
    "swot-analysis-subnav", "swot-user-card",
    "terralens-shell", "terralens-rail", "terralens-logo",
    "terralens-project", "terralens-utility", "terralens-collapse",
    "verdean-shell", "verdean-rail", "verdean-logo", "verdean-project",
    "verdean-main-nav", "verdean-subnav", "verdean-user",
}
DEAD_RE = re.compile(r"\.(?:" + "|".join(re.escape(t) for t in DEAD) + r")\b")


def find_block_end(src, start):
    """Given index of '{', return index just after matching '}'."""
    depth = 0
    i = start
    while i < len(src):
        c = src[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError("unbalanced braces")


def selector_is_dead(selector):
    return bool(DEAD_RE.search(selector))


def scrub(src):
    """Walk top-level rules; drop dead ones; recurse into @media."""
    out = []
    i = 0
    n = len(src)
    while i < n:
        # Find next '{'
        brace = src.find("{", i)
        if brace == -1:
            out.append(src[i:])
            break
        selector = src[i:brace]
        end = find_block_end(src, brace)
        body = src[brace + 1:end - 1]

        sel_stripped = selector.strip()
        if sel_stripped.startswith("@media") or sel_stripped.startswith("@supports"):
            new_body = scrub(body)
            if new_body.strip():
                out.append(selector + "{" + new_body + "}")
            # else: drop empty @media (and the leading whitespace before it)
            else:
                # Trim trailing whitespace from accumulated output
                # to avoid leaving a blank gap.
                while out and out[-1].endswith("\n\n"):
                    out[-1] = out[-1].rstrip() + "\n"
        elif selector_is_dead(selector):
            pass  # drop
        else:
            out.append(selector + "{" + body + "}")
        i = end
    return "".join(out)


def main():
    p = Path(sys.argv[1])
    original = p.read_text(encoding="utf-8")
    new = scrub(original)
    # Collapse 3+ blank lines to 2
    new = re.sub(r"\n{3,}", "\n\n", new)
    p.write_text(new, encoding="utf-8")
    print(f"before: {len(original)} chars / {original.count(chr(10))} lines")
    print(f"after:  {len(new)} chars / {new.count(chr(10))} lines")
    print(f"removed: {len(original) - len(new)} chars / {original.count(chr(10)) - new.count(chr(10))} lines")


if __name__ == "__main__":
    main()
