import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';
import 'notifications_screen.dart';
import 'garage_add_vehicle_screen.dart';
import 'project_detail_screen.dart';
import 'lars_ai_color_recommendation_chat.dart';

String _localizedRecommendationLabel(String value, String languageCode) {
  if (languageCode != 'en') return value;
  switch (value.toLowerCase()) {
    case 'signature':
      return 'Signature';
    case 'trend':
      return 'Trend';
    case 'colorflow':
      return 'ColorFlow';
    case 'satin':
      return 'Satin';
    case 'matte':
      return 'Matte';
    case 'gloss':
      return 'Gloss';
    case 'metallic':
      return 'Metallic';
    case 'carbon':
      return 'Carbon';
    case 'dechrome':
      return 'Dechrome';
    case 'forest':
      return 'Forest';
    case 'point':
      return 'Accent';
    case 'ev':
      return 'EV';
    case 'pearl':
      return 'Pearl';
    case 'flip':
      return 'Flip';
    case 'coupe':
      return 'Coupe';
    default:
      return value;
  }
}

String _homeHeroAdAsset(BuildContext context) {
  return 'assets/branding/home_ai_wrap.png';
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.onSelectTab});

  final ValueChanged<int> onSelectTab;

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final projects = state.projects;
    final latest = projects.isNotEmpty ? projects.first : null;
    final l10n = L10n.of(context);

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(painter: _StudioGridPainter(dotColor: WrapTheme.border(context))),
          ),

          SafeArea(
            bottom: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: RepaintBoundary(
                child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RepaintBoundary(child: _buildNewHeader(context)),
                  const SizedBox(height: 12),

                  // Hero Banner
                  RepaintBoundary(child: _buildHeroBanner(context, latest)),
                  const SizedBox(height: 32),

                  RepaintBoundary(
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildCategoryCard(
                            l10n.tx('AI 랩핑 시작', 'Start AI Wrapping'),
                            l10n.tx('지능형 비주얼라이저', 'Smart visualizer'),
                            Icons.auto_awesome_outlined,
                            () => onSelectTab(2),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildCategoryCard(
                            l10n.tx('디자인 추천 받기', 'Get Design Ideas'),
                            l10n.tx('맞춤형 스타일 제안', 'Tailored style suggestions'),
                            Icons.style_outlined,
                            () => onSelectTab(3),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Active Projects Section (iOS와 동일)
                  if (projects.isNotEmpty)
                    RepaintBoundary(
                      child: _ActiveProjects(
                        projects: projects.take(3).toList(),
                        onOpen: (projectId) {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => AppStateScope(
                                notifier: state,
                                child: ProjectDetailScreen(projectId: projectId),
                              ),
                            ),
                          );
                        },
                        onDelete: (projectId) {
                          // 프로젝트 삭제 기능 (필요시 구현)
                        },
                        l10n: l10n,
                      ),
                    ),
                  const SizedBox(height: 40),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.sectionRecommendations,
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface),
                      ),
                      TextButton(
                        onPressed: () => onSelectTab(3),
                        child: Text('${l10n.viewAll} >', style: const TextStyle(color: Color(0xFF4F378A), fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  RepaintBoundary(child: _buildRecommendationScroll(context, state)),
                  const SizedBox(height: 32),

                  RepaintBoundary(child: _buildAIAssistantBanner(context, l10n, state)),
                  const SizedBox(height: 100),
                ],
              ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNewHeader(BuildContext context) {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 32), // Placeholder to keep title centered if needed
          Text(
            'REKORA',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -1.8, color: Theme.of(context).colorScheme.onSurface),
          ),
          IconButton(
            icon: Icon(Icons.notifications_none_rounded, color: WrapTheme.primary, size: 32),
            onPressed: () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHeroBanner(BuildContext context, VehicleProject? latest) {
    final heroAdAsset = _homeHeroAdAsset(context);

    return Container(
      width: double.infinity,
      height: 380,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(44),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 30, offset: const Offset(0, 10)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(44),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              decoration: BoxDecoration(
                gradient: LinearRefresh.heroGradient(),
              ),
            ),
            Positioned.fill(
              child: Opacity(
                opacity: 0.9,
                child: Image.asset(
                  heroAdAsset,
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                  cacheWidth: 1200,
                  filterQuality: FilterQuality.medium,
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Colors.black.withValues(alpha: 0.34),
                    Colors.black.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    L10n.of(context).tx('AI로 내 차량을\n미리 확인하세요', 'Preview your vehicle\nwith AI'),
                    style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, height: 1.2),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    L10n.of(context).tx('사진 한 장으로 맞춤 랩핑 시뮬레이션', 'Custom wrap simulation from one photo'),
                    style: TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      if (latest != null) {
                        _openProject(context, latest.id);
                      } else {
                        _openGarageAddVehicle(context);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F378A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    ),
                    child: Text(latest != null ? '${L10n.of(context).heroContinue} →' : '${L10n.of(context).heroStart} →', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationScroll(BuildContext context, AppState state) {
    final recommendations = state.recommendations;
    final l10n = L10n.of(context);
    if (recommendations.isEmpty) return SizedBox(height: 100, child: Center(child: Text(L10n.of(context).tx('추천 데이터가 없습니다.', 'No recommendation data.'))));
    
    return SizedBox(
      height: 320,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: recommendations.length,
        itemBuilder: (context, index) {
          final item = recommendations[index];
          final wrap = state.wraps.firstWhere((w) => w.id == item.wrapId, orElse: () => state.wraps.first);
          
          return GestureDetector(
            onTap: () {
              state.setPendingWrap(wrap);
              onSelectTab(2);
            },
            child: Container(
              width: 240,
              margin: const EdgeInsets.only(right: 20),
              decoration: BoxDecoration(
                color: WrapTheme.card(context),
                borderRadius: BorderRadius.circular(32),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: Theme.of(context).brightness == Brightness.dark ? 0.18 : 0.04), blurRadius: 20, offset: const Offset(0, 10))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (wrap.referenceAssetPath != null)
                            Image.asset(
                              wrap.referenceAssetPath!,
                              fit: BoxFit.cover,
                              cacheWidth: 640,
                              filterQuality: FilterQuality.medium,
                              errorBuilder: (context, error, stackTrace) => _buildFallbackFilmTexture(wrap),
                            )
                          else
                            _buildFallbackFilmTexture(wrap),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.08),
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: 0.22),
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            left: 16,
                            right: 16,
                            bottom: 14,
                            child: Row(
                              children: [
                                Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: wrap.swatch,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 1.5),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${wrap.brand} · ${wrap.finish}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
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
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 32,
                          child: Align(
                            alignment: Alignment.topLeft,
                            child: Text(
                              l10n.code == 'en'
                                  ? (item.titleEn ?? item.title)
                                  : (item.titleKo ?? item.title),
                              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Theme.of(context).colorScheme.onSurface),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          height: 56,
                          child: Align(
                            alignment: Alignment.topLeft,
                            child: Text(
                              l10n.code == 'en'
                                  ? (item.subtitleEn ?? item.subtitle)
                                  : (item.subtitleKo ?? item.subtitle),
                              style: TextStyle(color: WrapTheme.mutedText(context), fontSize: 13, fontWeight: FontWeight.w500),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _localizedCategoryChip(context, l10n, item.category),
                            ...item.tags.take(3).map(
                              (tag) => _localizedTagChip(context, l10n, tag),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFallbackFilmTexture(WrapColor wrap) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            wrap.swatch.withValues(alpha: 0.96),
            wrap.swatch.withValues(alpha: 0.72),
            Colors.black.withValues(alpha: 0.18),
          ],
        ),
      ),
      child: CustomPaint(
        painter: FilmTexturePainter(baseColor: wrap.swatch),
      ),
    );
  }

  Widget _buildAIAssistantBanner(BuildContext context, L10n l10n, AppState state) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => AppStateScope(
              notifier: state,
              child: const LARSAIColorRecommendationChat(),
            ),
          ),
        );
      },
      child: Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.tx('• 스마트 AI 어시스턴트', '• SMART AI ASSISTANT'), style: const TextStyle(color: Color(0xFF4F378A), fontWeight: FontWeight.w900, fontSize: 11)),
                const SizedBox(height: 4),
                Text(l10n.tx('나에게 맞는 컬러를\nAI가 분석해드려요', 'AI analyzes the best\ncolors for you'), style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 12),
                Text('${l10n.tx('분석 시작하기', 'Start Analysis')} →', style: const TextStyle(color: Color(0xFF4F378A), fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const Icon(Icons.auto_fix_high_rounded, color: Color(0xFF4F378A), size: 48),
        ],
      ),
    ));
  }

  Widget _localizedCategoryChip(BuildContext context, L10n l10n, String category) {
    final text = _localizedRecommendationLabel(category, l10n.code);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF4F378A).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Color(0xFF4F378A),
        ),
      ),
    );
  }

  Widget _localizedTagChip(BuildContext context, L10n l10n, String tag) {
    final text = _localizedRecommendationLabel(tag, l10n.code);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? Colors.white.withValues(alpha: 0.08)
            : const Color(0xFFF0F2F8),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: Theme.of(context).brightness == Brightness.dark
              ? Colors.white.withValues(alpha: 0.09)
              : WrapTheme.border(context),
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: WrapTheme.mutedText(context),
        ),
      ),
    );
  }

  Future<void> _showAiPreferenceAssistant(
    BuildContext context,
    AppState state,
    L10n l10n,
  ) async {
    final questions = <_PreferenceQuestion>[
      _PreferenceQuestion(
        prompt: l10n.tx('차량의 첫인상을 어떤 방향으로 바꾸고 싶으신가요?', 'How do you want the vehicle’s first impression to change?'),
        options: [
          _PreferenceOption(id: 'stealth', label: l10n.tx('묵직하고 절제된 분위기', 'Restrained and stealthy')),
          _PreferenceOption(id: 'premium', label: l10n.tx('고급스럽고 세련된 분위기', 'Premium and refined')),
          _PreferenceOption(id: 'sport', label: l10n.tx('스포티하고 존재감 있게', 'Sporty and assertive')),
          _PreferenceOption(id: 'trend', label: l10n.tx('트렌디하고 시선을 끌게', 'Trendy and eye-catching')),
        ],
      ),
      _PreferenceQuestion(
        prompt: l10n.tx('표면 질감은 어떤 쪽이 취향에 가깝나요?', 'Which surface finish feels most like your taste?'),
        options: [
          _PreferenceOption(id: 'satin', label: l10n.tx('빛이 은은하게 흐르는 새틴', 'Soft-flow satin')),
          _PreferenceOption(id: 'matte', label: l10n.tx('차분한 질감의 매트', 'Calm matte texture')),
          _PreferenceOption(id: 'gloss', label: l10n.tx('선명하고 반짝이는 글로스', 'Crisp reflective gloss')),
          _PreferenceOption(id: 'metallic', label: l10n.tx('입체감 있는 메탈릭', 'Dimensional metallic')),
        ],
      ),
      _PreferenceQuestion(
        prompt: l10n.tx('차량이 가장 자주 놓이는 라이프스타일은 어느 쪽인가요?', 'Which lifestyle context best matches how the car is used?'),
        options: [
          _PreferenceOption(id: 'daily', label: l10n.tx('데일리 / 출퇴근', 'Daily / commuting')),
          _PreferenceOption(id: 'family', label: l10n.tx('패밀리 / SUV', 'Family / SUV')),
          _PreferenceOption(id: 'showcar', label: l10n.tx('쇼카 / 특별한 존재감', 'Show car / presence')),
          _PreferenceOption(id: 'ev', label: l10n.tx('전기차 / 미래지향', 'EV / futuristic')),
        ],
      ),
      _PreferenceQuestion(
        prompt: l10n.tx('전문가 입장에서 추천 강도는 어느 정도가 좋을까요?', 'How bold should the curator recommendation be?'),
        options: [
          _PreferenceOption(id: 'safe', label: l10n.tx('실패 없는 안정적인 방향', 'Safe and versatile')),
          _PreferenceOption(id: 'balanced', label: l10n.tx('개성과 실용성의 균형', 'Balanced character')),
          _PreferenceOption(id: 'bold', label: l10n.tx('확실히 눈에 띄는 방향', 'Clearly bold')),
        ],
      ),
    ];

    final answers = <String>[];
    final result = await showModalBottomSheet<WrapColor>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      builder: (sheetContext) {
        var step = 0;
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            if (step < questions.length) {
              final question = questions[step];
              return SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.tx('AI 취향 분석', 'AI Preference Analysis'),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.tx('질문 ${step + 1}/${questions.length}', 'Question ${step + 1}/${questions.length}'),
                        style: TextStyle(color: WrapTheme.mutedText(context)),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        question.prompt,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 18),
                      ...question.options.map(
                        (option) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () {
                              answers.add(option.id);
                              setSheetState(() => step += 1);
                            },
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                              alignment: Alignment.centerLeft,
                              side: BorderSide(color: WrapTheme.border(context)),
                            ),
                            child: Text(option.label),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            final recommendations = _recommendFilmsForAnswers(state, answers);
            final curatorSummary = _buildCuratorSummary(l10n, answers);
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.tx('AI 컬러 큐레이터 추천', 'AI Color Curator Picks'),
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: WrapTheme.background(context),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: WrapTheme.border(context)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.tx('큐레이터 노트', 'Curator Note'),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: WrapTheme.primary,
                              letterSpacing: 0.3,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            curatorSummary,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...recommendations.map(
                      (pick) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: WrapTheme.background(context),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: WrapTheme.border(context)),
                        ),
                        child: ListTile(
                          leading: Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: pick.wrap.swatch,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 1.2),
                            ),
                          ),
                          title: Text(pick.wrap.displayName),
                          subtitle: Text(
                            '${pick.wrap.finish} • ${pick.wrap.hexCode}\n${l10n.code == 'en' ? pick.reasonEn : pick.reasonKo}',
                          ),
                          isThreeLine: true,
                          trailing: FilledButton(
                            onPressed: () => Navigator.of(sheetContext).pop(pick.wrap),
                            child: Text(l10n.apply),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result == null || !context.mounted) return;
    state.setPendingWrap(result);
    onSelectTab(2);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.wrapAppliedToAi(result.displayName))),
    );
  }

  List<_CuratedWrapPick> _recommendFilmsForAnswers(AppState state, List<String> answers) {
    final catalog = [...state.wraps, ...state.colorPpfWraps];
    final mood = answers.isNotEmpty ? answers[0] : 'premium';
    final finish = answers.length > 1 ? answers[1] : 'satin';
    final usage = answers.length > 2 ? answers[2] : 'daily';
    final intensity = answers.length > 3 ? answers[3] : 'balanced';

    int scoreWrap(WrapColor wrap) {
      var score = 0;
      final wrapFinish = wrap.finish.toLowerCase();
      final hsl = HSLColor.fromColor(wrap.swatch);
      final name = wrap.displayName.toLowerCase();

      if (wrapFinish.contains(finish)) score += 40;
      if (finish == 'metallic' && name.contains('metal')) score += 20;
      if (finish == 'matte' && name.contains('matte')) score += 20;
      if (finish == 'satin' && name.contains('satin')) score += 20;
      if (finish == 'gloss' && name.contains('gloss')) score += 20;

      switch (mood) {
        case 'stealth':
          if (hsl.lightness < 0.34) score += 32;
          if (name.contains('black') || name.contains('graphite') || name.contains('gray')) score += 18;
          break;
        case 'premium':
          if (hsl.saturation < 0.30) score += 18;
          if (name.contains('silver') || name.contains('gray') || name.contains('white') || name.contains('pearl')) score += 26;
          break;
        case 'sport':
          if (hsl.saturation > 0.45) score += 18;
          if (name.contains('red') || name.contains('blue') || name.contains('orange')) score += 28;
          break;
        case 'trend':
          if (name.contains('aurora') || name.contains('colorflow') || name.contains('purple') || name.contains('forest')) score += 34;
          if (hsl.saturation > 0.38) score += 16;
          break;
      }

      switch (usage) {
        case 'daily':
          if (name.contains('gray') || name.contains('silver') || name.contains('graphite')) score += 18;
          break;
        case 'family':
          if (name.contains('green') || name.contains('stone') || name.contains('beige') || name.contains('white')) score += 18;
          break;
        case 'showcar':
          if (name.contains('chrome') || name.contains('colorflow') || name.contains('aurora') || name.contains('magenta')) score += 30;
          break;
        case 'ev':
          if (name.contains('silver') || name.contains('aqua') || name.contains('forest') || name.contains('moonlight')) score += 24;
          break;
      }

      switch (intensity) {
        case 'safe':
          if (hsl.saturation < 0.42) score += 18;
          if (name.contains('gray') || name.contains('silver') || name.contains('white') || name.contains('black')) score += 18;
          break;
        case 'balanced':
          if (hsl.saturation >= 0.25 && hsl.saturation <= 0.58) score += 14;
          break;
        case 'bold':
          if (hsl.saturation > 0.5) score += 22;
          if (name.contains('colorflow') || name.contains('chrome') || name.contains('aurora') || name.contains('purple')) score += 20;
          break;
      }

      if (wrap.referenceAssetPath != null) score += 6;
      return score;
    }

    final sorted = [...catalog]..sort((a, b) => scoreWrap(b).compareTo(scoreWrap(a)));
    final unique = <String>{};
    final result = <_CuratedWrapPick>[];
    for (final wrap in sorted) {
      final key = '${wrap.brand}-${wrap.name}-${wrap.finish}';
      if (unique.add(key)) {
        result.add(
          _CuratedWrapPick(
            wrap: wrap,
            reasonKo: _buildCuratorReasonKo(wrap, mood, usage, intensity),
            reasonEn: _buildCuratorReasonEn(wrap, mood, usage, intensity),
          ),
        );
      }
      if (result.length == 3) break;
    }
    return result;
  }

  String _buildCuratorSummary(L10n l10n, List<String> answers) {
    final mood = answers.isNotEmpty ? answers[0] : 'premium';
    final finish = answers.length > 1 ? answers[1] : 'satin';
    final usage = answers.length > 2 ? answers[2] : 'daily';
    final intensity = answers.length > 3 ? answers[3] : 'balanced';

    if (l10n.code == 'en') {
      return 'The curator read your preference as ${_curatorMoodLabel(mood, false)}, '
          'with a ${_curatorFinishLabel(finish, false)} finish and a ${_curatorUsageLabel(usage, false)} use pattern. '
          'The shortlist leans ${_curatorIntensityLabel(intensity, false)} so the result feels intentional on the road, not random.';
    }
    return '큐레이터는 취향을 ${_curatorMoodLabel(mood, true)} 방향으로 읽었고, '
        '${_curatorFinishLabel(finish, true)} 질감과 ${_curatorUsageLabel(usage, true)} 사용 맥락을 기준으로 필름을 골랐습니다. '
        '${_curatorIntensityLabel(intensity, true)} 추천 강도로 정리해 실제 주행 환경에서도 어색하지 않게 맞췄습니다.';
  }

  String _buildCuratorReasonKo(
    WrapColor wrap,
    String mood,
    String usage,
    String intensity,
  ) {
    final finish = wrap.finish;
    final intensityLabel = _curatorIntensityLabel(intensity, true);
    return '${wrap.brand}의 $finish 질감이 ${_curatorMoodLabel(mood, true)} 방향과 잘 맞고, '
        '${_curatorUsageLabel(usage, true)} 환경에서 ${intensityLabel.replaceFirst('추천', '')} 존재감을 내기 좋습니다.';
  }

  String _buildCuratorReasonEn(
    WrapColor wrap,
    String mood,
    String usage,
    String intensity,
  ) {
    final finish = wrap.finish;
    final intensityLabel = _curatorIntensityLabel(intensity, false);
    return 'The ${finish.toLowerCase()} finish from ${wrap.brand} supports a ${_curatorMoodLabel(mood, false)} direction and fits a ${_curatorUsageLabel(usage, false)} context with a ${intensityLabel.toLowerCase()} recommendation level.';
  }

  String _curatorMoodLabel(String mood, bool ko) {
    switch (mood) {
      case 'stealth':
        return ko ? '절제되고 묵직한' : 'restrained, stealthy';
      case 'sport':
        return ko ? '스포티하고 공격적인' : 'sporty, assertive';
      case 'trend':
        return ko ? '트렌디하고 시선을 끄는' : 'trendy, attention-grabbing';
      case 'premium':
      default:
        return ko ? '고급스럽고 세련된' : 'premium, refined';
    }
  }

  String _curatorFinishLabel(String finish, bool ko) {
    switch (finish) {
      case 'matte':
        return ko ? '매트한' : 'matte';
      case 'gloss':
        return ko ? '선명한 글로스' : 'glossy';
      case 'metallic':
        return ko ? '입체감 있는 메탈릭' : 'metallic';
      case 'satin':
      default:
        return ko ? '은은한 새틴' : 'satin';
    }
  }

  String _curatorUsageLabel(String usage, bool ko) {
    switch (usage) {
      case 'family':
        return ko ? '패밀리/SUV' : 'family or SUV';
      case 'showcar':
        return ko ? '쇼카/전시' : 'show-car';
      case 'ev':
        return ko ? '전기차/미래지향' : 'EV-oriented';
      case 'daily':
      default:
        return ko ? '데일리 주행' : 'daily-driving';
    }
  }

  String _curatorIntensityLabel(String intensity, bool ko) {
    switch (intensity) {
      case 'safe':
        return ko ? '안정적인 추천' : 'safe';
      case 'bold':
        return ko ? '강한 추천' : 'bold';
      case 'balanced':
      default:
        return ko ? '균형 잡힌 추천' : 'balanced';
    }
  }

  void _openProject(BuildContext context, String projectId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppStateScope(
          notifier: AppStateScope.of(context),
          child: ProjectDetailScreen(projectId: projectId),
        ),
      ),
    );
  }

  void _openGarageAddVehicle(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppStateScope(
          notifier: AppStateScope.of(context),
          child: const GarageAddVehicleScreen(),
        ),
      ),
    );
  }

  Widget _buildCategoryCard(String title, String sub, IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFF4F378A), size: 28),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF1D1B20))),
            const SizedBox(height: 4),
            Text(sub, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class LinearRefresh {
  static LinearGradient heroGradient() => LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [
      const Color(0xFF1D1B20).withOpacity(0.8),
      Colors.transparent,
    ],
  );
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

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.l10n});

  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Rekora Wrap',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              l10n.heroSub,
              style: TextStyle(color: WrapTheme.mutedText(context)),
            ),
          ],
        ),
        const Spacer(),
        IconButton(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            );
          },
          icon: const Icon(Icons.notifications_none),
          tooltip: l10n.notificationsTooltip,
        ),
      ],
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    this.latestProject,
    required this.onStart,
    this.onContinue,
    required this.l10n,
  });

  final VehicleProject? latestProject;
  final VoidCallback onStart;
  final VoidCallback? onContinue;
  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    final hasProject = latestProject != null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0B162E), Color(0xFF1A2C57)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            hasProject ? l10n.heroContinue : l10n.heroNewHere,
            style: const TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 8),
          Text(
            hasProject ? latestProject!.vehicleName : l10n.heroPrimary,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: hasProject ? onContinue : onStart,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                  ),
                  child: Text(hasProject ? l10n.heroOpen : l10n.heroStart),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({
    required this.onSelectTab,
    required this.l10n,
    required this.isWide,
  });
  final ValueChanged<int> onSelectTab;
  final L10n l10n;
  final bool isWide;

  @override
  Widget build(BuildContext context) {
    final cards = [
      _ActionCard(
        title: l10n.quickAiTitle,
        subtitle: l10n.quickAiDesc,
        icon: Icons.auto_awesome,
        image: 'assets/icons/wrap_clay/08_3d_preview.png',
        onTap: () => onSelectTab(2),
      ),
      _ActionCard(
        title: l10n.quickDesignTitle,
        subtitle: l10n.quickDesignDesc,
        image: 'assets/icons/wrap_clay/04_color_picker.png',
        glow: WrapTheme.primaryContainer,
        onTap: () => onSelectTab(3),
      ),
    ];

    if (isWide) {
      return Wrap(
        spacing: 12,
        runSpacing: 12,
        children: cards
            .map((card) => SizedBox(width: 280, child: card))
            .toList(),
      );
    }

    return Row(
      children: [
        Expanded(child: cards[0]),
        const SizedBox(width: 12),
        Expanded(child: cards[1]),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.title,
    required this.subtitle,
    this.icon,
    this.image,
    required this.onTap,
    this.glow,
  });

  final String title;
  final String subtitle;
  final IconData? icon;
  final String? image;
  final Color? glow;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = glow ?? WrapTheme.primary;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? Colors.white : const Color(0xFF1F2430);
    final subtitleColor =
        isDark ? Colors.white.withOpacity(0.72) : WrapTheme.mutedText(context);
    return _GlassCard(
      glow: accent,
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (image != null)
            SizedBox(
              height: 64,
              child: Image.asset(image!),
            )
          else if (icon != null)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: accent.withOpacity(0.16),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: accent),
            ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(fontWeight: FontWeight.w800, color: titleColor),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              color: subtitleColor,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveProjects extends StatelessWidget {
  const _ActiveProjects({
    required this.projects,
    required this.onOpen,
    required this.onDelete,
    required this.l10n,
  });

  final List<VehicleProject> projects;
  final ValueChanged<String> onOpen;
  final ValueChanged<String> onDelete;
  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = L10n.of(context);
    final primaryText = isDark ? Colors.white : const Color(0xFF1F2430);
    final mutedText =
        isDark ? Colors.white.withOpacity(0.72) : WrapTheme.mutedText(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              l10n.sectionInProgress,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            if (projects.isNotEmpty)
              TextButton(
                onPressed: () => onOpen(projects.first.id),
                child: Text(l10n.viewAll),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (projects.isEmpty)
          _GlassCard(
            padding: const EdgeInsets.all(16),
            child: Text(
              l10n.emptyProjects,
              style: TextStyle(color: primaryText, fontWeight: FontWeight.w700),
            ),
          )
        else
          Column(
            children: projects
                .map(
                  (project) => _ProjectTile(
                    project: project,
                    onTap: () => onOpen(project.id),
                    onDelete: () => onDelete(project.id),
                    l10n: l10n,
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}

class _ProjectTile extends StatelessWidget {
  const _ProjectTile({
    required this.project,
    required this.onTap,
    required this.onDelete,
    required this.l10n,
  });
  final VehicleProject project;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    final l10n = this.l10n;
    final progress = project.progress;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryText = isDark ? Colors.white : const Color(0xFF1F2430);
    final mutedText =
        isDark ? Colors.white.withOpacity(0.72) : WrapTheme.mutedText(context);
    return _GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                project.vehicleName,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: primaryText,
                ),
              ),
              const Spacer(),
              Text(
                l10n.projectStageLabel(
                  consultationBooked: project.consultationBooked,
                  designExplored: project.designExplored,
                  captureCompleted: project.captureCompleted,
                ),
                style: TextStyle(color: mutedText),
              ),
              Builder(
                builder: (ctx) {
                  final l10n = L10n.of(ctx);
                  return PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) {
                      if (value == 'delete') onDelete();
                    },
                    itemBuilder: (_) => [
                      PopupMenuItem(value: 'delete', child: Text(l10n.delete)),
                    ],
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress,
            minHeight: 8,
            borderRadius: BorderRadius.circular(12),
          ),
          const SizedBox(height: 6),
          Builder(
            builder: (ctx) => Text(
              L10n.of(ctx).progressPercent((progress * 100).round()),
              style: TextStyle(color: mutedText, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecommendationSection extends StatelessWidget {
  const _RecommendationSection({
    required this.items,
    required this.wraps,
    required this.l10n,
    required this.onApplyWrap,
  });
  final List<RecommendationItem> items;
  final List<WrapColor> wraps;
  final L10n l10n;
  final ValueChanged<WrapColor> onApplyWrap;

  @override
  Widget build(BuildContext context) {
    final mapped = items.map((item) {
      final wrap = wraps.firstWhere(
        (w) => w.id.toLowerCase() == item.wrapId.toLowerCase(),
        orElse: () => WrapColor(
          id: '',
          name: '',
          brand: '',
          finish: '',
          pricePerSquareMeter: 0,
          texturePreview: '',
          swatch: Colors.transparent,
        ),
      );
      if (wrap.id.isEmpty) return null;
      return (item: item, wrap: wrap);
    }).whereType<({RecommendationItem item, WrapColor wrap})>().toList();

    if (mapped.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.sectionRecommendations,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: mapped
                .map(
                  (entry) => Padding(
                    padding: const EdgeInsets.only(right: 14),
                    child: _RecommendationCard(
                      item: entry.item,
                      wrap: entry.wrap,
                      onApply: () => onApplyWrap(entry.wrap),
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({
    required this.item,
    required this.wrap,
    required this.onApply,
  });

  final RecommendationItem item;
  final WrapColor wrap;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = L10n.of(context);
    final primaryText = isDark ? Colors.white : const Color(0xFF1F2430);
    final mutedText =
        isDark ? Colors.white.withOpacity(0.72) : WrapTheme.mutedText(context);
    final tagBg = isDark ? Colors.white.withOpacity(0.08) : const Color(0xFFF0F2F8);
    final tagBorder = isDark ? Colors.white.withOpacity(0.1) : WrapTheme.border(context);
    final tagText = isDark ? Colors.white.withOpacity(0.78) : WrapTheme.mutedText(context);
    final gradient = LinearGradient(
      colors: [
        wrap.swatch.withOpacity(0.95),
        wrap.swatch.withOpacity(0.6),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
    return _GlassCard(
      width: 240,
      padding: const EdgeInsets.all(14),
      glow: wrap.swatch,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 120,
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _localizedRecommendationLabel(item.category, l10n.code),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            l10n.code == 'en'
                ? (item.titleEn ?? item.title)
                : (item.titleKo ?? item.title),
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 16,
              color: primaryText,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.code == 'en'
                ? (item.subtitleEn ?? item.subtitle)
                : (item.subtitleKo ?? item.subtitle),
            style: TextStyle(color: mutedText),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: item.tags
                .map(
                  (tag) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: tagBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: tagBorder),
                    ),
                    child: Text(
                      _localizedRecommendationLabel(tag, L10n.of(context).code),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: tagText,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: Builder(
              builder: (ctx) => FilledButton(
                onPressed: onApply,
                child: Text(L10n.of(ctx).wrapApplyInAiBtn),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  const _GlassCard({
    this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.width,
    this.glow,
  });

  final Widget? child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final double? width;
  final Color? glow;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor =
        isDark ? Colors.white.withOpacity(0.06) : WrapTheme.card(context);
    final borderColor =
        isDark ? Colors.white.withOpacity(0.08) : WrapTheme.border(context);
    final shadow = isDark
        ? [
            BoxShadow(
              color: Colors.black.withOpacity(0.35),
              blurRadius: 24,
              offset: const Offset(0, 18),
            ),
            if (glow != null)
              BoxShadow(
                color: glow!.withOpacity(0.22),
                blurRadius: 32,
                spreadRadius: -6,
              ),
          ]
        : [
            const BoxShadow(
              color: Color(0x14000000),
              blurRadius: 24,
              offset: Offset(0, 12),
            ),
            if (glow != null)
              BoxShadow(
                color: glow!.withOpacity(0.12),
                blurRadius: 28,
                spreadRadius: -10,
              ),
          ];

    final card = Container(
      width: width,
      padding: padding,
      margin: margin,
      decoration: BoxDecoration(
        color: baseColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
        boxShadow: shadow,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: card,
        ),
      );
    }
    return card;
  }
}

class _LearningSection extends StatelessWidget {
  const _LearningSection({required this.items, required this.l10n});
  final List<LearningItem> items;
  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.sectionGuide,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Column(
          children: items
              .map(
                (item) => _GlassCard(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(
                            context,
                          ).colorScheme.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          l10n.learningTag(item.tag),
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.learningTitle(item.title),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              l10n.learningDuration(item.duration),
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.7),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.play_circle_outline,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.controller,
    required this.hint,
    this.keyboardType,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            decoration: InputDecoration(
              hintText: hint,
              filled: true,
              fillColor: WrapTheme.background(context),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: WrapTheme.border(context)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: WrapTheme.border(context)),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class FilmTexturePainter extends CustomPainter {
  const FilmTexturePainter({required this.baseColor});

  final Color baseColor;

  @override
  void paint(Canvas canvas, Size size) {
    final highlight = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withValues(alpha: 0.22),
          Colors.transparent,
          Colors.black.withValues(alpha: 0.12),
        ],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, highlight);

    final linePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..strokeWidth = 1.1;
    for (double y = -size.height; y < size.height * 2; y += 18) {
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y + size.width * 0.18),
        linePaint,
      );
    }

    final glossPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.55),
        radius: 0.9,
        colors: [
          Colors.white.withValues(alpha: 0.18),
          baseColor.withValues(alpha: 0.0),
        ],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, glossPaint);
  }

  @override
  bool shouldRepaint(covariant FilmTexturePainter oldDelegate) {
    return oldDelegate.baseColor != baseColor;
  }
}

class _CuratedWrapPick {
  const _CuratedWrapPick({
    required this.wrap,
    required this.reasonKo,
    required this.reasonEn,
  });

  final WrapColor wrap;
  final String reasonKo;
  final String reasonEn;
}

class _PreferenceQuestion {
  const _PreferenceQuestion({
    required this.prompt,
    required this.options,
  });

  final String prompt;
  final List<_PreferenceOption> options;
}

class _PreferenceOption {
  const _PreferenceOption({
    required this.id,
    required this.label,
  });

  final String id;
  final String label;
}
