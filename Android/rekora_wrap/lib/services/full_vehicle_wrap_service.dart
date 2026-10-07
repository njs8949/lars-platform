import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../models.dart';

// ─── Models ───────────────────────────────────────────────────────────────────

class PhysicsMetadata {
  const PhysicsMetadata({
    required this.ior,
    required this.coating,
    required this.roughness,
    required this.product,
    required this.sku,
  });

  final double ior;
  final String coating;
  final double roughness;
  final String product;
  final String sku;

  static PhysicsMetadata forFinish(String finish, String productName, String sku) {
    switch (finish.toLowerCase()) {
      case 'gloss':
        return PhysicsMetadata(ior: 1.58, coating: 'PET High-Gloss Clear Coat', roughness: 0.02, product: productName, sku: sku);
      case 'matte':
        return PhysicsMetadata(ior: 1.58, coating: 'PET Matte Diffuse Coat', roughness: 0.95, product: productName, sku: sku);
      case 'satin':
        return PhysicsMetadata(ior: 1.58, coating: 'PET Satin Semi-Gloss Coat', roughness: 0.40, product: productName, sku: sku);
      default:
        return PhysicsMetadata(ior: 1.58, coating: 'PET Standard Coat', roughness: 0.40, product: productName, sku: sku);
    }
  }
}

enum LightScenario { showroom, outdoor, tunnel }
enum RenderQuality { preview, finalRender }

// ─── Service ──────────────────────────────────────────────────────────────────

class FullVehicleWrapService {
  FullVehicleWrapService({String? backendBaseUrl, http.Client? client})
      : _client = client ?? http.Client();

  final http.Client _client;

  Future<({Uint8List mask, Map<String, dynamic>? lightingMeta})> segmentVehicle(Uint8List imageBytes) async {
    // 세그멘테이션은 비교적 안정적이므로 기존 경로 사용
    final url = Uri.parse('https://rekora.lars-technologies.com/api/segment-vehicle');
    final payload = {'imageBase64': base64Encode(imageBytes)};

    final response = await _client.post(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(payload)).timeout(const Duration(seconds: 45));
    if (response.statusCode != 200) throw Exception('Segmentation failed: ${response.statusCode}');

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final maskB64 = json['maskBase64'] as String? ?? '';
    return (mask: base64Decode(maskB64), lightingMeta: json['lightingMeta'] as Map<String, dynamic>?);
  }

  Future<({Uint8List imageBytes, PhysicsMetadata physics, String? renderSource, String? vertexError})> renderLayeredWrap({
    required Uint8List imageBytes,
    Uint8List? maskBytes,
    required WrapColor wrapColor,
    required RenderQuality quality,
    required LightScenario scenario,
    List<String>? selectedScopes,
    String? promptText,
    String? vehicleHash,
  }) async {
    String? proxyFailure;
    // --- 최우선 순위: 제미나이 프록시 (TypeScript) ---
    final String proxyUrl = 'https://rekora.lars-technologies.com/api/render-layered-wrap';
    final lab = _colorToLab(wrapColor.swatch);
    final normalizedQuality =
        quality == RenderQuality.preview ? 'preview' : 'final';
    
    final proxyBody = {
      'imageBase64': base64Encode(imageBytes),
      'quality': normalizedQuality,
      'lightScenario': scenario.name,
      'wrapColor': {
        'displayName': wrapColor.displayName,
        'name': wrapColor.name,
        'brand': wrapColor.brand,
        'sku': wrapColor.id,
        'finish': wrapColor.finish,
        'hexCode': wrapColor.hexCode,
        'labColor': {'l': lab.$1, 'a': lab.$2, 'b': lab.$3},
      },
    };
    if (maskBytes != null) proxyBody['maskBase64'] = base64Encode(maskBytes);
    if (selectedScopes != null) proxyBody['selected_scopes'] = selectedScopes;
    if (promptText != null && promptText.trim().isNotEmpty) {
      proxyBody['promptText'] = promptText.trim();
    }
    if (vehicleHash != null && vehicleHash.trim().isNotEmpty) {
      proxyBody['vehicleHash'] = vehicleHash.trim();
    }

    try {
      debugPrint('[FullVehicleWrap] Attempting Proxy: $proxyUrl');
      final response = await _client.post(Uri.parse(proxyUrl), headers: {'Content-Type': 'application/json'}, body: jsonEncode(proxyBody)).timeout(const Duration(seconds: 120));
      
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final imgB64 = json['imageBase64'] as String?;
        if (imgB64 != null && imgB64.isNotEmpty) {
          return (
            imageBytes: base64Decode(imgB64), 
            physics: PhysicsMetadata.forFinish(wrapColor.finish, wrapColor.displayName, wrapColor.id),
            renderSource: 'gemini-proxy',
            vertexError: null
          );
        }
        proxyFailure = 'Proxy returned 200 without image payload';
      } else {
        proxyFailure = 'Proxy failed: ${response.statusCode}';
      }
    } catch (e) {
      proxyFailure = 'Proxy exception: $e';
      debugPrint('[FullVehicleWrap] Proxy failed, trying fallback: $e');
    }

    // --- 차선책: 파이썬 백엔드 (Vertex AI 직접 호출) ---
    final String backendUrl = 'https://rh2kdj9wdp.ap-northeast-1.awsapprunner.com/generate-wrapped-image';
    final backendBody = {
      'image_base64': base64Encode(imageBytes),
      'wrap_description': 'A premium ${wrapColor.finish} vinyl wrap in color #${wrapColor.swatch.toARGB32().toRadixString(16).substring(2).toUpperCase()}',
      'wrap_finish': wrapColor.finish.toLowerCase(),
      'wrap_brand': wrapColor.brand,
      'wrap_sku': wrapColor.id,
      'wrap_name': wrapColor.name,
      'lab_target': {'l': lab.$1, 'a': lab.$2, 'b': lab.$3},
      'material_params': {'roughness': wrapColor.finish == 'matte' ? 0.9 : 0.05, 'metallic': 0.1},
    };
    if (maskBytes != null) backendBody['mask_base_64'] = base64Encode(maskBytes);
    if (promptText != null && promptText.trim().isNotEmpty) {
      backendBody['prompt_text'] = promptText.trim();
    }

    final response = await _client.post(Uri.parse(backendUrl), headers: {'Content-Type': 'application/json'}, body: jsonEncode(backendBody)).timeout(const Duration(seconds: 180));
    if (response.statusCode != 200) {
      throw Exception('Wrap render failed. $proxyFailure. Backend status: ${response.statusCode}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    String? imgB64 = json['vertex_image_base64'] as String? ?? json['image_base64'] as String?;
    if (imgB64 == null && json['preview'] != null) imgB64 = json['preview']['image_base64'] as String?;

    if (imgB64 == null || imgB64.isEmpty) {
      final backendError = json['vertex_error'] as String? ?? json['error'] as String?;
      throw Exception('Wrap render returned no image. ${backendError ?? proxyFailure}');
    }

    return (
      imageBytes: base64Decode(imgB64), 
      physics: PhysicsMetadata.forFinish(wrapColor.finish, wrapColor.displayName, wrapColor.id),
      renderSource: json['render_source'] as String? ?? 'fallback-backend',
      vertexError: json['vertex_error'] as String? ?? proxyFailure,
    );
  }

  static (double l, double a, double b) _colorToLab(Color color) {
    double linearize(double c) {
      c = c / 255.0;
      return c <= 0.04045 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();
    }
    final r = linearize((color.r * 255.0).round().clamp(0, 255).toDouble());
    final g = linearize((color.g * 255.0).round().clamp(0, 255).toDouble());
    final b = linearize((color.b * 255.0).round().clamp(0, 255).toDouble());
    final x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    final y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    final z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    double f(double t) {
      const delta = 6.0 / 29.0;
      return t > delta * delta * delta ? math.pow(t, 1.0 / 3.0).toDouble() : t / (3 * delta * delta) + 4.0 / 29.0;
    }
    final fx = f(x / 0.95047);
    final fy = f(y / 1.00000);
    final fz = f(z / 1.08883);
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz));
  }
}
