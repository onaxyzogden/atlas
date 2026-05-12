"""Map every observe-port.css class to its real consumer .tsx files.

Tightened audit: only counts class names that appear inside JSX
`className=` attributes (including template literals and clsx/cn
call args). Ignores raw string tokens elsewhere in source — those
were false positives in the earlier version (ICON_MAP keys, store
prop names, content text, etc.).

Output:
  - Defined / referenced / orphan counts.
  - Per-Observe-module list of distinct real classes consumed.
  - Per-class list of consuming files (so the migration step can
    locate every rewrite point).
"""
import os
import re
from collections import defaultdict

ROOT = 'apps/web/src'
CSS_FILE = 'apps/web/src/v3/observe/styles/observe-port.css'

CLASS_TOKEN_RE = re.compile(r'[a-zA-Z_][a-zA-Z0-9_-]*')

# Capture the RHS of className= in JSX. Two shapes:
#   className="literal"           or  className='literal'
#   className={ ...expr... }      (may contain template strings, ternaries)
# We capture the literal form directly; for the brace form we recurse
# into the contents and pull every quoted-string slice we find.
CLASSNAME_ATTR_RE = re.compile(
    r'className\s*=\s*(?:'
    r'"([^"]*)"'        # group 1: double-quoted literal
    r"|'([^']*)'"       # group 2: single-quoted literal
    r'|\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'  # group 3: brace expr (one level of nested braces)
    r')'
)

# Inside a brace expression, find every quoted/backtick string slice.
# Inside backtick template literals, drop ${...} sections (those are
# CSS-module identifier refs, not class-name literals).
STRING_LITERAL_RE = re.compile(
    r'"([^"]*)"'
    r"|'([^']*)'"
    r'|`([^`]*)`'
)
TEMPLATE_EXPR_RE = re.compile(r'\$\{[^}]*\}')

# clsx(...) / classnames(...) / cn(...) call arg scanning. Same shape:
# extract every quoted string inside the call's paren block.
CLSX_CALL_RE = re.compile(
    r'\b(?:clsx|classnames|cn)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)'
)


def extract_css_classes(path: str) -> set[str]:
    with open(path, 'rb') as fh:
        text = fh.read().decode('utf-8')
    return set(re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', text))


def tokens_from_text(text: str) -> set[str]:
    """Whitespace-split classname text into bare identifier tokens."""
    out = set()
    for m in CLASS_TOKEN_RE.finditer(text):
        out.add(m.group(0))
    return out


def extract_string_slices_dropping_template_exprs(expr: str) -> list[str]:
    """Inside a className={...} or clsx(...) expression, pull every
    quoted-string slice. For backtick templates, strip ${...} blocks
    first so identifiers like `styles.foo` don't get counted."""
    slices: list[str] = []
    for m in STRING_LITERAL_RE.finditer(expr):
        s = m.group(1) or m.group(2) or m.group(3) or ''
        if m.group(3) is not None:  # backtick
            s = TEMPLATE_EXPR_RE.sub(' ', s)
        slices.append(s)
    return slices


def classes_in_file(text: str) -> set[str]:
    found: set[str] = set()
    # className=... attributes
    for m in CLASSNAME_ATTR_RE.finditer(text):
        literal_dq, literal_sq, brace = m.group(1), m.group(2), m.group(3)
        if literal_dq is not None:
            found |= tokens_from_text(literal_dq)
        elif literal_sq is not None:
            found |= tokens_from_text(literal_sq)
        elif brace is not None:
            for s in extract_string_slices_dropping_template_exprs(brace):
                found |= tokens_from_text(s)
    # clsx/classnames/cn(...) calls
    for m in CLSX_CALL_RE.finditer(text):
        for s in extract_string_slices_dropping_template_exprs(m.group(1)):
            found |= tokens_from_text(s)
    return found


def scan(root: str, exclude: str, defined: set[str]):
    exclude_norm = os.path.normpath(exclude)
    by_class: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            full = os.path.normpath(os.path.join(dirpath, fn))
            if full == exclude_norm:
                continue
            if not fn.endswith(('.tsx', '.jsx', '.ts', '.js')):
                continue
            try:
                with open(full, 'rb') as fh:
                    text = fh.read().decode('utf-8', errors='replace')
            except Exception:
                continue
            for cls in classes_in_file(text):
                if cls in defined:
                    by_class[cls][full] += 1
    return by_class


def main():
    defined = extract_css_classes(CSS_FILE)
    by_class = scan(ROOT, CSS_FILE, defined)
    consumed = sorted(by_class.keys())
    print(f'Defined in observe-port.css:  {len(defined)}')
    print(f'Real consumers (className=):   {len(consumed)}')
    print(f'Orphan (no real consumer):     {len(defined) - len(consumed)}')
    print()

    per_module: dict[str, dict[str, list[str]]] = defaultdict(
        lambda: defaultdict(list)
    )
    other: dict[str, list[str]] = defaultdict(list)
    for cls, files in by_class.items():
        for f in files:
            f_norm = f.replace('\\', '/')
            marker = '/v3/observe/modules/'
            if marker in f_norm:
                rest = f_norm.split(marker, 1)[1]
                module = rest.split('/', 1)[0]
                per_module[module][cls].append(f_norm)
            else:
                other[cls].append(f_norm)

    print('=== Per Observe module ===')
    for module in sorted(per_module.keys()):
        classes = sorted(per_module[module].keys())
        print(f'\n[{module}]  {len(classes)} real classes')
        for c in classes:
            files = sorted(set(per_module[module][c]))
            short = [f.split('/v3/observe/modules/')[1] for f in files]
            print(f'  .{c:<32}  {", ".join(short)}')

    if other:
        print(f'\n=== Outside Observe modules ({len(other)} classes) ===')
        for c in sorted(other.keys()):
            files = sorted(set(other[c]))
            short = [f.split('apps/web/src/')[1] for f in files]
            print(f'  .{c:<32}  {", ".join(short)}')


if __name__ == '__main__':
    main()
