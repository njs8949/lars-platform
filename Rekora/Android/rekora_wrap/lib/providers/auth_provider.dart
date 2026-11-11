import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/aws_auth_service.dart';
import '../models/auth_models.dart';

// AWS Auth Service Provider
final authServiceProvider = Provider((ref) => AWSAuthService());

// Current Auth State Provider
final authStateProvider = StateNotifierProvider<AuthNotifier, AsyncValue<AuthUser?>>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});

// Current Tokens Provider
final authTokensProvider = FutureProvider((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.getCurrentTokens();
});

// Auth Loading State
final authLoadingProvider = StateProvider((ref) => false);

class AuthNotifier extends StateNotifier<AsyncValue<AuthUser?>> {
  final AWSAuthService _authService;

  AuthNotifier(this._authService) : super(const AsyncValue.data(null)) {
    _init();
  }

  Future<void> _init() async {
    try {
      state = const AsyncValue.loading();
      await _authService.initialize();
      // 현재 세션 복구 시도
      final tokens = await _authService.getCurrentTokens();
      if (tokens != null) {
        // 사용자 정보 로드 (Optional)
        state = const AsyncValue.data(null);
      } else {
        state = const AsyncValue.data(null);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signInWithApple({
    required String appleIDToken,
    required String nonce,
    Map<String, String>? fullName,
  }) async {
    try {
      state = const AsyncValue.loading();
      final tokens = await _authService.signInWithAppleToken(
        appleIDToken: appleIDToken,
        nonce: nonce,
        fullName: fullName,
      );
      // 토큰 저장 (AWSAuthService 내부에서 처리)
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signInWithGoogle({required String googleIDToken}) async {
    try {
      state = const AsyncValue.loading();
      final tokens = await _authService.signInWithGoogleToken(
        googleIDToken: googleIDToken,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signOut() async {
    try {
      state = const AsyncValue.loading();
      await _authService.signOut();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> deleteAccount() async {
    try {
      state = const AsyncValue.loading();
      await _authService.deleteAccount();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
