package com.anushdcosta.cryptochat;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "WhatsAppScanner")
public class WhatsAppScannerPlugin extends Plugin {

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.addCategory("android.intent.category.DEFAULT");
                    intent.setData(Uri.parse(String.format("package:%s", getContext().getPackageName())));
                    getActivity().startActivity(intent);
                    call.resolve(new JSObject().put("granted", false).put("message", "Requested permission via settings"));
                } catch (Exception e) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    getActivity().startActivity(intent);
                    call.resolve(new JSObject().put("granted", false).put("message", "Requested permission via settings fallback"));
                }
                return;
            }
        }
        call.resolve(new JSObject().put("granted", true));
    }

    @PluginMethod
    public void scanStickers(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                call.reject("Permission not granted");
                return;
            }
        }

        JSArray stickers = new JSArray();
        
        // WhatsApp stickers path on Android 11+
        File dir = new File(Environment.getExternalStorageDirectory(), "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Stickers");
        if (!dir.exists() || !dir.isDirectory()) {
            // Fallback for older WhatsApp versions or Android 10-
            dir = new File(Environment.getExternalStorageDirectory(), "WhatsApp/Media/WhatsApp Stickers");
        }

        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile() && file.getName().endsWith(".webp")) {
                        stickers.put(file.getAbsolutePath());
                    }
                }
            }
        }
        
        JSObject ret = new JSObject();
        ret.put("stickers", stickers);
        call.resolve(ret);
    }
}
