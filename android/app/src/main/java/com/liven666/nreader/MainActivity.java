package com.liven666.nreader;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final OnBackPressedCallback backCallback = new OnBackPressedCallback(true) {
        @Override
        public void handleOnBackPressed() {
            handleBackNavigation();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NgaHttpPlugin.class);
        registerPlugin(InternalBrowserPlugin.class);
        super.onCreate(savedInstanceState);
        configureInternalBrowsing();
        getOnBackPressedDispatcher().addCallback(this, backCallback);
    }

    private void handleBackNavigation() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        finish();
    }

    private void configureInternalBrowsing() {
        if (getBridge() == null || getBridge().getWebView() == null) return;

        WebView webView = getBridge().getWebView();
        webView.getSettings().setSupportMultipleWindows(true);
        webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);

        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (shouldOpenInInternalBrowser(uri)) {
                    openInternalBrowser(uri.toString());
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });

        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView childWebView = new WebView(view.getContext());
                childWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView childView, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (isHttpUrl(uri)) {
                            openInternalBrowser(uri.toString());
                        }
                        return true;
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(childWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    private void openInternalBrowser(String url) {
        Intent intent = new Intent(this, InternalBrowserActivity.class);
        intent.putExtra("url", url);
        startActivity(intent);
    }

    private boolean shouldOpenInInternalBrowser(Uri uri) {
        if (!isHttpUrl(uri)) return false;
        String host = uri.getHost();
        return host != null && !host.equals("localhost") && !host.equals("127.0.0.1") && !host.equals("::1");
    }

    private boolean isHttpUrl(Uri uri) {
        if (uri == null || uri.getScheme() == null) return false;
        String scheme = uri.getScheme().toLowerCase();
        return "http".equals(scheme) || "https".equals(scheme);
    }
}
