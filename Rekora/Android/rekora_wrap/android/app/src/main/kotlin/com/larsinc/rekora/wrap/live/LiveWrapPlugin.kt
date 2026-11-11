package com.larsinc.rekora.wrap.live

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.view.OrientationEventListener
import android.view.Surface
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.view.TextureRegistry

/**
 * Flutter entry point for the native live wrap view.
 * Channel: `rekora/live_wrap`
 *  - start()            -> { textureId, width, height } | error
 *  - stop()
 *  - setTint({r,g,b})   colour 0..1
 *  - takePicture()      -> Uint8List (JPEG)
 */
class LiveWrapPlugin : FlutterPlugin, MethodChannel.MethodCallHandler, ActivityAware {
    private lateinit var channel: MethodChannel
    private lateinit var textures: TextureRegistry
    private lateinit var appContext: android.content.Context
    private val main = Handler(Looper.getMainLooper())

    private var activityBinding: ActivityPluginBinding? = null
    private var pendingStart: MethodChannel.Result? = null

    private var producer: TextureRegistry.SurfaceProducer? = null
    private var renderer: LiveWrapRenderer? = null
    private var camera: LiveWrapCamera? = null
    private var lifecycle: PluginLifecycle? = null
    private var orientationListener: OrientationEventListener? = null
    private var lastRotation = Surface.ROTATION_0
    private var channelRef: MethodChannel? = null

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        appContext = binding.applicationContext
        textures = binding.textureRegistry
        channel = MethodChannel(binding.binaryMessenger, "rekora/live_wrap")
        channel.setMethodCallHandler(this)
        channelRef = channel
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
        channelRef = null
        teardown()
    }

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activityBinding = binding
        binding.addRequestPermissionsResultListener { requestCode, permissions, grantResults ->
            if (requestCode != PERMISSION_REQUEST) return@addRequestPermissionsResultListener false
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingStart?.let { result ->
                pendingStart = null
                if (granted) startInternal(result) else result.error("permission_denied", "camera permission denied", null)
            }
            true
        }
    }

    override fun onDetachedFromActivityForConfigChanges() { activityBinding = null }
    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) { activityBinding = binding }
    override fun onDetachedFromActivity() { activityBinding = null }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "start" -> {
                if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    val activity = activityBinding?.activity
                    if (activity == null) {
                        result.error("no_activity", "no activity to request camera permission", null)
                        return
                    }
                    pendingStart = result
                    ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.CAMERA), PERMISSION_REQUEST)
                    return
                }
                startInternal(result)
            }
            "stop" -> {
                teardown()
                result.success(null)
            }
            "setTint" -> {
                val r = (call.argument<Number>("r") ?: 0.5).toFloat()
                val g = (call.argument<Number>("g") ?: 0.5).toFloat()
                val b = (call.argument<Number>("b") ?: 0.5).toFloat()
                renderer?.setTint(r, g, b)
                result.success(null)
            }
            "takePicture" -> {
                val cam = camera
                if (cam == null) {
                    result.error("not_running", "live camera is not running", null)
                    return
                }
                cam.takePicture { bytes, error ->
                    main.post {
                        if (bytes != null) result.success(bytes) else result.error("capture_failed", error, null)
                    }
                }
            }
            else -> result.notImplemented()
        }
    }

    private fun startInternal(result: MethodChannel.Result) {
        if (producer != null) {
            // Already running: return the same texture.
            result.success(mapOf("textureId" to producer!!.id(), "width" to OUT_W, "height" to OUT_H))
            return
        }
        try {
            val p = textures.createSurfaceProducer()
            p.setSize(OUT_W, OUT_H)
            val r = LiveWrapRenderer(p.surface)
            r.setOutputSize(OUT_W, OUT_H)
            if (!r.init()) {
                p.release()
                result.error("gl_init_failed", "GL pipeline could not start", null)
                return
            }
            val owner = PluginLifecycle()
            owner.resume()
            val cam = LiveWrapCamera(appContext, r, owner)
            producer = p
            renderer = r
            camera = cam
            lifecycle = owner
            cam.setDisplayRotation(Surface.ROTATION_0)
            startOrientation()
            cam.start { ok, error ->
                main.post {
                    if (ok) {
                        result.success(mapOf("textureId" to p.id(), "width" to OUT_W, "height" to OUT_H))
                    } else {
                        teardown()
                        result.error("camera_failed", error, null)
                    }
                }
            }
        } catch (e: Throwable) {
            teardown()
            result.error("start_failed", e.message, null)
        }
    }

    /**
     * The native output stays portrait (fixed buffer, fixed CameraX target rotation). When the phone is rotated,
     * only the display rotation is sent to Dart, which turns the texture with RotatedBox. Resizing the GL buffer
     * or changing the CameraX rotation on rotation is what produced the squashed preview.
     */
    private fun startOrientation() {
        orientationListener?.disable()
        val listener = object : OrientationEventListener(appContext) {
            override fun onOrientationChanged(degrees: Int) {
                if (degrees == ORIENTATION_UNKNOWN) return
                val rotation = when {
                    degrees >= 315 || degrees < 45 -> Surface.ROTATION_0
                    degrees < 135 -> Surface.ROTATION_270
                    degrees < 225 -> Surface.ROTATION_180
                    else -> Surface.ROTATION_90
                }
                if (rotation == lastRotation) return
                lastRotation = rotation
                val degreesOut = when (rotation) {
                    Surface.ROTATION_90 -> 90
                    Surface.ROTATION_180 -> 180
                    Surface.ROTATION_270 -> 270
                    else -> 0
                }
                main.post {
                    channelRef?.invokeMethod("orientation", mapOf("rotation" to degreesOut))
                }
            }
        }
        listener.enable()
        orientationListener = listener
    }

    private fun teardown() {
        orientationListener?.disable()
        orientationListener = null
        lastRotation = Surface.ROTATION_0
        camera?.stop()
        renderer?.release()
        lifecycle?.destroy()
        producer?.release()
        camera = null
        renderer = null
        lifecycle = null
        producer = null
    }

    companion object {
        private const val PERMISSION_REQUEST = 7341
        // Portrait output (the app is portrait); the preview is rotated to match in the renderer.
        private const val OUT_W = 720
        private const val OUT_H = 1280
    }
}
