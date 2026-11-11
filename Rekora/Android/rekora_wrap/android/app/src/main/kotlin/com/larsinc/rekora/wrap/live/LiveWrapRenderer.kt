package com.larsinc.rekora.wrap.live

import android.graphics.SurfaceTexture
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.EGLContext
import android.opengl.EGLDisplay
import android.opengl.EGLSurface
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.os.Handler
import android.os.HandlerThread
import android.view.Surface
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * GPU side of the live wrap view. Everything here runs on one GL thread:
 *  - the camera frames arrive as an external OES texture (no CPU copy),
 *  - the ML Kit subject mask is uploaded as a luminance texture,
 *  - a fragment shader blends the wrap colour into the masked body while keeping the photo's brightness
 *    (the same idea as the iOS CIColorBlendMode + CIOverlayBlendMode path),
 *  - the result is drawn into the Flutter SurfaceProducer surface, which Dart shows as a Texture.
 */
class LiveWrapRenderer(private val output: Surface) {
    private val thread = HandlerThread("LiveWrapGL").apply { start() }
    val handler = Handler(thread.looper)

    private var eglDisplay: EGLDisplay = EGL14.EGL_NO_DISPLAY
    private var eglContext: EGLContext = EGL14.EGL_NO_CONTEXT
    private var eglSurface: EGLSurface = EGL14.EGL_NO_SURFACE
    private var program = 0
    private var cameraTexture = 0
    private var maskTexture = 0
    private var uCam = 0
    private var uMask = 0
    private var uTint = 0
    private var uHasMask = 0
    private var uTexMatrix = 0

    // Same default as iOS (targetColor = .blue): the recognised vehicle is highlighted from the start.
    private var tint = floatArrayOf(0.0f, 0.0f, 1.0f)
    private var hasMask = false
    private val texMatrix = FloatArray(16)
    private var outW = 1280
    private var outH = 720
    private var pendingFrame = false
    private var running = false

    /** Surface the CameraX preview renders into. Created on the GL thread during [init]. */
    lateinit var cameraSurface: Surface
        private set
    private lateinit var cameraSurfaceTexture: SurfaceTexture

    private val quad: FloatBuffer = ByteBuffer.allocateDirect(4 * 4 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
        // x, y, u, v (triangle strip)
        put(floatArrayOf(-1f, -1f, 0f, 0f, 1f, -1f, 1f, 0f, -1f, 1f, 0f, 1f, 1f, 1f, 1f, 1f))
        position(0)
    }

    /** Creates the GL context and the camera texture. Blocks until done. */
    fun init(): Boolean {
        var ok = false
        val latch = java.util.concurrent.CountDownLatch(1)
        handler.post {
            try {
                setupEgl()
                setupGl()
                ok = true
            } catch (e: Throwable) {
                android.util.Log.e("LiveWrap", "GL init failed", e)
            } finally {
                latch.countDown()
            }
        }
        latch.await()
        return ok
    }

    fun setCameraSize(width: Int, height: Int) {
        handler.post {
            cameraSurfaceTexture.setDefaultBufferSize(width, height)
        }
    }

    fun setOutputSize(width: Int, height: Int) {
        outW = width
        outH = height
    }

    fun setTint(r: Float, g: Float, b: Float) {
        handler.post { tint = floatArrayOf(r, g, b) }
    }

    /** Uploads a mask (0..1 confidence, row-major, [w] x [h]). Called from the ML Kit callback. */
    fun uploadMask(confidence: java.nio.FloatBuffer, w: Int, h: Int) {
        val bytes = ByteArray(w * h)
        val src = confidence.duplicate()
        src.rewind()
        for (i in 0 until w * h) {
            val v = src.get(i).coerceIn(0f, 1f)
            bytes[i] = (v * 255f).toInt().toByte()
        }
        handler.post {
            val buf = ByteBuffer.wrap(bytes)
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, maskTexture)
            GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D, 0, GLES20.GL_LUMINANCE, w, h, 0, GLES20.GL_LUMINANCE, GLES20.GL_UNSIGNED_BYTE, buf)
            hasMask = true
        }
    }

    /** Uploads a mask that is already laid out on the upright frame grid (w x h, 0..1 per pixel). */
    fun uploadMaskArray(values: FloatArray, w: Int, h: Int) {
        val bytes = ByteArray(w * h)
        for (i in 0 until w * h) {
            bytes[i] = (values[i].coerceIn(0f, 1f) * 255f).toInt().toByte()
        }
        handler.post {
            val buf = ByteBuffer.wrap(bytes)
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, maskTexture)
            GLES20.glPixelStorei(GLES20.GL_UNPACK_ALIGNMENT, 1)
            GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D, 0, GLES20.GL_LUMINANCE, w, h, 0, GLES20.GL_LUMINANCE, GLES20.GL_UNSIGNED_BYTE, buf)
            hasMask = true
        }
    }

    fun clearMask() {
        handler.post { hasMask = false }
    }

    /** Called on each new camera frame (from the SurfaceTexture listener). */
    fun requestDraw() {
        if (!running) return
        if (pendingFrame) return
        pendingFrame = true
        handler.post {
            pendingFrame = false
            drawFrame()
        }
    }

    fun start() {
        handler.post {
            running = true
            cameraSurfaceTexture.setOnFrameAvailableListener({ requestDraw() }, handler)
        }
    }

    fun stop() {
        handler.post {
            running = false
        }
    }

    fun release() {
        handler.post {
            try {
                cameraSurfaceTexture.release()
                cameraSurface.release()
                if (eglDisplay != EGL14.EGL_NO_DISPLAY) {
                    EGL14.eglMakeCurrent(eglDisplay, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
                    if (eglSurface != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(eglDisplay, eglSurface)
                    if (eglContext != EGL14.EGL_NO_CONTEXT) EGL14.eglDestroyContext(eglDisplay, eglContext)
                    EGL14.eglTerminate(eglDisplay)
                }
            } catch (e: Throwable) {
                android.util.Log.w("LiveWrap", "release: ${e.message}")
            } finally {
                thread.quitSafely()
            }
        }
    }

    // ── EGL ─────────────────────────────────────────────────────────────

    private fun setupEgl() {
        eglDisplay = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
        val version = IntArray(2)
        EGL14.eglInitialize(eglDisplay, version, 0, version, 1)
        val attribs = intArrayOf(
            EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 8,
            EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT, EGL14.EGL_NONE
        )
        val configs = arrayOfNulls<EGLConfig>(1)
        val num = IntArray(1)
        EGL14.eglChooseConfig(eglDisplay, attribs, 0, configs, 0, 1, num, 0)
        val config = configs[0] ?: throw IllegalStateException("No EGL config")
        val ctxAttribs = intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE)
        eglContext = EGL14.eglCreateContext(eglDisplay, config, EGL14.EGL_NO_CONTEXT, ctxAttribs, 0)
        eglSurface = EGL14.eglCreateWindowSurface(eglDisplay, config, output, intArrayOf(EGL14.EGL_NONE), 0)
        EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)
    }

    // ── GL resources ────────────────────────────────────────────────────

    private fun setupGl() {
        val tex = IntArray(2)
        GLES20.glGenTextures(2, tex, 0)
        cameraTexture = tex[0]
        maskTexture = tex[1]

        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTexture)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)

        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, maskTexture)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)

        program = buildProgram(VERTEX_SHADER, FRAGMENT_SHADER)
        GLES20.glUseProgram(program)
        uCam = GLES20.glGetUniformLocation(program, "uCam")
        uMask = GLES20.glGetUniformLocation(program, "uMask")
        uTint = GLES20.glGetUniformLocation(program, "uTint")
        uHasMask = GLES20.glGetUniformLocation(program, "uHasMask")
        uTexMatrix = GLES20.glGetUniformLocation(program, "uTexMatrix")

        cameraSurfaceTexture = SurfaceTexture(cameraTexture)
        cameraSurfaceTexture.setDefaultBufferSize(1280, 720)
        cameraSurface = Surface(cameraSurfaceTexture)
    }

    private fun drawFrame() {
        if (eglDisplay == EGL14.EGL_NO_DISPLAY) return
        try {
            cameraSurfaceTexture.updateTexImage()
        } catch (e: Throwable) {
            return
        }
        cameraSurfaceTexture.getTransformMatrix(texMatrix)

        EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)
        GLES20.glViewport(0, 0, outW, outH)
        GLES20.glUseProgram(program)

        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTexture)
        GLES20.glUniform1i(uCam, 0)

        GLES20.glActiveTexture(GLES20.GL_TEXTURE1)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, maskTexture)
        GLES20.glUniform1i(uMask, 1)

        GLES20.glUniform3f(uTint, tint[0], tint[1], tint[2])
        GLES20.glUniform1f(uHasMask, if (hasMask) 1f else 0f)
        GLES20.glUniformMatrix4fv(uTexMatrix, 1, false, texMatrix, 0)

        val aPos = GLES20.glGetAttribLocation(program, "aPos")
        val aTex = GLES20.glGetAttribLocation(program, "aTex")
        quad.position(0)
        GLES20.glVertexAttribPointer(aPos, 2, GLES20.GL_FLOAT, false, 16, quad)
        GLES20.glEnableVertexAttribArray(aPos)
        quad.position(2)
        GLES20.glVertexAttribPointer(aTex, 2, GLES20.GL_FLOAT, false, 16, quad)
        GLES20.glEnableVertexAttribArray(aTex)

        GLES20.glClearColor(0f, 0f, 0f, 1f)
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        EGL14.eglSwapBuffers(eglDisplay, eglSurface)
    }

    private fun buildProgram(vs: String, fs: String): Int {
        val v = compile(GLES20.GL_VERTEX_SHADER, vs)
        val f = compile(GLES20.GL_FRAGMENT_SHADER, fs)
        val p = GLES20.glCreateProgram()
        GLES20.glAttachShader(p, v)
        GLES20.glAttachShader(p, f)
        GLES20.glLinkProgram(p)
        val status = IntArray(1)
        GLES20.glGetProgramiv(p, GLES20.GL_LINK_STATUS, status, 0)
        if (status[0] == 0) throw IllegalStateException("link: " + GLES20.glGetProgramInfoLog(p))
        return p
    }

    private fun compile(type: Int, src: String): Int {
        val s = GLES20.glCreateShader(type)
        GLES20.glShaderSource(s, src)
        GLES20.glCompileShader(s)
        val status = IntArray(1)
        GLES20.glGetShaderiv(s, GLES20.GL_COMPILE_STATUS, status, 0)
        if (status[0] == 0) throw IllegalStateException("compile: " + GLES20.glGetShaderInfoLog(s))
        return s
    }

    companion object {
        private const val VERTEX_SHADER = """
            attribute vec4 aPos;
            attribute vec2 aTex;
            uniform mat4 uTexMatrix;
            varying vec2 vCam;
            varying vec2 vMask;
            void main() {
                gl_Position = aPos;
                vCam = (uTexMatrix * vec4(aTex, 0.0, 1.0)).xy;
                vMask = vCam;
            }
        """

        // Same three steps as the iOS path (LiveARWrappingView.applyWrapColor):
        //  1. CIColorBlendMode  - hue and saturation of the wrap colour, luminosity of the photo
        //  2. CIOverlayBlendMode - overlay of the wrap colour on the coloured body (vivid wrap)
        //  3. CIBlendWithMask   - only the masked vehicle pixels take the result
        private const val FRAGMENT_SHADER = """
            #extension GL_OES_EGL_image_external : require
            precision mediump float;
            uniform samplerExternalOES uCam;
            uniform sampler2D uMask;
            uniform vec3 uTint;
            uniform float uHasMask;
            varying vec2 vCam;
            varying vec2 vMask;

            float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }

            vec3 clipColor(vec3 c) {
                float l = lum(c);
                float n = min(min(c.r, c.g), c.b);
                float x = max(max(c.r, c.g), c.b);
                if (n < 0.0) c = l + (c - l) * l / (l - n);
                if (x > 1.0) c = l + (c - l) * (1.0 - l) / (x - l);
                return c;
            }

            // W3C "color" blend: keep the source hue and saturation, take the luminosity of the backdrop.
            vec3 setLum(vec3 c, float l) {
                return clipColor(c + (l - lum(c)));
            }

            float overlayCh(float base, float src) {
                return base <= 0.5 ? 2.0 * base * src : 1.0 - 2.0 * (1.0 - base) * (1.0 - src);
            }

            void main() {
                vec3 orig = texture2D(uCam, vCam).rgb;
                float m = texture2D(uMask, vMask).r * uHasMask;

                vec3 coloured = clamp(setLum(uTint, lum(orig)), 0.0, 1.0);
                vec3 vivid = vec3(
                    overlayCh(coloured.r, uTint.r),
                    overlayCh(coloured.g, uTint.g),
                    overlayCh(coloured.b, uTint.b)
                );
                gl_FragColor = vec4(mix(orig, clamp(vivid, 0.0, 1.0), m), 1.0);
            }
        """
    }
}
