import JSON5 from "json5";

export function parseNgaPayload(raw: string): any {
  let cleanStr = raw.trim();

  cleanStr = cleanStr.replace(/^(window\.|var\s+)?script_muti_get_var_store=/, "");
  if (cleanStr.endsWith(";")) {
    cleanStr = cleanStr.slice(0, -1);
  }

  cleanStr = cleanStr.replace(/[\u0000-\u001F]/g, (char) => {
    if (char === "\t") return "\\t";
    if (char === "\n") return "\\n";
    if (char === "\r") return "\\r";
    return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).slice(-4);
  });

  cleanStr = cleanStr.replace(/\\x([0-9a-fA-F]{2})/g, "\\u00$1");

  try {
    return JSON5.parse(cleanStr);
  } catch (error) {
    try {
      const fixedStr = cleanStr.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
      return JSON5.parse(fixedStr);
    } catch (secondError) {
      const start = cleanStr.indexOf("{");
      const end = cleanStr.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        return JSON5.parse(cleanStr.substring(start, end + 1));
      }
      throw secondError;
    }
  }
}

