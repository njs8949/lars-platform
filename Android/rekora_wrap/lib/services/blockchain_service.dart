import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

// Vehicle Installation Record
class VehicleInstallationRecord {
  final String recordId;
  final String vin;
  final String filmSpecHash;
  final String installerId;
  final int installedAt;
  final String cost;
  final int qualityScore;
  final List<String> photoHashList;
  final String service;

  VehicleInstallationRecord({
    required this.recordId,
    required this.vin,
    required this.filmSpecHash,
    required this.installerId,
    required this.installedAt,
    required this.cost,
    required this.qualityScore,
    required this.photoHashList,
    required this.service,
  });

  factory VehicleInstallationRecord.fromJson(Map<String, dynamic> json) {
    return VehicleInstallationRecord(
      recordId: json['recordId'] as String,
      vin: json['vin'] as String,
      filmSpecHash: json['filmSpecHash'] as String,
      installerId: json['installerId'] as String,
      installedAt: json['installedAt'] as int,
      cost: json['cost'] as String,
      qualityScore: json['qualityScore'] as int,
      photoHashList: List<String>.from(json['photoHashList'] as List),
      service: json['service'] as String,
    );
  }
}

// Blockchain Response
class BlockchainVehicleResponse {
  final bool success;
  final String message;
  final VehicleInstallationRecord record;

  BlockchainVehicleResponse({
    required this.success,
    required this.message,
    required this.record,
  });

  factory BlockchainVehicleResponse.fromJson(Map<String, dynamic> json) {
    return BlockchainVehicleResponse(
      success: json['success'] as bool,
      message: json['message'] as String,
      record: VehicleInstallationRecord.fromJson(
        json['record'] as Map<String, dynamic>,
      ),
    );
  }
}

// Vehicle History Response
class BlockchainVehicleHistoryResponse {
  final bool success;
  final String vin;
  final int count;
  final List<VehicleInstallationRecord> records;

  BlockchainVehicleHistoryResponse({
    required this.success,
    required this.vin,
    required this.count,
    required this.records,
  });

  factory BlockchainVehicleHistoryResponse.fromJson(Map<String, dynamic> json) {
    return BlockchainVehicleHistoryResponse(
      success: json['success'] as bool,
      vin: json['vin'] as String,
      count: json['count'] as int,
      records: (json['records'] as List)
          .map((r) => VehicleInstallationRecord.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }
}

// MARK: - BlockchainService
class BlockchainService extends ChangeNotifier {
  static final BlockchainService _instance = BlockchainService._internal();

  factory BlockchainService() {
    return _instance;
  }

  BlockchainService._internal();

  final String _defaultBaseURL = 'https://api.lars.ai';
  late String _baseURL;
  late String _apiKey;

  bool _isConfigured = false;

  bool get isConfigured => _isConfigured;

  void initialize({
    String? baseURL,
    String? apiKey,
  }) {
    _baseURL = baseURL ?? _defaultBaseURL;
    _apiKey = apiKey ?? '';
    _isConfigured = _apiKey.isNotEmpty && _baseURL.isNotEmpty;
    notifyListeners();
  }

  /// Record a vehicle wrap installation
  Future<VehicleInstallationRecord?> recordVehicleInstallation({
    required String vin,
    required String filmSpecHash,
    required String installerId,
    required String cost,
    required int qualityScore,
    required List<String> photoHashes,
  }) async {
    if (!_isConfigured) {
      debugPrint('❌ Blockchain not configured');
      return null;
    }

    try {
      final installationData = {
        'filmSpec': {
          'type': 'PPF',
          'filmSpecHash': filmSpecHash,
        },
        'installerId': installerId,
        'cost': cost,
        'qualityScore': qualityScore,
        'photoHashes': photoHashes,
      };

      final body = jsonEncode({
        'vin': vin,
        'installationData': installationData,
      });

      final response = await http.post(
        Uri.parse('$_baseURL/blockchain/vehicles/installation'),
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': _apiKey,
          'Authorization': 'Bearer $_apiKey',
        },
        body: body,
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final result = BlockchainVehicleResponse.fromJson(json);
        debugPrint('✅ Vehicle installation recorded: ${result.record.recordId}');
        return result.record;
      } else {
        debugPrint('❌ Failed to record vehicle: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('❌ Exception: $e');
      return null;
    }
  }

  /// Get vehicle installation history
  Future<List<VehicleInstallationRecord>> getVehicleHistory({
    required String vin,
  }) async {
    if (!_isConfigured) {
      debugPrint('❌ Blockchain not configured');
      return [];
    }

    try {
      final response = await http.get(
        Uri.parse('$_baseURL/blockchain/vehicles/$vin/history'),
        headers: {
          'X-API-Key': _apiKey,
          'Authorization': 'Bearer $_apiKey',
        },
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final result = BlockchainVehicleHistoryResponse.fromJson(json);
        debugPrint('✅ Retrieved ${result.records.length} vehicle records');
        return result.records;
      } else {
        debugPrint('❌ Failed to get history: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      debugPrint('❌ Exception: $e');
      return [];
    }
  }

  /// Get blockchain health status
  Future<bool> healthCheck() async {
    if (!_isConfigured) {
      return false;
    }

    try {
      final response = await http.get(
        Uri.parse('$_baseURL/blockchain/health'),
        headers: {
          'X-API-Key': _apiKey,
        },
      );

      final isHealthy = response.statusCode == 200;
      debugPrint(isHealthy ? '✅ Blockchain healthy' : '❌ Blockchain unhealthy');
      return isHealthy;
    } catch (e) {
      debugPrint('❌ Health check failed: $e');
      return false;
    }
  }
}

// MARK: - Usage Example
/*
// Initialize Blockchain Service
void main() {
  BlockchainService().initialize(
    baseURL: 'https://api.lars-technologies.com',
    apiKey: 'your-api-key',
  );
  runApp(const MyApp());
}

// In your widget
class VehicleInstallationWidget extends StatefulWidget {
  @override
  State<VehicleInstallationWidget> createState() =>
      _VehicleInstallationWidgetState();
}

class _VehicleInstallationWidgetState extends State<VehicleInstallationWidget> {
  final BlockchainService _blockchainService = BlockchainService();

  Future<void> recordInstallation() async {
    final record = await _blockchainService.recordVehicleInstallation(
      vin: '1HGBH41JXMN109186',
      filmSpecHash: 'sha256:abc123',
      installerId: 'installer-789',
      cost: '150000',
      qualityScore: 95,
      photoHashes: [
        'sha256:photo1',
        'sha256:photo2',
        'sha256:photo3',
      ],
    );

    if (record != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Recorded: ${record.recordId}')),
      );
    }
  }

  Future<void> getHistory() async {
    final history = await _blockchainService.getVehicleHistory(
      vin: '1HGBH41JXMN109186',
    );

    setState(() {
      // Update UI with history
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vehicle Installation')),
      body: Column(
        children: [
          ElevatedButton(
            onPressed: recordInstallation,
            child: const Text('Record Installation'),
          ),
          ElevatedButton(
            onPressed: getHistory,
            child: const Text('Get History'),
          ),
        ],
      ),
    );
  }
}
*/
