import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img;

/// Result of analyzing multiple reference images for a specific film.
class FilmReferenceAnalysis {
  FilmReferenceAnalysis({
    required this.filmName,
    required this.trueColor,
    required this.luminanceRange,
    required this.saturationRange,
    required this.environmentScores,
  });

  final String filmName;
  final Color trueColor;
  final ({double min, double max}) luminanceRange;
  final ({double min, double max}) saturationRange;
  /// Mapping of environment types (indoor, sunny, cloudy) to their representative colors.
  final Map<String, Color> environmentScores;
}

/// Advanced analyzer that uses multiple web reference images to derive
/// high-accuracy PBR properties for a specific film.
class ReferenceImageAnalyzer {
  final http.Client _client = http.Client();

  /// Analyzes a list of image URLs to find the most accurate color representation.
  Future<FilmReferenceAnalysis?> analyzeFilmReferences(String filmName, List<String> imageUrls) async {
    if (imageUrls.isEmpty) return null;

    final List<Color> sampledColors = [];
    final List<double> luminances = [];
    final List<double> saturations = [];
    final Map<String, List<Color>> envBuckets = {
      'indoor': [],
      'sunny': [],
      'cloudy': [],
    };

    // 1. Multi-image Analysis (Color Clustering)
    for (final url in imageUrls.take(15)) {
      try {
        final bytes = await _downloadImage(url);
        if (bytes == null) continue;
        
        final image = img.decodeImage(bytes);
        if (image == null) continue;

        // Apply White Balance Calibration before sampling
        final balanced = _calibrateWhiteBalance(image);
        
        final color = _extractDominantColor(balanced);
        if (color == null) continue;

        sampledColors.add(color);
        final hsl = HSLColor.fromColor(color);
        luminances.add(hsl.lightness);
        saturations.add(hsl.saturation);

        // Environment Classification (Heuristic)
        final env = _classifyEnvironment(balanced);
        envBuckets[env]?.add(color);
      } catch (_) {
        // Skip failed images
      }
    }

    if (sampledColors.isEmpty) return null;

    // 2. Average Color Extraction (True Color)
    final trueColor = _calculateAverageColor(sampledColors);

    // 3. Range Mapping (Shadows and Highlights)
    luminances.sort();
    saturations.sort();
    
    final lumRange = (
      min: luminances.first,
      max: luminances.last,
    );
    final satRange = (
      min: saturations.first,
      max: saturations.last,
    );

    // 4. Environment Matching Data
    final envScores = envBuckets.map((key, list) {
      if (list.isEmpty) return MapEntry(key, trueColor);
      return MapEntry(key, _calculateAverageColor(list));
    });

    return FilmReferenceAnalysis(
      filmName: filmName,
      trueColor: trueColor,
      luminanceRange: lumRange,
      saturationRange: satRange,
      environmentScores: envScores,
    );
  }

  /// Neutralizes lighting by finding the white point (brightest 1% area).
  img.Image _calibrateWhiteBalance(img.Image image) {
    int maxR = 0, maxG = 0, maxB = 0;
    
    // Grid sample for performance
    for (int y = 0; y < image.height; y += 15) {
      for (int x = 0; x < image.width; x += 15) {
        final p = image.getPixel(x, y);
        if (p.r > maxR) maxR = p.r.toInt();
        if (p.g > maxG) maxG = p.g.toInt();
        if (p.b > maxB) maxB = p.b.toInt();
      }
    }

    if (maxR < 100 || maxG < 100 || maxB < 100) return image;

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

  Color? _extractDominantColor(img.Image image) {
    // Focused center sampling to avoid background noise in reference photos
    final center = img.copyCrop(
      image,
      x: (image.width * 0.25).round(),
      y: (image.height * 0.25).round(),
      width: (image.width * 0.5).round(),
      height: (image.height * 0.5).round(),
    );

    int rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (final p in center) {
      // Filter out extreme highlights and shadows
      final lum = (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255.0;
      if (lum > 0.15 && lum < 0.85) {
        rSum += p.r.toInt();
        gSum += p.g.toInt();
        bSum += p.b.toInt();
        count++;
      }
    }
    if (count == 0) return null;
    return Color.fromARGB(255, rSum ~/ count, gSum ~/ count, bSum ~/ count);
  }

  String _classifyEnvironment(img.Image image) {
    double totalLum = 0;
    int count = 0;
    for (int i = 0; i < image.width * image.height; i += 50) {
      final p = image.getPixel(i % image.width, i ~/ image.width);
      totalLum += (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255.0;
      count++;
    }
    final avgLum = totalLum / count;
    
    if (avgLum > 0.65) return 'sunny';
    if (avgLum < 0.35) return 'indoor';
    return 'cloudy';
  }

  Color _calculateAverageColor(List<Color> colors) {
    int r = 0, g = 0, b = 0;
    for (final c in colors) {
      r += c.red;
      g += c.green;
      b += c.blue;
    }
    return Color.fromARGB(255, r ~/ colors.length, g ~/ colors.length, b ~/ colors.length);
  }

  Future<Uint8List?> _downloadImage(String url) async {
    try {
      final response = await _client.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) return response.bodyBytes;
    } catch (_) {}
    return null;
  }
}
