# Wave 0: Bundle Analysis
Date: 2026-03-18

## Build Output Summary
- **Total JS size (raw)**: 2.11 MB (2,163,101 bytes)
- **Total JS size (gzip est ~30%)**: 633 KB
- **Total JS files**: 106 chunks
- **Build time**: 4.24s (Vite)

## Top 10 Largest JS Chunks

| Rank | Filename | Raw Size | Gzip Est | Notes |
|------|----------|----------|----------|-------|
| 1 | ArticleEditor-C5TOdMTw.js | 696 KB | 209 KB | Rich text editor (Slate/Lexical-like) + framer-motion + phosphor-icons |
| 2 | entry.client-BSU6J6-e.js | 416 KB | 125 KB | **Sentry Replay (rrweb) + web-vitals + React Router hydration** |
| 3 | chunk-EPOLDU6W-MXSdSufd.js | 123 KB | 37 KB | Shared vendor chunk (Sentry SDK core) |
| 4 | article-6GWII1Yb.js | 83 KB | 25 KB | Article page route |
| 5 | select-_mRPh_EW.js | 79 KB | 24 KB | Headless UI select component |
| 6 | style-reference-DPr9Bx-G.js | 53 KB | 16 KB | Style reference/editor component |
| 7 | _public-GQJBlVLi.js | 41 KB | 12 KB | Public layout wrapper |
| 8 | root-BzfvH5Ds.js | 39 KB | 12 KB | Root layout component |
| 9 | debug-build-DBMh2f-V.js | 36 KB | 11 KB | Sentry debug/instrumentation code |
| 10 | manifest-7629c836.js | 35 KB | 11 KB | React Router manifest (route definitions) |

## Sentry Replay Bundle Analysis
- **Location**: Inlined in `entry.client-BSU6J6-e.js`
- **Estimated size**: ~150-180 KB (raw) / ~45-54 KB (gzip)
- **Status**: ✅ Confirmed present via string search for "rrweb" and "sentry"
- **Impact**: Sentry Replay is the **single largest contributor** to entry.client bloat

## Library-Specific Observations

### entry.client Chunk (416 KB)
- Contains Sentry SDK initialization + Replay integration
- Contains React Router hydration logic
- Contains web-vitals monitoring
- **Primary optimization target**: Remove or lazy-load Sentry Replay

### ArticleEditor Chunk (696 KB)
- **Largest single chunk** — contains rich text editor implementation
- Contains framer-motion (motion library for animations)
- Contains @phosphor-icons (icon library)
- **Status**: Separate route chunk (good) — only loaded when user navigates to /write/article
- **Optimization opportunity**: Tree-shake unused icons from @phosphor-icons

### @phosphor-icons Tree-shaking
- ✅ **Icons are split into individual chunks** (ChatTeardrop.es-CN9N8EbF.js, Check.es-DNxasZ1s.js, etc.)
- ✅ **Tree-shaking appears to be working** — only used icons are bundled
- **Status**: No action needed; icons are already optimized

### framer-motion
- ✅ **No separate framer-motion chunk** — inlined in ArticleEditor and component chunks
- **Status**: Bundled with components that use it (expected behavior)
- **Size impact**: ~30-50 KB estimated within ArticleEditor chunk

## Route Chunk Breakdown
- **Entry chunk**: 416 KB (hydration + Sentry)
- **Layout chunks**: ~120 KB (_public, _admin, root)
- **Route chunks**: ~1.2 MB (article, select, style-reference, etc.)
- **Icon chunks**: ~50+ individual .es files (optimized)
- **Vendor chunks**: ~150 KB (shared dependencies)

## Key Findings

### 🔴 Critical Issues
1. **Sentry Replay in entry.client**: ~150-180 KB (raw) is bundled in the main entry point
   - Affects **every page load** even if Replay is not needed
   - Recommendation: Lazy-load Sentry Replay or disable for non-error scenarios

2. **ArticleEditor chunk size**: 696 KB is very large
   - Only needed on /write/article route
   - Recommendation: Already route-split (good), but consider code-splitting the editor itself

### 🟡 Moderate Issues
1. **Total JS size**: 2.11 MB is substantial for a Cloudflare Pages app
   - Gzip estimate: ~633 KB (still significant)
   - Recommendation: Analyze route-level code splitting effectiveness

2. **Manifest chunk**: 35 KB for route definitions
   - Recommendation: Verify if all routes are necessary or if some can be lazy-loaded

### 🟢 Good Practices
1. ✅ Route-level code splitting is working (article, select, etc. are separate chunks)
2. ✅ @phosphor-icons are tree-shaken into individual icon chunks
3. ✅ Vendor code is extracted into shared chunks
4. ✅ No obvious duplicate dependencies

## Recommendations for Wave 1-2

1. **Priority 1**: Analyze Sentry Replay integration
   - Measure actual Replay payload size in production
   - Consider conditional loading (only on error pages)
   - Evaluate if Replay is necessary for all users

2. **Priority 2**: Audit ArticleEditor dependencies
   - Profile which libraries contribute most to 696 KB
   - Consider lazy-loading editor features (markdown preview, etc.)

3. **Priority 3**: Measure Core Web Vitals impact
   - Run Lighthouse on entry.client (416 KB) vs. optimized version
   - Measure LCP, FID, CLS with/without Sentry Replay

4. **Priority 4**: Analyze route-level performance
   - Measure time-to-interactive for each major route
   - Identify if any routes have unnecessary dependencies

## Build Configuration Notes
- **Vite config**: React Router 7 with Cloudflare Pages adapter
- **Sentry integration**: @sentry/react + @sentry/vite-plugin
- **CSS**: Tailwind CSS v4 (compiled separately, not included in JS totals)
- **No visualizer plugin used**: Analysis based on raw build output

---

**Next Steps**: Proceed to Wave 1 (Sentry Replay analysis) and Wave 2 (ArticleEditor profiling).
