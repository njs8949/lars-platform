import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../theme.dart';

Future<void> showAppUsageGuideSheet(
  BuildContext context, {
  required AppState state,
  bool fromStartup = false,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => AppStateScope(
      notifier: state,
      child: _AppUsageGuideSheet(fromStartup: fromStartup),
    ),
  );
}

class _AppUsageGuideSheet extends StatefulWidget {
  const _AppUsageGuideSheet({required this.fromStartup});

  final bool fromStartup;

  @override
  State<_AppUsageGuideSheet> createState() => _AppUsageGuideSheetState();
}

class _AppUsageGuideSheetState extends State<_AppUsageGuideSheet> {
  final PageController _pageController = PageController();
  int _page = 0;
  bool _showOnStartup = true;
  bool _hydratedPrefs = false;
  bool _didPersistOnExit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_hydratedPrefs) return;
    _showOnStartup = AppStateScope.of(context).profile.showUsageGuideOnStartup;
    _hydratedPrefs = true;
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    final pages = _guidePages(l10n);
    final isLast = _page == pages.length - 1;

    return PopScope(
      onPopInvokedWithResult: (didPop, result) => _persistGuidePrefs(),
      child: SafeArea(
        child: FractionallySizedBox(
          heightFactor: 0.92,
          child: Container(
            decoration: BoxDecoration(
              color: WrapTheme.card(context),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            ),
            child: Column(
              children: [
              const SizedBox(height: 12),
              Container(
                width: 48,
                height: 5,
                decoration: BoxDecoration(
                  color: WrapTheme.border(context),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.tx('사용자 매뉴얼', 'User Manual'),
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            l10n.tx(
                              '처음 설치했을 때도, 다시 실행했을 때도 바로 따라할 수 있도록 핵심 흐름을 정리했습니다.',
                              'A step-by-step manual for first installs and later relaunches.',
                            ),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: WrapTheme.mutedText(context),
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () {
                        _persistGuidePrefs();
                        Navigator.of(context).pop();
                      },
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: pages.length,
                  onPageChanged: (value) => setState(() => _page = value),
                  itemBuilder: (context, index) {
                    final page = pages[index];
                    return SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: WrapTheme.background(context),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: WrapTheme.border(context)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(page.icon, color: WrapTheme.primary, size: 30),
                                const SizedBox(height: 16),
                                Text(
                                  page.title,
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    color: Theme.of(context).colorScheme.onSurface,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  page.summary,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: WrapTheme.mutedText(context),
                                    height: 1.45,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                          ...page.steps.asMap().entries.map((entry) {
                            final stepIndex = entry.key + 1;
                            final step = entry.value;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: WrapTheme.background(context),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: WrapTheme.border(context)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    decoration: BoxDecoration(
                                      color: WrapTheme.primary,
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '$stepIndex',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      step,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Theme.of(context).colorScheme.onSurface,
                                        height: 1.45,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    pages.length,
                    (index) => AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: _page == index ? 20 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _page == index
                            ? WrapTheme.primary
                            : WrapTheme.border(context),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
                child: Column(
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _showOnStartup,
                      onChanged: (value) => setState(() => _showOnStartup = value),
                      title: Text(
                        l10n.tx('앱 실행 시 사용자 매뉴얼 보기', 'Show user manual when app opens'),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (_page > 0)
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                _pageController.previousPage(
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOut,
                                );
                              },
                              child: Text(l10n.tx('이전', 'Back')),
                            ),
                          ),
                        if (_page > 0) const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: () async {
                              if (!isLast) {
                                await _pageController.nextPage(
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOut,
                                );
                                return;
                              }
                              _persistGuidePrefs();
                              if (!mounted) return;
                              Navigator.of(context).pop();
                            },
                            child: Text(
                              isLast
                                  ? l10n.tx('가이드 완료', 'Finish Guide')
                                  : l10n.next,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (widget.fromStartup)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: TextButton(
                          onPressed: () {
                            _showOnStartup = false;
                            _persistGuidePrefs();
                            Navigator.of(context).pop();
                          },
                          child: Text(
                            l10n.tx('다시 보지 않기', 'Do not show again'),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
            ),
          ),
        ),
      ),
    );
  }

  void _persistGuidePrefs() {
    if (_didPersistOnExit || !_hydratedPrefs || !mounted) return;
    _didPersistOnExit = true;
    AppStateScope.of(context).updateUsageGuidePrefs(
      hasSeenUsageGuide: true,
      showUsageGuideOnStartup: _showOnStartup,
    );
  }

  List<_GuidePage> _guidePages(L10n l10n) {
    return [
      _GuidePage(
        icon: Icons.home_rounded,
        title: l10n.tx('홈에서 시작', 'Start from Home'),
        summary: l10n.tx(
          '홈 화면은 추천 스타일, AI 컬러 큐레이터, 빠른 진입 버튼이 모여 있는 시작 지점입니다.',
          'Home is your starting point for recommendations, the AI color curator, and quick actions.',
        ),
        steps: [
          l10n.tx('상단 메인 배너에서 바로 `마이 개러지 시작` 또는 주요 메뉴로 진입할 수 있습니다.', 'Use the hero banner to jump into My Garage or other main flows.'),
          l10n.tx('추천 스타일 카드는 실제 필름을 기준으로 구성되며, 탭하면 AI 랩핑으로 바로 이어집니다.', 'Recommendation cards are based on actual films and can open AI Wrapping directly.'),
          l10n.tx('`나에게 맞는 컬러를 AI가 분석해드려요`를 누르면 큐레이터 방식으로 필름 추천을 받을 수 있습니다.', 'Tap the AI color curator banner for a curator-style film recommendation flow.'),
        ],
      ),
      _GuidePage(
        icon: Icons.directions_car_filled_rounded,
        title: l10n.tx('차량 등록과 개러지', 'Vehicle Registration & Garage'),
        summary: l10n.tx(
          '차량을 등록하면 이후 AI 랩핑, 디자인 추천, 프로젝트 관리 흐름이 모두 개러지 중심으로 연결됩니다.',
          'Registering a vehicle connects AI wrapping, recommendations, and project management around your garage.',
        ),
        steps: [
          l10n.tx('`마이 개러지 시작` 또는 `마이 개러지` 메뉴에서 차량 사진, 차급, 모델명, 별명을 등록합니다.', 'Register a vehicle photo, category, model, and nickname from My Garage.'),
          l10n.tx('등록된 차량은 개러지 카드 상단에 실제 사진으로 표시되고, `랩핑 시작` 버튼으로 바로 AI 랩핑으로 이동할 수 있습니다.', 'Saved vehicles show their actual photo and can jump into AI Wrapping with the Start button.'),
          l10n.tx('개러지의 `AI 추천`은 차량 성격과 사용 맥락을 묻는 전문 큐레이터형 추천으로 동작합니다.', 'Garage AI Recommendations use a curator-style flow based on your vehicle context and taste.'),
        ],
      ),
      _GuidePage(
        icon: Icons.auto_awesome_rounded,
        title: l10n.tx('AI 랩핑 적용', 'AI Wrap Application'),
        summary: l10n.tx(
          'AI 랩핑 화면에서 차량 사진을 올리고, 컬러칩 또는 디자인 허브의 필름 색을 적용한 뒤 결과를 저장합니다.',
          'On the AI Wrapping screen, upload a vehicle photo, apply a film color from a color chip or Design Hub, and save the result.',
        ),
        steps: [
          l10n.tx('차량 사진을 업로드한 뒤 컬러칩을 스캔하거나 디자인 허브에서 필름을 고릅니다.', 'Upload a vehicle photo, then scan a color chip or pick a film from Design Hub.'),
          l10n.tx('컬러칩을 스캔하면 "비슷한 색상 필름" 목록이 나타나며, 아주 가까운 필름이 있으면 그 필름 색으로 맞춰집니다.', 'After a chip scan, "Similar films" lists the closest films. If one is a very close match, its color is used.'),
          l10n.tx('고급 설정에서 랩핑 방식(전체 랩핑, 기존 포인트 유지)과 크롬 딜리트 포함 여부를 정합니다.', 'In Advanced settings, choose the wrap method (Full Wrap or Keep Existing Accents) and whether to include chrome delete.'),
          l10n.tx('적용하기를 누르면 결과 색은 선택한 필름 색에 맞춰 보정됩니다. 생성이 끝날 때마다 AI 생성 크레딧이 1회 차감됩니다.', 'Tap Apply AI Wrap. The result color is corrected to the selected film color. Each completed generation uses one AI generation credit.'),
          l10n.tx('미리보기 왼쪽 하단에서 환경 설정(날씨, 시간대, 배경), 돋보기(세부 확대), 3D(AR 보기)를 사용할 수 있습니다.', 'Use the buttons at the bottom left of the preview: environment settings (weather, time, background), zoom for details, and 3D for AR view.'),
        ],
      ),
      _GuidePage(
        icon: Icons.palette_rounded,
        title: l10n.tx('디자인 허브 활용', 'Using Design Hub'),
        summary: l10n.tx(
          '디자인 허브는 제조사별 필름과 실제 재질감을 탐색하고 AI 랩핑으로 넘기는 필름 카탈로그입니다.',
          'Design Hub is the film catalog where you explore brands, finishes, and textures before sending them to AI Wrapping.',
        ),
        steps: [
          l10n.tx('제조사, 재질, 컬러 계열 필터로 실제 필름을 빠르게 좁힐 수 있습니다.', 'Use brand, finish, and color-family filters to narrow down actual films quickly.'),
          l10n.tx('필름 카드를 누르면 현재 차량 또는 AI 랩핑 화면으로 선택 정보가 그대로 전달됩니다.', 'Selecting a film sends that exact choice into your current vehicle or the AI Wrapping flow.'),
          l10n.tx('추천 스타일과 인스피레이션 카드는 실 필름 기반이므로 바로 비교 시뮬레이션에 활용하면 됩니다.', 'Recommendation and inspiration cards are based on real film data, so they can be used directly for comparison.'),
        ],
      ),
      _GuidePage(
        icon: Icons.support_agent_rounded,
        title: l10n.tx('저장, 지원, 다시 보기', 'Save, Support, and Revisit'),
        summary: l10n.tx(
          '생성 결과를 저장하고, 가이드를 다시 열고, 고객 지원 채널로 이동하는 경로까지 한곳에서 확인할 수 있습니다.',
          'This is where you save results, reopen the guide, and reach support channels.',
        ),
        steps: [
          l10n.tx('AI 랩핑 결과는 필름명과 워터마크가 포함된 상태로 갤러리에 저장됩니다. 프로필의 AI 생성 크레딧에서 남은 횟수를 확인할 수 있습니다.', 'AI wrap results are saved to the gallery with film name and watermark. Check your remaining AI generation credits on your profile.'),
          l10n.tx('더보기 메뉴의 `사용자 매뉴얼`에서 이 설명을 언제든 다시 열 수 있습니다.', 'You can reopen this guide anytime from More > User Manual.'),
          l10n.tx('고객 지원 / FAQ에서는 카카오톡 1:1 채팅과 문의 메일을 바로 열 수 있습니다.', 'Help Center / FAQ lets you open KakaoTalk 1:1 chat or support email directly.'),
        ],
      ),
    ];
  }
}

class _GuidePage {
  const _GuidePage({
    required this.icon,
    required this.title,
    required this.summary,
    required this.steps,
  });

  final IconData icon;
  final String title;
  final String summary;
  final List<String> steps;
}
