package com.aqsaseries.tv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Opens the remote-friendly Aqsa Series interface in an Android TV browser. */
public final class MainActivity extends Activity {
    private static final Uri TV_URL = Uri.parse("https://www.aqsaseries.com/tv");

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Intent open = new Intent(Intent.ACTION_VIEW, TV_URL);
        open.setPackage("com.internet.tvbrowser");
        try {
            startActivity(open);
        } catch (ActivityNotFoundException missingPreferredBrowser) {
            open.setPackage(null);
            try {
                startActivity(open);
            } catch (ActivityNotFoundException noBrowser) {
                // No browser is installed. The user can still open the URL on another device.
            }
        }
        finish();
    }
}
