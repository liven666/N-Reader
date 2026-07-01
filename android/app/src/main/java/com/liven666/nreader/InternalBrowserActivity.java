package com.liven666.nreader;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

public class InternalBrowserActivity extends Activity {
    private static final int SURFACE_COLOR = Color.rgb(255, 253, 245);
    private static final int TEXT_COLOR = Color.rgb(31, 41, 55);
    private static final int ACCENT_COLOR = Color.rgb(217, 119, 6);

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();

        String url = getIntent().getStringExtra("url");
        if (url == null || url.trim().isEmpty()) {
            finish();
            return;
        }
        String uid = getIntent().getStringExtra("uid");
        String cid = getIntent().getStringExtra("cid");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(SURFACE_COLOR);

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(8), dp(8), dp(8), dp(8));
        toolbar.setBackgroundColor(SURFACE_COLOR);

        TextView back = toolbarButton("Back");
        back.setOnClickListener(view -> {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
            } else {
                finish();
            }
        });

        TextView title = new TextView(this);
        title.setText("N-Reader");
        title.setTextColor(TEXT_COLOR);
        title.setTextSize(16);
        title.setGravity(Gravity.CENTER);
        title.setSingleLine(true);
        toolbar.addView(back, new LinearLayout.LayoutParams(dp(72), dp(44)));
        toolbar.addView(title, new LinearLayout.LayoutParams(0, dp(44), 1));

        TextView close = toolbarButton("Done");
        close.setOnClickListener(view -> finish());
        toolbar.addView(close, new LinearLayout.LayoutParams(dp(72), dp(44)));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(true);
        applyNgaCookies(uid, cid);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !isHttpUrl(uri);
            }

            @Override
            public void onPageFinished(WebView view, String loadedUrl) {
                super.onPageFinished(view, loadedUrl);
                title.setText(view.getTitle() == null || view.getTitle().trim().isEmpty() ? "N-Reader" : view.getTitle());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView childWebView = new WebView(view.getContext());
                childWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView childView, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (isHttpUrl(uri)) {
                            webView.loadUrl(uri.toString());
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

        root.addView(toolbar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(60)));
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        applySystemInsets(root, toolbar);

        webView.loadUrl(url);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private TextView toolbarButton(String text) {
        TextView button = new TextView(this);
        button.setText(text);
        button.setTextColor(ACCENT_COLOR);
        button.setTextSize(14);
        button.setGravity(Gravity.CENTER);
        return button;
    }

    private void configureSystemBars() {
        getWindow().setStatusBarColor(SURFACE_COLOR);
        getWindow().setNavigationBarColor(SURFACE_COLOR);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
    }

    private void applySystemInsets(LinearLayout root, LinearLayout toolbar) {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int topInset = insets.getSystemWindowInsetTop();
            int bottomInset = insets.getSystemWindowInsetBottom();

            toolbar.setPadding(dp(8), topInset + dp(8), dp(8), dp(8));
            ViewGroup.LayoutParams toolbarParams = toolbar.getLayoutParams();
            toolbarParams.height = topInset + dp(60);
            toolbar.setLayoutParams(toolbarParams);

            if (webView != null) {
                webView.setPadding(0, 0, 0, bottomInset);
            }

            return insets;
        });
        root.requestApplyInsets();
    }

    private boolean isHttpUrl(Uri uri) {
        if (uri == null || uri.getScheme() == null) return false;
        String scheme = uri.getScheme().toLowerCase();
        return "http".equals(scheme) || "https".equals(scheme);
    }

    private void applyNgaCookies(String uid, String cid) {
        if (uid == null || cid == null || uid.trim().isEmpty() || cid.trim().isEmpty()) return;

        String safeUid = uid.replace(";", "").trim();
        String safeCid = cid.replace(";", "").trim();
        String guestJs = String.valueOf(System.currentTimeMillis() / 1000);
        CookieManager cookieManager = CookieManager.getInstance();
        String[] urls = new String[] {
            "https://bbs.nga.cn",
            "https://ngabbs.com",
            "https://nga.178.com"
        };

        for (String cookieUrl : urls) {
            cookieManager.setCookie(cookieUrl, "ngaPassportUid=" + safeUid + "; Path=/");
            cookieManager.setCookie(cookieUrl, "ngaPassportCid=" + safeCid + "; Path=/");
            cookieManager.setCookie(cookieUrl, "guestJs=" + guestJs + "; Path=/");
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.flush();
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
