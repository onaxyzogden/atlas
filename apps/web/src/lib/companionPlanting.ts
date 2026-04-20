/**
 * Companion Planting Matrix — Sprint BF
 *
 * Static lookup of synergistic / antagonistic planting relationships for ~60
 * major food crops. Consolidates classical permaculture sources:
 *   - Louise Riotte (1998) Carrots Love Tomatoes
 *   - Jeavons, J. (2017) How to Grow More Vegetables
 *   - Hemenway, T. (2009) Gaia's Garden
 *
 * Rationale tags are coarse: pest-deterrent, nutrient-dynamics,
 * pollinator-support, structural-support, allelopathy, rhizosphere-antagonism.
 */

export interface CompanionEntry {
  companions: string[];
  antagonists: string[];
  rationale: Partial<Record<string, string>>; // partner → one-line reason
}

const MATRIX: Record<string, CompanionEntry> = {
  tomato: {
    companions: ['basil', 'parsley', 'carrot', 'onion', 'garlic', 'borage', 'marigold', 'chives'],
    antagonists: ['corn', 'potato', 'fennel', 'brassicas', 'kohlrabi'],
    rationale: {
      basil: 'Pest-deterrent; repels whitefly, thrips; reported yield uplift.',
      marigold: 'Root-knot nematode suppression via α-terthienyl.',
      corn: 'Shared pests (tomato fruitworm / corn earworm).',
      fennel: 'Allelopathic; inhibits tomato root growth.',
    },
  },
  pepper: {
    companions: ['basil', 'onion', 'carrot', 'tomato', 'parsley', 'marigold', 'spinach'],
    antagonists: ['fennel', 'kohlrabi', 'apricot'],
    rationale: { fennel: 'Allelopathic.' },
  },
  eggplant: {
    companions: ['bean', 'pepper', 'spinach', 'marigold', 'thyme'],
    antagonists: ['fennel'],
    rationale: {},
  },
  potato: {
    companions: ['bean', 'cabbage', 'corn', 'horseradish', 'marigold'],
    antagonists: ['tomato', 'cucumber', 'squash', 'sunflower', 'raspberry'],
    rationale: {
      horseradish: 'Increases disease resistance; deters Colorado beetle.',
      tomato: 'Shared Phytophthora / blight pressure.',
    },
  },
  corn: {
    companions: ['bean', 'squash', 'pumpkin', 'cucumber', 'melon', 'sunflower', 'pea'],
    antagonists: ['tomato', 'celery'],
    rationale: {
      bean: 'Three Sisters — nitrogen fixation for heavy-feeder corn.',
      squash: 'Three Sisters — living mulch, pest-deterrent prickly leaves.',
    },
  },
  bean_pole: {
    companions: ['corn', 'cucumber', 'strawberry', 'carrot', 'celery', 'radish'],
    antagonists: ['onion', 'garlic', 'leek', 'shallot', 'chive', 'fennel'],
    rationale: {
      corn: 'Three Sisters — corn stalk trellis + N-fixation payback.',
      onion: 'Alliums suppress Rhizobium nodulation.',
    },
  },
  bean_bush: {
    companions: ['cucumber', 'corn', 'strawberry', 'celery', 'potato', 'beet', 'carrot'],
    antagonists: ['onion', 'garlic', 'leek', 'fennel'],
    rationale: {},
  },
  pea: {
    companions: ['carrot', 'cucumber', 'corn', 'radish', 'turnip', 'bean', 'lettuce'],
    antagonists: ['onion', 'garlic', 'shallot', 'gladiolus'],
    rationale: { onion: 'Allium suppression of Rhizobium nodulation.' },
  },
  squash: {
    companions: ['corn', 'bean', 'radish', 'nasturtium', 'marigold', 'mint'],
    antagonists: ['potato'],
    rationale: {
      nasturtium: 'Trap crop for squash bugs + aphids.',
    },
  },
  cucumber: {
    companions: ['bean', 'corn', 'pea', 'radish', 'sunflower', 'nasturtium', 'dill'],
    antagonists: ['potato', 'sage', 'aromatic herbs'],
    rationale: {},
  },
  pumpkin: {
    companions: ['corn', 'bean', 'squash', 'nasturtium', 'marigold'],
    antagonists: ['potato'],
    rationale: {},
  },
  melon: {
    companions: ['corn', 'radish', 'marigold', 'nasturtium'],
    antagonists: ['potato'],
    rationale: {},
  },
  cabbage: {
    companions: ['onion', 'celery', 'dill', 'potato', 'chamomile', 'mint', 'rosemary', 'sage', 'thyme'],
    antagonists: ['tomato', 'pepper', 'strawberry', 'pole bean'],
    rationale: {
      thyme: 'Deters cabbage worm.',
      dill: 'Attracts parasitic wasps of cabbage white.',
    },
  },
  broccoli: {
    companions: ['onion', 'celery', 'potato', 'dill', 'chamomile', 'nasturtium', 'thyme'],
    antagonists: ['tomato', 'pepper', 'strawberry'],
    rationale: {},
  },
  cauliflower: {
    companions: ['onion', 'celery', 'dill', 'chamomile', 'spinach'],
    antagonists: ['tomato', 'strawberry'],
    rationale: {},
  },
  kale: {
    companions: ['onion', 'dill', 'chamomile', 'beet', 'cilantro', 'nasturtium'],
    antagonists: ['tomato', 'strawberry', 'pole bean'],
    rationale: {},
  },
  brussels_sprouts: {
    companions: ['onion', 'dill', 'celery', 'potato', 'thyme'],
    antagonists: ['tomato', 'strawberry'],
    rationale: {},
  },
  kohlrabi: {
    companions: ['beet', 'onion', 'cucumber'],
    antagonists: ['tomato', 'pepper', 'bean'],
    rationale: {},
  },
  carrot: {
    companions: ['onion', 'leek', 'tomato', 'lettuce', 'rosemary', 'sage', 'pea', 'chive'],
    antagonists: ['dill', 'parsnip'],
    rationale: {
      onion: 'Mutual pest deterrence — onion vs carrot fly, carrot vs onion fly.',
      dill: 'Allelopathic at maturity; attracts carrot-root fly predators only when young.',
    },
  },
  beet: {
    companions: ['onion', 'garlic', 'lettuce', 'cabbage', 'bush bean', 'kohlrabi'],
    antagonists: ['pole bean', 'mustard'],
    rationale: {},
  },
  radish: {
    companions: ['cucumber', 'pea', 'lettuce', 'chervil', 'nasturtium', 'squash'],
    antagonists: ['hyssop'],
    rationale: { cucumber: 'Radish trap-crops cucumber beetles.' },
  },
  turnip: {
    companions: ['pea', 'onion', 'thyme'],
    antagonists: ['potato', 'mustard'],
    rationale: {},
  },
  onion: {
    companions: ['carrot', 'beet', 'lettuce', 'cabbage', 'tomato', 'strawberry', 'chamomile'],
    antagonists: ['pea', 'bean', 'asparagus', 'sage'],
    rationale: { pea: 'Allium inhibits Rhizobium.' },
  },
  garlic: {
    companions: ['tomato', 'pepper', 'cabbage', 'rose', 'strawberry', 'beet'],
    antagonists: ['pea', 'bean'],
    rationale: {},
  },
  leek: {
    companions: ['carrot', 'celery', 'onion'],
    antagonists: ['pea', 'bean'],
    rationale: {},
  },
  shallot: {
    companions: ['tomato', 'carrot', 'beet', 'lettuce'],
    antagonists: ['pea', 'bean', 'asparagus'],
    rationale: {},
  },
  chive: {
    companions: ['carrot', 'tomato', 'apple', 'rose', 'grape'],
    antagonists: ['pea', 'bean'],
    rationale: { apple: 'Suppresses apple scab; deters aphids.' },
  },
  lettuce: {
    companions: ['carrot', 'radish', 'strawberry', 'cucumber', 'chive', 'onion'],
    antagonists: ['broccoli'],
    rationale: {},
  },
  spinach: {
    companions: ['strawberry', 'pea', 'bean', 'brassicas', 'eggplant'],
    antagonists: [],
    rationale: {},
  },
  chard: {
    companions: ['bean', 'cabbage', 'onion'],
    antagonists: ['bean (pole)'],
    rationale: {},
  },
  celery: {
    companions: ['cabbage', 'tomato', 'bean', 'leek', 'onion'],
    antagonists: ['corn', 'parsnip'],
    rationale: {},
  },
  asparagus: {
    companions: ['tomato', 'parsley', 'basil', 'marigold'],
    antagonists: ['onion', 'garlic', 'potato'],
    rationale: { tomato: 'Tomato deters asparagus beetle; asparagus deters root-knot nematodes for tomato.' },
  },
  strawberry: {
    companions: ['bean', 'lettuce', 'spinach', 'onion', 'borage', 'thyme'],
    antagonists: ['brassicas'],
    rationale: { borage: 'Enhances flavour + disease resistance (anecdotal); pollinator attractor.' },
  },
  raspberry: {
    companions: ['tansy', 'turnip', 'garlic'],
    antagonists: ['blackberry', 'potato'],
    rationale: {},
  },
  blueberry: {
    companions: ['thyme', 'bee balm', 'strawberry'],
    antagonists: [],
    rationale: {},
  },
  grape: {
    companions: ['basil', 'hyssop', 'chive', 'geranium', 'mulberry'],
    antagonists: ['cabbage', 'radish'],
    rationale: {},
  },
  apple: {
    companions: ['chive', 'nasturtium', 'comfrey', 'clover', 'foxglove'],
    antagonists: ['potato'],
    rationale: { comfrey: 'Dynamic accumulator — mines subsoil K + Ca.' },
  },
  pear: {
    companions: ['chive', 'comfrey', 'clover'],
    antagonists: [],
    rationale: {},
  },
  peach: {
    companions: ['garlic', 'onion', 'comfrey', 'asparagus'],
    antagonists: [],
    rationale: {},
  },
  plum: {
    companions: ['garlic', 'onion', 'clover'],
    antagonists: [],
    rationale: {},
  },
  wheat: {
    companions: ['clover', 'vetch', 'legume cover crops'],
    antagonists: [],
    rationale: { clover: 'Under-seeding provides N for succeeding wheat.' },
  },
  oat: {
    companions: ['vetch', 'pea', 'clover'],
    antagonists: [],
    rationale: {},
  },
  rye: {
    companions: ['vetch', 'clover'],
    antagonists: ['wheat (following rye — allelopathic residues)'],
    rationale: {},
  },
  barley: {
    companions: ['clover', 'pea'],
    antagonists: [],
    rationale: {},
  },
  rice: {
    companions: ['azolla', 'duckweed', 'fish (integrated)'],
    antagonists: [],
    rationale: { azolla: 'N-fixing aquatic fern — SRI rice system.' },
  },
  sunflower: {
    companions: ['corn', 'cucumber', 'squash'],
    antagonists: ['potato', 'bean'],
    rationale: { potato: 'Allelopathic suppression of potato.' },
  },
  buckwheat: {
    companions: ['any heavy-feeder (as green manure)'],
    antagonists: [],
    rationale: { 'heavy-feeder': 'Buckwheat mines P; use as green manure before cash crop.' },
  },
  sorghum: {
    companions: ['bean', 'pea', 'squash'],
    antagonists: ['following wheat — allelopathic residues'],
    rationale: {},
  },
  mint: {
    companions: ['cabbage', 'tomato', 'broccoli'],
    antagonists: ['parsley'],
    rationale: { cabbage: 'Deters cabbage moth.' },
  },
  basil: {
    companions: ['tomato', 'pepper', 'oregano'],
    antagonists: ['rue', 'sage'],
    rationale: {},
  },
  parsley: {
    companions: ['tomato', 'asparagus', 'carrot'],
    antagonists: ['mint', 'lettuce'],
    rationale: {},
  },
  dill: {
    companions: ['cabbage', 'cucumber', 'onion'],
    antagonists: ['carrot (mature)', 'tomato'],
    rationale: {},
  },
  cilantro: {
    companions: ['spinach', 'legumes', 'tomato'],
    antagonists: ['fennel'],
    rationale: {},
  },
  thyme: {
    companions: ['cabbage', 'strawberry', 'blueberry', 'eggplant', 'tomato'],
    antagonists: [],
    rationale: {},
  },
  rosemary: {
    companions: ['cabbage', 'bean', 'carrot', 'sage'],
    antagonists: ['cucumber'],
    rationale: {},
  },
  sage: {
    companions: ['rosemary', 'cabbage', 'carrot'],
    antagonists: ['cucumber', 'basil', 'onion'],
    rationale: {},
  },
  chamomile: {
    companions: ['cabbage', 'onion', 'cucumber'],
    antagonists: [],
    rationale: { cabbage: 'Enhances essential-oil content of cabbage; attracts predatory wasps.' },
  },
  borage: {
    companions: ['strawberry', 'tomato', 'squash'],
    antagonists: [],
    rationale: {},
  },
  marigold: {
    companions: ['tomato', 'pepper', 'cucumber', 'squash', 'bean'],
    antagonists: ['bean (Mexican marigold only — allelopathic at high density)'],
    rationale: {},
  },
  nasturtium: {
    companions: ['squash', 'cucumber', 'radish', 'brassicas', 'apple'],
    antagonists: [],
    rationale: { squash: 'Trap crop for aphids + squash bugs.' },
  },
  clover: {
    companions: ['wheat', 'oat', 'apple', 'corn (interseeded)'],
    antagonists: [],
    rationale: {},
  },
  alfalfa: {
    companions: ['grass pasture mixes'],
    antagonists: ['following alfalfa — autotoxicity'],
    rationale: { 'following alfalfa': 'Alfalfa autotoxicity — rotate ≥ 1 year before replanting.' },
  },
};

function normalize(name: string): string {
  const n = name.toLowerCase().trim();
  // Common plural / alt form normalizations
  if (n.includes('pole bean')) return 'bean_pole';
  if (n.includes('bush bean')) return 'bean_bush';
  if (n.includes('bean') && !n.includes('soy')) return 'bean_bush';
  if (n.includes('tomato')) return 'tomato';
  if (n.includes('pepper')) return 'pepper';
  if (n.includes('potato') && !n.includes('sweet')) return 'potato';
  if (n.includes('squash') || n.includes('zucchini')) return 'squash';
  if (n.includes('cucumber')) return 'cucumber';
  if (n.includes('cabbage')) return 'cabbage';
  if (n.includes('broccoli')) return 'broccoli';
  if (n.includes('cauliflower')) return 'cauliflower';
  if (n.includes('kale')) return 'kale';
  if (n.includes('carrot')) return 'carrot';
  if (n.includes('beet')) return 'beet';
  if (n.includes('onion')) return 'onion';
  if (n.includes('garlic')) return 'garlic';
  if (n.includes('leek')) return 'leek';
  if (n.includes('lettuce')) return 'lettuce';
  if (n.includes('spinach')) return 'spinach';
  if (n.includes('corn') || n.includes('maize')) return 'corn';
  if (n.includes('pea') && !n.includes('peach') && !n.includes('peanut')) return 'pea';
  if (n.includes('apple')) return 'apple';
  if (n.includes('pear')) return 'pear';
  if (n.includes('peach')) return 'peach';
  if (n.includes('plum')) return 'plum';
  if (n.includes('grape')) return 'grape';
  if (n.includes('strawberry')) return 'strawberry';
  if (n.includes('raspberry')) return 'raspberry';
  if (n.includes('blueberry')) return 'blueberry';
  if (n.includes('wheat')) return 'wheat';
  if (n.includes('oat')) return 'oat';
  if (n.includes('barley')) return 'barley';
  if (n.includes('rye') && !n.includes('ryeg')) return 'rye';
  if (n.includes('rice')) return 'rice';
  if (n.includes('sorghum')) return 'sorghum';
  if (n.includes('sunflower')) return 'sunflower';
  if (n.includes('buckwheat')) return 'buckwheat';
  if (n.includes('mint')) return 'mint';
  if (n.includes('basil')) return 'basil';
  if (n.includes('parsley')) return 'parsley';
  if (n.includes('dill')) return 'dill';
  if (n.includes('cilantro') || n.includes('coriander')) return 'cilantro';
  if (n.includes('thyme')) return 'thyme';
  if (n.includes('rosemary')) return 'rosemary';
  if (n.includes('sage')) return 'sage';
  if (n.includes('chamomile')) return 'chamomile';
  if (n.includes('borage')) return 'borage';
  if (n.includes('marigold')) return 'marigold';
  if (n.includes('nasturtium')) return 'nasturtium';
  if (n.includes('clover')) return 'clover';
  if (n.includes('alfalfa') || n.includes('lucerne')) return 'alfalfa';
  return n.replace(/\s+/g, '_');
}

export function findCompanions(cropName: string): CompanionEntry | null {
  const key = normalize(cropName);
  return MATRIX[key] ?? null;
}

/** Return all crop keys available in the matrix — for debugging / coverage checks. */
export function companionMatrixCoverage(): string[] {
  return Object.keys(MATRIX);
}
