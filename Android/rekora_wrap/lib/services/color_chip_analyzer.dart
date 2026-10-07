import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

import '../data/wrap_catalog.dart';
import '../models.dart';

class ColorChipAnalysis {
  ColorChipAnalysis({
    required this.primaryColor,
    required this.hex,
    required this.friendlyName,
    required this.rgb,
    required this.palette,
    required this.recognizedTexts,
    required this.source,
    this.matchedWrap,
    this.recommendedWraps = const [],
    this.confidence,
    this.chipBrand,
    this.chipCode,
  });

  final Color primaryColor;
  final String hex;
  final String friendlyName;
  final ({int r, int g, int b}) rgb;
  final List<Color> palette;
  final List<String> recognizedTexts;
  final ColorChipSource source;
  final WrapMatch? matchedWrap;
  final List<WrapColor> recommendedWraps;
  final double? confidence;
  /// OCR에서 직접 추출한 브랜드명 (예: "BRAVADO")
  final String? chipBrand;
  /// OCR에서 직접 추출한 필름 코드 (예: "BRAVADO-001", 언더스코어 정규화됨)
  final String? chipCode;

  String get promptDescription =>
      'Apply a premium vinyl wrap using official manufacturer Lab data for $friendlyName (SKU: $chipCode). '
      'IGNORE any lighting artifacts or shadows from the sample photo. '
      'Render the car body using Physically-Based Rendering (PBR) properties: '
      'Base Lab Color: ${matchedWrap?.brand} standard. '
      'Ensure the final output matches the perceptual appearance of the physical film under the target image lighting.';
}

enum ColorChipSource { sampled, library }

/// Extracts representative colors from a chip photo, optionally using OCR to
/// resolve a known wrap SKU/name and recommending nearby catalog colors.
class ColorChipAnalyzer {
  Future<ColorChipAnalysis?> analyze(File image) async {
    final bytes = await image.readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded == null) return null;

    // 1. Auto White Balance (AWB)
    // Neutralize lighting tint by assuming the brightest 1% of pixels are "near-white".
    final balanced = _applyAWB(decoded);

    final cropped = _cropCenter(balanced, insetRatio: 0.2) ?? balanced;
    final samples = _extractSamples(cropped, maxDimension: 96);
    if (samples.isEmpty) return null;

    final filtered = _filterSamples(samples);
    final clusters = _clusters(filtered.isEmpty ? samples : filtered, 4);
    if (clusters.isEmpty) return null;

    // 정교한 Lab 기반 추출 (L값 평준화)
    clusters.sort((a, b) {
      // 칩 색상의 대표성을 위해 채도가 적당히 높고 밝기가 중간인 색상 우선
      double score(Cluster c) {
        final lab = _labFromSample(c.centroid);
        // L값을 50(중간)으로 고정해 밝기 차이 무시하고 순수 색상 차이만 비교 가능
        final s = c.centroid.saturation;
        final b = c.centroid.brightness;
        final briBonus = (1.0 - (b - 0.5).abs() * 2.0).clamp(0.0, 1.0);
        return c.weight * (0.4 + s * 0.4 + briBonus * 0.2);
      }
      return score(b).compareTo(score(a));
    });

    final primary = clusters.first.centroid;
    var primaryColor = _colorFromSample(primary);
    var hex = _hex(primaryColor);
    var friendly = _describeColor(primaryColor);
    var rgb = _rgb(primaryColor);
    var source = ColorChipSource.sampled;

    final palette = clusters.take(4).map((c) => _colorFromSample(c.centroid)).toList();

    return ColorChipAnalysis(
      primaryColor: primaryColor,
      hex: hex,
      friendlyName: friendly,
      rgb: rgb,
      palette: palette,
      recognizedTexts: const [],
      source: source,
      matchedWrap: null,
      recommendedWraps: _recommend(primaryColor),
      confidence: null,
      chipBrand: null,
      chipCode: null,
    );
  }

  img.Image _applyAWB(img.Image image) {
    // Gray World variant: scale channels to normalize the brightest area.
    int maxR = 0, maxG = 0, maxB = 0;
    
    // Sample a small grid to find the white point
    for (int y = 0; y < image.height; y += 10) {
      for (int x = 0; x < image.width; x += 10) {
        final p = image.getPixel(x, y);
        if (p.r > maxR) maxR = p.r.toInt();
        if (p.g > maxG) maxG = p.g.toInt();
        if (p.b > maxB) maxB = p.b.toInt();
      }
    }
    
    if (maxR < 50 || maxG < 50 || maxB < 50) return image; // Too dark to AWB

    final scaleR = 255.0 / maxR;
    final scaleG = 255.0 / maxG;
    final scaleB = 255.0 / maxB;

    final out = img.Image.from(image);
    for (int y = 0; y < out.height; y++) {
      for (int x = 0; x < out.width; x++) {
        final p = out.getPixel(x, y);
        out.setPixelRgba(
          x, y,
          (p.r * scaleR).round().clamp(0, 255),
          (p.g * scaleG).round().clamp(0, 255),
          (p.b * scaleB).round().clamp(0, 255),
          p.a.toInt(),
        );
      }
    }
    return out;
  }

  _LabColor _labFromSample(_RGBSample s) => _labFromColor(_colorFromSample(s));

  WrapMatch? _bestMatch(List<String> texts) {
    for (final text in texts) {
      final match = matchWrapByQuery(text);
      if (match != null) return match;
    }
    if (texts.isNotEmpty) {
      return matchWrapByQuery(texts.join(' '));
    }
    return null;
  }

  WrapColor? _findWrapColor(WrapMatch matched) {
    return allWraps.firstWhere(
      (wrap) =>
          wrap.name.toLowerCase() == matched.name.toLowerCase() &&
          wrap.brand.toLowerCase() == matched.brand.toLowerCase(),
      orElse: () => allWraps.firstWhere(
        (wrap) => wrap.name.toLowerCase() == matched.name.toLowerCase(),
        orElse: () => allWraps.firstWhere(
          (wrap) => wrap.id.toLowerCase().contains(matched.code.toLowerCase()),
          orElse: () => WrapColor(
            id: matched.code.toLowerCase(),
            name: matched.name,
            brand: matched.brand,
            finish: matched.finish,
            pricePerSquareMeter: 0,
            texturePreview: matched.finish,
            swatch: Colors.grey.shade400,
          ),
        ),
      ),
    );
  }

  List<Cluster> _clusters(List<_RGBSample> samples, int k) {
    final count = max(1, min(k, samples.length));
    final centroids = List.generate(count, (i) => samples[i * samples.length ~/ count]);
    final assignments = List<int>.filled(samples.length, 0);

    for (int iter = 0; iter < 8; iter++) {
      final sums = List.generate(
        count,
        (_) => (
          r: 0.0,
          g: 0.0,
          b: 0.0,
          saturation: 0.0,
          weight: 0.0,
        ),
      );
      var changed = false;
      for (var i = 0; i < samples.length; i++) {
        final sample = samples[i];
        final idx = _nearest(sample, centroids);
        if (assignments[i] != idx) {
          assignments[i] = idx;
          changed = true;
        }
        sums[idx] = (
          r: sums[idx].r + sample.r,
          g: sums[idx].g + sample.g,
          b: sums[idx].b + sample.b,
          saturation: sums[idx].saturation + sample.saturation,
          weight: sums[idx].weight + 1,
        );
      }

      for (var i = 0; i < count; i++) {
        final weight = sums[i].weight;
        if (weight > 0) {
          centroids[i] = _RGBSample(
            r: sums[i].r / weight,
            g: sums[i].g / weight,
            b: sums[i].b / weight,
          );
        }
      }
      if (!changed) break;
    }

    final clusters = List.generate(count, (i) {
      final assigned = assignments.where((a) => a == i).length.toDouble();
      final membersEntries = samples.asMap().entries.where((e) => assignments[e.key] == i);
      final saturationSum = membersEntries.fold<double>(0, (sum, e) => sum + e.value.saturation);
      final brightnessSum = membersEntries.fold<double>(0, (sum, e) => sum + e.value.brightness);
      final avgSaturation = assigned == 0 ? 0.0 : saturationSum / assigned;
      final avgBrightness = assigned == 0 ? 0.5 : brightnessSum / assigned;
      return Cluster(centroid: centroids[i], weight: assigned, averageSaturation: avgSaturation, averageBrightness: avgBrightness);
    });

    return clusters.where((c) => c.weight > 0).toList();
  }

  int _nearest(_RGBSample sample, List<_RGBSample> centroids) {
    var bestIndex = 0;
    var best = double.infinity;
    for (var i = 0; i < centroids.length; i++) {
      final c = centroids[i];
      final d = pow(sample.r - c.r, 2) + pow(sample.g - c.g, 2) + pow(sample.b - c.b, 2);
      if (d < best) {
        best = d.toDouble();
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  _RGBSample _toSample(img.Color color) {
    return _RGBSample(
      r: color.r / 255.0,
      g: color.g / 255.0,
      b: color.b / 255.0,
    );
  }

  List<_RGBSample> _extractSamples(img.Image image, {required int maxDimension}) {
    final scale = min(
      1.0,
      maxDimension / max(image.width.toDouble(), image.height.toDouble()),
    );
    final w = max(1, (image.width * scale).round());
    final h = max(1, (image.height * scale).round());
    final resized = img.copyResize(
      image,
      width: w,
      height: h,
      interpolation: img.Interpolation.cubic,
    );

    final samples = <_RGBSample>[];
    for (int y = 0; y < resized.height; y++) {
      for (int x = 0; x < resized.width; x++) {
        final color = resized.getPixelSafe(x, y);
        if (color.a < 50) continue;
        samples.add(_toSample(color));
      }
    }
    return samples;
  }

  List<_RGBSample> _filterSamples(List<_RGBSample> samples) {
    return samples.where((sample) {
      final b = sample.brightness;
      if (b <= 0.08 || b >= 0.97) return false;
      final sat = sample.saturation;
      return sat > 0.08 || (b > 0.2 && b < 0.85);
    }).toList();
  }

  img.Image? _cropCenter(img.Image image, {double insetRatio = 0.2}) {
    final minDim = min(image.width, image.height);
    final inset = (minDim * insetRatio / 2).round();
    final side = minDim - inset * 2;
    if (side <= 0) return null;
    final x = (image.width - side) ~/ 2;
    final y = (image.height - side) ~/ 2;
    return img.copyCrop(image, x: x, y: y, width: side, height: side);
  }

  Color _colorFromSample(_RGBSample sample) {
    return Color.fromRGBO(
      (sample.r * 255).round(),
      (sample.g * 255).round(),
      (sample.b * 255).round(),
      1,
    );
  }

  String _hex(Color color) =>
      '#${color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';

  ({int r, int g, int b}) _rgb(Color color) => (
        r: color.red,
        g: color.green,
        b: color.blue,
      );

  List<WrapColor> _recommend(Color base, {int limit = 6}) {
    final baseLab = _labFromColor(base);
    final scored = <({WrapColor wrap, double distance})>[];
    for (final wrap in allWraps) {
      final lab = _labFromColor(wrap.swatch);
      final dist = _labDistance(baseLab, lab);
      scored.add((wrap: wrap, distance: dist));
    }
    scored.sort((a, b) => a.distance.compareTo(b.distance));
    return scored.take(limit).map((e) => e.wrap).toList();
  }

  _LabColor _labFromColor(Color color) {
    final r = color.red / 255.0;
    final g = color.green / 255.0;
    final b = color.blue / 255.0;
    double pivot(double c) => c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4).toDouble();
    final rl = pivot(r);
    final gl = pivot(g);
    final bl = pivot(b);

    final x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
    final y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
    final z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;

    double pivotXyz(double c) => c > 0.008856 ? pow(c, 1 / 3).toDouble() : (7.787 * c + 16.0 / 116.0);
    final xn = pivotXyz(x / 0.95047);
    final yn = pivotXyz(y / 1.00000);
    final zn = pivotXyz(z / 1.08883);

    return _LabColor(
      l: (116 * yn) - 16,
      a: 500 * (xn - yn),
      b: 200 * (yn - zn),
    );
  }

  double _labDistance(_LabColor a, _LabColor b) {
    final dl = a.l - b.l;
    final da = a.a - b.a;
    final db = a.b - b.b;
    return sqrt(dl * dl + da * da + db * db);
  }

  String _describeColor(Color color) {
    final hsl = HSLColor.fromColor(color);
    final hue = hsl.hue;
    final sat = hsl.saturation;
    final light = hsl.lightness;

    if (light < 0.18) return 'near black';
    if (sat < 0.10) {
      if (light > 0.87) return 'soft white';
      if (light > 0.65) return 'light gray';
      if (light > 0.4) return 'medium gray';
      return 'charcoal gray';
    }
    if (hue < 15) return 'rich red';
    if (hue < 45) return 'warm orange';
    if (hue < 70) return 'golden yellow';
    if (hue < 90) return 'lime green';
    if (hue < 150) return 'classic green';
    if (hue < 180) return 'teal';
    if (hue < 210) return 'aqua blue';
    if (hue < 240) return 'sky blue';
    if (hue < 270) return 'deep blue';
    if (hue < 300) return 'indigo violet';
    if (hue < 330) return 'vivid magenta';
    return 'crimson';
  }
}

class _RGBSample {
  _RGBSample({required this.r, required this.g, required this.b});
  final double r;
  final double g;
  final double b;

  double get brightness => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  double get saturation {
    final maxValue = max(r, max(g, b));
    final minValue = min(r, min(g, b));
    final delta = maxValue - minValue;
    if (maxValue == 0) return 0;
    return delta / maxValue;
  }
}

class Cluster {
  Cluster({
    required this.centroid,
    required this.weight,
    required this.averageSaturation,
    required this.averageBrightness,
  });

  final _RGBSample centroid;
  final double weight;
  final double averageSaturation;
  final double averageBrightness;
}

class _LabColor {
  _LabColor({required this.l, required this.a, required this.b});
  final double l;
  final double a;
  final double b;
}
