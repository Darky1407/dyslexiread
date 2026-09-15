/**
 * bionicParser.js
 *
 * Converts plain text into bionic reading tokens where initial letters (~35%) of words are bolded.
 */

export function parseBionic(text, boldRatio = 0.35) {
  if (!text) return [];

  const tokens = text.split(/(\s+)/);

  return tokens.map((token, idx) => {
    if (/^\s+$/.test(token) || token.length === 0) {
      return <span key={idx}>{token}</span>;
    }
    const boldLength = Math.max(1, Math.ceil(token.length * boldRatio));
    const boldPart = token.slice(0, boldLength);
    const restPart = token.slice(boldLength);

    return (
      <span key={idx}>
        <strong style={{ fontWeight: 700 }}>{boldPart}</strong>
        {restPart}
      </span>
    );
  });
}
