/** First sentence of a meeting turn, so every line fits in the dialog; a clause cut at a semicolon ends with a full stop. */
export const firstSentence = (text: string) =>
  text.split(/(?<=[.؛;])\s/)[0].replace(/[;؛]$/, ".");
