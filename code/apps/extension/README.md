# QuickPlot extension

Build from this directory with `pnpm build`. In Chrome or Edge, open the extensions manager, enable Developer mode, choose Load unpacked, and select this directory's `dist` folder. After rebuilding, reload the extension and refresh article tabs.

Select one equation, then open QuickPlot or use the selection context menu. Extraction supports common KaTeX annotations, MathJax semantic MathML or adjacent TeX scripts, native MathML, equation-image alt text, and HTML superscripts. Paste LaTeX or use Snip Page / upload when a page exposes no semantic source.

The grapher supports scalar Cartesian, implicit x/y, and polar r/theta equations. Common LaTeX fractions, roots, grouping, powers, and trig notation are normalized. Parameters must be replaced with numbers. Integrals, matrices, systems, inequalities, and arbitrary article notation are not universally supported; unsupported structures produce errors rather than being flattened into different formulas.

OCR uses a bundled worker and WebAssembly runtime. Its English recognition data requires a network connection on first use. OCR is approximate: review the recognized equation before plotting, particularly fractions and superscripts. Browser-protected pages may require uploading a screenshot instead of page selection.

Validation: `pnpm exec vitest run --maxWorkers=1 --minWorkers=1` and `pnpm build`. Automated coverage checks parsing, numeric evaluation, notation preservation, unsupported inputs, and OCR text cleanup. Live publisher pages and end-to-end browser OCR still require manual verification.
