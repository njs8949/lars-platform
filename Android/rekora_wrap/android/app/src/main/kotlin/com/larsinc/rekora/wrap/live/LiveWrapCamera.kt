package com.larsinc.rekora.wrap.live

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentationResult
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenter
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import java.nio.ByteBuffer
import java.util.concurrent.Executors

/**
 * CameraX side of the live wrap view.
 *  - Preview  -> the renderer's camera surface (GPU, no CPU copy).
 *  - Analysis -> ML Kit subject segmentation every [analyseEvery] frames (the mask is uploaded to the renderer).
 *  - Capture  -> a full-resolution JPEG for the wrap request.
 */
class LiveWrapCamera(
    private val context: Context,
    private val renderer: LiveWrapRenderer,
    private val lifecycleOwner: LifecycleOwner,
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private val cameraExecutor = Executors.newSingleThreadExecutor()

    private var provider: ProcessCameraProvider? = null
    private var preview: Preview? = null
    private var analysisUseCase: ImageAnalysis? = null
    private var imageCapture: ImageCapture? = null
    private var segmenter: SubjectSegmenter? = null
    private var frameCounter = 0
    private val analyseEvery = 3

    fun start(onReady: (Boolean, String?) -> Unit) {
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            try {
                val cameraProvider = future.get()
                provider = cameraProvider
                cameraProvider.unbindAll()

                val preview = Preview.Builder().build().also { p ->
                    this.preview = p
                    p.setSurfaceProvider(cameraExecutor) { request ->
                        val res = request.resolution
                        renderer.setCameraSize(res.width, res.height)
                        request.provideSurface(renderer.cameraSurface, cameraExecutor) { }
                    }
                }

                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setTargetResolution(Size(640, 480))
                    .build()
                analysis.setAnalyzer(analysisExecutor) { image -> analyse(image) }
                analysisUseCase = analysis

                imageCapture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()

                segmenter = SubjectSegmentation.getClient(
                    SubjectSegmenterOptions.Builder()
                        .enableForegroundConfidenceMask()
                        .build()
                )

                cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis,
                    imageCapture,
                )
                renderer.start()
                onReady(true, null)
            } catch (e: Throwable) {
                onReady(false, e.message ?: "camera start failed")
            }
        }, mainHandler::post)
    }

    /** Follows the device rotation: Surface.ROTATION_* of the display (0, 90, 180, 270). */
    fun setDisplayRotation(rotation: Int) {
        mainHandler.post {
            preview?.targetRotation = rotation
            imageCapture?.targetRotation = rotation
            analysisUseCase?.targetRotation = rotation
        }
    }

    fun stop() {
        renderer.stop()
        renderer.clearMask()
        mainHandler.post {
            provider?.unbindAll()
        }
        segmenter?.close()
        segmenter = null
    }

    /** Captures a full-resolution JPEG (upright as the sensor delivers it; Dart rotates if needed). */
    fun takePicture(onResult: (ByteArray?, String?) -> Unit) {
        val capture = imageCapture
        if (capture == null) {
            onResult(null, "camera not running")
            return
        }
        capture.takePicture(cameraExecutor, object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(image: ImageProxy) {
                try {
                    val buffer: ByteBuffer = image.planes[0].buffer
                    val bytes = ByteArray(buffer.remaining())
                    buffer.get(bytes)
                    onResult(bytes, null)
                } finally {
                    image.close()
                }
            }

            override fun onError(exception: ImageCaptureException) {
                onResult(null, exception.message ?: "capture failed")
            }
        })
    }

    private fun analyse(imageProxy: ImageProxy) {
        frameCounter++
        if (frameCounter % analyseEvery != 0) {
            imageProxy.close()
            return
        }
        val media = imageProxy.image
        val seg = segmenter
        if (media == null || seg == null) {
            imageProxy.close()
            return
        }
        val rotation = imageProxy.imageInfo.rotationDegrees
        val input = InputImage.fromMediaImage(media, rotation)
        val task: Task<SubjectSegmentationResult> = seg.process(input)
        task.addOnSuccessListener(analysisExecutor) { result ->
            // Build the mask on the upright frame grid from each subject's own box and mask. ML Kit's
            // full-image mask is square and does not line up with the camera frame, so it is not used.
            val upright = rotation == 90 || rotation == 270
            val uw = if (upright) imageProxy.height else imageProxy.width
            val uh = if (upright) imageProxy.width else imageProxy.height
            val full = FloatArray(uw * uh)
            var used = 0
            for (subject in result.subjects) {
                val m = subject.confidenceMask ?: continue
                val sw = subject.width
                val sh = subject.height
                android.util.Log.d("LiveWrap", "subject x=${subject.startX} y=${subject.startY} w=$sw h=$sh cap=${m.capacity()} frame=${uw}x${uh} rot=$rotation")
                if (sw <= 0 || sh <= 0 || m.capacity() != sw * sh) continue
                used++
                for (yy in 0 until sh) {
                    val fy = subject.startY + yy
                    if (fy < 0 || fy >= uh) continue
                    for (xx in 0 until sw) {
                        val fx = subject.startX + xx
                        if (fx < 0 || fx >= uw) continue
                        val v = m.get(yy * sw + xx)
                        val idx = fy * uw + fx
                        if (v > full[idx]) full[idx] = v
                    }
                }
            }
            if (used == 0) {
                renderer.clearMask()
            } else {
                renderer.uploadMaskArray(full, uw, uh)
            }
        }.addOnCompleteListener(analysisExecutor) {
            imageProxy.close()
        }
    }
}

/** Lifecycle owner the plugin uses to bind CameraX (the Flutter activity is not a LifecycleOwner). */
class PluginLifecycle : LifecycleOwner {
    private val registry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = registry
    fun resume() { registry.currentState = Lifecycle.State.RESUMED }
    fun destroy() { registry.currentState = Lifecycle.State.DESTROYED }
}
