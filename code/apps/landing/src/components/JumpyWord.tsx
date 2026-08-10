interface JumpyWordProps {
  /** Cycled in order. The longest one sets the reserved width. */
  words: string[];
  /** Which word to show. Owned by the caller via `useWordCycle`. */
  index: number;
  className?: string;
}

/**
 * Shows `words[index]`, springing up into place on each change. Hidden copies
 * of every word hold the line width steady so the sentence never reflows.
 */
export function JumpyWord({ words, index, className = '' }: JumpyWordProps) {
  return (
    <span className="jumpy-list">
      {words.map((word) => (
        <span key={word} aria-hidden className={`jumpy-list-measure ${className}`}>
          {word}
        </span>
      ))}
      {/* `key` restarts the entrance animation on every swap. */}
      <span key={index} aria-live="polite" className={`jumpy-list-item ${className}`}>
        {words[index]}
      </span>
    </span>
  );
}
