/** Convert common scalar LaTeX without discarding unknown commands. */
export function normalizeLatex(raw: string): string {
  let s = raw.trim().replace(/^\$\$?|\$\$?$/g, '').replace(/^\\[([]|\\[)\]]$/g, '')
    .replace(/\\(?:left|right|displaystyle|textstyle)\b/g, '')
    .replace(/\\(?:,|;|!|quad\b|qquad\b| )/g, ' ')
    .replace(/\\(?:cdot|times)\b/g, '*').replace(/\\div\b/g, '/')
    .replace(/\\(?:pi|theta)\b/g, m => m.slice(1))
    .replace(/\\(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|exp|log|ln|abs)\b/g, m => m.slice(1))
    .replace(/\\(?:operatorname|mathrm)\{([a-zA-Z]+)\}/g, '$1');
  let pos = 0;
  function argument(depth: number): string {
    while (/\s/.test(s[pos] || '') && pos < s.length) pos++;
    if (s[pos] !== '{') throw new Error('Expected a braced LaTeX argument');
    pos++;
    const result = sequence(depth + 1, true);
    return result;
  }
  function sequence(depth: number, grouped = false): string {
    if (depth > 64) throw new Error('Equation nesting is too deep');
    let result = '';
    while (pos < s.length) {
      if (s[pos] === '}') {
        if (!grouped) throw new Error('Unmatched brace');
        pos++;
        return result;
      }
      const command = s.slice(pos).match(/^\\(dfrac|tfrac|frac|sqrt)\b/);
      if (command) {
        pos += command[0].length;
        if (command[1] === 'sqrt') {
          while (s[pos] === ' ') pos++;
          let index = '';
          if (s[pos] === '[') {
            const end = s.indexOf(']', ++pos);
            if (end < 0) throw new Error('Unclosed root index');
            index = s.slice(pos, end); pos = end + 1;
          }
          const body = argument(depth);
          result += index ? `((${body})^(1/(${index})))` : `sqrt(${body})`;
        } else {
          const numerator = argument(depth), denominator = argument(depth);
          result += `((${numerator})/(${denominator}))`;
        }
      } else if (s[pos] === '{') {
        result += `(${argument(depth)})`;
      } else result += s[pos++];
    }
    if (grouped) throw new Error('Unclosed brace');
    return result;
  }
  try { return sequence(0); } catch { return s; }
}
