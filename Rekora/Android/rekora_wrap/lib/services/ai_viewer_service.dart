import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';

import '../config.dart';
import '../models.dart';
import 'OpenAI_image_edit_service.dart';

// ── TYPES ──

class MaterialMetadata {
  MaterialMetadata({
    this.finishLabel,
    this.flakeDensity,
    this.roughness,
    this.metallic,
  });
  final String? finishLabel;
  final double? flakeDensity;
  final double? roughness;
  final double? metallic;
}

class LABColor {
  LABColor({required this.l, required this.a, required this.b});
  final double l, a, b;
}

class AiPreviewResult {
  AiPreviewResult({
    required this.primary,
    required this.secondary,
    required this.caption,
    this.generatedImage,
    this.metadata,
    this.generationMethod = 'unknown',
    this.diagnostics,
  });

  final Color primary, secondary;
  final String caption;
  final File? generatedImage;
  final MaterialMetadata? metadata;
  final String generationMethod;
  final String? diagnostics;
}

// ── SERVICE ──

class AiViewerService {
  static const int _uploadSide = 4096;
  static const int _uploadJpegQuality = 100;
  static const double _fullWrapMaskMinCoverage = 0.003;
  static const double _partialWrapHardMinCoverage = 0.00015;

  Future<AiPreviewResult> generatePreview({
    required File? vehicleImage,
    File? chipImage,
    Color? chipColor,
    String? prompt,
    Set<String> selectedParts = const {},
    bool interiorMode = false,
    String? finish,
    double? flakeDensity,
    double? roughness,
    double? metallic,
    String? sku,
    String? brand,
    String? productName,
    Uint8List? precomputedMask,
    Map<String, dynamic>? pbrAssets,
    bool enableLightEstimation = true,
    double exposure = 0.0,
    double whiteBalance = 5500.0,
    String? modelOverride,
  }) async {
    if (vehicleImage == null) throw ArgumentError('vehicleImage required.');
    final originalBytes = await vehicleImage.readAsBytes();
    final Color chip = chipColor ?? Colors.blue;
    const bool isSynthetic = false;
    final isPartial =
        selectedParts.isNotEmpty &&
        !selectedParts.any((p) => p.contains('전체') || p.contains('Full'));

    // 1. High-fidelity upload payload (preserve original quality/aspect as much as possible)
    final optBytes = await Isolate.run(
      () => _optimizeBytesWork((
        bytes: originalBytes,
        maxSize: _uploadSide,
        usePng: false,
        jpegQuality: _uploadJpegQuality,
      )),
    );

    Object? engineFailure;
    if (Config.enableOpenAiImage) {
      try {
        // Pure Gemini by default, but partial wrap requires strict mask control.
        Uint8List maskForGemini = Uint8List(0);
        bool hasUsablePartialMask = false;
        if (!interiorMode && isPartial) {
          Uint8List? fullMask = precomputedMask;
          if (fullMask == null || fullMask.isEmpty) {
            fullMask = await _resolveMaskFast(imageBytes: optBytes);
          }
          if (fullMask.isNotEmpty) {
            final rawFullMask = await Isolate.run(
              () => _optimizeBytesWork((
                bytes: fullMask!,
                maxSize: _uploadSide,
                usePng: true,
                jpegQuality: _uploadJpegQuality,
              )),
            );
            final rawUsable = await Isolate.run(
              () => _isMaskUsableForWrapWork((maskBytes: rawFullMask)),
            );
            var refinedFullMask = await Isolate.run(
              () => _sanitizeMaskWithSceneWork((
                maskBytes: rawFullMask,
                imageSquareBytes: optBytes,
              )),
            );
            final refinedUsable = await Isolate.run(
              () => _isMaskUsableForWrapWork((maskBytes: refinedFullMask)),
            );
            if (!rawUsable && !refinedUsable) {
              final synthesized = await Isolate.run(
                () =>
                    _synthesizeVehicleMaskFromImageWork((imageBytes: optBytes)),
              );
              final synthesizedUsable = await Isolate.run(
                () => _isMaskUsableForWrapWork((maskBytes: synthesized)),
              );
              if (synthesizedUsable) {
                refinedFullMask = synthesized;
              } else {
                refinedFullMask = rawFullMask;
              }
            } else if (!refinedUsable) {
              refinedFullMask = rawFullMask;
            }
            maskForGemini = await _buildRobustPartialMask(
              fullMask: refinedFullMask,
              selectedParts: selectedParts,
              isSynthetic: isSynthetic,
            );
            final vehicleShapeMask = await Isolate.run(
              () => _synthesizeVehicleMaskFromImageWork((imageBytes: optBytes)),
            );
            if (vehicleShapeMask.isNotEmpty) {
              maskForGemini = await Isolate.run(
                () => _intersectMasksWork((
                  aMaskBytes: maskForGemini,
                  bMaskBytes: vehicleShapeMask,
                )),
              );
            }
            hasUsablePartialMask = maskForGemini.isNotEmpty;
            if (hasUsablePartialMask) {
              var partialCoverage = await Isolate.run(
                () => _estimateMaskCoverageWork((maskSquare: maskForGemini)),
              );
              // If robust mask got too wide, rebuild a conservative mask and continue.
              if (partialCoverage > 0.90) {
                final conservativeMask = await Isolate.run(
                  () => _applySelectiveMaskWork((
                    maskBytes: refinedFullMask,
                    parts: selectedParts,
                    dilate: false,
                    isSynthetic: isSynthetic,
                  )),
                );
                final conservativeCoverage = await Isolate.run(
                  () =>
                      _estimateMaskCoverageWork((maskSquare: conservativeMask)),
                );
                if (conservativeCoverage > 0.0 &&
                    conservativeCoverage < partialCoverage) {
                  maskForGemini = conservativeMask;
                  partialCoverage = conservativeCoverage;
                }
                if (partialCoverage > 0.90) {
                  final synthesized = await Isolate.run(
                    () => _synthesizeVehicleMaskFromImageWork((
                      imageBytes: optBytes,
                    )),
                  );
                  final syntheticPartial = await Isolate.run(
                    () => _applySelectiveMaskWork((
                      maskBytes: synthesized,
                      parts: selectedParts,
                      dilate: false,
                      isSynthetic: isSynthetic,
                    )),
                  );
                  final syntheticCoverage = await Isolate.run(
                    () => _estimateMaskCoverageWork((
                      maskSquare: syntheticPartial,
                    )),
                  );
                  if (syntheticCoverage > 0.0 &&
                      syntheticCoverage < partialCoverage) {
                    maskForGemini = syntheticPartial;
                    partialCoverage = syntheticCoverage;
                  }
                }
              }
              if (partialCoverage < 0.00005) {
                hasUsablePartialMask = false;
              }
            }
          }
          if (!hasUsablePartialMask) {
            throw StateError('부분 랩핑 마스크를 생성하지 못했습니다. 이미지를 다시 선택 후 시도해주세요.');
          }
        }

        final wrapped = await _generateWithGeminiWithRetry(
          optimizedBytes: optBytes,
          maskBytes: maskForGemini,
          chipImage: chipImage,
          chipColor: chip,
          prompt: prompt,
          selectedParts: selectedParts,
          finish: finish ?? 'gloss',
          sku: sku,
          brand: brand,
          productName: productName,
          modelName: modelOverride ?? Config.geminiImageModel,
        );

        var wrappedOnOriginal = await Isolate.run(
          () => _ensureOriginalOutputWork((
            reference: originalBytes,
            candidate: wrapped,
          )),
        );

        // ── STEP 5: PBR Enhancement (Digital Twin Integration) ──
        if (pbrAssets != null && maskForGemini.isNotEmpty) {
          wrappedOnOriginal = await _applyPBREnhancement(
            wrappedBytes: wrappedOnOriginal,
            maskBytes: maskForGemini,
            finish: finish ?? 'gloss',
            pbrAssets: pbrAssets,
          );
        }

        var generationMethod = 'OpenAI Image Single-Pass';
        if (isPartial) {
          generationMethod = maskForGemini.isNotEmpty
              ? 'OpenAI Partial (masked)'
              : 'OpenAI Partial (no-mask fallback)';
        }

        // Safety net: partial requests must still show a clear color change.
        if (!interiorMode && isPartial && hasUsablePartialMask) {
          // Hard-lock: keep all non-selected areas identical to source.
          wrappedOnOriginal = await Isolate.run(
            () => _compositeWithReferenceWork((
              original: originalBytes,
              generatedReference: wrappedOnOriginal,
              maskSquare: maskForGemini,
              isPartial: true,
            )),
          );
          final delta = await Isolate.run(
            () => _estimateMaskedDeltaOnReferenceWork((
              original: originalBytes,
              generatedReference: wrappedOnOriginal,
              maskSquare: maskForGemini,
            )),
          );
          if (delta < 8.5) {
            wrappedOnOriginal = await Isolate.run(
              () => _forceSelectiveRecolorWork((
                original: originalBytes,
                maskSquare: maskForGemini,
                red: chip.red,
                green: chip.green,
                blue: chip.blue,
              )),
            );
            generationMethod = 'OpenAI Partial + forced recolor fallback';
          }

          // Final hard clip: pixels outside selected mask must remain original.
          wrappedOnOriginal = await Isolate.run(
            () => _clipOutsideMaskWork((
              original: originalBytes,
              candidate: wrappedOnOriginal,
              maskSquare: maskForGemini,
            )),
          );
        } else if (!interiorMode) {
          // OpenAI strict mode (full wrap): do not run local geometry-lock composite.
          generationMethod = 'OpenAI Full (strict single-pass)';
        }
        return AiPreviewResult(
          primary: chip,
          secondary: chip,
          caption: prompt ?? 'Wrapped Vehicle',
          generatedImage: await _writeTempFile(wrappedOnOriginal, 'png'),
          generationMethod: generationMethod,
        );
      } catch (e) {
        print('[AiViewerService] Image engine FAILED: $e');
        engineFailure = e;
        // OpenAI strict mode: no local recolor fallback.
      }
    }
    throw StateError(
      'Image generation failed${engineFailure != null ? ': $engineFailure' : ' or disabled.'}',
    );
  }

  // ── PASS METHODS ──
  Future<File> applyChromeDeletePass({
    required File inputImage,
    required String colorHex,
    required String finish,
    String? modelName,
  }) async => _runPass(inputImage, 'ChromeDelete', {
    'colorHex': colorHex,
    'finish': finish,
  }, modelName: modelName);
  Future<File> applyChromeCleanupPass({
    required File inputImage,
    required String colorHex,
    required String finish,
    String? modelName,
  }) async => _runPass(inputImage, 'ChromeCleanup', {
    'colorHex': colorHex,
    'finish': finish,
  }, modelName: modelName);
  Future<File> applyWindowChromeCleanupPass({
    required File inputImage,
    required String colorHex,
    required String finish,
    String? modelName,
  }) async => _runPass(inputImage, 'WindowChromeCleanup', {
    'colorHex': colorHex,
    'finish': finish,
  }, modelName: modelName);
  Future<File> applyBodyCoverageCleanupPass({
    required File inputImage,
    required String wrapDescription,
    String? modelName,
  }) async => _runPass(inputImage, 'BodyCoverage', {
    'wrapDescription': wrapDescription,
  }, modelName: modelName);

  Future<File> _runPass(
    File input,
    String type,
    Map<String, String> args, {
    String? modelName,
  }) async {
    final inputBytes = input.readAsBytesSync();
    final service = OpenAIImageEditService(
      proxyBaseUrl: Config.imageProxyUrl,
      model: modelName ?? Config.geminiImageModel,
      apiKey: Config.imageApiKey,
    );
    final opt = await Isolate.run(
      () => _optimizeBytesWork((
        bytes: inputBytes,
        maxSize: _uploadSide,
        usePng: false,
        jpegQuality: _uploadJpegQuality,
      )),
    );
    late Uint8List result;
    if (type == 'ChromeDelete')
      result = await service.applyChromeDelete(
        imageBytes: opt,
        colorHex: args['colorHex']!,
        finish: args['finish']!,
      );
    else if (type == 'ChromeCleanup')
      result = await service.applyChromeCleanup(
        imageBytes: opt,
        colorHex: args['colorHex']!,
        finish: args['finish']!,
      );
    else if (type == 'WindowChromeCleanup')
      result = await service.applyWindowChromeCleanup(
        imageBytes: opt,
        colorHex: args['colorHex']!,
        finish: args['finish']!,
      );
    else
      result = await service.applyBodyCoverageCleanup(
        imageBytes: opt,
        wrapDescription: args['wrapDescription']!,
      );
    final restored = await Isolate.run(
      () =>
          _ensureOriginalOutputWork((reference: inputBytes, candidate: result)),
    );
    return _writeTempFile(restored, 'png');
  }

  // ── CORE LOGIC ──
  Future<Uint8List> _generateWithGemini({
    required Uint8List optimizedBytes,
    File? chipImage,
    required Color chipColor,
    String? prompt,
    Set<String> selectedParts = const {},
    required String finish,
    String? sku,
    String? brand,
    String? productName,
    required String modelName,
    Uint8List? precomputedMask,
  }) async {
    final service = OpenAIImageEditService(
      proxyBaseUrl: Config.imageProxyUrl,
      model: modelName,
      apiKey: Config.imageApiKey,
    );
    final hex =
        '#${chipColor.value.toRadixString(16).substring(2).toUpperCase()}';
    final isFull =
        selectedParts.isEmpty ||
        selectedParts.any(
          (p) => p.contains('전체') || p.toLowerCase().contains('full'),
        );
    final panelList = isFull ? 'full body' : _englishPanelList(selectedParts);
    final brandLabel = brand?.trim() ?? '';
    final productLabel = productName?.trim() ?? '';
    final skuLabel = sku?.trim() ?? '';
    final catalogParts = <String>[
      if (brandLabel.isNotEmpty) brandLabel,
      if (productLabel.isNotEmpty) productLabel,
      if (skuLabel.isNotEmpty) skuLabel,
    ];
    final catalogLine = catalogParts.isEmpty ? '' : catalogParts.join(' / ');

    final hasMask = precomputedMask != null && precomputedMask.isNotEmpty;
    final rawPromptDirective = (prompt ?? '').trim();
    final allowSceneChange = rawPromptDirective.contains('[SCENE_CHANGE]');
    final promptDirective = rawPromptDirective
        .replaceAll('[SCENE_CHANGE]', '')
        .trim();
    final exactFinish = finish.trim().isNotEmpty ? finish.trim() : 'gloss';
    final fullPrompt =
        """
Task: ${isFull ? 'full wrap' : 'partial wrap'} for the SAME car in this photo.
Target color: $hex (RGB ${chipColor.red},${chipColor.green},${chipColor.blue}), finish: $exactFinish.
${catalogLine.isEmpty ? '' : 'Selected catalog item: $catalogLine.'}
Target panels: $panelList.

Identity lock (must keep 100%):
- same vehicle model/shape/trim/viewpoint
- same wheels, lights, glass${allowSceneChange ? '' : ', background'}
- no geometry change, no new car, no crop/zoom shift
${allowSceneChange ? '- background/location may change only according to the requested scene preset, but keep the vehicle perspective and scale consistent.' : '- keep the EXACT same environment/background/location/lighting setup; do NOT replace or restyle surroundings.'}
${allowSceneChange ? '- do NOT alter the vehicle identity, angle, stance, wheels, glass, or proportions while changing the backdrop.' : '- do NOT add or remove objects, reflections, signs, buildings, people, or weather effects.'}

${promptDirective.isEmpty ? '' : 'Additional user direction: $promptDirective'}

${hasMask ? 'If mask is provided, edit only white-mask area.' : 'No mask: use visual understanding and repaint only painted body panels.'}
${isFull ? 'Full wrap: repaint all painted body panels including side mirrors.' : 'Partial wrap: repaint only target panels and keep all non-target panels unchanged.'}
Keep chrome, badges, handles, sunroof/soft-top unchanged unless explicitly in target panel.
Material guidance: preserve the selected catalog finish exactly as $exactFinish and keep the official manufacturer texture profile stable.
Return one photorealistic edited image only.
""";

    Uint8List chipBytes = chipImage != null
        ? await chipImage.readAsBytes()
        : _buildSyntheticChipBytes(chipColor);
    return await service.applyWrapWithFullPrompt(
      imageBytes: optimizedBytes,
      maskBytes: precomputedMask ?? Uint8List(0),
      chipBytes: chipBytes,
      fullPrompt: fullPrompt,
    );
  }

  Future<Uint8List> _generateWithGeminiWithRetry({
    required Uint8List optimizedBytes,
    required Uint8List maskBytes,
    File? chipImage,
    required Color chipColor,
    String? prompt,
    Set<String> selectedParts = const {},
    required String finish,
    String? sku,
    String? brand,
    String? productName,
    required String modelName,
  }) async {
    try {
      return await _generateWithGemini(
        optimizedBytes: optimizedBytes,
        chipImage: chipImage,
        chipColor: chipColor,
        prompt: prompt,
        selectedParts: selectedParts,
        finish: finish,
        sku: sku,
        brand: brand,
        productName: productName,
        modelName: modelName,
        precomputedMask: maskBytes,
      );
    } catch (e) {
      throw StateError('OpenAI single-pass failed: $e');
    }
  }

  Future<Uint8List> _resolveMaskFast({required Uint8List imageBytes}) async {
    Future<Uint8List?> tryJsonMaskEndpoint(
      Uri uri,
      Map<String, dynamic> body,
    ) async {
      try {
        final response = await http
            .post(
              uri,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode(body),
            )
            .timeout(const Duration(seconds: 8));
        if (response.statusCode != 200) return null;

        final contentType = response.headers['content-type'] ?? '';
        if (contentType.startsWith('image/')) {
          return response.bodyBytes;
        }

        final decoded = jsonDecode(response.body);
        if (decoded is! Map<String, dynamic>) return null;
        final maskB64 =
            (decoded['maskBase64'] as String?) ??
            (decoded['mask_base64'] as String?) ??
            '';
        if (maskB64.isEmpty) return null;
        return base64Decode(maskB64);
      } catch (_) {
        return null;
      }
    }

    final baseUrls = <String>[
      Config.backendBaseUrl,
      Config.backendBaseUrlCellular,
      'https://rekora.lars-technologies.com',
      'https://rh2kdj9wdp.ap-northeast-1.awsapprunner.com',
      'https://fs283evvhf.us-east-1.awsapprunner.com',
    ].toSet().toList();

    for (final base in baseUrls) {
      final segmentPaths = <String>['/api/segment-vehicle', '/segment-vehicle'];
      final payloads = <Map<String, dynamic>>[
        {'imageBase64': base64Encode(imageBytes)},
        {'image_base64': base64Encode(imageBytes)},
      ];
      for (final path in segmentPaths) {
        for (final body in payloads) {
          final segmentMask = await tryJsonMaskEndpoint(
            Uri.parse('$base$path'),
            body,
          );
          if (segmentMask != null && segmentMask.isNotEmpty) {
            return segmentMask;
          }
        }
      }

      final legacyMaskUri = Uri.parse('$base/generate-mask');
      for (final body in payloads) {
        final legacyMask = await tryJsonMaskEndpoint(legacyMaskUri, body);
        if (legacyMask != null && legacyMask.isNotEmpty) {
          return legacyMask;
        }
      }
    }
    return Uint8List(0);
  }

  double _targetPartialCoverage(Set<String> selectedParts) {
    final canonical = selectedParts
        .map(_canonicalPartKey)
        .whereType<String>()
        .toSet();
    if (canonical.isEmpty) return 0.0010;
    if (canonical.length == 1) {
      return canonical.contains('mirrors') ? 0.00035 : 0.00055;
    }
    final scaled = 0.00045 * canonical.length;
    return scaled.clamp(0.00065, 0.0030);
  }

  Future<Uint8List> _buildRobustPartialMask({
    required Uint8List fullMask,
    required Set<String> selectedParts,
    required bool isSynthetic,
  }) async {
    Uint8List best = await Isolate.run(
      () => _applySelectiveMaskWork((
        maskBytes: fullMask,
        parts: selectedParts,
        dilate: false,
        isSynthetic: isSynthetic,
      )),
    );
    double bestCoverage = await Isolate.run(
      () => _estimateMaskCoverageWork((maskSquare: best)),
    );
    final target = _targetPartialCoverage(selectedParts);
    if (bestCoverage >= target) return best;

    final dilatedFromParts = await Isolate.run(
      () => _applySelectiveMaskWork((
        maskBytes: fullMask,
        parts: selectedParts,
        dilate: true,
        isSynthetic: isSynthetic,
      )),
    );
    final dilatedCoverage = await Isolate.run(
      () => _estimateMaskCoverageWork((maskSquare: dilatedFromParts)),
    );
    if (dilatedCoverage > bestCoverage) {
      best = dilatedFromParts;
      bestCoverage = dilatedCoverage;
    }
    if (bestCoverage >= target * 0.85) return best;

    const radii = <int>[4, 8, 12];
    for (final radius in radii) {
      final expanded = await Isolate.run(
        () => _expandMaskWork((maskBytes: best, radiusPx: radius)),
      );
      final coverage = await Isolate.run(
        () => _estimateMaskCoverageWork((maskSquare: expanded)),
      );
      if (coverage > bestCoverage) {
        best = expanded;
        bestCoverage = coverage;
      }
      if (bestCoverage >= target) {
        return best;
      }
    }
    return best;
  }

  Uint8List _synthesizeFullMask(int size) {
    final image = img.Image(width: size, height: size);
    image.clear(img.ColorRgba8(255, 255, 255, 255));
    return Uint8List.fromList(img.encodePng(image));
  }

  LABColor _colorToLab(Color c) {
    double r = c.red / 255, g = c.green / 255, b = c.blue / 255;
    r = r > 0.04045 ? pow((r + 0.055) / 1.055, 2.4).toDouble() : r / 12.92;
    g = g > 0.04045 ? pow((g + 0.055) / 1.055, 2.4).toDouble() : g / 12.92;
    b = b > 0.04045 ? pow((b + 0.055) / 1.055, 2.4).toDouble() : b / 12.92;
    double x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722),
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = x > 0.008856 ? pow(x, 1 / 3).toDouble() : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? pow(y, 1 / 3).toDouble() : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? pow(z, 1 / 3).toDouble() : 7.787 * z + 16 / 116;
    return LABColor(l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z));
  }

  Future<File> _writeTempFile(Uint8List b, String e) async {
    final t = await getTemporaryDirectory();
    final f = File(
      '${t.path}/ai_wrap_${DateTime.now().millisecondsSinceEpoch}.$e',
    );
    await f.writeAsBytes(b);
    return f;
  }

  Uint8List _buildSyntheticChipBytes(Color c) {
    final i = img.Image(width: 256, height: 256);
    i.clear(img.ColorRgb8(c.red, c.green, c.blue));
    return Uint8List.fromList(img.encodeJpg(i));
  }

  Uint8List? _decodeDataUrl(String? url) {
    if (url == null) return null;
    final parts = url.split(',');
    if (parts.length < 2) return null;
    try {
      return base64Decode(parts[1]);
    } catch (_) {
      return null;
    }
  }

  Future<Uint8List> _applyPBREnhancement({
    required Uint8List wrappedBytes,
    required Uint8List maskBytes,
    required String finish,
    required Map<String, dynamic> pbrAssets,
  }) async {
    final normalBytes = _decodeDataUrl(pbrAssets['normal_map_url']);
    final roughnessBytes = _decodeDataUrl(pbrAssets['roughness_map_url']);
    final flakeBytes = _decodeDataUrl(pbrAssets['flake_map_url']);
    final clearcoatBytes = _decodeDataUrl(pbrAssets['clearcoat_map_url']);

    return await Isolate.run(() => _pbrEnhanceWork((
      wrappedBytes: wrappedBytes,
      maskBytes: maskBytes,
      normalMapBytes: normalBytes,
      roughnessMapBytes: roughnessBytes,
      flakeMapBytes: flakeBytes,
      clearcoatMapBytes: clearcoatBytes,
      finish: finish,
    )));
  }
}

typedef _PbrEnhanceArgs = ({
  Uint8List wrappedBytes,
  Uint8List maskBytes,
  Uint8List? normalMapBytes,
  Uint8List? roughnessMapBytes,
  Uint8List? flakeMapBytes,
  Uint8List? clearcoatMapBytes,
  String finish,
});

Uint8List _pbrEnhanceWork(_PbrEnhanceArgs a) {
  final wrapped = img.decodeImage(a.wrappedBytes);
  final mask = a.maskBytes.isEmpty ? null : img.decodeImage(a.maskBytes);
  if (wrapped == null || mask == null) return a.wrappedBytes;

  final normal = a.normalMapBytes != null ? img.decodeImage(a.normalMapBytes!) : null;
  final roughness = a.roughnessMapBytes != null ? img.decodeImage(a.roughnessMapBytes!) : null;
  final flake = a.flakeMapBytes != null ? img.decodeImage(a.flakeMapBytes!) : null;
  final clearcoat = a.clearcoatMapBytes != null ? img.decodeImage(a.clearcoatMapBytes!) : null;

  final w = wrapped.width;
  final h = wrapped.height;
  
  final rMask = img.copyResize(mask, width: w, height: h, interpolation: img.Interpolation.linear);
  final rNormal = normal != null ? img.copyResize(normal, width: w, height: h) : null;
  final rRoughness = roughness != null ? img.copyResize(roughness, width: w, height: h) : null;
  final rFlake = flake != null ? img.copyResize(flake, width: w, height: h) : null;
  final rClearcoat = clearcoat != null ? img.copyResize(clearcoat, width: w, height: h) : null;

  final out = img.Image.from(wrapped);
  final finishLow = a.finish.toLowerCase();
  final isMatte = finishLow.contains('matte');
  final isMetallic = finishLow.contains('metallic') || finishLow.contains('pearl');

  for (int y = 0; y < h; y++) {
    for (int x = 0; x < w; x++) {
      final mP = rMask.getPixel(x, y);
      final mw = _maskStrength(mP) / 255.0;
      if (mw < 0.05) continue;

      final p = wrapped.getPixel(x, y);
      double pr = p.r.toDouble();
      double pg = p.g.toDouble();
      double pb = p.b.toDouble();
      final lum = (0.2126 * pr + 0.7152 * pg + 0.0722 * pb) / 255.0;

      if (rRoughness != null) {
        final rv = (rRoughness.getPixel(x, y).r / 255.0);
        final gloss = 1.0 - rv;
        final highlight = pow(lum, isMatte ? 5.0 : 3.0).toDouble();
        final boost = highlight * gloss * (isMatte ? 15.0 : 40.0);
        pr += boost; pg += boost; pb += boost;
      }

      if (rClearcoat != null) {
        final cv = (rClearcoat.getPixel(x, y).r / 255.0);
        final spec = pow(lum, 12.0).toDouble() * cv * 60.0;
        pr += spec; pg += spec; pb += spec;
      }

      if (rFlake != null && isMetallic) {
        final fv = (rFlake.getPixel(x, y).r / 255.0);
        if (fv > 0.4) {
          final sparkle = pow(fv, 2.0).toDouble() * lum * 50.0;
          pr += sparkle; pg += sparkle; pb += sparkle;
        }
      }

      if (rNormal != null) {
        final nx = (rNormal.getPixel(x, y).r - 128) / 128.0;
        final ny = (rNormal.getPixel(x, y).g - 128) / 128.0;
        final detail = (nx.abs() + ny.abs()) * 0.1 * lum * 255.0;
        pr += detail; pg += detail; pb += detail;
      }

      out.setPixelRgba(
        x, y,
        (pr * mw + p.r * (1 - mw)).round().clamp(0, 255),
        (pg * mw + p.g * (1 - mw)).round().clamp(0, 255),
        (pb * mw + p.b * (1 - mw)).round().clamp(0, 255),
        255
      );
    }
  }

  return Uint8List.fromList(img.encodePng(out));
}

Uint8List _buildCenterFallbackMaskWork(({Uint8List imageBytes}) args) {
  try {
    final src = img.decodeImage(args.imageBytes);
    if (src == null) return Uint8List(0);
    final w = src.width;
    final h = src.height;
    final out = img.Image(width: w, height: h);

    final x0 = (w * 0.08).round().clamp(0, w - 1);
    final x1 = (w * 0.92).round().clamp(0, w - 1);
    final y0 = (h * 0.16).round().clamp(0, h - 1);
    final y1 = (h * 0.90).round().clamp(0, h - 1);

    for (int y = y0; y <= y1; y++) {
      for (int x = x0; x <= x1; x++) {
        out.setPixelRgba(x, y, 255, 255, 255, 255);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return Uint8List(0);
  }
}

Uint8List _applyStrongTintFallbackWork(
  ({Uint8List original, Uint8List maskSquare, int red, int green, int blue})
  args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || maskDecoded == null) return args.original;
    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: orig.width,
      refHeight: orig.height,
    );
    final out = img.Image.from(orig);
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
        if (mw < 0.08) continue;
        final p = orig.getPixel(x, y);
        final lum = (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255.0;
        final tint = (0.72 + 0.24 * (1.0 - lum)).clamp(0.68, 0.92);
        final r = (p.r * (1 - tint) + args.red * tint).round().clamp(0, 255);
        final g = (p.g * (1 - tint) + args.green * tint).round().clamp(0, 255);
        final b = (p.b * (1 - tint) + args.blue * tint).round().clamp(0, 255);
        out.setPixelRgba(x, y, r, g, b, 255);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.original;
  }
}

// ── ISOLATE WORKERS ──

Uint8List _optimizeBytesWork(
  ({Uint8List bytes, int maxSize, bool usePng, int jpegQuality}) args,
) {
  try {
    final d = img.decodeImage(args.bytes);
    if (d == null) return args.bytes;
    img.Image work = d;
    var resized = false;
    if (d.width > args.maxSize || d.height > args.maxSize) {
      int w = d.width;
      int h = d.height;
      if (w > h) {
        h = (h * args.maxSize / w).round();
        w = args.maxSize;
      } else {
        w = (w * args.maxSize / h).round();
        h = args.maxSize;
      }
      work = img.copyResize(
        d,
        width: w,
        height: h,
        interpolation: img.Interpolation.cubic,
      );
      resized = true;
    }
    // If resize is unnecessary, keep original bytes to avoid generation-loss re-encoding.
    if (!resized) return args.bytes;
    return Uint8List.fromList(
      args.usePng
          ? img.encodePng(work)
          : img.encodeJpg(work, quality: args.jpegQuality),
    );
  } catch (_) {
    return args.bytes;
  }
}

Uint8List _applySelectiveMaskWork(
  ({Uint8List maskBytes, Set<String> parts, bool dilate, bool isSynthetic})
  args,
) {
  try {
    final d = img.decodeImage(args.maskBytes);
    if (d == null) return args.maskBytes;
    final w = d.width, h = d.height;
    final out = img.Image(width: w, height: h);
    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (_maskStrength(d.getPixel(x, y)) > 30) {
          minX = min(minX, x);
          minY = min(minY, y);
          maxX = max(maxX, x);
          maxY = max(maxY, y);
        }
      }
    }
    if (maxX <= minX) return args.maskBytes;
    final bw = (maxX - minX + 1).toDouble(), bh = (maxY - minY + 1).toDouble();
    final selectedCanonical = args.parts
        .map(_canonicalPartKey)
        .whereType<String>()
        .toSet();

    // ⚠️ STICKY MIRRORS: If any side panel is selected, include mirrors automatically
    // as most users expect mirrors to be part of the "side" wrap.
    final hasSideParts = selectedCanonical.any(
      (p) => p.contains('door') || p.contains('fender') || p == 'side_skirts',
    );
    if (hasSideParts) {
      selectedCanonical.add('mirrors');
    }

    final blockedCanonical = _knownCanonicalParts.difference(selectedCanonical);
    final selectedRegions = selectedCanonical
        .expand(_panelRegions)
        .toList(growable: false);
    final blockedRegions = blockedCanonical
        .expand(_panelRegions)
        .toList(growable: false);
    final blockedMask = img.Image(width: w, height: h);

    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        final bodyA = _maskStrength(d.getPixel(x, y));
        if (bodyA < 10) continue;
        final nx = (x - minX) / bw, ny = (y - minY) / bh;
        if (args.isSynthetic &&
            (nx < 0.02 || nx > 0.98 || ny < 0.05 || ny > 0.90))
          continue;
        bool blocked = false;
        for (final r in blockedRegions) {
          if (nx >= r.minX && nx <= r.maxX && ny >= r.minY && ny <= r.maxY) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          blockedMask.setPixelRgba(x, y, 255, 255, 255, bodyA.toInt());
          continue;
        }

        double sw = 0.0;
        for (final r in selectedRegions) {
          if (nx >= r.minX && nx <= r.maxX && ny >= r.minY && ny <= r.maxY) {
            sw = 1.0;
            break;
          }
        }
        if (sw <= 0.0) continue;

        double finalA = bodyA * sw;
        // ⚠️ MIRROR HINT: If mirror is selected but mask is weak/missing,
        // provide a faint hint to help Gemini's vision follow the "MIRROR RULE".
        final inMirrorZone = _isLikelyMirrorZone(nx, ny);
        if (finalA < 40 && inMirrorZone && sw > 0.5) {
          finalA = 40;
        }

        out.setPixelRgba(x, y, 255, 255, 255, finalA.round().clamp(0, 255));
      }
    }
    if (blockedRegions.isNotEmpty) {
      final guard = img.Image(width: w, height: h);
      final guardRad = max(1, (max(w, h) * 0.006).round());
      for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
          int maxA = 0;
          for (int ky = -guardRad; ky <= guardRad; ky++) {
            final yy = (y + ky).clamp(0, h - 1);
            for (int kx = -guardRad; kx <= guardRad; kx++) {
              final xx = (x + kx).clamp(0, w - 1);
              final a = blockedMask.getPixel(xx, yy).a.toInt();
              if (a > maxA) {
                maxA = a;
                if (maxA >= 255) break;
              }
            }
            if (maxA >= 255) break;
          }
          if (maxA > 0) guard.setPixelRgba(x, y, 255, 255, 255, maxA);
        }
      }
      for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
          if (guard.getPixel(x, y).a > 0) {
            out.setPixelRgba(x, y, 0, 0, 0, 0);
          }
        }
      }
    }
    if (!args.dilate) return Uint8List.fromList(img.encodePng(out));
    final dilated = img.Image(width: w, height: h);
    final rad = (max(w, h) * 0.05).round().clamp(20, 80);
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int maxV = 0;
        for (int ky = -rad; ky <= rad; ky += rad ~/ 2) {
          for (int kx = -rad; kx <= rad; kx += rad ~/ 2) {
            final p = out.getPixel(
              (x + kx).clamp(0, w - 1),
              (y + ky).clamp(0, h - 1),
            );
            if (p.a > maxV) maxV = p.a.toInt();
            if (maxV >= 255) break;
          }
          if (maxV >= 255) break;
        }
        dilated.setPixelRgba(x, y, 255, 255, 255, maxV);
      }
    }
    return Uint8List.fromList(img.encodePng(dilated));
  } catch (_) {
    return args.maskBytes;
  }
}

Uint8List _expandMaskWork(({Uint8List maskBytes, int radiusPx}) args) {
  try {
    final src = img.decodeImage(args.maskBytes);
    if (src == null) return args.maskBytes;
    final w = src.width;
    final h = src.height;
    final rad = args.radiusPx.clamp(1, 20);
    final out = img.Image(width: w, height: h);

    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int maxA = 0;
        for (int ky = -rad; ky <= rad; ky++) {
          final yy = (y + ky).clamp(0, h - 1);
          for (int kx = -rad; kx <= rad; kx++) {
            if (kx * kx + ky * ky > rad * rad) continue;
            final xx = (x + kx).clamp(0, w - 1);
            final a = src.getPixel(xx, yy).a.toInt();
            if (a > maxA) {
              maxA = a;
              if (maxA >= 255) break;
            }
          }
          if (maxA >= 255) break;
        }
        out.setPixelRgba(x, y, 255, 255, 255, maxA);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.maskBytes;
  }
}

Uint8List _cleanupMaskArtifactsWork(({Uint8List maskBytes}) args) {
  try {
    final src = img.decodeImage(args.maskBytes);
    if (src == null) return args.maskBytes;
    final w = src.width;
    final h = src.height;
    if (w < 8 || h < 8) return args.maskBytes;

    final stage1 = img.Image.from(src);
    for (int y = 1; y < h - 1; y++) {
      for (int x = 1; x < w - 1; x++) {
        final on = _maskStrength(src.getPixel(x, y)) > 36;
        int neighbors = 0;
        for (int ky = -1; ky <= 1; ky++) {
          for (int kx = -1; kx <= 1; kx++) {
            if (kx == 0 && ky == 0) continue;
            if (_maskStrength(src.getPixel(x + kx, y + ky)) > 36) {
              neighbors++;
            }
          }
        }
        if (on && neighbors <= 1) {
          stage1.setPixelRgba(x, y, 0, 0, 0, 0);
        } else if (!on && neighbors >= 7) {
          stage1.setPixelRgba(x, y, 255, 255, 255, 255);
        }
      }
    }

    final out = img.Image.from(stage1);
    final rad = max(1, (max(w, h) * 0.0035).round());
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int maxA = 0;
        for (int ky = -rad; ky <= rad; ky++) {
          final yy = (y + ky).clamp(0, h - 1);
          for (int kx = -rad; kx <= rad; kx++) {
            if (kx * kx + ky * ky > rad * rad) continue;
            final xx = (x + kx).clamp(0, w - 1);
            final a = _maskStrength(stage1.getPixel(xx, yy));
            if (a > maxA) maxA = a;
          }
        }
        if (maxA > 36) {
          out.setPixelRgba(x, y, 255, 255, 255, 255);
        }
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.maskBytes;
  }
}

Uint8List _restoreOriginalAspectWork(
  ({Uint8List original, Uint8List square}) args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final sq = img.decodeImage(args.square);
    if (orig == null || sq == null) return args.square;

    final squareW = sq.width;
    final squareH = sq.height;
    // The candidate is a square-padded version of the original.
    // The longest side of the original was mapped to the full side of the square.
    final sampleSide = max(squareW, squareH).toDouble();
    final side = max(orig.width, orig.height).toDouble();
    final sc = sampleSide / side;

    // Calculate offsets to center the original image within the square workspace.
    final offX = ((sampleSide - orig.width * sc) / 2).round();
    final offY = ((sampleSide - orig.height * sc) / 2).round();

    final out = img.Image(width: orig.width, height: orig.height);
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final sx = (x * sc).round() + offX;
        final sy = (y * sc).round() + offY;

        // Ensure we stay within the candidate image bounds.
        final cx = sx.clamp(0, squareW - 1);
        final cy = sy.clamp(0, squareH - 1);

        final p = sq.getPixel(cx, cy);
        out.setPixelRgba(x, y, p.r.toInt(), p.g.toInt(), p.b.toInt(), 255);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.square;
  }
}

Uint8List _renderMaskedWrapWork(
  ({
    Uint8List original,
    Uint8List maskSquare,
    int red,
    int green,
    int blue,
    String finish,
  })
  args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || maskDecoded == null) return args.original;

    final squareW = maskDecoded.width;
    final squareH = maskDecoded.height;
    final sampleSide = min(squareW, squareH).toDouble();
    final side = max(orig.width, orig.height).toDouble();
    final sc = sampleSide / side;
    final offX = ((sampleSide - orig.width * sc) / 2).round();
    final offY = ((sampleSide - orig.height * sc) / 2).round();

    final matte = args.finish.toLowerCase().contains('matte');
    final baseBlend = matte ? 0.72 : 0.80;
    final out = img.Image.from(orig);

    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final gx = (x * sc).round() + offX;
        final gy = (y * sc).round() + offY;
        if (gx < 0 || gx >= squareW || gy < 0 || gy >= squareH) continue;

        final mw = _maskStrength(maskDecoded.getPixel(gx, gy)) / 255.0;
        if (mw < 0.2) continue;

        final p = orig.getPixel(x, y);
        final luma = (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255.0;
        final shade = (0.38 + luma * 0.62).clamp(0.28, 1.0);

        final tr = (args.red * shade).round().clamp(0, 255);
        final tg = (args.green * shade).round().clamp(0, 255);
        final tb = (args.blue * shade).round().clamp(0, 255);

        final blend = (baseBlend * mw).clamp(0.0, 1.0);
        out.setPixelRgba(
          x,
          y,
          (tr * blend + p.r * (1.0 - blend)).round().clamp(0, 255),
          (tg * blend + p.g * (1.0 - blend)).round().clamp(0, 255),
          (tb * blend + p.b * (1.0 - blend)).round().clamp(0, 255),
          255,
        );
      }
    }

    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.original;
  }
}

Uint8List _normalizeToReferenceSizeWork(
  ({Uint8List reference, Uint8List candidate}) args,
) {
  try {
    final ref = img.decodeImage(args.reference);
    final cand = img.decodeImage(args.candidate);
    if (ref == null || cand == null) return args.candidate;
    if (ref.width == cand.width && ref.height == cand.height) {
      return args.candidate;
    }
    return _restoreOriginalAspectWork((
      original: args.reference,
      square: args.candidate,
    ));
  } catch (_) {
    return args.candidate;
  }
}

Uint8List _ensureOriginalOutputWork(
  ({Uint8List reference, Uint8List candidate}) args,
) {
  try {
    final ref = img.decodeImage(args.reference);
    final cand = img.decodeImage(args.candidate);
    if (ref == null || cand == null) return args.candidate;
    if (cand.width == ref.width && cand.height == ref.height) {
      return Uint8List.fromList(img.encodePng(cand));
    }

    // If model returned a square working image, map back using the original
    // padding geometry to preserve source aspect exactly.
    if ((cand.width - cand.height).abs() <= 2) {
      return _restoreOriginalAspectWork((
        original: args.reference,
        square: args.candidate,
      ));
    }

    final aspectDiff = ((cand.width / cand.height) - (ref.width / ref.height)).abs();
    if (aspectDiff <= 0.035) {
      final normalized = img.copyResize(
        cand,
        width: ref.width,
        height: ref.height,
        interpolation: img.Interpolation.cubic,
      );
      return Uint8List.fromList(img.encodePng(normalized));
    }

    final scale = min(
      ref.width / max(1, cand.width),
      ref.height / max(1, cand.height),
    );
    final targetWidth = max(1, (cand.width * scale).round());
    final targetHeight = max(1, (cand.height * scale).round());
    final resized = img.copyResize(
      cand,
      width: targetWidth,
      height: targetHeight,
      interpolation: img.Interpolation.cubic,
    );
    final out = img.Image(width: ref.width, height: ref.height);
    final offsetX = ((ref.width - targetWidth) / 2).round();
    final offsetY = ((ref.height - targetHeight) / 2).round();
    for (int y = 0; y < targetHeight; y++) {
      final dy = y + offsetY;
      if (dy < 0 || dy >= ref.height) continue;
      for (int x = 0; x < targetWidth; x++) {
        final dx = x + offsetX;
        if (dx < 0 || dx >= ref.width) continue;
        final p = resized.getPixel(x, y);
        out.setPixelRgba(dx, dy, p.r.toInt(), p.g.toInt(), p.b.toInt(), p.a);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.candidate;
  }
}

double _estimateMaskedDeltaWork(
  ({Uint8List original, Uint8List generatedSquare, Uint8List maskSquare}) args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final gen = img.decodeImage(args.generatedSquare);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || gen == null || maskDecoded == null) return 0.0;
    final mask =
        (maskDecoded.width == gen.width && maskDecoded.height == gen.height)
        ? maskDecoded
        : img.copyResize(
            maskDecoded,
            width: gen.width,
            height: gen.height,
            interpolation: img.Interpolation.nearest,
          );
    final squareW = gen.width;
    final squareH = gen.height;
    final sampleSide = min(squareW, squareH).toDouble();
    final side = max(orig.width, orig.height).toDouble();
    final sc = sampleSide / side;
    final offX = ((sampleSide - orig.width * sc) / 2).round();
    final offY = ((sampleSide - orig.height * sc) / 2).round();

    double sum = 0.0;
    int count = 0;
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final gx = (x * sc).round() + offX;
        final gy = (y * sc).round() + offY;
        if (gx < 0 || gx >= squareW || gy < 0 || gy >= squareH) continue;
        final mw = _maskStrength(mask.getPixel(gx, gy)) / 255.0;
        if (mw < 0.15) continue;
        final o = orig.getPixel(x, y);
        final g = gen.getPixel(gx, gy);
        sum +=
            ((o.r - g.r).abs() + (o.g - g.g).abs() + (o.b - g.b).abs()) / 3.0;
        count++;
      }
    }
    if (count == 0) return 0.0;
    return sum / count;
  } catch (_) {
    return 0.0;
  }
}

double _estimateMaskedDeltaOnReferenceWork(
  ({Uint8List original, Uint8List generatedReference, Uint8List maskSquare})
  args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final genRef = img.decodeImage(args.generatedReference);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || genRef == null || maskDecoded == null) return 0.0;
    if (orig.width != genRef.width || orig.height != genRef.height) return 0.0;

    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: orig.width,
      refHeight: orig.height,
    );

    double sum = 0.0;
    int count = 0;
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
        if (mw < 0.15) continue;
        final o = orig.getPixel(x, y);
        final g = genRef.getPixel(x, y);
        sum +=
            ((o.r - g.r).abs() + (o.g - g.g).abs() + (o.b - g.b).abs()) / 3.0;
        count++;
      }
    }
    if (count == 0) return 0.0;
    return sum / count;
  } catch (_) {
    return 0.0;
  }
}

double _estimateMaskCoverageWork(({Uint8List maskSquare}) args) {
  try {
    final mask = img.decodeImage(args.maskSquare);
    if (mask == null) return 0.0;
    final total = mask.width * mask.height;
    if (total <= 0) return 0.0;
    int on = 0;
    for (int y = 0; y < mask.height; y++) {
      for (int x = 0; x < mask.width; x++) {
        if (_maskStrength(mask.getPixel(x, y)) > 32) on++;
      }
    }
    return on / total;
  } catch (_) {
    return 0.0;
  }
}

Uint8List _forceSelectiveRecolorWork(
  ({Uint8List original, Uint8List maskSquare, int red, int green, int blue})
  args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || maskDecoded == null) return args.original;
    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: orig.width,
      refHeight: orig.height,
    );

    final out = img.Image.from(orig);
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
        if (mw < 0.2) continue;
        final p = orig.getPixel(x, y);
        final lum = ((p.r + p.g + p.b) / 3.0) / 255.0;
        final shade = (0.55 + lum * 0.45).clamp(0.35, 1.0);
        final tr = (args.red * shade).round().clamp(0, 255);
        final tg = (args.green * shade).round().clamp(0, 255);
        final tb = (args.blue * shade).round().clamp(0, 255);
        final blend = (0.62 * mw).clamp(0.0, 1.0);
        out.setPixelRgba(
          x,
          y,
          (tr * blend + p.r * (1.0 - blend)).round().clamp(0, 255),
          (tg * blend + p.g * (1.0 - blend)).round().clamp(0, 255),
          (tb * blend + p.b * (1.0 - blend)).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.original;
  }
}

Uint8List _anchorTargetColorWork(
  ({
    Uint8List imageBytes,
    Uint8List maskSquare,
    int red,
    int green,
    int blue,
    double strength,
  })
  args,
) {
  try {
    final src = img.decodeImage(args.imageBytes);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (src == null || maskDecoded == null) return args.imageBytes;
    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: src.width,
      refHeight: src.height,
    );
    final out = img.Image.from(src);
    final s = args.strength.clamp(0.0, 0.65);

    for (int y = 0; y < src.height; y++) {
      for (int x = 0; x < src.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
        if (mw < 0.12) continue;
        final p = src.getPixel(x, y);
        final lum = ((p.r + p.g + p.b) / 3.0) / 255.0;
        final shade = (0.52 + lum * 0.48).clamp(0.35, 1.0);
        final tr = (args.red * shade).round().clamp(0, 255);
        final tg = (args.green * shade).round().clamp(0, 255);
        final tb = (args.blue * shade).round().clamp(0, 255);
        final k = (s * mw).clamp(0.0, 1.0);
        out.setPixelRgba(
          x,
          y,
          (tr * k + p.r * (1.0 - k)).round().clamp(0, 255),
          (tg * k + p.g * (1.0 - k)).round().clamp(0, 255),
          (tb * k + p.b * (1.0 - k)).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.imageBytes;
  }
}

Uint8List _compositeHighResWork(
  ({
    Uint8List original,
    Uint8List generatedSquare,
    Uint8List maskSquare,
    bool isPartial,
  })
  args,
) {
  try {
    final orig = img.decodeImage(args.original),
        gen = img.decodeImage(args.generatedSquare),
        maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || gen == null || maskDecoded == null)
      return args.original;
    final mask =
        (maskDecoded.width == gen.width && maskDecoded.height == gen.height)
        ? maskDecoded
        : img.copyResize(
            maskDecoded,
            width: gen.width,
            height: gen.height,
            interpolation: img.Interpolation.nearest,
          );

    final squareW = gen.width;
    final squareH = gen.height;
    final sampleSide = min(squareW, squareH).toDouble();

    final side = max(orig.width, orig.height).toDouble();
    final sc = sampleSide / side;
    final offX = ((sampleSide - orig.width * sc) / 2).round();
    final offY = ((sampleSide - orig.height * sc) / 2).round();

    final out = img.Image.from(orig);
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final gx = (x * sc).round() + offX, gy = (y * sc).round() + offY;
        if (gx < 0 || gx >= squareW || gy < 0 || gy >= squareH) continue;
        final mP = mask.getPixel(gx, gy);
        final mw = _maskStrength(mP) / 255.0;
        final threshold = args.isPartial ? 0.25 : 0.06;
        if (mw < threshold) continue;

        final oP = orig.getPixel(x, y), gP = gen.getPixel(gx, gy);
        final blend = args.isPartial ? 1.0 : mw.clamp(0.0, 1.0);
        // Preserve original luminance detail and only borrow generated color.
        final oL = 0.2126 * oP.r + 0.7152 * oP.g + 0.0722 * oP.b;
        final gL = (0.2126 * gP.r + 0.7152 * gP.g + 0.0722 * gP.b).clamp(
          1.0,
          255.0,
        );
        final s = (oL / gL).clamp(0.45, 1.65);
        final cr = (gP.r * s).clamp(0.0, 255.0);
        final cg = (gP.g * s).clamp(0.0, 255.0);
        final cb = (gP.b * s).clamp(0.0, 255.0);
        out.setPixelRgba(
          x,
          y,
          (cr * blend + oP.r * (1.0 - blend)).round().clamp(0, 255),
          (cg * blend + oP.g * (1.0 - blend)).round().clamp(0, 255),
          (cb * blend + oP.b * (1.0 - blend)).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.original;
  }
}

img.Image _projectMaskToReferenceWork({
  required img.Image mask,
  required int refWidth,
  required int refHeight,
}) {
  final maskAspect = mask.width / max(1, mask.height);
  final refAspect = refWidth / max(1, refHeight);
  if ((maskAspect - refAspect).abs() <= 0.03) {
    return (mask.width == refWidth && mask.height == refHeight)
        ? mask
        : img.copyResize(
            mask,
            width: refWidth,
            height: refHeight,
            interpolation: img.Interpolation.nearest,
          );
  }
  if ((mask.width - mask.height).abs() <= 2) {
    final side = min(mask.width, mask.height).toDouble();
    final scale = side / max(refWidth, refHeight);
    final offX = (side - refWidth * scale) / 2.0;
    final offY = (side - refHeight * scale) / 2.0;
    final out = img.Image(width: refWidth, height: refHeight);
    for (int y = 0; y < refHeight; y++) {
      for (int x = 0; x < refWidth; x++) {
        final sx = (x * scale + offX).round().clamp(0, mask.width - 1);
        final sy = (y * scale + offY).round().clamp(0, mask.height - 1);
        final p = mask.getPixel(sx, sy);
        out.setPixelRgba(x, y, p.r.toInt(), p.g.toInt(), p.b.toInt(), p.a);
      }
    }
    return out;
  }
  return img.copyResize(
    mask,
    width: refWidth,
    height: refHeight,
    interpolation: img.Interpolation.nearest,
  );
}

Uint8List _compositeWithReferenceWork(
  ({
    Uint8List original,
    Uint8List generatedReference,
    Uint8List maskSquare,
    bool isPartial,
  })
  args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final genRef = img.decodeImage(args.generatedReference);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || genRef == null || maskDecoded == null) {
      return args.original;
    }
    if (orig.width != genRef.width || orig.height != genRef.height) {
      return args.original;
    }

    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: orig.width,
      refHeight: orig.height,
    );

    final out = img.Image.from(orig);
    final ow = orig.width;
    final oh = orig.height;
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
        final nx = x / max(1, ow - 1);
        final ny = y / max(1, oh - 1);
        // Tighten mirror zone: side mirrors are usually high and towards the sides, not in the center.
        final inMirrorZone =
            ((nx > 0.08 && nx < 0.33) || (nx > 0.67 && nx < 0.92)) &&
            (ny > 0.18 && ny < 0.45);
        // Use a much lower threshold for mirrors in full-wrap mode to allow Gemini's work through.
        final threshold = args.isPartial ? 0.25 : (inMirrorZone ? 0.05 : 0.12);
        if (mw < threshold) continue;

        final oP = orig.getPixel(x, y);
        if (_shouldProtectNonWrapPixel(oP, x, y, ow, oh)) {
          continue;
        }
        final gP = genRef.getPixel(x, y);
        final delta =
            ((gP.r - oP.r).abs() + (gP.g - oP.g).abs() + (gP.b - oP.b).abs()) /
            3.0;
        if (delta < 3.0) continue;
        final blend = args.isPartial ? 1.0 : mw.clamp(0.0, 1.0);

        final oL = 0.2126 * oP.r + 0.7152 * oP.g + 0.0722 * oP.b;
        final gL = (0.2126 * gP.r + 0.7152 * gP.g + 0.0722 * gP.b).clamp(
          1.0,
          255.0,
        );
        final s = (oL / gL).clamp(0.45, 1.65);
        final cr = (gP.r * s).clamp(0.0, 255.0);
        final cg = (gP.g * s).clamp(0.0, 255.0);
        final cb = (gP.b * s).clamp(0.0, 255.0);
        out.setPixelRgba(
          x,
          y,
          (cr * blend + oP.r * (1.0 - blend)).round().clamp(0, 255),
          (cg * blend + oP.g * (1.0 - blend)).round().clamp(0, 255),
          (cb * blend + oP.b * (1.0 - blend)).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.original;
  }
}

Uint8List _compositeWithReferenceRelaxedWork(
  ({
    Uint8List original,
    Uint8List generatedReference,
    Uint8List maskSquare,
    bool isPartial,
  })
  args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final genRef = img.decodeImage(args.generatedReference);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || genRef == null || maskDecoded == null) {
      return args.original;
    }
    if (orig.width != genRef.width || orig.height != genRef.height) {
      return args.original;
    }

    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: orig.width,
      refHeight: orig.height,
    );

    final out = img.Image.from(orig);
    final ow = orig.width;
    final oh = orig.height;
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
        final nx = x / max(1, ow - 1);
        final ny = y / max(1, oh - 1);
        final inMirrorZone =
            ((nx > 0.08 && nx < 0.33) || (nx > 0.67 && nx < 0.92)) &&
            (ny > 0.18 && ny < 0.45);
        final threshold = args.isPartial ? 0.20 : (inMirrorZone ? 0.03 : 0.05);
        if (mw < threshold) continue;

        final oP = orig.getPixel(x, y);
        if (_shouldProtectNonWrapPixel(oP, x, y, ow, oh)) continue;
        final gP = genRef.getPixel(x, y);
        final blend = args.isPartial ? 1.0 : mw.clamp(0.0, 1.0);
        out.setPixelRgba(
          x,
          y,
          (gP.r * blend + oP.r * (1.0 - blend)).round().clamp(0, 255),
          (gP.g * blend + oP.g * (1.0 - blend)).round().clamp(0, 255),
          (gP.b * blend + oP.b * (1.0 - blend)).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.original;
  }
}

bool _shouldProtectNonWrapPixel(
  img.Pixel p,
  int x,
  int y,
  int width,
  int height,
) {
  final r = p.r.toDouble();
  final g = p.g.toDouble();
  final b = p.b.toDouble();
  final maxC = max(r, max(g, b));
  final minC = min(r, min(g, b));
  final lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  final sat = maxC <= 0 ? 0.0 : (maxC - minC) / maxC;
  final nx = x / max(1, width - 1);
  final ny = y / max(1, height - 1);

  // Window glass guard: dark/low-sat in upper half should stay untouched.
  // ⚠️ LOOSENED for mirrors: mirrors often fall in this zone.
  final inMirrorZone = _isLikelyMirrorZone(nx, ny);
  final isWindowLike =
      !inMirrorZone &&
      ny < 0.64 &&
      nx > 0.10 &&
      nx < 0.96 &&
      lum < 96 &&
      sat < 0.22;
  if (isWindowLike) return true;

  // Headlight/taillight guard: bright low-sat at front/rear zones.
  final sideZone = nx < 0.24 || nx > 0.76;
  final isLightLike =
      sideZone && ny > 0.16 && ny < 0.78 && lum > 170 && sat < 0.20;
  if (isLightLike) return true;

  return false;
}

bool _isLikelyMirrorZone(double nx, double ny) {
  if (ny < 0.14 || ny > 0.52) return false;
  final flankZone = (nx > 0.08 && nx < 0.36) || (nx > 0.64 && nx < 0.94);
  // 3/4 front views often place the visible mirror close to the center-right.
  final threeQuarterZone = nx > 0.38 && nx < 0.70;
  return flankZone || threeQuarterZone;
}

Uint8List _augmentFullMaskForMirrorsWork(({Uint8List maskBytes}) args) {
  try {
    final src = img.decodeImage(args.maskBytes);
    if (src == null) return args.maskBytes;

    final w = src.width;
    final h = src.height;
    if (w < 8 || h < 8) return args.maskBytes;

    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (_maskStrength(src.getPixel(x, y)) > 30) {
          minX = min(minX, x);
          minY = min(minY, y);
          maxX = max(maxX, x);
          maxY = max(maxY, y);
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return args.maskBytes;

    final bw = (maxX - minX + 1).toDouble();
    final bh = (maxY - minY + 1).toDouble();
    final out = img.Image.from(src);
    final rad = max(2, (max(w, h) * 0.025).round());
    final maxAdded = (w * h * 0.05).round();
    int added = 0;
    bool changed = false;

    for (int y = minY; y <= maxY; y++) {
      for (int x = minX; x <= maxX; x++) {
        if (_maskStrength(src.getPixel(x, y)) > 30) continue;

        final nx = (x - minX) / bw;
        final ny = (y - minY) / bh;
        if (!_isLikelyMirrorZone(nx, ny)) continue;

        int nearOn = 0;
        for (int ky = -rad; ky <= rad; ky++) {
          final yy = (y + ky).clamp(0, h - 1);
          for (int kx = -rad; kx <= rad; kx++) {
            if (kx * kx + ky * ky > rad * rad) continue;
            final xx = (x + kx).clamp(0, w - 1);
            if (_maskStrength(src.getPixel(xx, yy)) > 30) {
              nearOn++;
              if (nearOn >= 1) break;
            }
          }
          if (nearOn >= 1) break;
        }
        if (nearOn < 1) continue;

        out.setPixelRgba(x, y, 255, 255, 255, 255);
        added++;
        changed = true;
        if (added > maxAdded) return args.maskBytes;
      }
    }

    // Hard fallback for full-wrap mirror misses:
    // force small mirror-cap zones near left/right shoulder lines.
    final leftX0 = (minX + bw * 0.04).round().clamp(0, w - 1);
    final leftX1 = (minX + bw * 0.31).round().clamp(0, w - 1);
    final rightX0 = (minX + bw * 0.66).round().clamp(0, w - 1);
    final rightX1 = (minX + bw * 0.96).round().clamp(0, w - 1);
    final y0 = (minY + bh * 0.18).round().clamp(0, h - 1);
    final y1 = (minY + bh * 0.46).round().clamp(0, h - 1);
    for (int y = y0; y <= y1; y++) {
      final ny = (y - minY) / bh;
      if (ny < 0.14 || ny > 0.54) continue;
      for (int x = leftX0; x <= leftX1; x++) {
        final nx = (x - minX) / bw;
        if (!_isLikelyMirrorZone(nx, ny)) continue;
        if (_maskStrength(out.getPixel(x, y)) > 30) continue;
        out.setPixelRgba(x, y, 255, 255, 255, 255);
        changed = true;
      }
      for (int x = rightX0; x <= rightX1; x++) {
        final nx = (x - minX) / bw;
        if (!_isLikelyMirrorZone(nx, ny)) continue;
        if (_maskStrength(out.getPixel(x, y)) > 30) continue;
        out.setPixelRgba(x, y, 255, 255, 255, 255);
        changed = true;
      }
    }

    if (!changed) return args.maskBytes;
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.maskBytes;
  }
}

Uint8List _restoreDetailFromOriginalWork(
  ({
    Uint8List reference,
    Uint8List candidate,
    Uint8List? maskSquare,
    double strength,
  })
  args,
) {
  try {
    final ref = img.decodeImage(args.reference);
    final cand = img.decodeImage(args.candidate);
    if (ref == null || cand == null) return args.candidate;

    final candFit = (cand.width == ref.width && cand.height == ref.height)
        ? cand
        : img.copyResize(
            cand,
            width: ref.width,
            height: ref.height,
            interpolation: img.Interpolation.cubic,
          );
    final refBlur = img.gaussianBlur(img.Image.from(ref), radius: 2);

    img.Image? mask;
    if (args.maskSquare != null && args.maskSquare!.isNotEmpty) {
      final m = img.decodeImage(args.maskSquare!);
      if (m != null) {
        mask = _projectMaskToReferenceWork(
          mask: m,
          refWidth: ref.width,
          refHeight: ref.height,
        );
      }
    }

    final out = img.Image.from(candFit);
    final s = args.strength.clamp(0.0, 1.0);
    for (int y = 0; y < ref.height; y++) {
      for (int x = 0; x < ref.width; x++) {
        double mw = 1.0;
        if (mask != null) {
          mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
          if (mw < 0.05) continue;
        }
        final rp = ref.getPixel(x, y);
        final rb = refBlur.getPixel(x, y);
        final cp = candFit.getPixel(x, y);
        final dr = rp.r - rb.r;
        final dg = rp.g - rb.g;
        final db = rp.b - rb.b;
        final k = s * mw;
        out.setPixelRgba(
          x,
          y,
          (cp.r + dr * k).round().clamp(0, 255),
          (cp.g + dg * k).round().clamp(0, 255),
          (cp.b + db * k).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.candidate;
  }
}

Uint8List _enhanceClarityWork(
  ({
    Uint8List reference,
    Uint8List candidate,
    Uint8List? maskSquare,
    double amount,
  })
  args,
) {
  try {
    final ref = img.decodeImage(args.reference);
    final cand = img.decodeImage(args.candidate);
    if (ref == null || cand == null) return args.candidate;

    final fit = (cand.width == ref.width && cand.height == ref.height)
        ? cand
        : img.copyResize(
            cand,
            width: ref.width,
            height: ref.height,
            interpolation: img.Interpolation.cubic,
          );
    final blur = img.gaussianBlur(img.Image.from(fit), radius: 1);

    img.Image? mask;
    if (args.maskSquare != null && args.maskSquare!.isNotEmpty) {
      final m = img.decodeImage(args.maskSquare!);
      if (m != null) {
        mask = _projectMaskToReferenceWork(
          mask: m,
          refWidth: ref.width,
          refHeight: ref.height,
        );
      }
    }

    final out = img.Image.from(fit);
    final k = args.amount.clamp(0.0, 0.8);
    for (int y = 0; y < ref.height; y++) {
      for (int x = 0; x < ref.width; x++) {
        if (mask != null) {
          final mw = _maskStrength(mask.getPixel(x, y)) / 255.0;
          if (mw < 0.04) continue;
        }
        final cp = fit.getPixel(x, y);
        final bp = blur.getPixel(x, y);
        final rp = ref.getPixel(x, y);
        final dr = cp.r - bp.r;
        final dg = cp.g - bp.g;
        final db = cp.b - bp.b;
        final rl = ((0.2126 * rp.r + 0.7152 * rp.g + 0.0722 * rp.b) / 255.0)
            .clamp(0.35, 1.15);
        final wk = (k * rl).clamp(0.0, 0.9);
        out.setPixelRgba(
          x,
          y,
          (cp.r + dr * wk).round().clamp(0, 255),
          (cp.g + dg * wk).round().clamp(0, 255),
          (cp.b + db * wk).round().clamp(0, 255),
          255,
        );
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.candidate;
  }
}

int _maskStrength(img.Pixel p) {
  final r = p.r.toInt().clamp(0, 255);
  final g = p.g.toInt().clamp(0, 255);
  final b = p.b.toInt().clamp(0, 255);
  final minC = min(r, min(g, b));
  final maxC = max(r, max(g, b));
  final chroma = maxC - minC;

  // Accept only bright, near-neutral pixels as mask foreground.
  // This blocks colored debug overlays / tinted preview rectangles from being
  // interpreted as valid mask area.
  if (minC < 56) return 0;
  if (chroma > 72 && minC < 220) return 0;

  final scaled = ((minC - 56) * 255 / 199).round();
  return scaled.clamp(0, 255);
}

bool _isMaskUsableForWrapWork(({Uint8List maskBytes}) args) {
  try {
    final mask = img.decodeImage(args.maskBytes);
    if (mask == null) return false;
    final w = mask.width;
    final h = mask.height;
    final total = w * h;
    if (total <= 0) return false;

    int on = 0;
    int minX = w;
    int minY = h;
    int maxX = -1;
    int maxY = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        final a = _maskStrength(mask.getPixel(x, y));
        if (a > 24) {
          on++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (on <= 0 || maxX <= minX || maxY <= minY) return false;

    final coverage = on / total;
    if (coverage < 0.002 || coverage > 0.985) return false;

    final bw = (maxX - minX + 1) / w;
    final bh = (maxY - minY + 1) / h;
    final cx = ((minX + maxX) / 2.0) / w;

    if (bw < 0.18 || bh < 0.08) return false;
    if (cx < 0.08 || cx > 0.92) return false;
    return true;
  } catch (_) {
    return false;
  }
}

Uint8List _sanitizeMaskWithSceneWork(
  ({Uint8List maskBytes, Uint8List imageSquareBytes}) args,
) {
  try {
    final mask = img.decodeImage(args.maskBytes);
    final src = img.decodeImage(args.imageSquareBytes);
    if (mask == null || src == null) return args.maskBytes;
    final w = mask.width;
    final h = mask.height;
    final srcFit = (src.width == w && src.height == h)
        ? src
        : img.copyResize(
            src,
            width: w,
            height: h,
            interpolation: img.Interpolation.linear,
          );

    // Estimate background color from border ring.
    int br = 0, bg = 0, bb = 0, n = 0;
    const ring = 6;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        final border = x < ring || y < ring || x >= w - ring || y >= h - ring;
        if (!border) continue;
        final p = srcFit.getPixel(x, y);
        br += p.r.toInt();
        bg += p.g.toInt();
        bb += p.b.toInt();
        n++;
      }
    }
    if (n == 0) return args.maskBytes;
    final mr = br / n, mg = bg / n, mb = bb / n;

    final out = img.Image(width: w, height: h);
    int kept = 0;
    for (int y = 1; y < h - 1; y++) {
      for (int x = 1; x < w - 1; x++) {
        final m = _maskStrength(mask.getPixel(x, y));
        if (m < 18) continue;

        final p = srcFit.getPixel(x, y);
        final diff = (p.r - mr).abs() + (p.g - mg).abs() + (p.b - mb).abs();

        final px = srcFit.getPixel(x + 1, y);
        final py = srcFit.getPixel(x, y + 1);
        final grad =
            (p.r - px.r).abs() +
            (p.g - px.g).abs() +
            (p.b - px.b).abs() +
            (p.r - py.r).abs() +
            (p.g - py.g).abs() +
            (p.b - py.b).abs();

        final fgLike = diff > 24 || grad > 18;
        if (!fgLike) continue;

        out.setPixelRgba(x, y, 255, 255, 255, m);
        kept++;
      }
    }

    // If sanitization removed almost everything, keep original mask.
    final total = w * h;
    if (kept < (total * 0.001)) return args.maskBytes;

    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.maskBytes;
  }
}

Uint8List _excludeRoofNonPaintWork(
  ({Uint8List maskBytes, Uint8List imageSquareBytes}) args,
) {
  try {
    final mask = img.decodeImage(args.maskBytes);
    final src = img.decodeImage(args.imageSquareBytes);
    if (mask == null || src == null) return args.maskBytes;
    final w = mask.width;
    final h = mask.height;
    final srcFit = (src.width == w && src.height == h)
        ? src
        : img.copyResize(
            src,
            width: w,
            height: h,
            interpolation: img.Interpolation.linear,
          );

    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (_maskStrength(mask.getPixel(x, y)) > 32) {
          minX = min(minX, x);
          minY = min(minY, y);
          maxX = max(maxX, x);
          maxY = max(maxY, y);
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return args.maskBytes;

    final bw = (maxX - minX + 1).toDouble();
    final bh = (maxY - minY + 1).toDouble();
    final out = img.Image.from(mask);
    int removed = 0;
    int topOn = 0;
    double topLumSum = 0.0;

    for (int y = minY; y <= maxY; y++) {
      for (int x = minX; x <= maxX; x++) {
        if (_maskStrength(mask.getPixel(x, y)) <= 32) continue;
        final ny = (y - minY) / bh;
        if (ny < 0.0 || ny > 0.42) continue;
        final p = srcFit.getPixel(x, y);
        final lum = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
        topLumSum += lum;
        topOn++;
      }
    }
    final topMeanLum = topOn > 0 ? topLumSum / topOn : 120.0;

    for (int y = minY; y <= maxY; y++) {
      for (int x = minX; x <= maxX; x++) {
        if (_maskStrength(mask.getPixel(x, y)) <= 32) continue;
        final nx = (x - minX) / bw;
        final ny = (y - minY) / bh;
        if (ny < 0.0 || ny > 0.42) continue;

        final p = srcFit.getPixel(x, y);
        final r = p.r.toDouble();
        final g = p.g.toDouble();
        final b = p.b.toDouble();
        final maxC = max(r, max(g, b));
        final minC = min(r, min(g, b));
        final lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        final sat = maxC <= 1e-5 ? 0.0 : (maxC - minC) / maxC;

        final centralSunroofZone =
            nx > 0.22 && nx < 0.86 && ny > 0.03 && ny < 0.30;
        final convertibleRoofZone =
            nx > 0.40 && nx < 0.98 && ny > 0.07 && ny < 0.40;

        // Panoramic sunroof glass: dark, low saturation in top-center roof zone.
        final px = srcFit.getPixel((x + 1).clamp(0, w - 1), y);
        final py = srcFit.getPixel(x, (y + 1).clamp(0, h - 1));
        final grad =
            (p.r - px.r).abs() +
            (p.g - px.g).abs() +
            (p.b - px.b).abs() +
            (p.r - py.r).abs() +
            (p.g - py.g).abs() +
            (p.b - py.b).abs();

        final sunroofLike =
            centralSunroofZone &&
            sat < 0.30 &&
            grad < 150 &&
            lum < (topMeanLum - 6.0).clamp(82.0, 168.0);
        // Soft-top fabric: dark/matte top region (rear-biased for cabriolet profiles).
        final softTopLike = convertibleRoofZone && lum < 96 && sat < 0.28;

        if (sunroofLike || softTopLike) {
          out.setPixelRgba(x, y, 0, 0, 0, 0);
          removed++;
        }
      }
    }

    // Safety: if this rule became too aggressive, keep original mask.
    if (topOn <= 0) return args.maskBytes;
    final removedRatio = removed / topOn;
    if (removedRatio > 0.84) return args.maskBytes;

    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.maskBytes;
  }
}

Uint8List _synthesizeVehicleMaskFromImageWork(({Uint8List imageBytes}) args) {
  try {
    final src = img.decodeImage(args.imageBytes);
    if (src == null) return Uint8List(0);
    final w = src.width;
    final h = src.height;
    if (w < 16 || h < 16) return Uint8List(0);

    int br = 0, bg = 0, bb = 0, n = 0;
    const ring = 8;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        final isBorder = x < ring || y < ring || x >= w - ring || y >= h - ring;
        if (!isBorder) continue;
        final p = src.getPixel(x, y);
        br += p.r.toInt();
        bg += p.g.toInt();
        bb += p.b.toInt();
        n++;
      }
    }
    if (n == 0) return Uint8List(0);
    final mr = br / n;
    final mg = bg / n;
    final mb = bb / n;

    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int y = 1; y < h - 1; y++) {
      for (int x = 1; x < w - 1; x++) {
        final p = src.getPixel(x, y);
        final px = src.getPixel(x + 1, y);
        final py = src.getPixel(x, y + 1);
        final diff = (p.r - mr).abs() + (p.g - mg).abs() + (p.b - mb).abs();
        final grad =
            (p.r - px.r).abs() +
            (p.g - px.g).abs() +
            (p.b - px.b).abs() +
            (p.r - py.r).abs() +
            (p.g - py.g).abs() +
            (p.b - py.b).abs();
        final fgLike = diff > 46 || grad > 32;
        if (!fgLike) continue;
        if (y < h * 0.06 && diff < 86) continue;
        minX = min(minX, x);
        minY = min(minY, y);
        maxX = max(maxX, x);
        maxY = max(maxY, y);
      }
    }

    if (maxX <= minX || maxY <= minY) {
      minX = (w * 0.08).round();
      maxX = (w * 0.92).round();
      minY = (h * 0.16).round();
      maxY = (h * 0.90).round();
    }

    final bw = maxX - minX + 1;
    final bh = maxY - minY + 1;
    if (bw > (w * 0.92)) {
      minX = (w * 0.08).round();
      maxX = (w * 0.92).round();
    }
    if (bh > (h * 0.88)) {
      minY = (h * 0.14).round();
      maxY = (h * 0.90).round();
    }

    final out = img.Image(width: w, height: h);
    for (int y = minY; y <= maxY; y++) {
      for (int x = minX; x <= maxX; x++) {
        out.setPixelRgba(x, y, 255, 255, 255, 255);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return Uint8List(0);
  }
}

Uint8List _intersectMasksWork(
  ({Uint8List aMaskBytes, Uint8List bMaskBytes}) args,
) {
  try {
    final a = img.decodeImage(args.aMaskBytes);
    final b0 = img.decodeImage(args.bMaskBytes);
    if (a == null || b0 == null) return args.aMaskBytes;
    final b = (b0.width == a.width && b0.height == a.height)
        ? b0
        : img.copyResize(
            b0,
            width: a.width,
            height: a.height,
            interpolation: img.Interpolation.nearest,
          );
    final out = img.Image(width: a.width, height: a.height);
    for (int y = 0; y < a.height; y++) {
      for (int x = 0; x < a.width; x++) {
        final aa = _maskStrength(a.getPixel(x, y));
        final bb = _maskStrength(b.getPixel(x, y));
        final v = min(aa, bb);
        if (v > 0) out.setPixelRgba(x, y, 255, 255, 255, v);
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.aMaskBytes;
  }
}

Uint8List _clipOutsideMaskWork(
  ({Uint8List original, Uint8List candidate, Uint8List maskSquare}) args,
) {
  try {
    final orig = img.decodeImage(args.original);
    final cand = img.decodeImage(args.candidate);
    final maskDecoded = img.decodeImage(args.maskSquare);
    if (orig == null || cand == null || maskDecoded == null)
      return args.candidate;
    if (orig.width != cand.width || orig.height != cand.height)
      return args.candidate;

    final mask = _projectMaskToReferenceWork(
      mask: maskDecoded,
      refWidth: orig.width,
      refHeight: orig.height,
    );
    final out = img.Image.from(cand);
    for (int y = 0; y < orig.height; y++) {
      for (int x = 0; x < orig.width; x++) {
        final mw = _maskStrength(mask.getPixel(x, y));
        if (mw <= 36) {
          final p = orig.getPixel(x, y);
          out.setPixelRgba(x, y, p.r.toInt(), p.g.toInt(), p.b.toInt(), 255);
        }
      }
    }
    return Uint8List.fromList(img.encodePng(out));
  } catch (_) {
    return args.candidate;
  }
}

const _knownCanonicalParts = <String>{
  'hood',
  'roof',
  'trunk',
  'front_bumper',
  'rear_bumper',
  'front_door',
  'rear_door',
  'front_fender',
  'rear_fender',
  'side_skirts',
  'mirrors',
  'a_pillar',
  'b_pillar',
  'c_pillar',
};

String? _canonicalPartKey(String raw) {
  final p = raw.toLowerCase().trim();
  final n = p
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replaceAll('_', '')
      .replaceAll('/', '');
  if (n.contains('후드') || n == 'hood') return 'hood';
  if (n.contains('루프') || n == 'roof') return 'roof';
  if (n.contains('트렁크') || n == 'trunk' || n.contains('테일게이트')) return 'trunk';
  if (n.contains('앞범퍼') || n.contains('전면범퍼') || n == 'frontbumper')
    return 'front_bumper';
  if (n.contains('뒤범퍼') || n.contains('후면범퍼') || n == 'rearbumper')
    return 'rear_bumper';
  if (n.contains('앞도어') || n.contains('전면도어') || n == 'frontdoor')
    return 'front_door';
  if (n.contains('뒤도어') || n.contains('후면도어') || n == 'reardoor')
    return 'rear_door';
  if (n.contains('앞휀다') || n.contains('앞펜더') || n == 'frontfender')
    return 'front_fender';
  if (n.contains('뒤휀다') || n.contains('뒤펜더') || n == 'rearfender')
    return 'rear_fender';
  if (n.contains('사이드스커트') || n == 'sideskirts') return 'side_skirts';
  if (n.contains('사이드미러') || n.contains('미러') || n.contains('mirror'))
    return 'mirrors';
  if (n == 'a필러' || n == 'apillar') return 'a_pillar';
  if (n == 'b필러' || n == 'bpillar') return 'b_pillar';
  if (n == 'c필러' || n == 'cpillar') return 'c_pillar';
  return null;
}

String _englishPanelList(Set<String> selectedParts) {
  if (selectedParts.isEmpty) return 'full body';
  final mapped =
      selectedParts
          .map(_canonicalPartKey)
          .whereType<String>()
          .map((p) {
            switch (p) {
              case 'hood':
                return 'hood';
              case 'roof':
                return 'roof';
              case 'trunk':
                return 'trunk';
              case 'front_bumper':
                return 'front bumper';
              case 'rear_bumper':
                return 'rear bumper';
              case 'front_door':
                return 'front door';
              case 'rear_door':
                return 'rear door';
              case 'front_fender':
                return 'front fender';
              case 'rear_fender':
                return 'rear fender';
              case 'side_skirts':
                return 'side skirts';
              case 'mirrors':
                return 'side mirrors';
              case 'a_pillar':
                return 'A-pillar';
              case 'b_pillar':
                return 'B-pillar';
              case 'c_pillar':
                return 'C-pillar';
              default:
                return p.replaceAll('_', ' ');
            }
          })
          .toSet()
          .toList()
        ..sort();
  if (mapped.isNotEmpty) return mapped.join(', ');
  return selectedParts.join(', ');
}

List<({double minX, double minY, double maxX, double maxY})> _panelRegions(
  String part,
) {
  final p = _canonicalPartKey(part) ?? part.toLowerCase().trim();

  // Exact panel map for 3/4 front view. Keep regions narrow to prevent spill.
  if (p == 'hood') return [(minX: 0.04, minY: 0.10, maxX: 0.46, maxY: 0.36)];
  if (p == 'roof') return [(minX: 0.22, minY: 0.03, maxX: 0.86, maxY: 0.28)];
  if (p == 'trunk') return [(minX: 0.70, minY: 0.12, maxX: 0.98, maxY: 0.42)];

  if (p == 'front_bumper')
    return [(minX: 0.00, minY: 0.30, maxX: 0.21, maxY: 0.84)];
  if (p == 'rear_bumper')
    return [(minX: 0.82, minY: 0.28, maxX: 1.00, maxY: 0.84)];

  if (p == 'front_door')
    return [(minX: 0.22, minY: 0.26, maxX: 0.52, maxY: 0.72)];
  if (p == 'rear_door')
    return [(minX: 0.48, minY: 0.26, maxX: 0.80, maxY: 0.72)];

  if (p == 'front_fender')
    return [(minX: 0.03, minY: 0.22, maxX: 0.30, maxY: 0.66)];
  if (p == 'rear_fender')
    return [(minX: 0.65, minY: 0.22, maxX: 0.88, maxY: 0.70)];

  if (p == 'side_skirts')
    return [(minX: 0.14, minY: 0.66, maxX: 0.86, maxY: 0.90)];

  if (p == 'mirrors')
    return [
      (minX: 0.08, minY: 0.18, maxX: 0.33, maxY: 0.45),
      (minX: 0.67, minY: 0.18, maxX: 0.92, maxY: 0.45),
    ];
  return const [];
}
