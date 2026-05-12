"""Map every observe-port.css class to its consumer .tsx files.

Output:
  - For each class consumed somewhere in apps/web/src (excluding
    observe-port.css), list the consuming files grouped by directory.
  - Print a per-Observe-module summary: which module needs which
    classes.
"""
import os
import re
from collections import defaultdict

ROOT = 'apps/web/src'
CSS_FILE = 'apps/web/src/v3/observe/styles/observe-port.css'
OBSERVE_MODULES_ROOT = 'apps/web/src/v3/observe/modules'

def extract_css_classes(path):
    with open(path, 'rb') as fh:
        text = fh.read().decode('utf-8')
    return set(re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', text))

def scan_consumers(root, exclude, defined):
    """For each defined class, list (file, count) consumers.

    Match only inside string literals (single/double/backtick quotes)
    so we do not pick up identifier collisions.
    """
    exclude_norm = os.path.normpath(exclude)
    # tokens-in-strings regex: matches identifiers inside quoted strings
    str_token_re = re.compile(
        r'["\'`]([^"\'`]*?)["\'`]'
    )
    word_re = re.compile(r'[a-zA-Z_][a-zA-Z0-9_-]*')
    by_class = defaultdict(lambda: defaultdict(int))
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            full = os.path.normpath(os.path.join(dirpath, fn))
            if full == exclude_norm:
                continue
            if not fn.endswith(('.tsx', '.ts', '.jsx', '.js')):
                continue
            try:
                with open(full, 'rb') as fh:
                    text = fh.read().decode('utf-8', errors='replace')
            except Exception:
                continue
            for sm in str_token_re.finditer(text):
                inner = sm.group(1)
                for tm in word_re.finditer(inner):
                    tok = tm.group(0)
                    if tok in defined:
                        by_class[tok][full] += 1
    return by_class

def main():
    defined = extract_css_classes(CSS_FILE)
    by_class = scan_consumers(ROOT, CSS_FILE, defined)
    consumed = sorted(by_class.keys())
    print(f'Defined: {len(defined)}')
    print(f'Consumed (string-literal match): {len(consumed)}')
    print()

    # Group consumers by Observe module directory
    per_module = defaultdict(lambda: defaultdict(int))  # module -> class -> count
    other = defaultdict(int)
    for cls, files in by_class.items():
        for f, n in files.items():
            f_norm = f.replace('\\', '/')
            marker = '/v3/observe/modules/'
            if marker in f_norm:
                rest = f_norm.split(marker, 1)[1]
                module = rest.split('/', 1)[0]
                per_module[module][cls] += n
            else:
                other[cls] += n

    print('=== Per Observe module ===')
    for module in sorted(per_module.keys()):
        classes = sorted(per_module[module].keys())
        print(f'\n[{module}]  {len(classes)} distinct classes')
        for c in classes:
            print(f'  .{c}')

    if other:
        print(f'\n=== Outside Observe modules ({len(other)} classes) ===')
        for c in sorted(other.keys()):
            print(f'  .{c}')

if __name__ == '__main__':
    main()
