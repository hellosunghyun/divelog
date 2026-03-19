# F3 TTFB Comparison - 2026-03-19

## Deployment and migration

- Build: success
- Deploy: success (`Current Version ID: 75b78640-eca7-49b2-9443-1302754e0e08`)
- Health check after 30s: `200`
- Remote D1 migration: `0016_composite_index_records.sql` applied

## Measurement method

- Tool: Playwright Navigation Timing API
- Warm worker rule: each route loaded twice, second load used
- Measured routes: 14 public routes (11 static + 3 dynamic)
- Baseline source: `.sisyphus/evidence/task-1-baseline.md`

## Before/after table

| Route | Before TTFB | After TTFB | TTFB delta | Before cfWorker | After cfWorker | cfWorker delta | Load Complete | Note |
|-------|-------------|------------|------------|-----------------|----------------|----------------|---------------|------|
| `/` | 1445ms | 881ms | -564ms (-39.0%) | 918ms | 725ms | -193ms (-21.0%) | 1044ms | target |
| `/logs` | 496ms | 522ms | +26ms (+5.2%) | 343ms | 365ms | +22ms (+6.4%) | 740ms | target |
| `/learners` | N/A | 497ms | N/A | N/A | 344ms | N/A | 703ms | newly measured target |
| `/journey` | N/A | 606ms | N/A | N/A | 178ms | N/A | 885ms | newly measured |
| `/questions` | N/A | 325ms | N/A | N/A | 173ms | N/A | 348ms | newly measured |
| `/tags` | 767ms | 346ms | -421ms (-54.9%) | 411ms | 167ms | -244ms (-59.4%) | 506ms | target |
| `/guide` | 158ms | 164ms | +6ms (+3.8%) | 12ms | 13ms | +1ms (+8.3%) | 485ms | comparable |
| `/guide/full` | 181ms | 229ms | +48ms (+26.5%) | 33ms | 16ms | -17ms (-51.5%) | 504ms | comparable |
| `/search` | 171ms | 261ms | +90ms (+52.6%) | 28ms | 25ms | -3ms (-10.7%) | 561ms | comparable |
| `/terms` | 161ms | 160ms | -1ms (-0.6%) | 15ms | 10ms | -5ms (-33.3%) | 495ms | comparable |
| `/privacy` | 159ms | 164ms | +5ms (+3.1%) | 15ms | 10ms | -5ms (-33.3%) | 450ms | comparable |
| `/logs/39` | 660ms | 810ms | +150ms (+22.7%) | 514ms | 515ms | +1ms (+0.2%) | 970ms | target dynamic |
| `/learners/sunkima26` | 1945ms | 804ms | -1141ms (-58.7%) | 1800ms | 512ms | -1288ms (-71.6%) | 969ms | target dynamic |
| `/tags/cbl` | N/A | 695ms | N/A | N/A | 309ms | N/A | 852ms | discovered dynamic tag |

## Comparison notes

- Exact baseline matches exist for 10 routes: `/`, `/logs`, `/tags`, `/guide`, `/guide/full`, `/search`, `/terms`, `/privacy`, `/logs/39`, `/learners/sunkima26`
- Baseline dynamic tag route was `/tags/tech`; current first discovered tag route is `/tags/cbl`, so exact before/after comparison for `tags/:slug` is not available
- Average cfWorker across the 10 exact-match routes improved from `408.9ms` to `235.8ms` (`42.3%` improvement)
- Overall measured routes under 500ms TTFB: `8/14`

## Target route gate

Required routes for approval: `/`, `/logs`, `/learners`, `/learners/sunkima26`, `/tags`, `/logs/39`

| Route | After TTFB | Under 500ms |
|-------|------------|-------------|
| `/` | 881ms | No |
| `/logs` | 522ms | No |
| `/learners` | 497ms | Yes |
| `/learners/sunkima26` | 804ms | No |
| `/tags` | 346ms | Yes |
| `/logs/39` | 810ms | No |

- Target routes under 500ms: `2/6`
- Result: `REJECT`
