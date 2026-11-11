import 'package:json_annotation/json_annotation.dart';

part 'auth_models.g.dart';

@JsonSerializable()
class AuthTokens {
  final String idToken;
  final String accessToken;
  final String? refreshToken;
  final int expiresIn;
  final String tokenType;

  AuthTokens({
    required this.idToken,
    required this.accessToken,
    this.refreshToken,
    required this.expiresIn,
    required this.tokenType,
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) =>
      _$AuthTokensFromJson(json);
  Map<String, dynamic> toJson() => _$AuthTokensToJson(this);
}

@JsonSerializable()
class AuthUser {
  final String userId;
  final String? email;
  final String? name;
  final String authProvider;

  AuthUser({
    required this.userId,
    this.email,
    this.name,
    required this.authProvider,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) =>
      _$AuthUserFromJson(json);
  Map<String, dynamic> toJson() => _$AuthUserToJson(this);
}

@JsonSerializable()
class AppleSignInRequest {
  final String appleIDToken;
  final String nonce;
  final Map<String, String>? fullName;

  AppleSignInRequest({
    required this.appleIDToken,
    required this.nonce,
    this.fullName,
  });

  factory AppleSignInRequest.fromJson(Map<String, dynamic> json) =>
      _$AppleSignInRequestFromJson(json);
  Map<String, dynamic> toJson() => _$AppleSignInRequestToJson(this);
}

@JsonSerializable()
class GoogleSignInRequest {
  final String googleIDToken;

  GoogleSignInRequest({required this.googleIDToken});

  factory GoogleSignInRequest.fromJson(Map<String, dynamic> json) =>
      _$GoogleSignInRequestFromJson(json);
  Map<String, dynamic> toJson() => _$GoogleSignInRequestToJson(this);
}
