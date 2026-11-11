import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Dart side of the native live wrap view (Kotlin: LiveWrapPlugin).
/// The camera, the ML Kit subject mask and the colour blend run on the GPU; Dart only shows the Texture.
class NativeLiveWrap {
  static const MethodChannel _channel = MethodChannel('rekora/live_wrap');

  /// Called by the native side when the phone is rotated: the display rotation in degrees (0, 90, 180, 270).
  static void setOrientationListener(void Function(int degrees) onChanged) {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'orientation') {
        final args = Map<String, dynamic>.from(call.arguments as Map);
        onChanged((args['rotation'] as num).toInt());
      }
    });
  }

  /// Starts the native camera pipeline. Requests camera permission if it is not granted yet.
  static Future<({int textureId, double aspectRatio})> start() async {
    final map = await _channel.invokeMapMethod<String, dynamic>('start');
    if (map == null) throw PlatformException(code: 'start_failed', message: 'no texture');
    // Highlight the recognised vehicle from the start, like iOS (default colour .blue).
    await setTint(const Color(0xFF0000FF));
    return (textureId: (map['textureId'] as num).toInt(), aspectRatio: (map['width'] as num).toDouble() / (map['height'] as num).toDouble());
  }

  static Future<void> stop() async {
    try {
      await _channel.invokeMethod<void>('stop');
    } catch (_) {}
  }

  /// Wrap colour for the live blend (0..1 channels).
  static Future<void> setTint(Color color) async {
    try {
      await _channel.invokeMethod<void>('setTint', {
        'r': color.r,
        'g': color.g,
        'b': color.b,
      });
    } catch (_) {}
  }

  /// Full-resolution JPEG of the current camera frame (the raw photo for the wrap request).
  static Future<Uint8List> takePicture() async {
    final bytes = await _channel
        .invokeMethod<Uint8List>('takePicture')
        .timeout(const Duration(seconds: 12), onTimeout: () => throw PlatformException(code: 'capture_timeout', message: 'capture timed out'));
    if (bytes == null || bytes.isEmpty) throw PlatformException(code: 'capture_failed', message: 'empty capture');
    return bytes;
  }
}
