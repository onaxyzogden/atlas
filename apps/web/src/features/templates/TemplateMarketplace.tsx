/**
 * TemplateMarketplace — mock community template marketplace.
 */

import { useState } from 'react';
import { semantic } from '../../lib/tokens.js';

interface MarketplaceTemplate {
  id: string;
  name: string;
  author: string;
  category: string;
  downloads: number;
  rating: number;
  description: string;
  tags: string[];
}

const MOCK_TEMPLATES: MarketplaceTemplate[] = [
  { id: '1', name: 'Regenerative Homestead', author: 'Atlas Community', category: 'Homestead', downloads: 342, rating: 4.8, description: 'Complete homestead layout with food forest, livestock, and water retention systems.', tags: ['homestead', 'food forest', 'livestock'] },
  { id: '2', name: 'Islamic Retreat Center', author: 'OGDEN', category: 'Retreat', downloads: 156, rating: 4.9, description: 'Prayer pavilion, guest cabins, contemplation gardens, and community gathering spaces.', tags: ['retreat', 'spiritual', 'hospitality'] },
  { id: '3', name: 'Market Farm (5 acre)', author: 'FarmStart Ontario', category: 'Agriculture', downloads: 289, rating: 4.6, description: 'Efficient 5-acre market garden with season extension, irrigation, and roadside stand.', tags: ['market garden', 'agriculture', 'small farm'] },
  { id: '4', name: 'Conservation Easement', author: 'Atlas Community', category: 'Conservation', downloads: 87, rating: 4.7, description: 'Wetland restoration, forest regeneration, and wildlife corridor planning template.', tags: ['conservation', 'wetland', 'wildlife'] },
  { id: '5', name: 'Educational Farm Trail', author: 'TWL Education', category: 'Education', downloads: 201, rating: 4.5, description: 'Interpretive trail with learning stations for farm tours and school groups.', tags: ['education', 'agritourism', 'trails'] },
  { id: '6', name: 'Silvopasture Layout', author: 'Atlas Community', category: 'Livestock', downloads: 178, rating: 4.4, description: 'Tree-pasture integration for shade, shelter, and supplemental browse.', tags: ['silvopasture', 'livestock', 'agroforestry'] },
];

export default function TemplateMarketplace() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(MOCK_TEMPLATES.map((t) => t.category))];

  const filtered = MOCK_TEMPLATES.filter((t) => {
    if (selectedCategory && t.category !== selectedCategory) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.tags.some((tag) => tag.includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        padding: '12px 14px', borderRadius: 8, marginBottom: 12,
        background: 'rgba(196,162,101,0.04)',
        border: '1px solid rgba(196,162,101,0.1)',
        fontSize: 11, color: 'var(--color-panel-muted)', lineHeight: 1.5,
      }}>
        Community template marketplace — preview of future cloud-connected sharing.
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 12, marginBottom: 8,
          background: 'var(--color-panel-subtle)', border: '1px solid var(--color-panel-card-border)',
          borderRadius: 6, color: 'var(--color-panel-text)', fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Category chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            padding: '4px 10px', fontSize: 10, borderRadius: 12,
            border: `1px solid ${!selectedCategory ? '#c4a265' : 'var(--color-panel-card-border)'}`,
            background: !selectedCategory ? 'rgba(196,162,101,0.1)' : 'transparent',
            color: !selectedCategory ? '#c4a265' : 'var(--color-panel-muted)',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            style={{
              padding: '4px 10px', fontSize: 10, borderRadius: 12,
              border: `1px solid ${selectedCategory === cat ? '#c4a265' : 'var(--color-panel-card-border)'}`,
              background: selectedCategory === cat ? 'rgba(196,162,101,0.1)' : 'transparent',
              color: selectedCategory === cat ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((t) => (
          <div key={t.id} style={{
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-panel-text)' }}>{t.name}</div>
              <div style={{ fontSize: 10, color: semantic.sidebarActive }}>{'\u2605'} {t.rating}</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginBottom: 6 }}>
              by {t.author} &middot; {t.downloads} downloads
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', lineHeight: 1.5, marginBottom: 8 }}>
              {t.description}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {t.tags.map((tag) => (
                <span key={tag} style={{
                  padding: '2px 6px', fontSize: 9, borderRadius: 4,
                  background: 'var(--color-panel-subtle)', color: 'var(--color-panel-muted)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
