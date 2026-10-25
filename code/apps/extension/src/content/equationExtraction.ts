/** Extract semantic source before reading rendered math text. */
export function equationFromElement(element: Element): string {
  const root = element.closest('.katex, mjx-container, .MathJax, .MathJax_SVG, math, [data-tex], [data-latex]') || element;
  for (const attr of ['data-tex', 'data-latex']) {
    const value = root.getAttribute(attr);
    if (value) return value.trim();
  }
  const annotation = root.querySelector('annotation[encoding="application/x-tex"], annotation[encoding="application/x-latex"]');
  if (annotation?.textContent) return annotation.textContent.trim();
  const script = root.nextElementSibling;
  if (script?.matches('script[type^="math/tex"]')) return script.textContent?.trim() || '';
  const math = root.matches('math') ? root : root.querySelector('math');
  if (math) return math.getAttribute('alttext') || mathText(math);
  const img = root.matches('img[alt]') ? root : root.querySelector('img[alt]');
  if (img) return img.getAttribute('alt')?.trim() || '';
  return root.getAttribute('aria-label')?.trim() || '';
}
function mathText(node: Element): string {
  const children = Array.from(node.children);
  const parts = children.map(mathText);
  switch (node.localName) {
    case 'annotation': case 'annotation-xml': return '';
    case 'semantics': return parts[0] || '';
    case 'mfrac': return `((${parts[0]})/(${parts[1]}))`;
    case 'msup': return `(${parts[0]})^(${parts[1]})`;
    case 'msqrt': return `sqrt(${parts.join('')})`;
    case 'mroot': return `(${parts[0]})^(1/(${parts[1]}))`;
    case 'msub': case 'msubsup': case 'munder': case 'munderover': case 'mtable': return '\\unsupportedMathML';
    case 'mfenced': return `${node.getAttribute('open') || '('}${parts.join(',')}${node.getAttribute('close') || ')'}`;
    default: return children.length ? parts.join('') : node.textContent || '';
  }
}
export function extractSelectedEquation(selection = window.getSelection()): string {
  if (!selection || !selection.rangeCount || selection.isCollapsed) return '';
  const range = selection.getRangeAt(0);
  const ancestor = range.commonAncestorContainer;
  const parent = ancestor.nodeType === 1 ? ancestor as Element : ancestor.parentElement;
  if (!parent) return selection.toString().trim();
  const enclosing = parent.closest('.katex, mjx-container, .MathJax, .MathJax_SVG, math, [data-tex], [data-latex]');
  if (enclosing) return equationFromElement(enclosing) || selection.toString().trim();
  const candidates = Array.from(parent.querySelectorAll('.katex, mjx-container, .MathJax, .MathJax_SVG, math, img[alt], [data-tex], [data-latex]'))
    .filter(el => range.intersectsNode(el))
    .filter((el, _, all) => !all.some(other => other !== el && other.contains(el)));
  if (candidates.length === 1) return equationFromElement(candidates[0]) || selection.toString().trim();
  if (candidates.length > 1) return 'Select one equation at a time.';
  const raw = selection.toString().trim();
  if (/^\(?\d+\)?\.?$/.test(raw)) {
    const row = parent.closest('tr, figure');
    const equations = row?.querySelectorAll('img.numberedequation[alt], img.displayformula[alt], math, .katex, mjx-container');
    if (equations?.length === 1) return equationFromElement(equations[0]);
    return '';
  }
  const fragment = range.cloneContents();
  fragment.querySelectorAll('sup').forEach(el => el.replaceWith(`^(${el.textContent})`));
  fragment.querySelectorAll('sub').forEach(el => el.replaceWith(`_(${el.textContent})`));
  return fragment.textContent?.trim() || selection.toString().trim();
}
