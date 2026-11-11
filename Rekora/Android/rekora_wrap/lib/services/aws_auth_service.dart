import 'dart:async';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../models/auth_models.dart' hide AuthUser;
import 'http_client.dart';

class AWSAuthService {
  static final AWSAuthService _instance = AWSAuthService._internal();
  static final _secureStorage = const FlutterSecureStorage();

  StreamController<AuthUser?>? _authStateController;

  factory AWSAuthService() {
    return _instance;
  }

  AWSAuthService._internal();

  /// Initialize Amplify with Cognito
  Future<void> initialize() async {
    try {
      // 이미 초기화되지 않았을 경우에만
      if (!Amplify.isConfigured) {
        // Amplify configuration
        final auth = AmplifyAuthCognito();
        await Amplify.addPlugin(auth);

        // TODO: Configure Amplify with proper configuration
        // await Amplify.configure(amplifyconfig);
        print('Amplify initialized successfully');
      }

      // 이전에 저장된 세션 복구
      await _restoreSession();
    } catch (e) {
      print('Error initializing Amplify: $e');
      rethrow;
    }
  }

  /// Sign in with Apple token
  Future<AuthTokens> signInWithAppleToken({
    required String appleIDToken,
    required String nonce,
    Map<String, String>? fullName,
  }) async {
    try {
      // 백엔드 API를 통해 Apple 토큰 교환
      return await _exchangeTokenWithBackend(
        endpoint: '/api/auth/apple',
        body: {
          'apple_id_token': appleIDToken,
          'nonce': nonce,
          'full_name': fullName,
        },
      );
    } catch (e) {
      print('Apple sign-in error: $e');
      rethrow;
    }
  }

  /// Sign in with Google token
  Future<AuthTokens> signInWithGoogleToken({required String googleIDToken}) async {
    try {
      return await _exchangeTokenWithBackend(
        endpoint: '/api/auth/google',
        body: {
          'google_id_token': googleIDToken,
        },
      );
    } catch (e) {
      print('Google sign-in error: $e');
      rethrow;
    }
  }

  /// Get current auth tokens
  Future<AuthTokens?> getCurrentTokens() async {
    try {
      final idToken = await _secureStorage.read(key: 'id_token');
      final accessToken = await _secureStorage.read(key: 'access_token');
      final refreshToken = await _secureStorage.read(key: 'refresh_token');

      if (idToken == null || accessToken == null) {
        return null;
      }

      return AuthTokens(
        idToken: idToken,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      );
    } catch (e) {
      print('Error getting current tokens: $e');
      return null;
    }
  }

  /// Refresh tokens
  Future<AuthTokens> refreshTokens({required String refreshToken}) async {
    try {
      return await _exchangeTokenWithBackend(
        endpoint: '/api/auth/refresh',
        headers: {
          'Authorization': 'Bearer $refreshToken',
        },
      );
    } catch (e) {
      print('Token refresh error: $e');
      rethrow;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      // 백엔드에 로그아웃 알림
      final token = await _secureStorage.read(key: 'access_token');
      if (token != null) {
        await _notifyBackendLogout(token);
      }

      // 로컬 토큰 삭제
      await _secureStorage.delete(key: 'id_token');
      await _secureStorage.delete(key: 'access_token');
      await _secureStorage.delete(key: 'refresh_token');
    } catch (e) {
      print('Sign out error: $e');
      rethrow;
    }
  }

  /// Delete account
  Future<void> deleteAccount() async {
    try {
      final token = await _secureStorage.read(key: 'access_token');
      if (token == null) {
        throw Exception('No active session');
      }

      // 백엔드 API 호출
      // TODO: HTTP 호출 구현
    } catch (e) {
      print('Delete account error: $e');
      rethrow;
    }
  }

  /// Private method: 백엔드와 토큰 교환
  Future<AuthTokens> _exchangeTokenWithBackend({
    required String endpoint,
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    try {
      final backendUrl = _getBackendURL();
      final dio = Dio(
        BaseOptions(
          baseUrl: backendUrl,
          contentType: 'application/json',
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ),
      );

      // 요청 헤더 설정
      if (headers != null) {
        dio.options.headers.addAll(headers);
      }

      final response = await dio.post(
        endpoint,
        data: body,
      );

      if (response.statusCode == 200) {
        final tokens = AuthTokens.fromJson(response.data as Map<String, dynamic>);
        await _saveTokens(tokens);
        return tokens;
      } else {
        throw Exception('Backend error: ${response.statusCode}');
      }
    } on DioException catch (e) {
      print('Dio error: $e');
      throw Exception('HTTP error: ${e.message}');
    } catch (e) {
      print('Token exchange error: $e');
      rethrow;
    }
  }

  /// Private method: 토큰 저장
  Future<void> _saveTokens(AuthTokens tokens) async {
    try {
      await _secureStorage.write(key: 'id_token', value: tokens.idToken);
      await _secureStorage.write(key: 'access_token', value: tokens.accessToken);
      if (tokens.refreshToken != null) {
        await _secureStorage.write(key: 'refresh_token', value: tokens.refreshToken!);
      }
    } catch (e) {
      print('Error saving tokens: $e');
      rethrow;
    }
  }

  /// Private method: 세션 복구
  Future<void> _restoreSession() async {
    try {
      final tokens = await getCurrentTokens();
      if (tokens != null) {
        // 토큰 유효성 검증 또는 갱신
        print('Session restored');
      }
    } catch (e) {
      print('Error restoring session: $e');
    }
  }

  /// Private method: 백엔드 로그아웃 알림
  Future<void> _notifyBackendLogout(String token) async {
    try {
      final backendUrl = _getBackendURL();
      final dio = Dio(
        BaseOptions(
          baseUrl: backendUrl,
          contentType: 'application/json',
        ),
      );

      dio.options.headers['Authorization'] = 'Bearer $token';

      await dio.post('/api/auth/logout');
      print('Backend logout notification sent');
    } catch (e) {
      print('Error notifying backend logout: $e');
      // 로그아웃 실패는 무시 (로컬에서는 이미 처리됨)
    }
  }

  /// Private method: 백엔드 URL 가져오기
  String _getBackendURL() {
    const String backendUrl = String.fromEnvironment(
      'BACKEND_URL',
      defaultValue: 'http://localhost:8100',
    );
    return backendUrl;
  }

  void dispose() {
    _authStateController?.close();
  }
}
