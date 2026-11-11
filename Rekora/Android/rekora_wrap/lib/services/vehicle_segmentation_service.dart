import 'dart:isolate';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:google_mlkit_commons/google_mlkit_commons.dart';
import 'package:google_mlkit_subject_segmentation/google_mlkit_subject_segmentation.dart';

/// One live frame, upright, RGBA8888, with the vehicle tinted when a mask was found.
/// Mirrors the iOS live pipeline: the processed frame itself is what gets displayed.
/// Foreground (vehicle) confidence on a frame grid, values 0..1.
class VehicleMask {
  const VehicleMask({required this.width, required this.height, required this.confidence});

  final int width;
  final int height;
  final Float32List confidence;
}

class LiveFrame {
  const LiveFrame({required this.width, required this.height, required this.rgba, required this.masked});

  final int width;
  final int height;
  final Uint8List rgba;
  final bool masked;
}

/// On-device vehicle segmentation + color blend for live camera frames
/// (Android counterpart of the iOS VNGenerateForegroundInstanceMaskRequest + CIBlendWithMask path).
class VehicleSegmentationService {
  VehicleSegmentationService()
      : _segmenter = SubjectSegmenter(
          options: SubjectSegmenterOptions(
            enableForegroundBitmap: false,
            enableForegroundConfidenceMask: false,
            enableMultipleSubjects: SubjectResultOptions(
              enableConfidenceMask: true,
              enableSubjectBitmap: false,
            ),
          ),
        );

  static const int _targetWidth = 320;
  static const int _minIntervalMs = 100;

  final SubjectSegmenter _segmenter;
  bool _busy = false;
  bool _closed = false;
  int _lastRunMs = 0;

  /// Returns the processed upright frame, or `null` when the frame is skipped.
  /// [tint] is the selected wrap color; without it the frame is returned untinted.
  Future<LiveFrame?> processFrame(CameraImage image, int sensorOrientation, {Color? tint}) async {
    if (_closed || _busy) return null;
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - _lastRunMs < _minIntervalMs) return null;
    _lastRunMs = now;
    _busy = true;

    try {
      final rotation = InputImageRotationValue.fromRawValue(sensorOrientation) ??
          InputImageRotation.rotation90deg;
      // Frame conversion runs off the UI isolate (it was the source of the frame drops).
      final copy = _FrameCopy.from(image);
      final prepared = await Isolate.run(() => _prepareFrame(copy, sensorOrientation, _targetWidth));
      final sampledBytes = prepared.nv21;
      final uprightWidth = prepared.uprightWidth;
      final uprightHeight = prepared.uprightHeight;
      final rgba = prepared.rgba;

      Float32List? confidence;
      try {
        final result = await _segmenter.processImage(
          InputImage.fromBytes(
            bytes: sampledBytes,
            metadata: InputImageMetadata(
              size: Size(prepared.width.toDouble(), prepared.height.toDouble()),
              rotation: rotation,
              format: InputImageFormat.nv21,
              bytesPerRow: prepared.width,
            ),
          ),
        );
        // Subject coordinates are in the upright frame.
        confidence = _composeSubjectMasks(result.subjects, uprightWidth, uprightHeight);
      } catch (e) {
        debugPrint('[VehicleSegmentation] segmentation failed: $e');
      }

      final masked = confidence != null && tint != null;
      if (masked) {
        _applyTint(rgba, confidence, tint);
      }
      return LiveFrame(width: uprightWidth, height: uprightHeight, rgba: rgba, masked: masked);
    } catch (e) {
      debugPrint('[VehicleSegmentation] frame failed: $e');
      return null;
    } finally {
      _busy = false;
    }
  }

  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    try {
      await _segmenter.close();
    } catch (e) {
      debugPrint('[VehicleSegmentation] close failed: $e');
    }
  }

  /// Sensor orientation (degrees) to the clockwise rotation that makes the frame upright.
  static int _angleFor(int sensorOrientation) {
    switch (sensorOrientation % 360) {
      case 90:
        return 90;
      case 180:
        return 180;
      case 270:
        return 270;
      default:
        return 0;
    }
  }

  /// Pastes every subject's confidence mask into a frame-sized buffer.
  /// The ML Kit mask grid is not always exactly the box size, so the grid is inferred
  /// from the box aspect and sampled onto the box.
  static Float32List? _composeSubjectMasks(List<Subject> subjects, int frameWidth, int frameHeight) {
    Float32List? confidence;
    for (final subject in subjects) {
      final mask = subject.confidenceMask;
      if (mask == null || subject.width <= 0 || subject.height <= 0) continue;

      final grid = _inferMaskDims(mask.length, subject.width / subject.height);
      if (grid == null) continue;
      confidence ??= Float32List(frameWidth * frameHeight);

      for (var y = 0; y < subject.height; y++) {
        final fy = subject.startY + y;
        if (fy < 0 || fy >= frameHeight) continue;
        final my = math.min(grid.height - 1, (y * grid.height / subject.height).floor());
        for (var x = 0; x < subject.width; x++) {
          final fx = subject.startX + x;
          if (fx < 0 || fx >= frameWidth) continue;
          final mx = math.min(grid.width - 1, (x * grid.width / subject.width).floor());
          final value = mask[my * grid.width + mx].toDouble();
          final index = fy * frameWidth + fx;
          if (value > confidence[index]) {
            confidence[index] = value;
          }
        }
      }
    }
    return confidence;
  }

  /// Integer grid `w x h == length` whose aspect (w / h) is closest to [aspect].
  static ({int width, int height})? _inferMaskDims(int length, double aspect) {
    if (length <= 0 || aspect <= 0) return null;
    final root = math.sqrt(length * aspect).round();
    int? bestWidth;
    var bestError = double.infinity;
    for (var w = math.max(1, root - 16); w <= root + 16; w++) {
      if (length % w != 0) continue;
      final h = length ~/ w;
      final error = math.log((w / h) / aspect).abs();
      if (error < bestError) {
        bestError = error;
        bestWidth = w;
      }
    }
    if (bestWidth == null || bestError > 0.08) return null;
    return (width: bestWidth, height: length ~/ bestWidth);
  }

  /// Color blend like iOS CIColorBlendMode: the wrap color's hue/saturation with the
  /// frame's luminance, mixed in by the vehicle mask.
  static void _applyTint(Uint8List rgba, Float32List confidence, Color tint) {
    final tr = tint.r * 255;
    final tg = tint.g * 255;
    final tb = tint.b * 255;
    final tintLum = 0.3 * tr + 0.59 * tg + 0.11 * tb;
    for (var i = 0; i < confidence.length; i++) {
      final c = confidence[i];
      if (c <= 0) continue;
      final alpha = (c * 0.85).clamp(0.0, 1.0);
      final o = i * 4;
      final r = rgba[o].toDouble();
      final g = rgba[o + 1].toDouble();
      final b = rgba[o + 2].toDouble();
      final d = (0.3 * r + 0.59 * g + 0.11 * b) - tintLum;
      final br = (tr + d).clamp(0.0, 255.0);
      final bg = (tg + d).clamp(0.0, 255.0);
      final bb = (tb + d).clamp(0.0, 255.0);
      rgba[o] = (r * (1 - alpha) + br * alpha).round();
      rgba[o + 1] = (g * (1 - alpha) + bg * alpha).round();
      rgba[o + 2] = (b * (1 - alpha) + bb * alpha).round();
    }
  }

  /// NV21 (sensor orientation) -> upright RGBA8888.
  static Uint8List _nv21ToUprightRgba(_Nv21Frame f, int angle) {
    final w = f.width;
    final h = f.height;
    final uw = (angle == 90 || angle == 270) ? h : w;
    final uh = (angle == 90 || angle == 270) ? w : h;
    final out = Uint8List(uw * uh * 4);
    final chromaBase = w * h;
    for (var uy = 0; uy < uh; uy++) {
      for (var ux = 0; ux < uw; ux++) {
        int sx;
        int sy;
        switch (angle) {
          case 90:
            sx = uy;
            sy = h - 1 - ux;
            break;
          case 180:
            sx = w - 1 - ux;
            sy = h - 1 - uy;
            break;
          case 270:
            sx = w - 1 - uy;
            sy = ux;
            break;
          default:
            sx = ux;
            sy = uy;
        }
        final yValue = f.bytes[sy * w + sx].toDouble();
        final ci = chromaBase + (sy >> 1) * w + (sx & ~1);
        final v = f.bytes[ci].toDouble() - 128;
        final u = f.bytes[ci + 1].toDouble() - 128;
        final o = (uy * uw + ux) * 4;
        out[o] = (yValue + 1.402 * v).round().clamp(0, 255);
        out[o + 1] = (yValue - 0.344136 * u - 0.714136 * v).round().clamp(0, 255);
        out[o + 2] = (yValue + 1.772 * u).round().clamp(0, 255);
        out[o + 3] = 255;
      }
    }
    return out;
  }

  /// Downsamples a camera frame (YUV420 3-plane or NV21 single-plane) to an
  /// NV21 buffer about [targetWidth] pixels wide, using nearest-neighbour sampling.
  static _Nv21Frame _sampleToNv21(_FrameCopy image, int targetWidth) {
    final srcW = image.width;
    final srcH = image.height;
    var outW = targetWidth;
    var outH = (targetWidth * srcH / srcW).round();
    outW -= outW % 2;
    outH -= outH % 2;

    final yPlane = image.planes[0];
    final yStride = yPlane.bytesPerRow;
    final yPixelStride = yPlane.bytesPerPixel ?? 1;

    final bool singlePlane = image.planes.length == 1;
    final _FramePlane? uPlane = singlePlane ? null : image.planes[1];
    final _FramePlane? vPlane = singlePlane ? null : image.planes[2];
    final int chromaBase = singlePlane ? yStride * srcH : 0;

    final out = Uint8List(outW * outH + outW * (outH ~/ 2));
    final sx = srcW / outW;
    final sy = srcH / outH;

    for (var y = 0; y < outH; y++) {
      final srcY = (y * sy).toInt();
      final rowBase = srcY * yStride;
      final outRow = y * outW;
      for (var x = 0; x < outW; x++) {
        final srcX = (x * sx).toInt();
        out[outRow + x] = yPlane.bytes[rowBase + srcX * yPixelStride];
      }
    }

    final chromaOffset = outW * outH;
    for (var cy = 0; cy < outH ~/ 2; cy++) {
      final srcY = ((cy * 2) * sy).toInt();
      for (var cx = 0; cx < outW ~/ 2; cx++) {
        final srcX = ((cx * 2) * sx).toInt();
        final int v;
        final int u;
        if (singlePlane) {
          final idx = chromaBase + (srcY ~/ 2) * yStride + (srcX ~/ 2) * 2;
          v = yPlane.bytes[idx];
          u = yPlane.bytes[idx + 1];
        } else {
          final vp = vPlane!;
          final up = uPlane!;
          v = vp.bytes[(srcY ~/ 2) * vp.bytesPerRow + (srcX ~/ 2) * (vp.bytesPerPixel ?? 1)];
          u = up.bytes[(srcY ~/ 2) * up.bytesPerRow + (srcX ~/ 2) * (up.bytesPerPixel ?? 1)];
        }
        final o = chromaOffset + cy * outW + cx * 2;
        out[o] = v;
        out[o + 1] = u;
      }
    }

    return _Nv21Frame(width: outW, height: outH, bytes: out);
  }
}

class _Nv21Frame {
  const _Nv21Frame({required this.width, required this.height, required this.bytes});

  final int width;
  final int height;
  final Uint8List bytes;
}

/// Plain-data copy of a camera plane, so a frame can be sent to a background isolate.
class _FramePlane {
  const _FramePlane({required this.bytes, required this.bytesPerRow, this.bytesPerPixel});

  final Uint8List bytes;
  final int bytesPerRow;
  final int? bytesPerPixel;
}

class _FrameCopy {
  const _FrameCopy({required this.width, required this.height, required this.planes});

  factory _FrameCopy.from(CameraImage image) => _FrameCopy(
        width: image.width,
        height: image.height,
        planes: [
          for (final p in image.planes)
            _FramePlane(bytes: Uint8List.fromList(p.bytes), bytesPerRow: p.bytesPerRow, bytesPerPixel: p.bytesPerPixel),
        ],
      );

  final int width;
  final int height;
  final List<_FramePlane> planes;
}

class _Prepared {
  const _Prepared({
    required this.nv21,
    required this.width,
    required this.height,
    required this.uprightWidth,
    required this.uprightHeight,
    required this.rgba,
  });

  final Uint8List nv21;
  final int width;
  final int height;
  final int uprightWidth;
  final int uprightHeight;
  final Uint8List rgba;
}

/// Runs on a background isolate: sample to NV21 and build the upright RGBA frame.
_Prepared _prepareFrame(_FrameCopy copy, int sensorOrientation, int targetWidth) {
  final sampled = VehicleSegmentationService._sampleToNv21(copy, targetWidth);
  final angle = VehicleSegmentationService._angleFor(sensorOrientation);
  final quarterTurn = angle == 90 || angle == 270;
  return _Prepared(
    nv21: sampled.bytes,
    width: sampled.width,
    height: sampled.height,
    uprightWidth: quarterTurn ? sampled.height : sampled.width,
    uprightHeight: quarterTurn ? sampled.width : sampled.height,
    rgba: VehicleSegmentationService._nv21ToUprightRgba(sampled, angle),
  );
}
