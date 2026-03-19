# F3 Final TTFB Verdict - 2026-03-19

Output: `Routes [2/6 under 500ms] | Avg cfWorker improvement [42.3%] | VERDICT: REJECT`

## Why

- Approval gate requires all target routes under 500ms TTFB
- Passed: `/learners` (`497ms`), `/tags` (`346ms`)
- Failed: `/` (`881ms`), `/logs` (`522ms`), `/learners/sunkima26` (`804ms`), `/logs/39` (`810ms`)

## Key takeaways

- Biggest win: `/learners/sunkima26` cfWorker improved from `1800ms` to `512ms` (`-71.6%`)
- Strong win: `/tags` improved from `767ms` to `346ms` TTFB and from `411ms` to `167ms` cfWorker
- Regression to watch: `/logs` rose from `496ms` to `522ms`; `/logs/39` rose from `660ms` to `810ms`
- Exact-match average cfWorker improved from `408.9ms` to `235.8ms` across 10 comparable routes (`42.3%`)

## Related evidence

- Detailed comparison: `.sisyphus/evidence/f3-comparison.md`
- Baseline: `.sisyphus/evidence/task-1-baseline.md`
