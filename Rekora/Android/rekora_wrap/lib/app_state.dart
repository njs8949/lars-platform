import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:datadog_flutter_plugin/datadog_flutter_plugin.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import 'config.dart';
import 'datadog_support.dart';
import 'models.dart';
import 'services/billing_service.dart';
import 'services/user_api.dart';

class AppState extends ChangeNotifier {
  static const String _datadogLocalUserFileName = 'datadog_user_id.txt';
  static const String _adminCommunityEmail = 'lars@lars-technologies.com';
  static const String _adminCommunityUserId =
      'a4ea353e-118f-4307-9026-6615abe5c9c0';
  static const String _adminCommunityName = '남종수';

  AppState({
    required this.projects,
    required this.vehicles,
    required this.wraps,
    required this.colorPpfWraps,
    required this.recommendations,
    required this.learning,
    required this.posts,
    required this.profile,
    required this.language,
    this.ageRestrictedAu = false,
    this.pendingWrap,
    this.pendingGarageWrapLaunch,
    this.activeProjectId,
  }) {
    _billingService = BillingService(
      onCatalogChanged: (available, catalog, error) {
        billingAvailable = available;
        billingCatalog = catalog;
        billingError = error;
        billingLoading = false;
        notifyListeners();
      },
      onEntitlementGranted: _applyBillingEntitlement,
      onPendingChanged: (value) {
        billingPurchasePending = value;
        notifyListeners();
      },
      onRestoreChanged: (value) {
        billingRestoreInProgress = value;
        notifyListeners();
      },
      onError: (message) {
        billingError = message;
        billingPurchasePending = false;
        notifyListeners();
      },
    );
  }

  factory AppState.withSampleData() {
    final wraps = sampleWraps;
    return AppState(
      projects: [],
      vehicles: [],
      wraps: wraps,
      colorPpfWraps: sampleColorPpfWraps,
      recommendations: sampleRecommendations,
      learning: sampleLearning,
      posts: samplePosts,
      profile: UserProfile(
        name: 'Lars',
        email: 'hello@rekora.ai',
        subscriptionPlan: 'Free',
        subscriptionStatus: '활성',
        wrapQuota: 10,
        wrapUsed: 0,
        avatarPath: null,
      ),
      language: _systemLanguageCode(),
      ageRestrictedAu: false,
      activeProjectId: null,
    );
  }

  List<VehicleProject> projects;
  List<SavedVehicle> vehicles;
  List<WrapColor> wraps;
  List<WrapColor> colorPpfWraps;
  List<RecommendationItem> recommendations;
  List<LearningItem> learning;
  List<CommunityPost> posts;
  List<CommunityPost> remotePosts = [];
  UserProfile profile;
  WrapColor? pendingWrap;
  GarageWrapLaunchContext? pendingGarageWrapLaunch;
  File? currentVehicleImage;
  // Set when the AI assistant hands over a photo: the visualizer must use it even if it already has a photo.
  bool assistantPhotoPending = false;
  String? activeProjectId;
  User? firebaseUser;
  String language;
  bool ageRestrictedAu;
  late final BillingService _billingService;
  bool billingAvailable = false;
  bool billingLoading = true;
  bool billingPurchasePending = false;
  bool billingRestoreInProgress = false;
  String? billingError;
  Map<String, BillingCatalogItem> billingCatalog = const {};
  bool _billingInitialized = false;
  bool _googleSignInInitialized = false;

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  bool _isLoadingData = false;
  bool _profileHydrated = false;
  bool _firestoreNetworkEnabled = true;
  Timer? _firestoreRetryTimer;

  bool get isProfileHydrated => firebaseUser == null || _profileHydrated;

  List<CommunityPost> get communityPosts {
    final combined = [...remotePosts, ...posts];
    combined.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return combined;
  }

  void setVehicleImage(File? image) {
    currentVehicleImage = image;
    notifyListeners();
  }

  void clearVehicleImage() {
    currentVehicleImage = null;
    notifyListeners();
  }

  VehicleProject? get activeProject {
    if (projects.isEmpty) return null;
    return projects.firstWhere(
      (p) => p.id == activeProjectId,
      orElse: () => projects.first,
    );
  }

  void addProject(VehicleProject project, {SavedVehicle? vehicle}) {
    projects.insert(0, project);
    if (vehicle != null && vehicles.every((v) => v.id != vehicle.id)) {
      vehicles.insert(0, vehicle);
      _persistVehicle(vehicle);
    }
    activeProjectId = project.id;
    notifyListeners();
    _persistProject(project);
    _saveProfile();
  }

  void updateProject(VehicleProject project) {
    final index = projects.indexWhere((p) => p.id == project.id);
    if (index == -1) return;
    projects[index] = project;
    notifyListeners();
    _persistProject(project);
  }

  void markCaptureCompleted(String projectId) {
    final project = _projectById(projectId);
    if (project == null) return;
    project.captureCompleted = true;
    activeProjectId = project.id;
    notifyListeners();
    _persistProject(project);
    _saveProfile();
  }

  void markDesignExplored(String projectId) {
    final project = _projectById(projectId);
    if (project == null) return;
    project.designExplored = true;
    activeProjectId = project.id;
    notifyListeners();
    _persistProject(project);
    _saveProfile();
  }

  void markConsultationBooked(String projectId) {
    final project = _projectById(projectId);
    if (project == null) return;
    project.consultationBooked = true;
    project.consultationDate ??= DateTime.now();
    activeProjectId = project.id;
    notifyListeners();
    _persistProject(project);
    _saveProfile();
  }

  bool setWrapForProject(String projectId, WrapColor wrap) {
    final project = _projectById(projectId);
    if (project == null) return false;

    // Choosing a colour for a project does not use an AI credit.
    // Only a completed AI wrap uses one (see recordAiWrapUsed).
    project.selectedWrap = wrap;
    project.selectedWrapId = wrap.id;
    project.designExplored = true;
    activeProjectId = project.id;
    notifyListeners();
    _persistProject(project);
    return true;
  }

  /// Mirrors this month's AI wrap count from the server. The server is the source of truth (see WrapUsageService).
  void applyServerWrapUsage(int used, int quota) {
    profile = profile.copyWith(wrapUsed: used, wrapQuota: quota);
    notifyListeners();
    _saveProfile();
  }

  void updateUsageGuidePrefs({
    bool? hasSeenUsageGuide,
    bool? showUsageGuideOnStartup,
  }) {
    profile = profile.copyWith(
      hasSeenUsageGuide: hasSeenUsageGuide,
      showUsageGuideOnStartup: showUsageGuideOnStartup,
    );
    notifyListeners();
    _saveProfile();
  }

  /// 현재 사용자가 AI 랩핑을 추가로 사용할 수 있는지 여부.
  bool get canUseAiWrap {
    // 디버그 모드에서는 무한 테스트 허용
    if (kDebugMode) return true;
    if (profile.wrapQuota <= 0) return true;
    return profile.wrapUsed < profile.wrapQuota;
  }

  bool get isProSubscriber =>
      profile.subscriptionPlan.trim().toLowerCase() == 'pro';

  String get preferredImageModel =>
      isProSubscriber ? Config.openAiImageModel : Config.geminiImageModel;

  void updateNotes(String projectId, String notes) {
    final project = _projectById(projectId);
    if (project == null) return;
    project.notes = notes;
    notifyListeners();
    _persistProject(project);
  }

  void updateSubscription({required String plan, String status = '활성'}) {
    _updateSubscriptionInternal(
      plan: plan,
      status: status,
      preserveUsage: true,
    );
  }

  Future<void> initBilling() async {
    if (_billingInitialized) {
      await _billingService.refreshCatalog();
      return;
    }
    billingLoading = true;
    billingError = null;
    notifyListeners();
    await _billingService.initialize();
    _billingInitialized = true;
  }

  Future<void> _ensureGoogleSignInInitialized() async {
    if (_googleSignInInitialized) return;
    await GoogleSignIn.instance.initialize();
    _googleSignInInitialized = true;
  }

  Future<String?> purchasePlan(String plan) async {
    if (firebaseUser == null) {
      return 'Please sign in to purchase a plan.';
    }
    billingError = null;
    notifyListeners();
    await _billingService.buyPlan(plan);
    return billingError;
  }

  Future<String?> restorePurchases() async {
    if (firebaseUser == null) {
      return 'Please sign in to restore purchases.';
    }
    billingError = null;
    notifyListeners();
    await _billingService.restorePurchases();
    return billingError;
  }

  Future<void> _applyBillingEntitlement(BillingEntitlement entitlement) async {
    _updateSubscriptionInternal(
      plan: entitlement.planId,
      status: '활성',
      storeProductId: entitlement.productId,
      storePurchaseId: entitlement.purchaseId,
      purchaseToken: entitlement.purchaseToken,
      billingProvider: 'google_play',
      preserveUsage: true,
    );
  }

  void _updateSubscriptionInternal({
    required String plan,
    required String status,
    String? storeProductId,
    String? storePurchaseId,
    String? purchaseToken,
    String? billingProvider,
    bool preserveUsage = true,
  }) {
    final quota = _quotaForPlan(plan);
    profile = profile.copyWith(
      subscriptionPlan: plan,
      subscriptionStatus: status,
      wrapQuota: quota,
      wrapUsed: preserveUsage ? profile.wrapUsed : 0,
      storeProductId: storeProductId ?? profile.storeProductId,
      storePurchaseId: storePurchaseId ?? profile.storePurchaseId,
      purchaseToken: purchaseToken ?? profile.purchaseToken,
      billingProvider: billingProvider ?? profile.billingProvider,
      lastBillingSyncAt: DateTime.now().toIso8601String(),
    );
    notifyListeners();
    _saveProfile();
  }

  void setLanguage(String code) {
    language = code;
    notifyListeners();
    _saveProfile();
  }

  void syncLanguageWithSystemLocale([ui.Locale? locale]) {
    final resolved = _normalizeLanguageCode(locale?.languageCode);
    if (language == resolved) return;
    language = resolved;
    notifyListeners();
  }

  void setAgeRestrictedAu(bool value) {
    ageRestrictedAu = value;
    notifyListeners();
  }

  void setPendingWrap(WrapColor wrap) {
    pendingWrap = wrap;
    notifyListeners();
  }

  WrapColor? consumePendingWrap() {
    final wrap = pendingWrap;
    pendingWrap = null;
    return wrap;
  }

  void setPendingGarageWrapLaunch(GarageWrapLaunchContext context) {
    pendingGarageWrapLaunch = context;
    notifyListeners();
  }

  GarageWrapLaunchContext? consumePendingGarageWrapLaunch() {
    final context = pendingGarageWrapLaunch;
    pendingGarageWrapLaunch = null;
    return context;
  }

  void updateProfile({
    String? name,
    String? email,
    String? avatarPath,
    String? avatarUrl,
  }) {
    profile = profile.copyWith(
      name: name,
      email: email,
      avatarPath: avatarPath,
      avatarUrl: avatarUrl,
    );
    notifyListeners();
    _saveProfile();
  }

  void removeProject(String projectId) {
    projects.removeWhere((p) => p.id == projectId);
    if (activeProjectId == projectId) {
      activeProjectId = projects.isNotEmpty ? projects.first.id : null;
    }
    notifyListeners();
    _deleteProject(projectId);
    _saveProfile();
  }

  void addVehicle(SavedVehicle vehicle) {
    vehicles = [vehicle, ...vehicles];
    notifyListeners();
    _persistVehicle(vehicle);
  }

  void updateVehicle(SavedVehicle vehicle) {
    final idx = vehicles.indexWhere((v) => v.id == vehicle.id);
    if (idx >= 0) {
      final updated = List<SavedVehicle>.from(vehicles);
      updated[idx] = vehicle;
      vehicles = updated;
      notifyListeners();
      _persistVehicle(vehicle);
    }
  }

  void addVehicleWrapHistory(String vehicleId, GarageWrapHistoryEntry entry) {
    final idx = vehicles.indexWhere((v) => v.id == vehicleId);
    if (idx < 0) return;
    final updatedVehicle = vehicles[idx].copyWith(
      wrapHistory: [entry, ...vehicles[idx].wrapHistory],
      lastUpdated: DateTime.now(),
    );
    updateVehicle(updatedVehicle);
  }

  void removeVehicleWrapHistory(String vehicleId, String entryId) {
    final idx = vehicles.indexWhere((v) => v.id == vehicleId);
    if (idx < 0) return;
    final vehicle = vehicles[idx];
    final updatedHistory =
        vehicle.wrapHistory.where((entry) => entry.id != entryId).toList();
    updateVehicle(
      vehicle.copyWith(
        wrapHistory: updatedHistory,
        lastUpdated: DateTime.now(),
      ),
    );
  }

  void removeVehicle(String vehicleId) {
    vehicles.removeWhere((v) => v.id == vehicleId);
    for (final p in projects) {
      if (p.savedVehicleId == vehicleId) {
        p.savedVehicleId = null;
      }
    }
    notifyListeners();
    _deleteVehicle(vehicleId);
  }

  void addPost(CommunityPost post) {
    posts.insert(0, post);
    notifyListeners();
  }

  void removePost(String postId) {
    posts = posts.where((p) => p.id != postId).toList();
    notifyListeners();
  }

  Future<void> refreshRemoteCommunityFeed() async {
    try {
      final response = await http.get(Uri.parse(Config.communityFeedUrl));
      if (response.statusCode < 200 || response.statusCode >= 300) return;

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final items = (body['items'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(_remotePostFromFeedItem)
          .toList();

      remotePosts = items;
      notifyListeners();
    } catch (_) {
      // Keep the existing local community experience if the shared feed is unavailable.
    }
  }

  CommunityPost _remotePostFromFeedItem(Map<String, dynamic> item) {
    final badge = _localizedMap(item['badge']);
    final title = _localizedMap(item['title']);
    final summary = _localizedMap(item['summary']);
    final body = _localizedMap(item['body']);
    final ctaLabel = _localizedMap(item['ctaLabel']);
    final publishedAtRaw = item['publishedAt'] as String? ?? '';
    final href = item['ctaHref'] as String?;
    final authorNameRaw = item['authorName'] as String? ?? 'Rekora';
    final authorEmail = (item['authorEmail'] as String? ?? '')
        .trim()
        .toLowerCase();
    final authorId =
        ((item['authorId'] ?? item['authorUserId']) as String? ?? '').trim();
    final isAdminAuthored =
        authorEmail == _adminCommunityEmail ||
        authorId == _adminCommunityUserId ||
        authorNameRaw.trim() == _adminCommunityName;
    final authorName = isAdminAuthored ? 'Rekora' : authorNameRaw;
    final mediaItemsRaw = item['mediaItems'] is List
        ? (item['mediaItems'] as List).whereType<Map>().toList()
        : const <Map>[];
    final firstMedia = mediaItemsRaw.isNotEmpty
        ? Map<String, dynamic>.from(
            mediaItemsRaw.first.cast<dynamic, dynamic>(),
          )
        : item['media'] is Map<String, dynamic>
        ? item['media'] as Map<String, dynamic>
        : null;
    final mediaUrlRaw = firstMedia?['url'] as String?;
    final mediaKind =
        firstMedia?['kind'] as String? ?? firstMedia?['type'] as String?;
    final mediaMime = firstMedia?['mimeType'] as String?;
    final fallbackMediaKind = mediaMime?.startsWith('video/') == true
        ? 'video'
        : mediaMime?.startsWith('image/') == true
        ? 'image'
        : null;
    final localizedBodyKo = body['ko']?.isNotEmpty == true
        ? body['ko']
        : summary['ko'];
    final localizedBodyEn = body['en']?.isNotEmpty == true
        ? body['en']
        : summary['en'];
    final categoryKo = _categoryKoFromItem(
      item,
      badge['ko'] ?? badge['en'] ?? '',
    );
    final resolvedTitle =
        title['ko'] ??
        title['en'] ??
        (localizedBodyKo?.split('\n').first) ??
        '';
    final rawContent = (localizedBodyKo ?? localizedBodyEn ?? '').trim();
    final embeddedYoutubeUrl = _extractYoutubeUrl(rawContent);
    final resolvedContent = _stripYoutubeMarker(rawContent);
    final resolvedCtaHref = _resolveCommunityHref(href) ?? embeddedYoutubeUrl;

    return CommunityPost(
      id: item['id'] as String? ?? 'remote-${publishedAtRaw.hashCode}',
      author: authorName,
      title: resolvedTitle,
      content: resolvedContent.isNotEmpty ? resolvedContent : ' ',
      createdAt: DateTime.tryParse(publishedAtRaw) ?? DateTime.now(),
      category: categoryKo,
      titleKo: title['ko'],
      titleEn: title['en'],
      contentKo: localizedBodyKo,
      contentEn: localizedBodyEn,
      ctaLabelKo: ctaLabel['ko'],
      ctaLabelEn: ctaLabel['en'],
      ctaHref: resolvedCtaHref,
      mediaUrl: _resolveCommunityHref(mediaUrlRaw),
      mediaType: mediaKind ?? fallbackMediaKind,
      isRemote: true,
    );
  }

  Map<String, String> _localizedMap(Object? value) {
    if (value is String) {
      final text = value.trim();
      return {'ko': text, 'en': text};
    }
    final map = value is Map ? value : const {};
    return {'ko': map['ko'] as String? ?? '', 'en': map['en'] as String? ?? ''};
  }

  String _categoryKoFromItem(Map<String, dynamic> item, String fallback) {
    final categoryKey = (item['categoryKey'] as String? ?? '').trim().toLowerCase();
    switch (categoryKey) {
      case 'all':
        return '전체';
      case 'general':
        return '자유';
      case 'guide':
        return '가이드';
      case 'notice':
        return '공지';
      case 'featured':
      case 'showcase':
        return '추천';
      case 'review':
      case 'installation':
        return '시공 후기';
      case 'color':
        return '컬러 추천';
      case 'color tips':
        return '컬러 추천';
      case 'care':
        return '케어/관리';
      case 'partial':
      case 'partial wrap':
        return '부분 랩핑';
      case 'coating':
        return '코팅/보호';
      default:
        return fallback.isNotEmpty ? fallback : '자유';
    }
  }

  String? _resolveCommunityHref(String? href) {
    if (href == null || href.isEmpty) return null;
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    if (href.startsWith('/')) return '${Config.communitySiteUrl}$href';
    return '${Config.communitySiteUrl}/$href';
  }

  String _stripYoutubeMarker(String text) {
    return text
        .replaceAll(RegExp(r'\n?\s*\[\[REKORA_YOUTUBE:[^\]]+\]\]\s*'), '\n')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }

  String? _extractYoutubeUrl(String text) {
    final marker = RegExp(r'\[\[REKORA_YOUTUBE:([^\]]+)\]\]');
    final markerMatch = marker.firstMatch(text);
    final markerUrl = markerMatch?.group(1)?.trim();
    if (markerUrl != null && markerUrl.isNotEmpty) return markerUrl;

    final generic = RegExp(
      r'(https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/[^\s]+)',
      caseSensitive: false,
    );
    final match = generic.firstMatch(text);
    return match?.group(1);
  }

  int _quotaForPlan(String plan) {
    switch (plan.toLowerCase()) {
      case 'free':
        return 10;
      case 'basic':
        return 50;
      case 'advanced':
        return 150;
      case 'pro':
        return 500;
      default:
        return 10;
    }
  }

  VehicleProject? _projectById(String id) {
    for (final project in projects) {
      if (project.id == id) return project;
    }
    return null;
  }

  Future<void> initAuthListener() async {
    final cachedUser = _auth.currentUser;
    if (cachedUser != null) {
      firebaseUser = cachedUser;
      // Existing sessions do not go through sign-in, so register the profile here as well.
      unawaited(UserApi.instance.registerProfile());
      await _syncDatadogUserInfo(cachedUser);
      _profileHydrated = false;
      await _ensureFirestoreNetworkReady();
      await _loadUserData();
      _syncProfileFromUser(cachedUser);
      notifyListeners();
    } else {
      await _syncDatadogUserInfo(null);
    }

    _auth.userChanges().listen((user) async {
      firebaseUser = user;
      await _syncDatadogUserInfo(user);
      if (user != null) {
        _profileHydrated = false;
        await _ensureFirestoreNetworkReady();
        await _loadUserData();
        _syncProfileFromUser(user);
      } else {
        _profileHydrated = false;
      }
      notifyListeners();
    });
  }

  Future<void> _syncDatadogUserInfo(User? user) async {
    if (user == null) {
      final localUserId = await _getOrCreateDatadogLocalUserId();
      DatadogSdk.instance.setUserInfo(
        id: localUserId,
        name: 'Public User',
        extraInfo: const {
          'auth_provider': 'local',
          'is_anonymous': true,
        },
      );
      logDatadogInfo(
        'Datadog user context set for public session',
        attributes: {
          'usr.id': localUserId,
          'auth_provider': 'local',
        },
      );
      return;
    }

    DatadogSdk.instance.setUserInfo(
      id: user.uid,
      name: user.displayName?.trim().isNotEmpty == true ? user.displayName : null,
      email: user.email?.trim().isNotEmpty == true ? user.email : null,
      extraInfo: {
        'auth_provider': user.providerData.isNotEmpty
            ? user.providerData.first.providerId
            : 'firebase',
        'is_anonymous': user.isAnonymous,
        if (user.phoneNumber?.trim().isNotEmpty == true)
          'phone_number': user.phoneNumber,
      },
    );
    logDatadogInfo(
      'Datadog user context updated',
      attributes: {
        'usr.id': user.uid,
        'auth_provider': user.providerData.isNotEmpty
            ? user.providerData.first.providerId
            : 'firebase',
        'has_email': user.email?.trim().isNotEmpty == true,
      },
    );
  }

  Future<String> _getOrCreateDatadogLocalUserId() async {
    final directory = await getApplicationSupportDirectory();
    final file = File('${directory.path}/$_datadogLocalUserFileName');
    if (await file.exists()) {
      final existing = (await file.readAsString()).trim();
      if (existing.isNotEmpty) {
        return existing;
      }
    }

    final generated = 'android-local-${DateTime.now().millisecondsSinceEpoch}';
    await file.writeAsString(generated, flush: true);
    return generated;
  }

  void _syncProfileFromUser(User user) {
    profile = profile.copyWith(
      name: user.displayName?.isNotEmpty == true
          ? user.displayName
          : profile.name,
      email: user.email ?? profile.email,
      avatarUrl: user.photoURL ?? profile.avatarUrl,
      avatarPath: profile.avatarPath,
    );
  }

  Future<String?> signInWithGoogle() async {
    try {
      await _ensureGoogleSignInInitialized();
      final googleUser = await GoogleSignIn.instance.authenticate();
      final googleAuth = googleUser.authentication;
      // 기본 프로필 정보를 즉시 반영
      updateProfile(
        name: googleUser.displayName,
        email: googleUser.email,
        avatarUrl: googleUser.photoUrl,
        avatarPath: null,
      );
      final credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
      );
      final result = await _auth.signInWithCredential(credential);
      firebaseUser = result.user;
      unawaited(UserApi.instance.registerProfile());
      await _syncDatadogUserInfo(result.user);
      if (_auth.currentUser != null) {
        _syncProfileFromUser(_auth.currentUser!);
      }
      await _loadUserData();
      await _saveProfile();
      return null;
    } catch (e) {
      return 'Google 로그인 오류: $e';
    }
  }

  Future<String?> signInWithApple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      final oauth = OAuthProvider('apple.com').credential(
        idToken: credential.identityToken,
        accessToken: credential.authorizationCode,
      );
      // 요청된 이름/이메일을 우선 반영 (Apple은 최초 1회만 제공될 수 있음)
      final fullName = [
        credential.givenName,
        credential.familyName,
      ].where((e) => e != null && e.isNotEmpty).join(' ');
      updateProfile(
        name: fullName.isNotEmpty ? fullName : null,
        email: credential.email,
        avatarUrl: null,
        avatarPath: null,
      );
      final result = await _auth.signInWithCredential(oauth);
      firebaseUser = result.user;
      unawaited(UserApi.instance.registerProfile());
      await _syncDatadogUserInfo(result.user);
      if (_auth.currentUser != null) {
        _syncProfileFromUser(_auth.currentUser!);
      }
      await _loadUserData();
      await _saveProfile();
      return null;
    } catch (e) {
      return 'Apple 로그인 오류: $e';
    }
  }

  Future<void> signOut() async {
    await GoogleSignIn.instance.signOut();
    await _auth.signOut();
    firebaseUser = null;
    await _syncDatadogUserInfo(null);
    logDatadogInfo('User signed out');
    _profileHydrated = false;
    // Clear user-scoped data so counts/garage do not leak from previous sessions.
    projects = [];
    vehicles = [];
    activeProjectId = null;
    notifyListeners();
  }

  Future<String?> deleteAccount() async {
    final user = _auth.currentUser;
    if (user == null) {
      return '로그인된 계정이 없습니다.';
    }

    final uid = user.uid;
    final userRef = _firestore.collection('users').doc(uid);

    try {
      // Remove the backend (RDS) copy first so no personal data is left behind.
      final backendDeleted = await UserApi.instance.deleteAccount();
      if (!backendDeleted) {
        debugPrint('Backend user data delete failed; continuing with Firestore');
      }

      // Remove user-scoped Firestore documents.
      try {
        final projects = await userRef.collection('projects').get();
        for (final doc in projects.docs) {
          await doc.reference.delete();
        }
        final vehicles = await userRef.collection('vehicles').get();
        for (final doc in vehicles.docs) {
          await doc.reference.delete();
        }
        await userRef.delete();
      } catch (e) {
        debugPrint('Firestore user data delete failed: $e');
      }

      await GoogleSignIn.instance.signOut();
      await user.delete();
      await _auth.signOut();

      firebaseUser = null;
      await _syncDatadogUserInfo(null);
      logDatadogWarn('User account deleted and Datadog context reset');
      _profileHydrated = false;
      projects = [];
      vehicles = [];
      activeProjectId = null;
      notifyListeners();
      return null;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'requires-recent-login') {
        return '보안을 위해 다시 로그인한 뒤 계정 삭제를 시도해주세요.';
      }
      return '계정 삭제 오류: ${e.message ?? e.code}';
    } catch (e) {
      return '계정 삭제 오류: $e';
    }
  }

  Future<void> _loadUserData() async {
    if (firebaseUser == null || _isLoadingData) return;
    final networkReady = await _ensureFirestoreNetworkReady();
    if (!networkReady) {
      debugPrint(
        'Firestore network disabled: firestore.googleapis.com DNS unavailable',
      );
      _profileHydrated = false;
      return;
    }
    _isLoadingData = true;
    try {
      final userRef = _userDoc;
      final userDoc = await userRef.get();
      if (userDoc.exists) {
        final data = userDoc.data();
        if (data != null) {
          final profileMap = (data['profile'] as Map<String, dynamic>?) ?? {};
          if (profileMap.isNotEmpty) {
            profile = UserProfile.fromMap(profileMap);
          }
          activeProjectId =
              data['activeProjectId'] as String? ?? activeProjectId;
        }
      }

      // Backend (RDS) is the read source. Firestore is used only when the backend is unreachable
      // or has no data yet, so users whose mirror write failed still see their data.
      final remoteVehicles = await UserApi.instance.list('vehicles');
      final remoteProjects = await UserApi.instance.list('projects');
      if (remoteVehicles != null &&
          remoteProjects != null &&
          (remoteVehicles.isNotEmpty || remoteProjects.isNotEmpty)) {
        vehicles = remoteVehicles.map(SavedVehicle.fromMap).toList();
        final loadedProjects = remoteProjects.map(VehicleProject.fromMap).toList();
        for (final project in loadedProjects) {
          _attachWrap(project);
        }
        projects = loadedProjects;
      } else {
        final vehiclesSnap = await userRef.collection('vehicles').get();
        final loadedVehicles = vehiclesSnap.docs
            .map((doc) => SavedVehicle.fromMap(doc.data()))
            .toList();
        vehicles = loadedVehicles;

        final projectsSnap = await userRef
            .collection('projects')
            .orderBy('createdAt', descending: true)
            .get();
        final loadedProjects = projectsSnap.docs
            .map((doc) => VehicleProject.fromMap(doc.data()))
            .toList();
        for (final project in loadedProjects) {
          _attachWrap(project);
        }
        projects = loadedProjects;
      }

      if (activeProjectId != null &&
          projects.every((p) => p.id != activeProjectId)) {
        activeProjectId = projects.isNotEmpty ? projects.first.id : null;
      } else if (activeProjectId == null && projects.isNotEmpty) {
        activeProjectId = projects.first.id;
      }
    } on FirebaseException catch (e) {
      await _handleFirestoreException(e, operation: 'load');
    } catch (e) {
      debugPrint('Firestore load failed: $e');
    } finally {
      _isLoadingData = false;
      _profileHydrated = true;
      notifyListeners();
    }
  }

  void _attachWrap(VehicleProject project) {
    final wrapId = project.selectedWrapId ?? project.selectedWrap?.id;
    if (wrapId == null) return;
    WrapColor? match;
    for (final wrap in wraps) {
      if (wrap.id == wrapId) {
        match = wrap;
        break;
      }
    }
    project.selectedWrap = match;
    project.selectedWrapId = wrapId;
  }

  // Firestore stays the read source during the transition. Every write is mirrored to the
  // backend (RDS) so the backend copy is complete before reads are switched over.

  Future<void> _persistProject(VehicleProject project) async {
    if (firebaseUser == null) return;
    unawaited(UserApi.instance.put('projects', project.id, project.toMap()));
    try {
      await _userDoc
          .collection('projects')
          .doc(project.id)
          .set(project.toMap(), SetOptions(merge: true));
    } on FirebaseException catch (e) {
      await _handleFirestoreException(e, operation: 'project save');
    } catch (e) {
      debugPrint('Firestore project save failed: $e');
    }
  }

  Future<void> _persistVehicle(SavedVehicle vehicle) async {
    if (firebaseUser == null) return;
    unawaited(UserApi.instance.put('vehicles', vehicle.id, vehicle.toMap()));
    try {
      await _userDoc
          .collection('vehicles')
          .doc(vehicle.id)
          .set(vehicle.toMap(), SetOptions(merge: true));
    } on FirebaseException catch (e) {
      await _handleFirestoreException(e, operation: 'vehicle save');
    } catch (e) {
      debugPrint('Firestore vehicle save failed: $e');
    }
  }

  Future<void> _deleteProject(String projectId) async {
    if (firebaseUser == null) return;
    unawaited(UserApi.instance.delete('projects', projectId));
    try {
      await _userDoc.collection('projects').doc(projectId).delete();
    } on FirebaseException catch (e) {
      await _handleFirestoreException(e, operation: 'project delete');
    } catch (e) {
      debugPrint('Firestore project delete failed: $e');
    }
  }

  Future<void> _deleteVehicle(String vehicleId) async {
    if (firebaseUser == null) return;
    unawaited(UserApi.instance.delete('vehicles', vehicleId));
    try {
      await _userDoc.collection('vehicles').doc(vehicleId).delete();
    } on FirebaseException catch (e) {
      await _handleFirestoreException(e, operation: 'vehicle delete');
    } catch (e) {
      debugPrint('Firestore vehicle delete failed: $e');
    }
  }

  Future<void> _saveProfile() async {
    if (firebaseUser == null) return;
    try {
      await _userDoc.set({
        'profile': profile.toMap(),
        'activeProjectId': activeProjectId,
      }, SetOptions(merge: true));
    } on FirebaseException catch (e) {
      await _handleFirestoreException(e, operation: 'profile save');
    } catch (e) {
      debugPrint('Firestore profile save failed: $e');
    }
  }

  DocumentReference<Map<String, dynamic>> get _userDoc =>
      _firestore.collection('users').doc(firebaseUser!.uid);

  Future<bool> _ensureFirestoreNetworkReady() async {
    final reachable = await _canResolveFirestoreHost();
    if (reachable) {
      if (!_firestoreNetworkEnabled) {
        try {
          await _firestore.enableNetwork();
          _firestoreNetworkEnabled = true;
          debugPrint('Firestore network re-enabled');
        } catch (e) {
          debugPrint('Failed to re-enable Firestore network: $e');
        }
      }
      _firestoreRetryTimer?.cancel();
      _firestoreRetryTimer = null;
      return true;
    }

    if (_firestoreNetworkEnabled) {
      try {
        await _firestore.disableNetwork();
        _firestoreNetworkEnabled = false;
        debugPrint('Firestore network disabled due to DNS failure');
      } catch (e) {
        debugPrint('Failed to disable Firestore network: $e');
      }
    }
    _scheduleFirestoreRetry();
    return false;
  }

  Future<void> _handleFirestoreException(
    FirebaseException error, {
    required String operation,
  }) async {
    final code = error.code.toLowerCase();
    if (code == 'unavailable' || code == 'failed-precondition') {
      debugPrint('Firestore $operation deferred: ${error.code}');
      await _suspendFirestoreNetwork('Firestore $operation unavailable');
      return;
    }
    debugPrint('Firestore $operation failed: $error');
  }

  Future<void> _suspendFirestoreNetwork(String reason) async {
    if (_firestoreNetworkEnabled) {
      try {
        await _firestore.disableNetwork();
        _firestoreNetworkEnabled = false;
        debugPrint(reason);
      } catch (e) {
        debugPrint('Failed to suspend Firestore network: $e');
      }
    }
    _scheduleFirestoreRetry();
  }

  Future<bool> _canResolveFirestoreHost() async {
    try {
      final result = await InternetAddress.lookup(
        'firestore.googleapis.com',
      ).timeout(const Duration(seconds: 3));
      return result.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  void _scheduleFirestoreRetry() {
    _firestoreRetryTimer ??= Timer.periodic(const Duration(seconds: 15), (
      _,
    ) async {
      final reachable = await _canResolveFirestoreHost();
      if (!reachable) return;
      try {
        await _firestore.enableNetwork();
        _firestoreNetworkEnabled = true;
        debugPrint('Firestore network restored after retry');
      } catch (e) {
        debugPrint('Firestore retry enable failed: $e');
        return;
      }
      _firestoreRetryTimer?.cancel();
      _firestoreRetryTimer = null;
    });
  }

  @override
  void dispose() {
    _firestoreRetryTimer?.cancel();
    unawaited(_billingService.dispose());
    super.dispose();
  }

  static String _systemLanguageCode() {
    return _normalizeLanguageCode(
      ui.PlatformDispatcher.instance.locale.languageCode,
    );
  }

  static String _normalizeLanguageCode(String? code) {
    if (code == null) return 'en';
    return code.toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }
}

class AppStateScope extends InheritedNotifier<AppState> {
  const AppStateScope({
    super.key,
    required AppState super.notifier,
    required super.child,
  });

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppStateScope>();
    assert(scope != null, 'AppStateScope not found in context');
    return scope!.notifier!;
  }
}

/// Lets a child screen (the AI assistant) ask the main shell to switch tabs. Value = tab index, null = idle.
final ValueNotifier<int?> assistantTabRequest = ValueNotifier<int?>(null);
