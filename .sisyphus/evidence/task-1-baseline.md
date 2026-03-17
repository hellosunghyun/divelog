# Task 1: Performance Baseline Measurement

**Date**: 2026-03-17  
**Measurement Method**: curl TTFB (Time To First Byte), pnpm build output analysis  
**Environment**: Production site (https://divelog.ada-kr-pos.com)

---

## 1. TTFB Measurements (3 runs per page)

### Home Page (`/`)
| Run | TTFB (s) | Total (s) |
|-----|----------|-----------|
| 1   | 1.717    | 1.850     |
| 2   | 1.457    | 1.593     |
| 3   | 1.657    | 1.790     |
| **Average** | **1.610** | **1.744** |

### Journey Page (`/journey`)
| Run | TTFB (s) | Total (s) |
|-----|----------|-----------|
| 1   | 0.700    | 0.731     |
| 2   | 0.895    | 0.909     |
| 3   | 0.966    | 0.993     |
| **Average** | **0.854** | **0.878** |

### Logs Page (`/logs`)
| Run | TTFB (s) | Total (s) |
|-----|----------|-----------|
| 1   | 1.007    | 1.177     |
| 2   | 0.664    | 0.832     |
| 3   | 0.689    | 0.855     |
| **Average** | **0.787** | **0.955** |

### Learners Page (`/learners`)
| Run | TTFB (s) | Total (s) |
|-----|----------|-----------|
| 1   | 0.987    | 1.008     |
| 2   | 0.917    | 0.930     |
| 3   | 1.038    | 1.050     |
| **Average** | **0.981** | **0.996** |

---

## 2. Build Output Analysis

**Build Command**: `pnpm build`  
**Build Time**: 4.79s (React Router) + 121ms (Cloudflare bundling)  
**Build Status**: ✅ Success (Sentry sourcemap upload skipped due to missing auth token — non-critical)

### Total Bundle Size
- **Total JS Size**: 2.3 MB (109 files)
- **Worker Bundle**: 4.6 MB (build/worker.js)

### Top 5 Largest Chunks
| Rank | File | Size |
|------|------|------|
| 1 | ArticleEditor-CWrIPaqK.js | 697 KB |
| 2 | entry.client-B18jwJKo.js | 410 KB |
| 3 | chunk-EPOLDU6W-VtQRAE-0.js | 123 KB |
| 4 | article-B-t-n6H_.js | 82 KB |
| 5 | select-BNQFpYbw.js | 79 KB |

**Total of Top 5**: 1,391 KB (60.5% of total JS)

---

## 3. Key Observations

1. **TTFB Variance**: Home page shows highest TTFB (1.61s avg), Journey page fastest (0.85s avg)
2. **ArticleEditor Dominance**: Single chunk (ArticleEditor) is 697 KB — largest optimization target
3. **Entry Client Large**: entry.client at 410 KB suggests heavy framework/runtime overhead
4. **Chunk Count**: 109 JS files indicates aggressive code splitting, but top 5 chunks still dominate
5. **Worker Bundle**: 4.6 MB worker.js is expected for Cloudflare Pages Functions (includes server-side code)

---

## 4. Baseline Targets for Optimization

Based on this measurement, optimization should focus on:
- **ArticleEditor chunk** (697 KB) — lazy load or split further
- **entry.client** (410 KB) — framework overhead, consider tree-shaking
- **chunk-EPOLDU6W** (123 KB) — identify and split
- **Overall TTFB** — currently 0.78–1.61s, target: <0.5s

---

## 5. Verification Checklist

- [x] TTFB measured for 4 pages (3 runs each)
- [x] Build executed successfully
- [x] Top 5 chunks identified
- [x] Total JS size calculated
- [x] Results recorded in markdown format
- [x] No code changes made
- [x] No commits created
