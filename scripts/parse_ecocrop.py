"""Parse EcoCrop_DB.csv into a compact JSON for the Atlas frontend."""
import csv, json, re, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CSV_PATH = 'apps/web/src/data/EcoCrop_DB.csv'
OUT_PATH = 'apps/web/src/data/ecocrop_parsed.json'

PREFERRED_ENGLISH = {
    'okra','corn','maize','rice','wheat','barley','oats','sorghum','millet',
    'apple','pear','cherry','peach','plum','grape','fig','olive','orange','lemon','lime',
    'mango','banana','coconut','papaya','avocado','guava','pomegranate','date palm',
    'walnut','pecan','almond','hazelnut','chestnut','pistachio','cashew','macadamia',
    'soybean','lentil','chickpea','peanut','pea','bean','cowpea','mung bean',
    'tomato','potato','carrot','onion','garlic','cabbage','lettuce','pepper','cucumber',
    'squash','pumpkin','spinach','kale','broccoli','cauliflower','celery','radish','turnip',
    'sweet potato','cassava','yam','taro','ginger','turmeric',
    'cotton','hemp','flax','jute','sisal','kenaf','ramie',
    'coffee','tea','cocoa','tobacco','rubber','sugar cane','sugarcane',
    'sunflower','canola','rapeseed','sesame','safflower',
    'alfalfa','clover','ryegrass','timothy','fescue','bermuda grass',
    'basil','mint','rosemary','thyme','oregano','sage','lavender','cinnamon',
    'eucalyptus','pine','oak','teak','mahogany','bamboo','willow','poplar',
    'strawberry','blueberry','raspberry','blackberry','cranberry',
    'melon','watermelon','cantaloupe',
    'artichoke','asparagus','beet','chard','eggplant','leek','parsnip',
    'rye','buckwheat','quinoa','amaranth',
}

def pick_best_name(comname, sci_name):
    if not comname or comname.strip() in ('', 'NA'):
        return sci_name
    candidates = [n.strip() for n in comname.split(',') if n.strip()]
    # Check exact match with well-known English names
    for c in candidates:
        if c.lower().strip() in PREFERRED_ENGLISH:
            return c.title() if c == c.lower() else c
    # Check contains
    for c in candidates:
        cl = c.lower().strip()
        for eng in PREFERRED_ENGLISH:
            if eng in cl and len(cl) < len(eng) + 15:
                return c.title() if c == c.lower() else c
    # Pick shortest ASCII-dominant name > 2 chars
    english = []
    for c in candidates:
        ascii_ratio = sum(1 for ch in c if ord(ch) < 128) / max(len(c), 1)
        if ascii_ratio > 0.9 and 2 < len(c) < 40:
            english.append(c)
    if english:
        english.sort(key=len)
        best = english[0]
        return best.title() if best == best.lower() else best
    return candidates[0]

def safe_float(v):
    try: return float(v)
    except: return None

def safe_int(v):
    try: return int(float(v))
    except: return None

def parse_dep(v):
    v = v.strip()
    if v in ('', 'NA'): return None
    if 'very shallow' in v: return 10
    if 'shallow' in v: return 35
    if 'medium' in v: return 100
    if 'deep' in v: return 200
    return None

def parse_text(v):
    v = v.strip()
    if v in ('', 'NA'): return None
    codes = []
    for t in v.split(','):
        t = t.strip()
        if t == 'heavy': codes.append(1)
        elif t == 'medium': codes.append(2)
        elif t == 'light': codes.append(3)
        elif t == 'organic': codes.append(4)
        elif t == 'wide': codes.append(0)
    return codes if codes else None

def parse_dra(v):
    v = v.strip()
    if v in ('', 'NA'): return None
    if 'poorly' in v: return 1
    if 'well' in v: return 2
    if 'excessive' in v: return 3
    return None

def parse_fer(v):
    v = v.strip()
    if v in ('', 'NA'): return None
    if v == 'low': return 1
    if v == 'moderate': return 2
    if v == 'high': return 3
    return None

def parse_sal(v):
    v = v.strip()
    if v in ('', 'NA'): return None
    if v == 'none': return 0
    if 'low' in v: return 1
    if 'medium' in v: return 2
    if 'high' in v: return 3
    return None

def parse_lifecycle(v):
    v = v.strip().lower()
    if v in ('', 'na'): return 'unknown'
    if 'perennial' in v: return 'perennial'
    if 'biennial' in v: return 'biennial'
    if 'annual' in v: return 'annual'
    return 'unknown'

def parse_lifo(v):
    v = v.strip().lower()
    if v in ('', 'na'): return 'herb'
    if 'tree' in v: return 'tree'
    if 'shrub' in v: return 'shrub'
    if 'vine' in v: return 'vine'
    if 'grass' in v: return 'grass'
    return 'herb'

CAT_MAP = {
    'cereals & pseudocereals': 'cereal',
    'pulses (grain legumes)': 'legume',
    'vegetables': 'vegetable',
    'fruits & nuts': 'fruit_nut',
    'roots/tubers': 'root_tuber',
    'forage/pasture': 'forage',
    'forest/wood': 'forestry',
    'materials': 'industrial',
    'ornamentals/turf': 'ornamental',
    'medicinals & aromatic': 'medicinal',
    'cover crop': 'cover_crop',
    'environmental': 'environmental',
    'other': 'other',
    'weed': 'other',
}

def primary_category(v):
    v = v.strip()
    if v in ('', 'NA'): return 'other'
    first = v.split(',')[0].strip()
    return CAT_MAP.get(first, 'other')

def slugify(name):
    return re.sub(r'[^a-zA-Z0-9]+', '-', name.lower()).strip('-')[:60]

def clean_family(fam):
    if not fam or fam.strip() in ('', 'NA'): return ''
    parts = fam.split(':')
    return parts[-1].strip()

# --- Main ---
with open(CSV_PATH, encoding='utf-8', errors='replace') as f:
    rows = list(csv.DictReader(f))

entries = []
seen_ids = set()

for r in rows:
    sci = r.get('ScientificName', '').strip()
    if not sci:
        continue
    com = r.get('COMNAME', '').strip()
    name = pick_best_name(com, sci)

    sid = slugify(sci)
    if sid in seen_ids:
        sid += '-2'
    seen_ids.add(sid)

    topmn = safe_float(r['TOPMN'])
    topmx = safe_float(r['TOPMX'])
    if topmn is None or topmx is None:
        continue

    entry = {
        'id': sid,
        'name': name,
        'scientificName': sci,
        'family': clean_family(r.get('FAMNAME', '')),
        'category': primary_category(r.get('CAT', '')),
        'lifecycle': parse_lifecycle(r.get('LISPA', '')),
        'lifeForm': parse_lifo(r.get('LIFO', '')),
        'tempOpt': [topmn, topmx],
        'tempAbs': [safe_float(r['TMIN']) or topmn - 10, safe_float(r['TMAX']) or topmx + 10],
        'precipOpt': [safe_float(r['ROPMN']) or 0, safe_float(r['ROPMX']) or 0],
        'precipAbs': [safe_float(r['RMIN']) or 0, safe_float(r['RMAX']) or 0],
        'phOpt': [safe_float(r['PHOPMN']) or 5.5, safe_float(r['PHOPMX']) or 7.5],
        'phAbs': [safe_float(r['PHMIN']) or 4.0, safe_float(r['PHMAX']) or 9.0],
        'growingDays': [safe_int(r['GMIN']) or 0, safe_int(r['GMAX']) or 0],
        'killingTemp': safe_float(r['KTMP']),
        'soilDepth': parse_dep(r.get('DEP', '')),
        'texture': parse_text(r.get('TEXT', '')),
        'drainage': parse_dra(r.get('DRA', '')),
        'fertility': parse_fer(r.get('FER', '')),
        'salinity': parse_sal(r.get('SAL', '')),
        'categories': [c.strip() for c in r.get('CAT', '').split(',') if c.strip() and c.strip() != 'NA'],
    }
    entries.append(entry)

# Spot check
checks = [
    ('Abelmoschus esculentus', 'Okra'),
    ('Zea mays', 'Corn/Maize'),
    ('Oryza sativa', 'Rice'),
    ('Malus domestica', 'Apple'),
    ('Triticum aestivum', 'Wheat'),
    ('Glycine max', 'Soybean'),
    ('Solanum lycopersicum', 'Tomato'),
    ('Coffea arabica', 'Coffee'),
]
for target_sci, expect in checks:
    found = [e for e in entries if target_sci in e['scientificName']]
    if found:
        print(f'  {target_sci}: "{found[0]["name"]}" (expect: {expect})')
    else:
        print(f'  {target_sci}: NOT FOUND')

print(f'\nTotal: {len(entries)} crops')

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(entries, f, separators=(',', ':'), ensure_ascii=True)

import os
sz = os.path.getsize(OUT_PATH)
print(f'JSON size: {sz // 1024} KB')
