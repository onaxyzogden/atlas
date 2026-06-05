# Protocol Authoring Guide

How to author **standing protocols** — the condition→response rules that act as
task triggers across a project's life. This is the reusable scaffold: the
operator fills in domain thresholds and wording; the structure and resolution
machinery are fixed.

> **What a protocol is.** A protocol is a standing rule of the form
> **IF _condition_ → THEN _response_**, bound to the stratum that authors it.
> When its trigger is recognised in the field (Act), it raises a review flag
> that becomes an assignable task. Protocols are *not* one-off tasks; they are
> the persistent watch that generates tasks whenever their condition holds.

---

## 1. The universal / primary / secondary model

Protocols compose exactly like objectives (see
[`resolveProjectObjectives`](../../packages/shared/src/relationships/resolveProjectObjectives.ts)).
A project's resolved protocol set is:

```
universal protocols            (every project, all 7 strata)
  + primary-type protocols     (the project's primary type)
  + each compatible secondary's additive protocols   (deduped by id)
  + each compatible secondary's patches              (amend an existing protocol)
```

resolved by
[`resolveProjectProtocols`](../../packages/shared/src/relationships/resolveProjectProtocols.ts),
sorted by **stratum ordinal (S1→S7), then source layer (universal < primary <
secondary), then authored order**.

| Layer | Lives in | `source` | `sourceTypeId` |
|---|---|---|---|
| Universal | `catalogues/universal.ts` | `'universal'` | _(omit)_ |
| Primary | `catalogues/<type>.ts` → `<TYPE>_PRIMARY_PROTOCOLS` | `'primary'` | the type |
| Secondary (additive) | `catalogues/<type>.ts` → `<TYPE>_SECONDARY_PROTOCOLS` | `'secondary'` | the type |
| Secondary (patch) | `catalogues/<type>.ts` → `<TYPE>_SECONDARY_PATCHES` | — (a `ProtocolPatchRecord`) | the type |

Secondary protocols only layer onto a primary the relationship matrix marks
**compatible** (`isCompatibleSecondary`) — the same single source of truth the
objective layer uses, so a pairing that is incompatible for objectives is
incompatible for protocols too.

---

## 2. The protocol template — every field

Authored against
[`StandardProtocolTemplateSchema`](../../packages/shared/src/schemas/protocol/protocol.schema.ts).

| Field | Required | Meaning |
|---|---|---|
| `id` | ✅ | Stable kebab id, globally unique. Prefix by type (`hs-`, `silv-`, `mg-`…); secondary protocols add a `2` (`silv2-`, `mg2-`). |
| `name` | ✅ | Short display name. |
| `type` | ✅ | One of the four **ProtocolType**s (§4). |
| `stratumId` | ✅ for per-type | The stratum that authors it (`s1-project-foundation`…`s7-phasing-resourcing`). Drives the sort. |
| `source` | ✅ for per-type | `universal` / `primary` / `secondary`. |
| `sourceTypeId` | primary/secondary | The contributing project type. |
| `severityTier` | ✅ recommended | Response posture when it fires (§5). |
| `condition` | ✅ | The **IF** clause. Numeric limits stay as `[bracketed tokens]` (§3). |
| `response` | ✅ | The **THEN** clause — what the steward does. |
| `rationale` | ✅ | One line: *why* this protocol exists. |
| `feeds` | ✅ | Observe-domain labels it reads/writes (e.g. `['Soil','Plants']`). |
| `scopeNotes` | when applicable | **Verbatim Amanah caution** (§6). |
| `enterpriseScope` | legacy only | Used only by the legacy livestock catalogue; per-type entries omit it. |

---

## 3. Threshold token convention

**Never hard-code a numeric threshold.** The operator supplies real values at
activation. Keep limits as bracketed tokens whose name states the intent:

```
condition: 'IF rainwater storage falls below [household reserve days]'
condition: 'IF browse damage to trees exceeds [browse tolerance]'
```

The `rationale` states the *principle* (why the limit matters); the operator
sets the number. This keeps drafted content reviewable without it reading as a
settled, authoritative figure.

---

## 4. The four protocol types (`ProtocolType`)

| Type | Fires on | Example condition |
|---|---|---|
| `threshold` | a measured stream crossing a limit | `IF battery state of charge falls below [reserve floor]` |
| `judgment` | a freshness/pattern signal; steward assesses | `IF contribution load becomes unevenly distributed across members` |
| `cyclical` | a rotation / season / calendar rhythm | `IF the [pantry review date] arrives` |
| `freeform` | plain-language logic on a cadence | _(reserved; use sparingly)_ |

---

## 5. The four severity tiers (`SeverityTier`)

The **response posture** when a protocol fires — orthogonal to its type.

| Tier | Posture |
|---|---|
| `stop` | Halt project-wide; needs Plan approval to resume. Reserve for life-safety / irreversible harm (e.g. contamination signal, stock water failure, visitor safety). |
| `respond` | Generate an assignable field action; the affected area pauses. The canonical "produces work" tier — most protocols. |
| `watch` | Log only; no action required. Slow, advisory trends. |
| `abundance` | A *positive* condition was reached — observe before acting (the permaculture observe-before-act tier, e.g. a harvest glut). |

---

## 6. The Amanah `scopeNotes` rule (non-negotiable)

Any protocol whose response touches a **sales channel or advance commitment**
must carry the **verbatim** `bayʿ mā laysa ʿindak` caution in `scopeNotes` — the
sale of what one does not yet possess. It is **never stripped, reworded, or
summarised away**.

Carried today on: `mg-market-channel-advance-sale`,
`mg2-surplus-market-channel` (market garden), `agri-experience-presale`
(agritourism), `nur-stock-presale` (nursery). The conformance test asserts these
keep the caution.

Permitted capital/sales structures: charitable donation, restricted donation,
qard ḥasan (interest-free loan), in-kind contribution, sponsorship; a
post-harvest membership yield-share may be designed afresh under Scholar Council
review. **CSA-style advance purchase is forbidden** — do not reintroduce it.

---

## 7. Patches (secondary amends an existing protocol)

A secondary type can also **amend** a universal or primary protocol instead of
adding a new one — via a
[`ProtocolPatchRecord`](../../packages/shared/src/schemas/protocol/protocol.schema.ts):

```ts
{
  targetTemplateId: 'u-s6-yield-shortfall',   // the protocol to amend
  secondaryTypeId: 'silvopasture',
  conditionAmendment: 'OR tree-fodder or timber yield falls below [expected yield]',
  responseAmendment:  'Review the tree-forage-livestock integration as a whole.',
  ref: 'silvopasture-secondary-patch-2',
}
```

The resolver **concatenates** amendments onto the target (never replaces), and
**skips** (records, never throws) a patch whose target id is absent.

---

## 8. Worked examples

**Universal threshold (S5):**

```ts
{
  id: 'u-s5-water-store-low', name: 'Water Store Low',
  type: 'threshold', source: 'universal', stratumId: 's5-system-design',
  severityTier: 'respond',
  condition: 'IF stored water falls below [reserve threshold]',
  response: 'Switch to conservation use and confirm the backup supply.',
  rationale: 'Water is the first dependency; the reserve floor is a line to act on, not discover.',
  feeds: ['Hydrology'],
}
```

**Primary cyclical (silvopasture, S5):**

```ts
{
  id: 'silv-rotational-fencing-integrity', name: 'Treed-Paddock Entry Check',
  type: 'cyclical', source: 'primary', sourceTypeId: 'silvopasture',
  stratumId: 's5-system-design', severityTier: 'respond',
  condition: 'IF a rotation entry event occurs in a treed paddock',
  response: 'Inspect fencing, tree guards, and water before opening the gate.',
  rationale: 'Trees complicate fence lines and water runs; a pre-entry check catches what a treeless paddock would not.',
  feeds: ['Built Infrastructure', 'Animals'],
}
```

**Sales-channel judgment with Amanah caution (market garden, S7):** see
`mg-market-channel-advance-sale` in
[`catalogues/marketGarden.ts`](../../packages/shared/src/constants/protocol/catalogues/marketGarden.ts).

---

## 9. Adding a new per-type catalogue

1. Create `packages/shared/src/constants/protocol/catalogues/<type>.ts`
   exporting `<TYPE>_PRIMARY_PROTOCOLS` and/or `<TYPE>_SECONDARY_PROTOCOLS`
   (+ `<TYPE>_SECONDARY_PATCHES` if it amends existing protocols).
2. Wire it into
   [`catalogues/index.ts`](../../packages/shared/src/constants/protocol/catalogues/index.ts)
   (`getPrimaryProtocolCatalogue` / `getSecondaryProtocolCatalogue`) — the only
   dispatch point.
3. Add the exports to the `ALL_*` arrays in
   [`protocolCatalogues.test.ts`](../../packages/shared/src/constants/protocol/__tests__/protocolCatalogues.test.ts).
4. Run `npx vitest run src/constants/protocol/__tests__/protocolCatalogues.test.ts --pool=forks`
   and `npm run lint`.

> **Verification discipline (Windows):** always bound vitest with
> `--pool=forks` and a timeout — the default threads pool hangs at exit on
> Windows. Run the full repo's `npm test` / `npm run lint` before claiming done.
