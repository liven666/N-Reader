package com.liven666.nreader;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

@CapacitorPlugin(name = "NgaHttp")
public class NgaHttpPlugin extends Plugin {
    private static final Charset GBK = Charset.forName("GBK");
    private static final int MAX_REDIRECTS = 5;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, String> sessionCookies = new LinkedHashMap<>();
    private String lastUid = "";
    private String lastCid = "";

    @PluginMethod
    public void request(PluginCall call) {
        executor.execute(() -> {
            try {
                JSObject result = performRequest(call);
                call.resolve(result);
            } catch (Exception error) {
                call.reject(error.getMessage(), error);
            }
        });
    }

    private JSObject performRequest(PluginCall call) throws Exception {
        String originalUrl = call.getString("url");
        if (originalUrl == null || originalUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing NGA request URL");
        }

        String method = call.getString("method", "GET").toUpperCase(Locale.ROOT);
        String uid = normalizeCookieValue(call.getString("uid"), "ngaPassportUid");
        String cid = normalizeCookieValue(call.getString("cid"), "ngaPassportCid");
        Object postData = call.getData().opt("postData");
        byte[] requestBody = encodePostData(postData);
        String currentUrl = originalUrl;
        resetSessionIfCredentialsChanged(uid, cid);

        for (int redirects = 0; redirects < MAX_REDIRECTS; redirects++) {
            HttpURLConnection connection = (HttpURLConnection) new URL(currentUrl).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setRequestMethod(method);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            connection.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            connection.setRequestProperty("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");
            connection.setRequestProperty("Referer", "https://bbs.nga.cn/");

            String cookieHeader = buildCookieHeader(uid, cid);
            if (cookieHeader != null && !cookieHeader.isEmpty()) {
                connection.setRequestProperty("Cookie", cookieHeader);
            }

            if ("POST".equals(method)) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=GBK");
                if (requestBody != null) {
                    connection.setFixedLengthStreamingMode(requestBody.length);
                    try (OutputStream output = connection.getOutputStream()) {
                        output.write(requestBody);
                    }
                }
            }

            int status = connection.getResponseCode();
            storeSetCookies(connection);
            if (isRedirect(status)) {
                String location = connection.getHeaderField("Location");
                if (location != null && location.contains("__lib=login")) {
                    return buildResponse(403, currentUrl, "{\"error\":[\"15:访客不能直接访问，请登录\"]}");
                }
                if (location != null && !location.isEmpty()) {
                    currentUrl = preserveOutputParam(originalUrl, new URL(new URL(currentUrl), location).toString());
                    continue;
                }
            }

            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            String decoded = new String(readAllBytes(stream), GBK);
            return buildResponse(status, connection.getURL().toString(), decoded);
        }

        throw new IllegalStateException("Too many NGA redirects");
    }

    private boolean isRedirect(int status) {
        return status == HttpURLConnection.HTTP_MOVED_PERM
            || status == HttpURLConnection.HTTP_MOVED_TEMP
            || status == HttpURLConnection.HTTP_SEE_OTHER
            || status == 307
            || status == 308;
    }

    private String normalizeCookieValue(String value, String name) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        String prefix = name + "=";
        int prefixIndex = trimmed.indexOf(prefix);
        if (prefixIndex >= 0) {
            trimmed = trimmed.substring(prefixIndex + prefix.length());
        }

        int semicolonIndex = trimmed.indexOf(";");
        if (semicolonIndex >= 0) {
            trimmed = trimmed.substring(0, semicolonIndex);
        }

        return trimmed.trim();
    }

    private void resetSessionIfCredentialsChanged(String uid, String cid) {
        String nextUid = uid == null ? "" : uid;
        String nextCid = cid == null ? "" : cid;
        synchronized (sessionCookies) {
            if (!nextUid.equals(lastUid) || !nextCid.equals(lastCid)) {
                sessionCookies.clear();
                lastUid = nextUid;
                lastCid = nextCid;
            }
        }
    }

    private String buildCookieHeader(String uid, String cid) {
        StringBuilder header = new StringBuilder();
        if (uid != null && !uid.isEmpty() && cid != null && !cid.isEmpty()) {
            appendCookie(header, "ngaPassportUid", uid);
            appendCookie(header, "ngaPassportCid", cid);
        }

        synchronized (sessionCookies) {
            for (Map.Entry<String, String> entry : sessionCookies.entrySet()) {
                String name = entry.getKey();
                if ("ngaPassportUid".equalsIgnoreCase(name) || "ngaPassportCid".equalsIgnoreCase(name)) {
                    continue;
                }
                appendCookie(header, name, entry.getValue());
            }
        }

        return header.length() == 0 ? null : header.toString();
    }

    private void appendCookie(StringBuilder header, String name, String value) {
        if (name == null || name.isEmpty() || value == null || value.isEmpty()) {
            return;
        }
        if (header.length() > 0) {
            header.append("; ");
        }
        header.append(name).append("=").append(value);
    }

    private void storeSetCookies(HttpURLConnection connection) {
        Map<String, List<String>> headers = connection.getHeaderFields();
        if (headers == null) {
            return;
        }

        synchronized (sessionCookies) {
            for (Map.Entry<String, List<String>> header : headers.entrySet()) {
                if (header.getKey() == null || !"Set-Cookie".equalsIgnoreCase(header.getKey())) {
                    continue;
                }
                for (String cookie : header.getValue()) {
                    storeSetCookie(cookie);
                }
            }
        }
    }

    private void storeSetCookie(String cookie) {
        if (cookie == null || cookie.trim().isEmpty()) {
            return;
        }

        String pair = cookie.split(";", 2)[0].trim();
        int equalsIndex = pair.indexOf("=");
        if (equalsIndex <= 0) {
            return;
        }

        String name = pair.substring(0, equalsIndex).trim();
        String value = pair.substring(equalsIndex + 1).trim();
        if (name.isEmpty() || "ngaPassportUid".equalsIgnoreCase(name) || "ngaPassportCid".equalsIgnoreCase(name)) {
            return;
        }
        if (value.isEmpty()) {
            sessionCookies.remove(name);
        } else {
            sessionCookies.put(name, value);
        }
    }

    private JSObject buildResponse(int status, String url, String text) {
        JSObject result = new JSObject();
        result.put("status", status);
        result.put("url", url);
        result.put("text", text);
        return result;
    }

    private byte[] encodePostData(Object postData) throws Exception {
        if (postData == null || postData == JSONObject.NULL) {
            return null;
        }

        if (postData instanceof JSONObject) {
            JSONObject json = (JSONObject) postData;
            StringBuilder body = new StringBuilder();
            Iterator<String> keys = json.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = json.opt(key);
                if (value == null || value == JSONObject.NULL) {
                    continue;
                }
                if (body.length() > 0) {
                    body.append("&");
                }
                body.append(percentEncodeGbk(key)).append("=").append(percentEncodeGbk(String.valueOf(value)));
            }
            return body.toString().getBytes(Charset.forName("US-ASCII"));
        }

        if (postData instanceof String) {
            return ((String) postData).getBytes(GBK);
        }

        return String.valueOf(postData).getBytes(GBK);
    }

    private String percentEncodeGbk(String value) {
        byte[] bytes = value.getBytes(GBK);
        StringBuilder encoded = new StringBuilder(bytes.length * 3);
        for (byte item : bytes) {
            encoded.append("%");
            String hex = Integer.toHexString(item & 0xff).toUpperCase(Locale.ROOT);
            if (hex.length() == 1) {
                encoded.append("0");
            }
            encoded.append(hex);
        }
        return encoded.toString();
    }

    private String preserveOutputParam(String originalUrl, String redirectedUrl) {
        String output = getQueryParam(originalUrl, "__output");
        if (output == null || getQueryParam(redirectedUrl, "__output") != null) {
            return redirectedUrl;
        }

        int hashIndex = redirectedUrl.indexOf("#");
        String base = hashIndex >= 0 ? redirectedUrl.substring(0, hashIndex) : redirectedUrl;
        String fragment = hashIndex >= 0 ? redirectedUrl.substring(hashIndex) : "";
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + "__output=" + output + fragment;
    }

    private String getQueryParam(String url, String name) {
        int queryStart = url.indexOf("?");
        if (queryStart < 0) {
            return null;
        }

        int hashStart = url.indexOf("#", queryStart);
        String query = hashStart >= 0 ? url.substring(queryStart + 1, hashStart) : url.substring(queryStart + 1);
        for (String part : query.split("&")) {
            int equalsIndex = part.indexOf("=");
            String key = equalsIndex >= 0 ? part.substring(0, equalsIndex) : part;
            if (name.equals(key)) {
                return equalsIndex >= 0 ? part.substring(equalsIndex + 1) : "";
            }
        }
        return null;
    }

    private byte[] readAllBytes(InputStream input) throws Exception {
        if (input == null) {
            return new byte[0];
        }

        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = stream.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
            return output.toByteArray();
        }
    }
}
