package com.anushdcosta.cryptochat;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.UUID;

@CapacitorPlugin(name = "WhatsAppSticker")
public class WhatsAppStickerPlugin extends Plugin {

    private JSArray pendingStickers = new JSArray();
    private String pendingPackName = "";

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        processIntent(intent);
    }

    public void processIntent(Intent intent) {
        if (intent == null) return;
        
        String action = intent.getAction();
        if ("com.whatsapp.intent.action.ENABLE_STICKER_PACK".equals(action)) {
            String packId = intent.getStringExtra("sticker_pack_id");
            String authority = intent.getStringExtra("sticker_pack_authority");
            String packName = intent.getStringExtra("sticker_pack_name");
            
            if (authority == null || packId == null) return;
            
            pendingPackName = packName != null ? packName : "Unknown Pack";
            
            new Thread(() -> {
                try {
                    ContentResolver resolver = getContext().getContentResolver();
                    Uri queryUri = Uri.parse("content://" + authority + "/stickers/" + packId);
                    
                    Cursor cursor = resolver.query(queryUri, new String[]{"image_file"}, null, null, null);
                    if (cursor != null) {
                        JSArray stickers = new JSArray();
                        
                        while (cursor.moveToNext()) {
                            String imageFile = cursor.getString(cursor.getColumnIndexOrThrow("image_file"));
                            
                            Uri assetUri = Uri.parse("content://" + authority + "/stickers_asset/" + packId + "/" + imageFile);
                            InputStream is = resolver.openInputStream(assetUri);
                            
                            if (is != null) {
                                File cacheDir = getContext().getCacheDir();
                                File outFile = new File(cacheDir, UUID.randomUUID().toString() + ".webp");
                                FileOutputStream fos = new FileOutputStream(outFile);
                                
                                byte[] buffer = new byte[1024];
                                int len;
                                while ((len = is.read(buffer)) != -1) {
                                    fos.write(buffer, 0, len);
                                }
                                fos.close();
                                is.close();
                                
                                stickers.put(outFile.getAbsolutePath());
                            }
                        }
                        cursor.close();
                        
                        pendingStickers = stickers;
                        
                        // Notify JS that a pack is ready
                        JSObject ret = new JSObject();
                        ret.put("packName", pendingPackName);
                        ret.put("count", pendingStickers.length());
                        notifyListeners("stickerPackReceived", ret);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    @PluginMethod
    public void getPendingPack(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("packName", pendingPackName);
        ret.put("stickers", pendingStickers);
        call.resolve(ret);
        
        // Clear after sending
        pendingStickers = new JSArray();
        pendingPackName = "";
    }
}
