import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_state.dart';
import '../services/app_update_service.dart';
import '../l10n.dart';
import '../services/datadog_consent.dart';
import '../services/ai_consent.dart';
import '../models.dart';
import '../theme.dart';
import 'app_usage_guide_screen.dart';
import 'garage_screen.dart';
import 'legal_screens.dart';
import 'notifications_screen.dart';
import 'updates_hub_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static final ImagePicker _picker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final profile = state.profile;
    final l10n = L10n.of(context);

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _StudioGridPainter(dotColor: WrapTheme.border(context)),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context, l10n),
                  const SizedBox(height: 24),
                  _buildProfileHero(context, profile, l10n),
                  const SizedBox(height: 24),
                  _buildCreditCard(context, state, profile, l10n),
                  const SizedBox(height: 28),
                  _buildSectionTitle(
                    context,
                    l10n.tx('계정 및 앱', 'Account & App'),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/car.svg',
                    title: l10n.tx('마이 개러지', 'My Garage'),
                    subtitle: l10n.tx(
                      '차량 ${state.vehicles.length}대 · 프로젝트 ${state.projects.length}개',
                      '${state.vehicles.length} vehicles · ${state.projects.length} projects',
                    ),
                    onTap: () => _openProjects(context, state),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/language.svg',
                    title: l10n.tx('언어 설정', 'Language'),
                    subtitle: l10n.languageLabel,
                    onTap: () => _showLanguageSheet(context, state, l10n),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/community.svg',
                    title: l10n.tx('업데이트 및 커뮤니티', 'Updates & Community'),
                    subtitle: l10n.tx(
                      '알림, 공지사항, 커뮤니티 피드를 한곳에서 확인합니다',
                      'Open notifications, announcements, and community feed in one place',
                    ),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => AppStateScope(
                          notifier: state,
                          child: const UpdatesHubScreen(),
                        ),
                      ),
                    ),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/support.svg',
                    title: l10n.tx('사용자 매뉴얼', 'User Manual'),
                    subtitle: l10n.tx(
                      '최초 설치부터 AI 랩핑 적용까지 단계별 사용법 보기',
                      'Open the step-by-step guide from first install to AI wrapping',
                    ),
                    onTap: () => showAppUsageGuideSheet(context, state: state),
                  ),
                  _buildToggleMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/support.svg',
                    title: l10n.tx('매뉴얼 자동 표시', 'Show Manual On Startup'),
                    subtitle: profile.showUsageGuideOnStartup
                        ? l10n.tx(
                            '앱 실행 시 사용자 매뉴얼을 자동으로 표시합니다',
                            'Automatically open the user manual when the app starts',
                          )
                        : l10n.tx(
                            '앱 실행 시 사용자 매뉴얼을 자동으로 표시하지 않습니다',
                            'Do not automatically open the user manual when the app starts',
                          ),
                    value: profile.showUsageGuideOnStartup,
                    onChanged: (value) => state.updateUsageGuidePrefs(
                      hasSeenUsageGuide: true,
                      showUsageGuideOnStartup: value,
                    ),
                  ),
                  const SizedBox(height: 28),
                  _buildSectionTitle(
                    context,
                    l10n.tx('지원 및 정책', 'Support & Legal'),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/support.svg',
                    title: l10n.tx('고객 지원 / FAQ', 'Help Center / FAQ'),
                    subtitle: l10n.tx('카카오톡 1:1 채팅과 문의 메일 열기', 'Open KakaoTalk 1:1 chat and support email'),
                    onTap: () => _showSupportSheet(context, l10n),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/privacy.svg',
                    title: l10n.tx('개인정보처리방침', 'Privacy Policy'),
                    subtitle: l10n.tx('개인정보 처리 및 보관 정책', 'How your data is handled'),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    context,
                    assetPath: 'assets/icons/lucide_menu/privacy.svg',
                    title: l10n.tx('서비스 이용약관', 'Terms of Service'),
                    subtitle: l10n.tx('서비스 사용 조건과 책임 범위', 'Service rules and liability'),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const TermsOfServiceScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    context,
                    iconData: Icons.shield_outlined,
                    title: l10n.tx('데이터 수집 동의 변경', 'Change data collection consent'),
                    subtitle: l10n.tx('앱 안정성 진단 데이터 수집을 켜거나 끕니다', 'Turn app stability diagnostics on or off'),
                    onTap: () => DatadogConsent.change(context, isKo: l10n.code != 'en'),
                  ),
                  _buildMenuTile(
                    context,
                    iconData: Icons.photo_camera_back_outlined,
                    title: l10n.tx('AI 사진 전송 동의 철회', 'Withdraw AI photo consent'),
                    subtitle: l10n.tx('다음 AI 기능 사용 시 다시 동의를 묻습니다', 'You will be asked again before the next AI feature'),
                    onTap: () async {
                      await AiConsent.revoke();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text(l10n.tx('AI 사진 전송 동의를 철회했습니다.', 'AI photo consent withdrawn.')),
                        ));
                      }
                    },
                  ),
                  _buildMenuTile(
                    context,
                    iconData: Icons.delete_forever_rounded,
                    title: l10n.tx('계정 삭제', 'Delete Account'),
                    subtitle: l10n.tx('계정과 저장된 데이터를 삭제합니다', 'Delete your account and saved data'),
                    onTap: () => _confirmDeleteAccount(context, state, l10n),
                    danger: true,
                  ),
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: WrapTheme.card(context),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: WrapTheme.border(context)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () => showAppUpdateCheck(context, isKorean: l10n.code != 'en'),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Text(
                              'Rekora Wrap v$kAppVersionName',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '© 2026 LARS Inc. All rights reserved.',
                          style: TextStyle(
                            color: WrapTheme.mutedText(context),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => state.signOut(),
                      icon: const Icon(Icons.logout),
                      label: Text(
                        l10n.tx('로그아웃', 'Sign Out'),
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFE11D48),
                        side: const BorderSide(color: Color(0xFFFDA4AF)),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, L10n l10n) {
    return SizedBox(
      height: 72,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 32),
          Text(
            'REKORA',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              letterSpacing: -1.8,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          IconButton(
            tooltip: l10n.notificationsTooltip,
            icon: Icon(
              Icons.notifications_none_rounded,
              color: WrapTheme.primary,
              size: 32,
            ),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHero(
    BuildContext context,
    UserProfile profile,
    L10n l10n,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: WrapTheme.border(context)),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.black.withValues(alpha: 0.24)
                : Colors.black.withValues(alpha: 0.05),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => _pickAvatarImage(context, AppStateScope.of(context)),
            child: Container(
              width: 82,
              height: 82,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: WrapTheme.badge(context),
              ),
              child: _ProfileAvatar(profile: profile),
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.name,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  profile.email,
                  style: TextStyle(
                    fontSize: 14,
                    color: WrapTheme.mutedText(context),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildInfoPill(
                      context,
                      l10n.currentPlan,
                      profile.subscriptionPlan,
                    ),
                    _buildInfoPill(
                      context,
                      l10n.tx('상태', 'Status'),
                      l10n.subscriptionStatusLabel(profile.subscriptionStatus),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickAvatarImage(BuildContext context, AppState state) async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        imageQuality: 92,
      );
      if (picked == null) return;
      state.updateProfile(
        avatarPath: picked.path,
        avatarUrl: null,
      );
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('프로필 이미지가 변경되었습니다.')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('프로필 이미지 변경에 실패했습니다: $e')),
      );
    }
  }

  Widget _buildInfoPill(BuildContext context, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: WrapTheme.badge(context),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label · $value',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: WrapTheme.badgeText(context),
        ),
      ),
    );
  }

  Widget _buildCreditCard(
    BuildContext context,
    AppState state,
    UserProfile profile,
    L10n l10n,
  ) {
    final remaining = (profile.wrapQuota - profile.wrapUsed).clamp(0, profile.wrapQuota);
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l10n.tx('AI 생성 크레딧', 'AI Generation Credits'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: WrapTheme.mutedText(context),
                  letterSpacing: 0.8,
                ),
              ),
              TextButton(
                onPressed: () => _showBillingSheet(context, state, l10n),
                child: Text(l10n.upgradeAction),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$remaining',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              Text(
                ' / ${profile.wrapQuota}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: WrapTheme.mutedText(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          LinearProgressIndicator(
            value: profile.wrapQuota > 0 ? remaining / profile.wrapQuota : 0,
            backgroundColor: WrapTheme.border(context),
            color: WrapTheme.primary,
            minHeight: 10,
            borderRadius: BorderRadius.circular(999),
          ),
          const SizedBox(height: 12),
          Text(
            l10n.wrapUsageCount(profile.wrapUsed, profile.wrapQuota),
            style: TextStyle(
              color: WrapTheme.mutedText(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14, left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: WrapTheme.mutedText(context),
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  Widget _buildMenuTile(
    BuildContext context, {
    String? assetPath,
    IconData? iconData,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool danger = false,
  }) {
    final titleColor = danger
        ? const Color(0xFFE11D48)
        : Theme.of(context).colorScheme.onSurface;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
        leading: _buildMenuLeadingIcon(
          context,
          assetPath: assetPath,
          iconData: iconData,
          danger: danger,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 16,
            color: titleColor,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            fontSize: 13,
            color: WrapTheme.mutedText(context),
            fontWeight: FontWeight.w500,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: WrapTheme.mutedText(context),
        ),
      ),
    );
  }

  Widget _buildToggleMenuTile(
    BuildContext context, {
    String? assetPath,
    IconData? iconData,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: SwitchListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
        secondary: _buildMenuLeadingIcon(
          context,
          assetPath: assetPath,
          iconData: iconData,
          danger: false,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 16,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            fontSize: 13,
            color: WrapTheme.mutedText(context),
            fontWeight: FontWeight.w500,
          ),
        ),
        value: value,
        onChanged: onChanged,
        activeThumbColor: WrapTheme.primary,
      ),
    );
  }

  Widget _buildMenuLeadingIcon(
    BuildContext context, {
    String? assetPath,
    IconData? iconData,
    required bool danger,
  }) {
    final tint = danger
        ? const Color(0xFFE11D48)
        : _menuTintForAsset(assetPath: assetPath, iconData: iconData);
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: iconData != null
          ? Icon(
              iconData,
              size: 24,
              color: tint,
            )
          : _ProfileAssetIcon(assetPath: assetPath!, tint: tint, danger: danger),
    );
  }

  Color _menuTintForAsset({
    String? assetPath,
    IconData? iconData,
  }) {
    if (assetPath?.contains('car.svg') == true) return const Color(0xFF4F6CFB);
    if (assetPath?.contains('language.svg') == true) return const Color(0xFF20C997);
    if (assetPath?.contains('community.svg') == true) return const Color(0xFF8B7FF0);
    if (assetPath?.contains('support.svg') == true) return const Color(0xFF4F378A);
    if (assetPath?.contains('privacy.svg') == true) return const Color(0xFF4F6CFB);
    return WrapTheme.primary;
  }

  Future<void> _showLanguageSheet(
    BuildContext context,
    AppState state,
    L10n l10n,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: WrapTheme.card(context),
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: Text(l10n.tx('한국어', 'Korean')),
                onTap: () {
                  state.setLanguage('ko');
                  Navigator.of(sheetContext).pop();
                },
              ),
              ListTile(
                title: Text(l10n.tx('영어', 'English')),
                onTap: () {
                  state.setLanguage('en');
                  Navigator.of(sheetContext).pop();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showBillingSheet(
    BuildContext context,
    AppState state,
    L10n l10n,
  ) async {
    await state.initBilling();
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            Future<void> buy(String plan) async {
              final error = await state.purchasePlan(plan);
              if (!sheetContext.mounted) return;
              Navigator.of(sheetContext).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(error ?? l10n.planPurchased(plan)),
                ),
              );
            }

            Future<void> restore() async {
              final error = await state.restorePurchases();
              if (!sheetContext.mounted) return;
              Navigator.of(sheetContext).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(error ?? l10n.purchaseRestoredMsg),
                ),
              );
            }

            final plans = ['basic', 'advanced', 'pro'];
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.tx('요금제 업그레이드', 'Upgrade Plan'),
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 16),
                    ...plans.map(
                      (plan) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: WrapTheme.border(context)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    plan[0].toUpperCase() + plan.substring(1),
                                    style: const TextStyle(fontWeight: FontWeight.w800),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    l10n.planPerks(plan),
                                    style: TextStyle(color: WrapTheme.mutedText(context)),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            FilledButton(
                              onPressed: state.billingPurchasePending ? null : () => buy(plan),
                              child: Text(l10n.planPrice(plan)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: state.billingRestoreInProgress ? null : restore,
                        child: Text(
                          state.billingRestoreInProgress
                              ? l10n.restoringPurchasesAction
                              : l10n.restorePurchasesAction,
                        ),
                      ),
                    ),
                    if (state.billingError != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        state.billingError!,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _confirmDeleteAccount(
    BuildContext context,
    AppState state,
    L10n l10n,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: WrapTheme.card(context),
          title: Text(l10n.tx('계정 삭제', 'Delete Account')),
          content: Text(
            l10n.tx(
              '계정과 저장된 프로젝트/차량 데이터가 삭제됩니다. 계속할까요?',
              'Your account and saved project/vehicle data will be deleted. Continue?',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(l10n.delete),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !context.mounted) return;
    final message = await state.deleteAccount();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message ?? l10n.tx('계정이 삭제되었습니다.', 'Account deleted.'),
        ),
      ),
    );
  }

  Future<void> _showSupportSheet(BuildContext context, L10n l10n) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: WrapTheme.card(context),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.tx('고객 지원 / FAQ', 'Help Center / FAQ'),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.tx(
                    '빠른 문의는 카카오톡 1:1 채팅으로, 상세 문의는 이메일로 접수할 수 있습니다.',
                    'Use KakaoTalk 1:1 chat for quick help or email for detailed support requests.',
                  ),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: WrapTheme.mutedText(context),
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.chat_bubble_rounded, color: WrapTheme.primary),
                  title: Text(
                    l10n.tx('카카오톡 1:1 채팅', 'KakaoTalk 1:1 Chat'),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: Text(
                    l10n.tx('실시간으로 상담 채널을 엽니다', 'Open the live support channel'),
                  ),
                  trailing: const Icon(Icons.open_in_new_rounded),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _openKakaoSupportChat(context, l10n);
                  },
                ),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.mail_outline_rounded, color: WrapTheme.primary),
                  title: Text(
                    l10n.tx('문의 메일 보내기', 'Send Support Email'),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: const Text('lars@lars-technologies.com'),
                  trailing: const Icon(Icons.open_in_new_rounded),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _openSupportEmail(context, l10n);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openSupportEmail(BuildContext context, L10n l10n) async {
    final uri = Uri.parse(
      'mailto:lars@lars-technologies.com?subject=Rekora%20Wrap%20Support',
    );
    await _launchSupportUri(context, l10n, uri);
  }

  Future<void> _openKakaoSupportChat(BuildContext context, L10n l10n) async {
    final uri = Uri.parse('https://pf.kakao.com/_krxgcn/chat');
    await _launchSupportUri(context, l10n, uri);
  }

  Future<void> _launchSupportUri(
    BuildContext context,
    L10n l10n,
    Uri uri,
  ) async {
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (launched || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          l10n.tx('지원 채널을 열 수 없습니다.', 'Unable to open the support channel.'),
        ),
      ),
    );
  }

  void _openProjects(BuildContext context, AppState state) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppStateScope(
          notifier: state,
          child: const GarageScreen(),
        ),
      ),
    );
  }

}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({required this.profile});

  final UserProfile profile;

  @override
  Widget build(BuildContext context) {
    final localAvatarPath = profile.avatarPath;
    final remoteAvatarUrl = profile.avatarUrl;
    final hasLocalAvatar =
        localAvatarPath != null &&
        localAvatarPath.isNotEmpty &&
        File(localAvatarPath).existsSync();
    final hasRemoteAvatar =
        remoteAvatarUrl != null && remoteAvatarUrl.isNotEmpty;

    final child = hasLocalAvatar
        ? ClipOval(
            child: Image.file(
              File(localAvatarPath),
              width: 82,
              height: 82,
              fit: BoxFit.cover,
            ),
          )
        : hasRemoteAvatar
        ? ClipOval(
            child: Image.network(
              remoteAvatarUrl,
              width: 82,
              height: 82,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.person_rounded,
                size: 44,
                color: WrapTheme.badgeText(context),
              ),
            ),
          )
        : Icon(
            Icons.person_rounded,
            size: 44,
            color: WrapTheme.badgeText(context),
          );

    return Stack(
      fit: StackFit.expand,
      children: [
        Center(child: child),
        Positioned(
          right: 2,
          bottom: 2,
          child: Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              shape: BoxShape.circle,
              border: Border.all(color: WrapTheme.border(context)),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.edit_rounded,
              size: 13,
              color: WrapTheme.primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileAssetIcon extends StatelessWidget {
  const _ProfileAssetIcon({required this.assetPath, required this.tint, this.danger = false});

  final String assetPath;
  final Color tint;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      assetPath,
      width: 24,
      height: 24,
      colorFilter: ColorFilter.mode(
        danger ? const Color(0xFFE11D48) : tint,
        BlendMode.srcIn,
      ),
    );
  }
}

class _StudioGridPainter extends CustomPainter {
  final Color dotColor;
  _StudioGridPainter({required this.dotColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = dotColor;
    for (double x = 0; x < size.width; x += 32) {
      for (double y = 0; y < size.height; y += 32) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
