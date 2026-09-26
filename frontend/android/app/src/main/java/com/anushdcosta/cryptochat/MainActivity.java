package com.anushdcosta.cryptochat;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.content.Intent;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WhatsAppStickerPlugin.class);
        registerPlugin(WhatsAppScannerPlugin.class);
        super.onCreate(savedInstanceState);
        
        WhatsAppStickerPlugin plugin = (WhatsAppStickerPlugin) bridge.getPlugin("WhatsAppSticker").getInstance();
        if (plugin != null) {
            plugin.processIntent(getIntent());
        }
    }
}
