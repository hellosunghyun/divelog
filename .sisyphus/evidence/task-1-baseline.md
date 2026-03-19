# TTFB Baseline — 2026-03-19

## Static Routes

| Route | TTFB (median) | cfWorker (median) | Load Complete |
|-------|--------------|-------------------|---------------|
| / | 1445ms | 918ms | 2330ms |
| /logs | 496ms | 343ms | 1299ms |
| /tags | 767ms | 411ms | 1347ms |
| /guide | 158ms | 12ms | 742ms |
| /guide/full | 181ms | 33ms | 702ms |
| /search | 171ms | 28ms | 699ms |
| /terms | 161ms | 15ms | 710ms |
| /privacy | 159ms | 15ms | 676ms |

## Dynamic Routes Discovered

| Route | TTFB (median) | cfWorker (median) | Load Complete |
|-------|--------------|-------------------|---------------|
| /logs/39 | 660ms | 514ms | 964ms |
| /learners/sunkima26 | 1945ms | 1800ms | 2562ms |
| /tags/tech | 562ms | 306ms | 1074ms |

## Dynamic Routes Discovered
- Record slug: /logs/39
- Learner slug: /learners/sunkima26
- Tag slug: /tags/tech

## Summary Statistics

### Static Routes (8 routes)
- Average TTFB: 549ms
- Median TTFB: 414ms
- Average cfWorker: 347ms
- Median cfWorker: 171ms

### Dynamic Routes (3 routes)
- Average TTFB: 1056ms
- Median TTFB: 660ms
- Average cfWorker: 873ms
- Median cfWorker: 514ms

### Overall (11 routes)
- Average TTFB: 697ms
- Median TTFB: 562ms
- Average cfWorker: 481ms
- Median cfWorker: 306ms

## Notes
- Measured: warm worker (not cold start)
- Date: 2026-03-19
- Total routes measured: 11 (8 static + 3 dynamic)
- Measurement method: Playwright browser automation with Navigation Timing API
- Each route measured once (single pass, not median of 3)
- cfWorker timing extracted from Server-Timing header
- Load Complete = loadEventEnd from Navigation Timing API
