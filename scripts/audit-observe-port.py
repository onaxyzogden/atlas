"""Audit observe-port.css for unused selectors.

Extracts every class name defined in observe-port.css and compares
against class names referenced anywhere in apps/web/src (excluding
observe-port.css itself). Reports which classes are orphaned.
"""
import os
import re
from collections import defaultdict

ROOT = 'apps/web/src'
CSS_FILE = 'apps/web/src/v3/observe/styles/observe-port.css'

def extract_css_classes(path):
    with open(path, 'rb') as fh:
        text = fh.read().decode('utf-8')
    classes = set()
    for m in re.finditer(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', text):
        classes.add(m.group(1))
    return classes

def extract_consumer_classes(root, exclude):
    classes = set()
    exclude_norm = os.path.normpath(exclude)
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            full = os.path.normpath(os.path.join(dirpath, fn))
            if full == exclude_norm:
                continue
            if not fn.endswith(('.tsx', '.ts', '.jsx', '.js', '.css', '.md', '.html')):
                continue
            try:
                with open(full, 'rb') as fh:
                    text = fh.read().decode('utf-8', errors='replace')
            except Exception:
                continue
            for m in re.finditer(r'[a-zA-Z_][a-zA-Z0-9_-]*', text):
                classes.add(m.group(0))
    return classes

def group_by_prefix(orphans):
    groups = defaultdict(int)
    for c in orphans:
        parts = c.split('-', 1)
        prefix = parts[0] if len(parts) > 1 else '(no-prefix)'
        groups[prefix] += 1
    return sorted(groups.items(), key=lambda kv: -kv[1])

def main():
    defined = extract_css_classes(CSS_FILE)
    consumed_tokens = extract_consumer_classes(ROOT, CSS_FILE)
    orphans = defined - consumed_tokens
    used = defined & consumed_tokens
    print(f'Defined in observe-port.css:  {len(defined)}')
    print(f'Referenced elsewhere in src:  {len(used)}')
    print(f'Orphan (no consumer found):   {len(orphans)}')
    print()
    print('Top orphan prefixes:')
    for prefix, n in group_by_prefix(orphans)[:30]:
        print(f'  {prefix:<28} {n}')
    print()
    print('Top consumed prefixes:')
    for prefix, n in group_by_prefix(used)[:20]:
        print(f'  {prefix:<28} {n}')

if __name__ == '__main__':
    main()
