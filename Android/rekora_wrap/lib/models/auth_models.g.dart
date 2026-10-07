// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuthTokens _$AuthTokensFromJson(Map<String, dynamic> json) => AuthTokens(
      idToken: json['idToken'] as String,
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String?,
      expiresIn: (json['expiresIn'] as num).toInt(),
      tokenType: json['tokenType'] as String,
    );

Map<String, dynamic> _$AuthTokensToJson(AuthTokens instance) =>
    <String, dynamic>{
      'idToken': instance.idToken,
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'expiresIn': instance.expiresIn,
      'tokenType': instance.tokenType,
    };

AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => AuthUser(
      userId: json['userId'] as String,
      email: json['email'] as String?,
      name: json['name'] as String?,
      authProvider: json['authProvider'] as String,
    );

Map<String, dynamic> _$AuthUserToJson(AuthUser instance) => <String, dynamic>{
      'userId': instance.userId,
      'email': instance.email,
      'name': instance.name,
      'authProvider': instance.authProvider,
    };

AppleSignInRequest _$AppleSignInRequestFromJson(Map<String, dynamic> json) =>
    AppleSignInRequest(
      appleIDToken: json['appleIDToken'] as String,
      nonce: json['nonce'] as String,
      fullName: (json['fullName'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
    );

Map<String, dynamic> _$AppleSignInRequestToJson(AppleSignInRequest instance) =>
    <String, dynamic>{
      'appleIDToken': instance.appleIDToken,
      'nonce': instance.nonce,
      'fullName': instance.fullName,
    };

GoogleSignInRequest _$GoogleSignInRequestFromJson(Map<String, dynamic> json) =>
    GoogleSignInRequest(
      googleIDToken: json['googleIDToken'] as String,
    );

Map<String, dynamic> _$GoogleSignInRequestToJson(
        GoogleSignInRequest instance) =>
    <String, dynamic>{
      'googleIDToken': instance.googleIDToken,
    };
