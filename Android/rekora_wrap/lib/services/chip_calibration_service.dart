import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';

class CalibrationRoi {
  const CalibrationRoi({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  final double x;
  final double y;
  final double width;
  final double height;

  Map<String, dynamic> toJson() => {
        'x': x,
        'y': y,
        'width': width,
        'height': height,
      };
}

class CaptureMetadataPayload {
  const CaptureMetadataPayload({
    this.deviceModel,
    this.iso,
    this.shutterMs,
    this.awbLocked,
    this.aeLocked,
    this.whiteBalanceKelvin,
    this.exposureBias,
  });

  final String? deviceModel;
  final double? iso;
  final double? shutterMs;
  final bool? awbLocked;
  final bool? aeLocked;
  final double? whiteBalanceKelvin;
  final double? exposureBias;

  Map<String, dynamic> toJson() => {
        if (deviceModel != null) 'device_model': deviceModel,
        if (iso != null) 'iso': iso,
        if (shutterMs != null) 'shutter_ms': shutterMs,
        if (awbLocked != null) 'awb_locked': awbLocked,
        if (aeLocked != null) 'ae_locked': aeLocked,
        if (whiteBalanceKelvin != null) 'white_balance_kelvin': whiteBalanceKelvin,
        if (exposureBias != null) 'exposure_bias': exposureBias,
      };
}

class ChipCalibrationResult {
  const ChipCalibrationResult({
    required this.raw,
  });

  final Map<String, dynamic> raw;

  Map<String, dynamic>? get calibratedColor => raw['calibrated_color'] is Map
      ? Map<String, dynamic>.from(raw['calibrated_color'] as Map)
      : null;

  Map<String, dynamic>? get environmentMetadata => raw['environment_metadata'] is Map
      ? Map<String, dynamic>.from(raw['environment_metadata'] as Map)
      : null;

  Map<String, dynamic>? get materialPrediction => raw['material_prediction'] is Map
      ? Map<String, dynamic>.from(raw['material_prediction'] as Map)
      : null;

  Map<String, dynamic>? get captureQuality => raw['capture_quality'] is Map
      ? Map<String, dynamic>.from(raw['capture_quality'] as Map)
      : null;

  Map<String, dynamic>? get pbrAssets => raw['pbr_assets'] is Map
      ? Map<String, dynamic>.from(raw['pbr_assets'] as Map)
      : null;
}

class ChipCalibrationService {
  Uri _endpoint([bool cellular = false]) {
    final base = cellular ? Config.backendBaseUrlCellular : Config.backendBaseUrl;
    return Uri.parse('$base/calibrate-chip');
  }

  Future<ChipCalibrationResult> calibrateChip({
    required File imageFile,
    CalibrationRoi? chipRoi,
    CalibrationRoi? checkerRoi,
    String? expectedBrand,
    String? expectedSku,
    CaptureMetadataPayload? captureMetadata,
    bool cellular = false,
  }) async {
    final bytes = await imageFile.readAsBytes();
    final body = <String, dynamic>{
      'image_base64': base64Encode(bytes),
      if (chipRoi != null) 'chip_roi': chipRoi.toJson(),
      if (checkerRoi != null) 'checker_roi': checkerRoi.toJson(),
      if (expectedBrand != null && expectedBrand.trim().isNotEmpty) 'expected_brand': expectedBrand.trim(),
      if (expectedSku != null && expectedSku.trim().isNotEmpty) 'expected_sku': expectedSku.trim(),
      if (captureMetadata != null) 'capture_metadata': captureMetadata.toJson(),
    };

    final response = await http
        .post(
          _endpoint(cellular),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 30));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException('calibrate-chip failed (${response.statusCode})', uri: _endpoint(cellular));
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Invalid calibrate-chip response');
    }
    return ChipCalibrationResult(raw: decoded);
  }
}
