import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────────────────────────────

class RekoraShop {
  const RekoraShop({
    required this.id,
    required this.name,
    required this.region,
    required this.address,
    required this.phone,
    required this.rating,
    required this.reviewCount,
    required this.specialties,
    required this.certifiedBrands,
    required this.businessHours,
    required this.priceRange,
    required this.description,
    this.lat,
    this.lng,
  });

  final String id;
  final String name;
  final String region;
  final String address;
  final String phone;
  final double rating;
  final int reviewCount;
  final List<String> specialties;
  final List<String> certifiedBrands;
  final String businessHours;
  final String priceRange;
  final String description;
  final double? lat;
  final double? lng;

  factory RekoraShop.fromJson(Map<String, dynamic> json) => RekoraShop(
    id: json['id'] as String,
    name: json['name'] as String,
    region: json['region'] as String,
    address: json['address'] as String,
    phone: json['phone'] as String? ?? '',
    rating: (json['rating'] as num).toDouble(),
    reviewCount: (json['reviewCount'] as num).toInt(),
    specialties: List<String>.from(json['specialties'] as List),
    certifiedBrands: List<String>.from(json['certifiedBrands'] as List),
    businessHours: json['businessHours'] as String? ?? '',
    priceRange: json['priceRange'] as String? ?? 'medium',
    description: json['description'] as String? ?? '',
    lat: (json['lat'] as num?)?.toDouble(),
    lng: (json['lng'] as num?)?.toDouble(),
  );
}

class BookingResult {
  const BookingResult({
    required this.id,
    required this.shopName,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String shopName;
  final String status;
  final String createdAt;

  factory BookingResult.fromJson(Map<String, dynamic> json) => BookingResult(
    id: json['id'] as String,
    shopName: json['shopName'] as String,
    status: json['status'] as String,
    createdAt: json['createdAt'] as String,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class BookingService {
  static String get _base => Config.imageProxyUrl;

  static Future<List<RekoraShop>> fetchShops({String? region}) async {
    final uri = Uri.parse('$_base/api/rekora/shops').replace(
      queryParameters: (region != null && region.isNotEmpty)
          ? {'region': region}
          : null,
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) {
      throw Exception('샵 목록 로딩 실패: ${response.statusCode}');
    }
    final List<dynamic> list = jsonDecode(response.body) as List;
    return list
        .map((j) => RekoraShop.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  static Future<BookingResult> createBooking({
    required String shopId,
    required String vehicleMake,
    required String vehicleModel,
    int? vehicleYear,
    required String wrapType,
    String? preferredDate,
    String? preferredTime,
    String notes = '',
  }) async {
    final uri = Uri.parse('$_base/api/rekora/bookings');
    final body = jsonEncode({
      'shopId': shopId,
      'vehicleMake': vehicleMake,
      'vehicleModel': vehicleModel,
      if (vehicleYear != null) 'vehicleYear': vehicleYear,
      'wrapType': wrapType,
      if (preferredDate != null) 'preferredDate': preferredDate,
      if (preferredTime != null) 'preferredTime': preferredTime,
      'notes': notes,
      'source': 'android',
    });
    final response = await http
        .post(uri, headers: {'Content-Type': 'application/json'}, body: body)
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != 201) {
      throw Exception('예약 전송 실패: ${response.statusCode}');
    }
    return BookingResult.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }
}
