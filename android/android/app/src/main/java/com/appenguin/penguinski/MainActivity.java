package com.appenguin.penguinski;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Apply window insets to the root view
        View rootView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        // System bars behavior
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), rootView);
        if (controller != null) {
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }

        // Handle back button - pause game instead of navigating
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    // Inject ESC key press to pause/unpause the game
                    // The game handles ESC for pause menu
                    webView.evaluateJavascript(
                        "if(window.__gameTogglePause)window.__gameTogglePause();",
                        null
                    );
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        // Add progress bar and set custom clients after bridge is ready
        getBridge().getWebView().post(() -> {
            setupProgressBar();
            setupDownloadListener();
            getBridge().setWebViewClient(new AppWebViewClient(getBridge()));
            getBridge().getWebView().setWebChromeClient(new AppWebChromeClient());
        });
    }

    /**
     * Add a progress bar at the top of the screen.
     */
    private void setupProgressBar() {
        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setIndeterminate(false);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.GONE);

        // Style: thin bar at top, accent color
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                8  // 8px height
        );
        params.gravity = Gravity.TOP;
        progressBar.setLayoutParams(params);

        // Use app accent color (#0a1628 = dark blue)
        progressBar.getProgressDrawable().setColorFilter(
                Color.parseColor("#94a3b8"),
                android.graphics.PorterDuff.Mode.SRC_IN
        );

        parent.addView(progressBar);
    }

    /**
     * Set up download listener for file downloads.
     */
    private void setupDownloadListener() {
        getBridge().getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));

                // Get filename from URL or content disposition
                String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);

                // Set download settings
                request.setMimeType(mimeType);
                request.addRequestHeader("cookie", CookieManager.getInstance().getCookie(url));
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(filename);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                // Start download
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                dm.enqueue(request);

                Toast.makeText(this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                // Fallback: open in browser
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
            }
        });
    }

    /**
     * Custom WebViewClient to handle external URLs.
     */
    private class AppWebViewClient extends BridgeWebViewClient {
        public AppWebViewClient(com.getcapacitor.Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            String host = uri.getHost();

            // Handle mailto links
            if ("mailto".equals(scheme)) {
                Intent intent = new Intent(Intent.ACTION_SENDTO, uri);
                startActivity(Intent.createChooser(intent, "Send email"));
                return true;
            }

            // Handle tel links
            if ("tel".equals(scheme)) {
                Intent intent = new Intent(Intent.ACTION_DIAL, uri);
                startActivity(intent);
                return true;
            }

            // Handle Play Store links
            if (host != null && (
                    (host.equals("play.google.com") && uri.getPath() != null && uri.getPath().contains("store/apps"))
                    || "market".equals(scheme))) {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            }

            return super.shouldOverrideUrlLoading(view, request);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            if (progressBar != null) {
                progressBar.setProgress(0);
                progressBar.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (progressBar != null) {
                progressBar.setVisibility(View.GONE);
            }
        }
    }

    /**
     * WebChromeClient to track page load progress.
     */
    private class AppWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
            if (progressBar != null) {
                progressBar.setProgress(newProgress);
            }
        }
    }
}
