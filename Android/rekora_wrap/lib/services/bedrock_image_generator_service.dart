import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

/// AWS Bedrock Titan Image Generator service for vehicle wrap previews.
/// Provides cost-efficient image generation ($0.015/image) with high throughput.
class BedrockImageGeneratorService {
  BedrockImageGeneratorService({
    this.serverBaseUrl = '',
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String serverBaseUrl;
  final http.Client _client;

  Uri get _endpoint => Uri.parse('$serverBaseUrl/api/bedrock-wrap');

  /// Fallback endpoints for Bedrock wrap generation
  List<Uri> _bedrockProxyEndpoints() => [
    Uri.parse('$serverBaseUrl/api/bedrock-wrap'),
    Uri.parse('https://rekora.lars-technologies.com/api/bedrock-wrap'),
    Uri.parse('http://43.203.87.25/api/bedrock-wrap'),
    Uri.parse('https://rh2kdj9wdp.ap-northeast-1.awsapprunner.com/api/bedrock-wrap'),
  ];

  /// Generate vehicle wrap preview using AWS Bedrock Titan Image Generator
  ///
  /// Parameters:
  /// - [imageBytes]: Original vehicle image (optional, for context)
  /// - [wrapColor]: Color information {displayName, brand, finish, labColor}
  /// - [quality]: 'preview' for quick render, 'final' for high-quality
  /// - [lightScenario]: 'outdoor', 'showroom', or 'tunnel'
  ///
  /// Returns: Base64-encoded PNG image or null on failure
  Future<String?> generateWrapPreview({
    required Map<String, dynamic> wrapColor,
    String quality = 'preview',
    String lightScenario = 'outdoor',
    Uint8List? imageBytes,
  }) async {
    final imageBase64 = imageBytes != null ? base64Encode(imageBytes) : null;

    final requestBody = {
      'wrapColor': wrapColor,
      'quality': quality,
      'lightScenario': lightScenario,
      if (imageBase64 != null) 'imageBase64': imageBase64,
    };

    // Try primary endpoint first, then fallback endpoints
    final endpoints = _bedrockProxyEndpoints();

    for (final endpoint in endpoints) {
      try {
        final response = await _client.post(
          endpoint,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(requestBody),
          timeout: const Duration(minutes: 3),
        );

        if (response.statusCode == 200) {
          final responseJson = jsonDecode(response.body) as Map<String, dynamic>;
          final imageBase64Result = responseJson['imageBase64'] as String?;

          if (imageBase64Result != null) {
            return imageBase64Result;
          }
        } else if (response.statusCode == 502 || response.statusCode == 503) {
          // Service temporarily unavailable, try next endpoint
          continue;
        } else {
          // Other errors should fail immediately
          throw Exception('Bedrock API error: ${response.statusCode} - ${response.body}');
        }
      } catch (e) {
        // Try next endpoint on network error
        if (endpoint != endpoints.last) {
          continue;
        }
        rethrow;
      }
    }

    return null;
  }

  /// Generate high-quality vehicle wrap render using Bedrock
  ///
  /// Includes mask and detailed color/finish information
  Future<Map<String, dynamic>?> generateFinalWrap({
    required Uint8List imageBytes,
    required Uint8List maskBytes,
    required Map<String, dynamic> wrapColor,
    String lightScenario = 'outdoor',
  }) async {
    final imageBase64 = base64Encode(imageBytes);
    final maskBase64 = base64Encode(maskBytes);

    final requestBody = {
      'imageBase64': imageBase64,
      'maskBase64': maskBase64,
      'wrapColor': wrapColor,
      'quality': 'final',
      'lightScenario': lightScenario,
    };

    final endpoints = _bedrockProxyEndpoints();

    for (final endpoint in endpoints) {
      try {
        final response = await _client.post(
          endpoint,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(requestBody),
          timeout: const Duration(minutes: 3),
        );

        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        } else if (response.statusCode != 502 && response.statusCode != 503) {
          throw Exception('Bedrock API error: ${response.statusCode}');
        }
      } catch (e) {
        if (endpoint != endpoints.last) {
          continue;
        }
        rethrow;
      }
    }

    return null;
  }

  /// Decode base64 PNG image to bytes
  static Uint8List decodeImageFromBase64(String base64String) {
    return base64Decode(base64String);
  }
}
