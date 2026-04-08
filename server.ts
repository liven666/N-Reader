import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import iconv from "iconv-lite";
import path from "path";
import JSON5 from "json5";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // NGA Proxy Endpoint
  app.post("/api/nga", async (req, res) => {
    try {
      const { url, uid, cid, method = "GET", postData } = req.body;
      const headers: any = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      };
      
      if (uid && cid) {
        headers["Cookie"] = `ngaPassportUid=${uid}; ngaPassportCid=${cid};`;
      }

      if (method === "POST") {
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=GBK";
      }

      let encodedData: Buffer | undefined;
      if (postData) {
        if (typeof postData === 'object') {
          // Serialize object to GBK URL-encoded string
          const parts = [];
          for (const key in postData) {
            const value = postData[key];
            if (value !== undefined && value !== null) {
              const gbkKey = iconv.encode(key, 'gbk');
              const gbkValue = iconv.encode(String(value), 'gbk');
              
              let encodedKey = '';
              for (let i = 0; i < gbkKey.length; i++) {
                encodedKey += '%' + gbkKey[i].toString(16).toUpperCase();
              }
              
              let encodedValue = '';
              for (let i = 0; i < gbkValue.length; i++) {
                encodedValue += '%' + gbkValue[i].toString(16).toUpperCase();
              }
              
              parts.push(`${encodedKey}=${encodedValue}`);
            }
          }
          encodedData = Buffer.from(parts.join('&'));
        } else {
          encodedData = iconv.encode(postData, 'gbk');
        }
      }

      let response;
      let retries = 0;
      let json;
      while (retries < 3) {
        try {
          response = await axios({
            method: method,
            url: url,
            headers,
            data: encodedData,
            responseType: "arraybuffer",
            timeout: 10000,
            maxRedirects: 0,
          });

          // NGA uses GBK encoding
          const decoded = iconv.decode(response.data, "gbk");
          
          let cleanStr = decoded.trim();
          
          // Remove NGA's JS wrapper if present
          cleanStr = cleanStr.replace(/^(window\.|var\s+)?script_muti_get_var_store=/, '');
          if (cleanStr.endsWith(';')) {
              cleanStr = cleanStr.slice(0, -1);
          }
          
          // 1. Replace raw control characters with escaped unicode
          cleanStr = cleanStr.replace(/[\u0000-\u001F]/g, (c) => {
            if (c === '\t') return '\\t';
            if (c === '\n') return '\\n';
            if (c === '\r') return '\\r';
            return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
          });

          // 2. Replace \xXX hex escapes with \u00XX
          cleanStr = cleanStr.replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1');
          
          try {
              // Try JSON5 first as it's more forgiving for NGA's JS-like output
              json = JSON5.parse(cleanStr);
              break; // Success
          } catch (e) {
              // Try regex fix for unquoted keys then JSON5 again
              try {
                  const fixedStr = cleanStr.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
                  json = JSON5.parse(fixedStr);
                  break; // Success
              } catch (e2) {
                  // Last resort: try to find the first { and last } to extract the object
                  const start = cleanStr.indexOf('{');
                  const end = cleanStr.lastIndexOf('}');
                  if (start !== -1 && end !== -1 && end > start) {
                      try {
                          const extracted = cleanStr.substring(start, end + 1);
                          json = JSON5.parse(extracted);
                          break; // Success
                      } catch (e3) {
                          throw e2;
                      }
                  } else {
                      throw e2;
                  }
              }
          }
        } catch (error: any) {
          retries++;
          if (retries >= 3) throw error;
          console.warn(`Retry ${retries} for ${url} due to error: ${error.message}`);
        }
      }
      
      res.json(json);
    } catch (error: any) {
      if (error.response && error.response.status === 302) {
        const location = error.response.headers.location;
        const locStr = Array.isArray(location) ? location[0] : location;
        if (locStr && locStr.includes('__lib=login')) {
          return res.status(403).json({ error: ["15:访客不能直接访问，请登录"] });
        } else {
          console.error("Unexpected 302 redirect to:", locStr);
          return res.status(500).json({ error: "Unexpected redirect from NGA", location: locStr });
        }
      }
      if (error.response && error.response.status === 403) {
        try {
          const decoded = iconv.decode(error.response.data, "gbk");
          let cleanStr = decoded.replace(/\t/g, '\\t');
          cleanStr = cleanStr.replace(/\n/g, '\\n');
          cleanStr = cleanStr.replace(/\r/g, '\\r');
          const json = JSON.parse(cleanStr);
          return res.status(403).json(json);
        } catch (e) {
          return res.status(403).json({ error: ["15:访客不能直接访问，请登录"] });
        }
      }
      console.error("NGA Proxy Error:", error.message);
      res.status(500).json({ error: ["Failed to fetch from NGA"] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
