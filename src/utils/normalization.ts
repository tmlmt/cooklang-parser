const fullWidthSyntaxMap: Record<string, string> = {
  "＠": "@",
  "＃": "#",
  "～": "~",
  "〜": "~",
  "｛": "{",
  "｝": "}",
  "（": "(",
  "）": ")",
  "［": "[",
  "］": "]",
  "％": "%",
  "｜": "|",
  "：": ":",
  "，": ",",
  "．": ".",
  "／": "/",
  "－": "-",
  "＝": "=",
  "\u3000": " ",
};

/**
 * Normalizes parser-significant full-width characters without changing prose.
 */
export function normalizeInputString(input: string): string {
  return input.replace(
    /[＠＃～〜｛｝（）［］％｜：，．／－＝\u3000０-９]/g,
    (char) => {
      if (char >= "０" && char <= "９") {
        return String(char.charCodeAt(0) - "０".charCodeAt(0));
      }
      return fullWidthSyntaxMap[char]!;
    },
  );
}
