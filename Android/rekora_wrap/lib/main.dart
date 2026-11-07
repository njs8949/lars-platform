import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:datadog_flutter_plugin/datadog_flutter_plugin.dart';
import 'package:datadog_session_replay/datadog_session_replay.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:ui' as ui;

import 'app_state.dart';
import 'datadog_support.dart';
import 'l10n.dart';
import 'screens/design_screen.dart';
import 'screens/garage_screen.dart';
import 'screens/home_screen.dart';
import 'screens/app_usage_guide_screen.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/visualizer_screen.dart';
import 'theme.dart';

const _datadogLocalUserFileName = 'datadog_user_id.txt';

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

Future<void> _syncInitialDatadogUserInfo() async {
  final currentUser = FirebaseAuth.instance.currentUser;
  if (currentUser != null) {
    DatadogSdk.instance.setUserInfo(
      id: currentUser.uid,
      name: currentUser.displayName?.trim().isNotEmpty == true
          ? currentUser.displayName
          : null,
      email: currentUser.email?.trim().isNotEmpty == true
          ? currentUser.email
          : null,
      extraInfo: {
        'auth_provider': currentUser.providerData.isNotEmpty
            ? currentUser.providerData.first.providerId
            : 'firebase',
        'is_anonymous': currentUser.isAnonymous,
      },
    );
    return;
  }

  final localUserId = await _getOrCreateDatadogLocalUserId();
  DatadogSdk.instance.setUserInfo(
    id: localUserId,
    name: 'Public User',
    extraInfo: const {
      'auth_provider': 'local',
      'is_anonymous': true,
    },
  );
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarDividerColor: Colors.transparent,
    systemNavigationBarIconBrightness: Brightness.dark,
    statusBarColor: Colors.transparent,
  ));

  // Android에서 전체 화면 레이아웃을 사용하도록 설정 (상/하단 바 투명화 지원)
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  DatadogSdk.instance.sdkVerbosity = CoreLoggerLevel.debug;

  final configuration = DatadogConfiguration(
    clientToken: 'pubb628a2b64c8ab0daeec460b81ff7533a',
    env: 'production',
    site: DatadogSite.us1,
    nativeCrashReportEnabled: true,
    loggingConfiguration: DatadogLoggingConfiguration(),
    rumConfiguration: DatadogRumConfiguration(
      applicationId: 'f0324bff-5080-4629-9a46-4e5ea776f3ce',
      sessionSamplingRate: 100.0,
      reportFlutterPerformance: true,
    ),
  )..enableSessionReplay(
      DatadogSessionReplayConfiguration(
        textAndInputPrivacyLevel: TextAndInputPrivacyLevel.maskSensitiveInputs,
        imagePrivacyLevel: ImagePrivacyLevel.maskNone,
        touchPrivacyLevel: TouchPrivacyLevel.show,
        replaySampleRate: 100.0,
        imageDownscaling: ImageDownscaling.enabled,
        maxImagePixelBudget: 3000000,
        fontFamilyTransform: const FontFamilyTransformConfig(
          strategy: FontFamilyStrategy.smart,
        ),
      ),
    );

  await DatadogSdk.runApp(configuration, TrackingConsent.granted, () async {
    initializeDatadogLogger();
    await _syncInitialDatadogUserInfo();
    logDatadogInfo(
      'Datadog logging enabled',
      attributes: {
        'platform': 'android',
        'env': 'production',
        'session_replay_enabled': true,
      },
    );
    runApp(const RekoraWrapApp());
  });
}

class RekoraWrapApp extends StatefulWidget {
  const RekoraWrapApp({super.key});

  @override
  State<RekoraWrapApp> createState() => _RekoraWrapAppState();
}

class _RekoraWrapAppState extends State<RekoraWrapApp> {
  final GlobalKey _sessionReplayCaptureKey = GlobalKey();
  late final AppState _state;
  int _tabIndex = 0;
  late final ValueNotifier<double> _tabBarGlassIntensity;
  bool _usageGuideScheduled = false;
  bool _usageGuideShownThisSession = false;

  @override
  void initState() {
    super.initState();
    assistantTabRequest.addListener(_onAssistantTabRequest);
    _state = AppState.withSampleData();
    _tabBarGlassIntensity = ValueNotifier<double>(0.0);
    _state.syncLanguageWithSystemLocale(ui.PlatformDispatcher.instance.locale);
    _state.initAuthListener();
    DatadogSdk.instance.rum?.startView(runtimeType.toString());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _state.refreshRemoteCommunityFeed();
      _maybeShowAuAgeGate(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _state,
      builder: (context, _) {
        final loggedIn = _state.firebaseUser != null;
        final l10n = L10n(_state.language);
        if (!loggedIn) {
          _usageGuideScheduled = false;
          _usageGuideShownThisSession = false;
        }
        return AppStateScope(
          notifier: _state,
          child: SessionReplayCapture(
            key: _sessionReplayCaptureKey,
            rum: DatadogSdk.instance.rum!,
            sessionReplay: DatadogSessionReplay.instance!,
            child: MaterialApp(
              debugShowCheckedModeBanner: false,
              title: 'Rekora Wrap',
              theme: WrapTheme.light,
              darkTheme: WrapTheme.dark,
              themeMode: ThemeMode.system,
              locale: Locale(_state.language),
              supportedLocales: const [Locale('ko'), Locale('en')],
              localeListResolutionCallback: (locales, supportedLocales) {
                final deviceLocale = locales?.first;
                _state.syncLanguageWithSystemLocale(deviceLocale);
                if (deviceLocale == null) return supportedLocales.first;
                for (final supported in supportedLocales) {
                  if (supported.languageCode == deviceLocale.languageCode) {
                    return supported;
                  }
                }
                return supportedLocales.firstWhere(
                  (locale) => locale.languageCode == 'en',
                  orElse: () => supportedLocales.first,
                );
              },
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              navigatorObservers: [
                DatadogNavigationObserver(datadogSdk: DatadogSdk.instance),
              ],
              home: loggedIn
                  ? Builder(
                      builder: (context) {
                        _scheduleUsageGuideIfNeeded(context);
                        final body = SafeArea(
                          bottom: false,
                          child: IndexedStack(
                            index: _tabIndex,
                            children: [
                              HomeScreen(onSelectTab: _setTab),
                              GarageScreen(onSelectTab: _setTab),
                              VisualizerScreen(onSelectDesign: () => _setTab(3)),
                              DesignScreen(onWrapApplied: () => _setTab(2)),
                              const ProfileScreen(),
                            ],
                          ),
                        );

                        return Scaffold(
                          extendBody: true,
                          body: NotificationListener<ScrollNotification>(
                            onNotification: (notification) {
                              final depth = notification.depth;
                              if (depth > 0) return false;
                              if (notification is! ScrollUpdateNotification &&
                                  notification is! OverscrollNotification &&
                                  notification is! UserScrollNotification) {
                                return false;
                              }
                              final pixels = notification.metrics.pixels;
                              final next = (pixels / 220).clamp(0.0, 1.0);
                              if ((next - _tabBarGlassIntensity.value).abs() > 0.03) {
                                _tabBarGlassIntensity.value = next;
                              }
                              return false;
                            },
                            child: body,
                          ),
                          bottomNavigationBar: ValueListenableBuilder<double>(
                            valueListenable: _tabBarGlassIntensity,
                            builder: (context, intensity, _) {
                              return Padding(
                                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(40),
                                  child: BackdropFilter(
                                    filter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                                    child: Container(
                                      height: 84,
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).brightness == Brightness.dark
                                            ? Colors.black.withValues(alpha: 0.6)
                                            : Colors.white.withValues(alpha: 0.65),
                                        borderRadius: BorderRadius.circular(40),
                                        border: Border.all(
                                          color: Colors.white.withValues(alpha: 0.2),
                                          width: 1.5,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.1),
                                            blurRadius: 20,
                                            offset: const Offset(0, 8),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                        children: [
                                          _buildTabItem(0, 'assets/icons/lucide_menu/home.svg', l10n.navHome, WrapTheme.primary),
                                          _buildTabItem(1, 'assets/icons/lucide_menu/car.svg', l10n.navProjects, WrapTheme.primaryContainer),
                                          _buildCenterTabItem(2, 'assets/icons/lucide_menu/ai-wrap.svg', l10n.navViewer, WrapTheme.primary),
                                          _buildTabItem(3, 'assets/icons/lucide_menu/design.svg', l10n.navDesign, WrapTheme.secondary),
                                          _buildTabItem(4, 'assets/icons/lucide_menu/more.svg', l10n.navMore, WrapTheme.primaryContainer),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    )
                  : LoginScreen(
                      onGoogle: () async {
                        await _state.signInWithGoogle();
                      },
                      onApple: () async {
                        await _state.signInWithApple();
                      },
                    ),
            ),
          ),
        );
      },
    );
  }

  void _onAssistantTabRequest() {
    final index = assistantTabRequest.value;
    if (index == null) return;
    assistantTabRequest.value = null;
    _setTab(index);
  }

  void _setTab(int index) {
    setState(() {
      _tabIndex = index;
    });
  }

  @override
  void dispose() {
    assistantTabRequest.removeListener(_onAssistantTabRequest);
    _tabBarGlassIntensity.dispose();
    _state.dispose();
    super.dispose();
  }

  Widget _buildTabItem(int index, String assetPath, String label, Color selectedTint) {
    final isSelected = _tabIndex == index;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final unselectedLabelColor = isDark
        ? Colors.white.withValues(alpha: 0.82)
        : const Color(0xFF94A3B8);
    return GestureDetector(
      onTap: () => _setTab(index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _NavMenuIcon(
            assetPath: assetPath,
            selectedTint: selectedTint,
            isSelected: isSelected,
            size: 30,
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: isSelected ? selectedTint : unselectedLabelColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCenterTabItem(int index, String assetPath, String label, Color selectedTint) {
    final isSelected = _tabIndex == index;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final unselectedLabelColor = isDark
        ? Colors.white.withValues(alpha: 0.82)
        : const Color(0xFF94A3B8);
    return GestureDetector(
      onTap: () => _setTab(index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _NavMenuIcon(
            assetPath: assetPath,
            selectedTint: selectedTint,
            isSelected: isSelected,
            size: 32,
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
              color: isSelected ? selectedTint : unselectedLabelColor,
            ),
          ),
        ],
      ),
    );
  }

  void _maybeShowAuAgeGate(BuildContext context) {
    final locale = ui.PlatformDispatcher.instance.locale;
    final isAu = locale.countryCode?.toUpperCase() == 'AU';
    if (!isAu) return;
    final l10n = L10n(_state.language);
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: WrapTheme.card(context),
          title: Text(l10n.auAgeGateTitle),
          content: Text(l10n.auAgeGateContent),
          actions: [
            TextButton(
              onPressed: () {
                _state.setAgeRestrictedAu(true);
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.auAgeGateRestrictedMsg)),
                );
              },
              child: Text(l10n.auAgeGateNo),
            ),
            ElevatedButton(
              onPressed: () {
                _state.setAgeRestrictedAu(false);
                Navigator.of(ctx).pop();
              },
              child: Text(l10n.auAgeGateYes),
            ),
          ],
        );
      },
    );
  }

  void _scheduleUsageGuideIfNeeded(BuildContext context) {
    if (_usageGuideScheduled || _usageGuideShownThisSession) return;
    if (!_state.isProfileHydrated) return;
    final profile = _state.profile;
    // 첫 실행이고 매뉴얼 자동 표시가 켜진 경우에만 표시
    final shouldShow = !profile.hasSeenUsageGuide && profile.showUsageGuideOnStartup;
    if (!shouldShow) return;
    _usageGuideScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _usageGuideScheduled = false;
      if (!mounted || !(_state.firebaseUser != null)) return;
      _usageGuideShownThisSession = true;
      await showAppUsageGuideSheet(
        context,
        state: _state,
        fromStartup: true,
      );
    });
  }
}

class _NavMenuIcon extends StatelessWidget {
  const _NavMenuIcon({
    required this.assetPath,
    required this.isSelected,
    required this.selectedTint,
    this.size = 28,
  });

  final String assetPath;
  final bool isSelected;
  final Color selectedTint;
  final double size;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tint = isSelected
        ? selectedTint
        : (isDark
            ? Colors.white.withValues(alpha: 0.84)
            : const Color(0xFF94A3B8));
    return Opacity(
      opacity: isSelected ? 1 : (isDark ? 0.92 : 0.72),
      child: SvgPicture.asset(
        assetPath,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(tint, BlendMode.srcIn),
      ),
    );
  }
}

class _GlassNoisePainter extends CustomPainter {
  const _GlassNoisePainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    for (double x = 10; x < size.width; x += 14) {
      for (double y = 8; y < size.height; y += 12) {
        final radius = (((x + y).toInt() % 3) + 1) * 0.32;
        canvas.drawCircle(Offset(x, y), radius, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _GlassNoisePainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
