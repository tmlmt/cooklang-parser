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

const keyFoldMap: Record<string, string> = {
  œ: "oe",
  æ: "ae",
  ß: "ss",
  ø: "o",
  đ: "d",
  ł: "l",
  þ: "th",
};

/**
 * Builds a key for comparing names (ingredients, units, aliases).
 * Case-, accent-, apostrophe- and whitespace-insensitive. For matching only:
 * never use it to rewrite or display data.
 */
export function normalizeKey(s: string): string {
  return s
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘ʼ]/g, "'")
    .toLowerCase()
    .replace(/[œæßøđłþ]/g, (c) => keyFoldMap[c]!)
    .replace(/\s+/g, " ")
    .trim();
}
