import 'dart:io';

import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';
import 'garage_add_vehicle_screen.dart';
import 'garage_vehicle_detail_screen.dart';
import 'notifications_screen.dart';
import 'lars_ai_color_recommendation_chat.dart';

class GarageScreen extends StatelessWidget {
  const GarageScreen({super.key, this.onSelectTab});

  final ValueChanged<int>? onSelectTab;

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final vehicles = state.vehicles;
    final l10n = L10n.of(context);

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      body: Stack(
        children: [
          // Studio Grid Background
          Positioned.fill(
            child: CustomPaint(
              painter: _StudioGridPainter(
                dotColor: WrapTheme.border(context),
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildNewHeader(context),
                  const SizedBox(height: 24),
                  
                  Text(
                    l10n.navProjects,
                    style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l10n.tx('관리 중인 내 차량 ${vehicles.length}대', '${vehicles.length} vehicles in your garage'),
                    style: TextStyle(fontSize: 16, color: WrapTheme.mutedText(context), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 32),

                  if (vehicles.isEmpty)
                    _buildEmptyState(context, state, l10n)
                  else
                    ...vehicles.map((v) => _NewVehicleCard(
                      vehicle: v, 
                      onStart: () {
                        if (v.imagePath != null) {
                          state.setVehicleImage(File(v.imagePath!));
                        }
                        onSelectTab?.call(2);
                      },
                      onTap: () => _openDetail(context, state, v),
                      onDelete: () => _confirmDeleteVehicle(context, state, v),
                    )),

                  const SizedBox(height: 32),

                  // Smart AI Assistant Banner
                  SizedBox(
                    width: double.infinity,
                    child: GestureDetector(
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
                                  Text(
                                    l10n.tx('• 스마트 AI 어시스턴트', '• SMART AI ASSISTANT'),
                                    style: const TextStyle(color: Color(0xFF4F378A), fontWeight: FontWeight.w900, fontSize: 11),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    l10n.tx('나에게 맞는 컬러를\nAI가 분석해드려요', 'AI analyzes the best\ncolors for you'),
                                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Theme.of(context).colorScheme.onSurface),
                                  ),
                                  const SizedBox(height: 12),
                                  Text('${l10n.tx('분석 시작하기', 'Start Analysis')} →', style: const TextStyle(color: Color(0xFF4F378A), fontWeight: FontWeight.w800)),
                                ],
                              ),
                            ),
                            const Icon(Icons.auto_fix_high_rounded, color: Color(0xFF4F378A), size: 48),
                          ],
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

  Widget _buildNewHeader(BuildContext context) {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(vertical: 12),
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
            icon: Icon(Icons.notifications_none_rounded, color: WrapTheme.primary, size: 32),
            onPressed: () {
               Navigator.of(context).push(MaterialPageRoute(builder: (_) => NotificationsScreen()));
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AppState state, L10n l10n) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Column(
          children: [
            Image.asset(
              'assets/icons/wrap_clay/02_car_select.png',
              width: 80,
              height: 80,
              color: WrapTheme.border(context),
              colorBlendMode: BlendMode.srcIn,
            ),
            const SizedBox(height: 24),
            Text(
              l10n.tx('등록된 차량이 없습니다', 'No vehicles saved'),
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.tx('첫 차량을 등록하고 랩핑 시뮬레이션을 시작해보세요', 'Add your first vehicle to start wrap simulation'),
              textAlign: TextAlign.center,
              style: TextStyle(color: WrapTheme.mutedText(context), fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => _addVehicle(context, state),
              icon: const Icon(Icons.add),
              label: Text(l10n.tx('차량 등록하기', 'Add Vehicle'), style: const TextStyle(fontWeight: FontWeight.w900)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F378A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAIRecommendedBanner(BuildContext context, L10n l10n) {
    final state = AppStateScope.of(context);
    return GestureDetector(
      onTap: () => _showAiPreferenceAssistant(context, state, l10n),
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
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(8)),
                    child: Text(l10n.tx('AI 추천', 'AI Recommended'), style: const TextStyle(color: Color(0xFF4F378A), fontSize: 10, fontWeight: FontWeight.w900)),
                  ),
                  const SizedBox(height: 12),
                  Text(l10n.tx('내 차량에 어울리는 추천\n스타일을 확인해보세요', 'See recommended\nstyles for your vehicle'), style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Theme.of(context).colorScheme.onSurface)),
                ],
              ),
            ),
            const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF4F378A), size: 36),
          ],
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
    onSelectTab?.call(2);
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
          if (hsl.saturation > 0.55) score += 24;
          if (name.contains('red') || name.contains('orange') || name.contains('blue')) score += 24;
          break;
        case 'trend':
          if (hsl.saturation > 0.42) score += 20;
          if (name.contains('green') || name.contains('purple') || name.contains('pink') || name.contains('gold')) score += 26;
          break;
      }

      switch (usage) {
        case 'daily':
          if (hsl.lightness > 0.18 && hsl.lightness < 0.72) score += 14;
          break;
        case 'family':
          if (name.contains('gray') || name.contains('silver') || name.contains('blue') || name.contains('white')) score += 16;
          break;
        case 'showcar':
          if (hsl.saturation > 0.58 || name.contains('chrome') || name.contains('color shift')) score += 24;
          break;
        case 'ev':
          if (name.contains('white') || name.contains('silver') || name.contains('ice') || name.contains('blue')) score += 22;
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

      return score;
    }

    final ranked = [...catalog]..sort((a, b) => scoreWrap(b).compareTo(scoreWrap(a)));
    final unique = <String>{};
    final result = <_CuratedWrapPick>[];
    for (final wrap in ranked) {
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

  void _addVehicle(BuildContext context, AppState state) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppStateScope(
          notifier: state,
          child: const GarageAddVehicleScreen(),
        ),
      ),
    );
  }

  void _openDetail(BuildContext context, AppState state, SavedVehicle vehicle) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppStateScope(
          notifier: state,
          child: GarageVehicleDetailScreen(
            vehicleId: vehicle.id,
            onSelectTab: onSelectTab,
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteVehicle(
    BuildContext context,
    AppState state,
    SavedVehicle vehicle,
  ) async {
    final l10n = L10n.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: WrapTheme.card(context),
          title: Text(l10n.tx('차량 삭제', 'Delete Vehicle')),
          content: Text(
            l10n.tx(
              '${vehicle.nickname} 차량을 삭제하면 되돌릴 수 없습니다. 계속할까요?',
              'Delete ${vehicle.nickname}? This cannot be undone.',
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
    state.removeVehicle(vehicle.id);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.vehicleDeletedMsg)),
    );
  }
}

class _PreferenceQuestion {
  const _PreferenceQuestion({required this.prompt, required this.options});

  final String prompt;
  final List<_PreferenceOption> options;
}

class _PreferenceOption {
  const _PreferenceOption({required this.id, required this.label});

  final String id;
  final String label;
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

class _NewVehicleCard extends StatelessWidget {
  final SavedVehicle vehicle;
  final VoidCallback onStart;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _NewVehicleCard({
    required this.vehicle,
    required this.onStart,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(44),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 20, offset: const Offset(0, 10))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(44)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: vehicle.imagePath != null && vehicle.imagePath!.isNotEmpty
                      ? SizedBox.expand(
                          child: Image.file(
                            File(vehicle.imagePath!),
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Center(
                              child: Icon(
                                Icons.directions_car_rounded,
                                size: 64,
                                color: Colors.grey.withValues(alpha: 0.3),
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Icon(
                            Icons.directions_car_rounded,
                            size: 64,
                            color: Colors.grey.withValues(alpha: 0.3),
                          ),
                        ),
                ),
                Positioned(
                  top: 20,
                  right: 24,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: const Color(0xFF1E293B).withValues(alpha: 0.9), borderRadius: BorderRadius.circular(100)),
                        child: const Text('MATTE FINISH', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
                      ),
                      const SizedBox(width: 8),
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: onDelete,
                          borderRadius: BorderRadius.circular(999),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 18),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 24, 32, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(vehicle.nickname, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF1D1B20))),
                  const SizedBox(height: 4),
                  Text(vehicle.displayName, style: const TextStyle(fontSize: 15, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: onStart,
                          child: Container(
                            height: 56,
                            decoration: BoxDecoration(color: const Color(0xFF4F378A), borderRadius: BorderRadius.circular(20)),
                            child: const Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.auto_awesome, color: Colors.white, size: 20),
                                  SizedBox(width: 8),
                                  Text('랩핑 시작', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: onTap,
                          child: Container(
                            height: 56,
                            decoration: BoxDecoration(color: const Color(0xFFF2F4F7), borderRadius: BorderRadius.circular(20)),
                            child: const Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.remove_red_eye_outlined, color: Color(0xFF1D1B20), size: 20),
                                  SizedBox(width: 8),
                                  Text('스타일 보기', style: TextStyle(color: Color(0xFF1D1B20), fontWeight: FontWeight.w900)),
                                ],
                              ),
                            ),
                          ),
                        ),
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
