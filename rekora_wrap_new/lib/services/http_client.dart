import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

class HTTPClient {
  static final HTTPClient _instance = HTTPClient._internal();
  late final Dio _dio;

  factory HTTPClient() {
    return _instance;
  }

  HTTPClient._internal() {
    _initializeDio();
  }

  void _initializeDio() {
    const String backendUrl = String.fromEnvironment(
      'BACKEND_URL',
      defaultValue: 'http://localhost:8100',
    );

    _dio = Dio(
      BaseOptions(
        baseUrl: backendUrl,
        contentType: 'application/json',
        validateStatus: (status) => status != null && status < 500,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    // 개발 환경에서 로깅 활성화
    _dio.interceptors.add(
      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseHeader: true,
        responseBody: true,
        error: true,
        compact: false,
        maxWidth: 90,
      ),
    );

    // 에러 핸들러
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          print('🔵 [HTTP] ${options.method} ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          print('🟢 [HTTP] ${response.statusCode} ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (error, handler) {
          print('🔴 [HTTP] Error: ${error.message}');
          return handler.next(error);
        },
      ),
    );
  }

  Future<T> post<T>({
    required String path,
    Map<String, dynamic>? data,
    Map<String, String>? headers,
    required T Function(dynamic) fromJson,
  }) async {
    try {
      final options = Options(headers: headers);
      final response = await _dio.post(
        path,
        data: data,
        options: options,
      );

      if (response.statusCode == null || response.statusCode! >= 400) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
          error: 'HTTP Error: ${response.statusCode}',
        );
      }

      return fromJson(response.data);
    } on DioException catch (e) {
      print('DioException: ${e.message}');
      rethrow;
    } catch (e) {
      print('HTTP Client error: $e');
      rethrow;
    }
  }

  Future<void> postVoid({
    required String path,
    Map<String, dynamic>? data,
    Map<String, String>? headers,
  }) async {
    try {
      final options = Options(headers: headers);
      final response = await _dio.post(
        path,
        data: data,
        options: options,
      );

      if (response.statusCode == null || response.statusCode! >= 400) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
          error: 'HTTP Error: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      print('DioException: ${e.message}');
      rethrow;
    }
  }

  Future<void> delete({
    required String path,
    Map<String, dynamic>? data,
    Map<String, String>? headers,
  }) async {
    try {
      final options = Options(headers: headers);
      final response = await _dio.delete(
        path,
        data: data,
        options: options,
      );

      if (response.statusCode == null || response.statusCode! >= 400) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
          error: 'HTTP Error: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      print('DioException: ${e.message}');
      rethrow;
    }
  }

  Dio getDio() => _dio;

  void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void removeAuthToken() {
    _dio.options.headers.remove('Authorization');
  }
}
