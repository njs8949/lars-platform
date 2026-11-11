package com.larsinc.rekora.wrap

import com.larsinc.rekora.wrap.live.LiveWrapPlugin
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // Native live wrap view (CameraX + ML Kit subject mask + GL colour blend -> Flutter Texture).
        flutterEngine.plugins.add(LiveWrapPlugin())
    }
}
