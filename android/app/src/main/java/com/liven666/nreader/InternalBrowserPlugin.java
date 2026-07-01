package com.liven666.nreader;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "InternalBrowser")
public class InternalBrowserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (!isHttpUrl(url)) {
            call.reject("Invalid URL");
            return;
        }

        Intent intent = new Intent(getActivity(), InternalBrowserActivity.class);
        intent.putExtra("url", url);
        intent.putExtra("uid", call.getString("uid"));
        intent.putExtra("cid", call.getString("cid"));
        getActivity().startActivity(intent);
        call.resolve();
    }

    private boolean isHttpUrl(String rawUrl) {
        if (rawUrl == null) return false;
        Uri uri = Uri.parse(rawUrl);
        String scheme = uri.getScheme();
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }
}
