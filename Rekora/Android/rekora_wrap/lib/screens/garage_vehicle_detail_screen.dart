import 'dart:io';

import 'package:flutter/material.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';
import 'visualizer_screen.dart';
import 'lars_ai_color_recommendation_chat.dart';

class GarageVehicleDetailScreen extends StatelessWidget {
  const GarageVehicleDetailScreen({
    super.key,
    required this.vehicleId,
    this.onSelectTab,
  });

  final String vehicleId;
  final ValueChanged<int>? onSelectTab;

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final l10n = L10n.of(context);
    SavedVehicle? vehicle;
    for (final item in state.vehicles) {
      if (item.id == vehicleId) {
        vehicle = item;
        break;
      }
    }

    if (vehicle == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.navProjects)),
        body: Center(child: Text(l10n.tx('차량을 찾을 수 없습니다', 'Vehicle not found'))),
      );
    }

    final savedVehicle = vehicle;
    final currentStyle = _resolveCurrentStyle(savedVehicle);

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      appBar: AppBar(
        backgroundColor: WrapTheme.card(context),
        title: Text(savedVehicle.nickname),
        actions: [
          IconButton(
            tooltip: l10n.delete,
            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
            onPressed: () => _confirmDeleteVehicle(context, state, savedVehicle),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _VehicleInfoCard(vehicle: savedVehicle),
            const SizedBox(height: 16),
            Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () =>
                        _launchGarageWrap(context, state, savedVehicle, currentStyle),
                    icon: const Icon(Icons.palette_outlined),
                    label: Text(
                      l10n.tx('랩핑 시뮬레이션 시작', 'Start Wrap Simulation'),
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                if (currentStyle != null) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(l10n.tx('NFT 발행 기능 준비중입니다', 'NFT minting coming soon'))),
                        );
                      },
                      icon: const Icon(Icons.hub_outlined),
                      label: Text(
                        l10n.tx('NFT로 발행하기', 'Mint as NFT'),
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.orange,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 20),

            // AI Assistant Banner (moved from bottom)
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
            const SizedBox(height: 20),

            Text(
              l10n.tx('저장된 스타일', 'Saved Styles'),
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            if (savedVehicle.garageStyles.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: WrapTheme.card(context),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: WrapTheme.border(context)),
                ),
                child: Text(
                  l10n.tx('저장된 스타일이 없습니다', 'No saved styles'),
                  style: TextStyle(
                    color: WrapTheme.mutedText(context),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              )
            else
              ...savedVehicle.garageStyles.map(
                (style) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _StyleCard(
                    style: style,
                    isCurrent: savedVehicle.currentStyleId == style.id,
                    onSetCurrent: () {
                      state.updateVehicle(
                        savedVehicle.copyWith(
                          currentStyleId: style.id,
                          lastUpdated: DateTime.now(),
                        ),
                      );
                    },
                    onDelete: () {
                      final updatedStyles =
                          savedVehicle.garageStyles
                              .where((s) => s.id != style.id)
                              .toList();
                      state.updateVehicle(
                        savedVehicle.copyWith(
                          garageStyles: updatedStyles,
                          currentStyleId: savedVehicle.currentStyleId == style.id
                              ? null
                              : savedVehicle.currentStyleId,
                          lastUpdated: DateTime.now(),
                        ),
                      );
                    },
                  ),
                ),
              ),
            const SizedBox(height: 20),
            _WrapHistorySection(
              vehicle: savedVehicle,
              onDeleteEntry: (entry) => state.removeVehicleWrapHistory(savedVehicle.id, entry.id),
            ),
          ],
        ),
      ),
    );
  }

  GarageWrapStyle? _resolveCurrentStyle(SavedVehicle vehicle) {
    if (vehicle.currentStyleId != null) {
      for (final style in vehicle.garageStyles) {
        if (style.id == vehicle.currentStyleId) return style;
      }
    }
    return vehicle.garageStyles.isEmpty ? null : vehicle.garageStyles.last;
  }

  void _launchGarageWrap(
    BuildContext context,
    AppState state,
    SavedVehicle vehicle,
    GarageWrapStyle? style,
  ) {
    final launch = GarageWrapLaunchContext.fromVehicle(vehicle, style: style);
    if (vehicle.imagePath != null) {
      state.setVehicleImage(File(vehicle.imagePath!));
    }
    state.setPendingGarageWrapLaunch(launch);
    if (onSelectTab != null) {
      Navigator.of(context).pop();
      onSelectTab!(2);
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AppStateScope(
          notifier: state,
          child: Scaffold(
            body: SafeArea(
              child: const VisualizerScreen(),
            ),
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
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.vehicleDeletedMsg)),
    );
  }

  Future<void> _showCuratedStyleAssistant(
    BuildContext context,
    AppState state,
    SavedVehicle vehicle,
  ) async {
    final l10n = L10n.of(context);
    final questions = <_PreferenceQuestion>[
      _PreferenceQuestion(
        prompt: l10n.tx(
          '차량의 첫인상을 어떤 방향으로 바꾸고 싶으신가요?',
          'How do you want the vehicle’s first impression to change?',
        ),
        options: [
          _PreferenceOption(id: 'stealth', label: l10n.tx('묵직하고 절제된 분위기', 'Restrained and stealthy')),
          _PreferenceOption(id: 'premium', label: l10n.tx('고급스럽고 세련된 분위기', 'Premium and refined')),
          _PreferenceOption(id: 'sport', label: l10n.tx('스포티하고 존재감 있게', 'Sporty and assertive')),
          _PreferenceOption(id: 'trend', label: l10n.tx('트렌디하고 시선을 끌게', 'Trendy and eye-catching')),
        ],
      ),
      _PreferenceQuestion(
        prompt: l10n.tx(
          '표면 질감은 어떤 쪽이 취향에 가깝나요?',
          'Which surface finish feels most like your taste?',
        ),
        options: [
          _PreferenceOption(id: 'satin', label: l10n.tx('빛이 은은하게 흐르는 새틴', 'Soft-flow satin')),
          _PreferenceOption(id: 'matte', label: l10n.tx('차분한 질감의 매트', 'Calm matte texture')),
          _PreferenceOption(id: 'gloss', label: l10n.tx('선명하고 반짝이는 글로스', 'Crisp reflective gloss')),
          _PreferenceOption(id: 'metallic', label: l10n.tx('입체감 있는 메탈릭', 'Dimensional metallic')),
        ],
      ),
      _PreferenceQuestion(
        prompt: l10n.tx(
          '차량이 가장 자주 놓이는 라이프스타일은 어느 쪽인가요?',
          'Which lifestyle context best matches how the car is used?',
        ),
        options: [
          _PreferenceOption(id: 'daily', label: l10n.tx('데일리 / 출퇴근', 'Daily / commuting')),
          _PreferenceOption(id: 'family', label: l10n.tx('패밀리 / SUV', 'Family / SUV')),
          _PreferenceOption(id: 'showcar', label: l10n.tx('쇼카 / 특별한 존재감', 'Show car / presence')),
          _PreferenceOption(id: 'ev', label: l10n.tx('전기차 / 미래지향', 'EV / futuristic')),
        ],
      ),
      _PreferenceQuestion(
        prompt: l10n.tx(
          '전문가 입장에서 추천 강도는 어느 정도가 좋을까요?',
          'How bold should the curator recommendation be?',
        ),
        options: [
          _PreferenceOption(id: 'safe', label: l10n.tx('실패 없는 안정적인 방향', 'Safe and versatile')),
          _PreferenceOption(id: 'balanced', label: l10n.tx('개성과 실용성의 균형', 'Balanced character')),
          _PreferenceOption(id: 'bold', label: l10n.tx('확실히 눈에 띄는 방향', 'Clearly bold')),
        ],
      ),
    ];

    final nameCtrl = TextEditingController();
    final brandCtrl = TextEditingController();
    final productCtrl = TextEditingController();
    final baseColorCtrl = TextEditingController(text: '#1C1C1E');
    final accentCtrl = TextEditingController();
    final roofCtrl = TextEditingController();
    GarageFinishType finish = GarageFinishType.gloss;
    final answers = <String>[];
    var step = 0;

    final style = await showModalBottomSheet<GarageWrapStyle>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (step < questions.length) ...[
                      Text(
                        l10n.tx('스타일 큐레이터', 'Style Curator'),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.tx('질문 ${step + 1}/${questions.length}', 'Question ${step + 1}/${questions.length}'),
                        style: TextStyle(color: WrapTheme.mutedText(context)),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        questions[step].prompt,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 18),
                      ...questions[step].options.map(
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
                    ] else if (step == questions.length) ...[
                      Builder(
                        builder: (_) {
                          final recommendations = _recommendFilmsForAnswers(state, answers);
                          final curatorSummary = _buildCuratorSummary(l10n, answers);
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.tx('AI 스타일 큐레이터 제안', 'AI Style Curator Picks'),
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                              ),
                              const SizedBox(height: 10),
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
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      curatorSummary,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        height: 1.45,
                                        color: Theme.of(context).colorScheme.onSurface,
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
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    leading: Container(
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        color: pick.wrap.swatch,
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white, width: 1.2),
                                      ),
                                    ),
                                    title: Text(
                                      _styleNameForWrap(l10n, pick.wrap, answers),
                                      style: const TextStyle(fontWeight: FontWeight.w800),
                                    ),
                                    subtitle: Text(
                                      '${pick.wrap.displayName}\n${l10n.code == 'en' ? pick.reasonEn : pick.reasonKo}',
                                    ),
                                    isThreeLine: true,
                                    trailing: FilledButton(
                                      onPressed: () {
                                        final generatedStyle = _garageStyleFromWrap(
                                          l10n,
                                          wrap: pick.wrap,
                                          answers: answers,
                                        );
                                        nameCtrl.text = generatedStyle.name;
                                        baseColorCtrl.text = generatedStyle.baseColor;
                                        brandCtrl.text = generatedStyle.filmBrand;
                                        productCtrl.text = generatedStyle.filmProduct;
                                        accentCtrl.text = generatedStyle.accentColor ?? '';
                                        roofCtrl.text = generatedStyle.roofColor ?? '';
                                        finish = generatedStyle.finishType;
                                        setSheetState(() => step += 1);
                                      },
                                      child: Text(l10n.tx('이 스타일로 진행', 'Use this style')),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ] else ...[
                      Text(
                        l10n.tx('스타일 세부 조정', 'Refine Style'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 16),
                      _StyleInput(controller: nameCtrl, label: l10n.tx('스타일명', 'Style Name')),
                      const SizedBox(height: 12),
                      _StyleInput(controller: baseColorCtrl, label: l10n.tx('베이스 HEX', 'Base HEX')),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<GarageFinishType>(
                        initialValue: finish,
                        decoration: InputDecoration(
                          labelText: l10n.tx('마감', 'Finish'),
                          border: const OutlineInputBorder(),
                        ),
                        items: GarageFinishType.values
                            .map(
                              (item) => DropdownMenuItem(
                                value: item,
                                child: Text(item.label),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) return;
                          setSheetState(() => finish = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      _StyleInput(controller: brandCtrl, label: l10n.tx('필름 브랜드', 'Film Brand')),
                      const SizedBox(height: 12),
                      _StyleInput(controller: productCtrl, label: l10n.tx('필름 제품명', 'Film Product')),
                      const SizedBox(height: 12),
                      _StyleInput(controller: accentCtrl, label: l10n.tx('악센트 HEX (선택)', 'Accent HEX (Optional)')),
                      const SizedBox(height: 12),
                      _StyleInput(controller: roofCtrl, label: l10n.tx('루프 HEX (선택)', 'Roof HEX (Optional)')),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () {
                            final name = nameCtrl.text.trim();
                            final baseColor = baseColorCtrl.text.trim().toUpperCase();
                            if (name.isEmpty || !_isValidHex(baseColor)) return;
                            Navigator.of(sheetContext).pop(
                              GarageWrapStyle(
                                id: DateTime.now().millisecondsSinceEpoch.toString(),
                                name: name,
                                baseColor: baseColor.startsWith('#') ? baseColor : '#$baseColor',
                                finishType: finish,
                                filmBrand: brandCtrl.text.trim(),
                                filmProduct: productCtrl.text.trim(),
                                accentColor: _normalizeOptionalHex(accentCtrl.text),
                                roofColor: _normalizeOptionalHex(roofCtrl.text),
                                createdAt: DateTime.now(),
                              ),
                            );
                          },
                          child: Text(l10n.tx('저장', 'Save')),
                        ),
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

    if (style == null) return;
    final updatedStyles = [...vehicle.garageStyles, style];
    state.updateVehicle(
      vehicle.copyWith(
        garageStyles: updatedStyles,
        currentStyleId: style.id,
        lastUpdated: DateTime.now(),
      ),
    );
  }

  bool _isValidHex(String value) {
    final normalized = value.trim();
    return RegExp(r'^#?[0-9A-Fa-f]{6}$').hasMatch(normalized);
  }

  String? _normalizeOptionalHex(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    if (!_isValidHex(trimmed)) return null;
    return trimmed.startsWith('#') ? trimmed.toUpperCase() : '#${trimmed.toUpperCase()}';
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

  GarageWrapStyle _garageStyleFromWrap(
    L10n l10n, {
    required WrapColor wrap,
    required List<String> answers,
  }) {
    final mood = answers.isNotEmpty ? answers[0] : 'premium';
    return GarageWrapStyle(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: _styleNameForWrap(l10n, wrap, answers),
      baseColor: wrap.hexCode,
      finishType: _finishTypeFromWrap(wrap),
      filmBrand: wrap.brand,
      filmProduct: wrap.name,
      accentColor: mood == 'sport' || mood == 'trend' ? wrap.hexCode : null,
      roofColor: mood == 'stealth' ? '#101114' : null,
      createdAt: DateTime.now(),
    );
  }

  GarageFinishType _finishTypeFromWrap(WrapColor wrap) {
    final finish = wrap.finish.toLowerCase();
    if (finish.contains('matte')) return GarageFinishType.matte;
    if (finish.contains('satin')) return GarageFinishType.satin;
    if (finish.contains('chrome')) return GarageFinishType.chrome;
    return GarageFinishType.gloss;
  }

  String _styleNameForWrap(L10n l10n, WrapColor wrap, List<String> answers) {
    final mood = answers.isNotEmpty ? answers[0] : 'premium';
    final moodTitle = switch (mood) {
      'stealth' => l10n.tx('스텔스', 'Stealth'),
      'sport' => l10n.tx('스포트', 'Sport'),
      'trend' => l10n.tx('트렌드', 'Trend'),
      _ => l10n.tx('시그니처', 'Signature'),
    };
    return '$moodTitle ${wrap.name}';
  }
}

class _VehicleInfoCard extends StatelessWidget {
  const _VehicleInfoCard({required this.vehicle});

  final SavedVehicle vehicle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '차량 정보',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          _InfoRow(label: '차량', value: vehicle.displayName),
          _InfoRow(label: '닉네임', value: vehicle.nickname),
          if (vehicle.vehicleCategory != null)
            _InfoRow(label: '카테고리', value: vehicle.vehicleCategory!.label),
          if (vehicle.vehicleSize != null)
            _InfoRow(label: '크기', value: vehicle.vehicleSize!.label),
          if (vehicle.originalColor != null)
            _InfoColorRow(label: '현재 색상', hex: vehicle.originalColor!),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _InfoColorRow extends StatelessWidget {
  const _InfoColorRow({required this.label, required this.hex});

  final String label;
  final String hex;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          const Spacer(),
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              color: _hexToColor(hex),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.black.withValues(alpha: 0.12)),
            ),
          ),
          const SizedBox(width: 8),
          Text(hex, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Color _hexToColor(String value) {
    final normalized = value.replaceAll('#', '');
    return Color(int.parse('FF$normalized', radix: 16));
  }
}

class _EmptyStylesCard extends StatelessWidget {
  const _EmptyStylesCard({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Column(
        children: [
          Icon(Icons.palette_outlined, size: 40, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          const Text(
            '아직 저장된 스타일이 없습니다',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            '첫 스타일을 만들고 바로 AI 랩핑으로 넘길 수 있습니다',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('첫 스타일 만들기'),
          ),
        ],
      ),
    );
  }
}

class _WrapHistorySection extends StatelessWidget {
  const _WrapHistorySection({
    required this.vehicle,
    required this.onDeleteEntry,
  });

  final SavedVehicle vehicle;
  final ValueChanged<GarageWrapHistoryEntry> onDeleteEntry;

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              l10n.tx('랩핑 기록', 'Wrap History'),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const Spacer(),
            Text(
              l10n.tx('${vehicle.wrapHistory.length}건', '${vehicle.wrapHistory.length} items'),
              style: TextStyle(color: WrapTheme.mutedText(context), fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (vehicle.wrapHistory.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: WrapTheme.card(context),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: WrapTheme.border(context)),
            ),
            child: Text(
              l10n.tx('아직 적용한 랩핑 기록이 없습니다.', 'No wrap history yet.'),
              style: TextStyle(color: WrapTheme.mutedText(context), fontWeight: FontWeight.w600),
            ),
          )
        else
          ...vehicle.wrapHistory.map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _WrapHistoryCard(
                entry: entry,
                onDelete: () => onDeleteEntry(entry),
              ),
            ),
          ),
      ],
    );
  }
}

class _WrapHistoryCard extends StatelessWidget {
  const _WrapHistoryCard({
    required this.entry,
    required this.onDelete,
  });

  final GarageWrapHistoryEntry entry;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final color = _parseHexColor(entry.hexCode) ?? const Color(0xFF4F378A);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.displayTitle,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  entry.displaySubtitle,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: WrapTheme.mutedText(context),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _formatHistoryDate(entry.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: WrapTheme.mutedText(context),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: L10n.of(context).delete,
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
          ),
        ],
      ),
    );
  }
}

String _formatHistoryDate(DateTime dateTime) {
  final y = dateTime.year.toString().padLeft(4, '0');
  final m = dateTime.month.toString().padLeft(2, '0');
  final d = dateTime.day.toString().padLeft(2, '0');
  final hh = dateTime.hour.toString().padLeft(2, '0');
  final mm = dateTime.minute.toString().padLeft(2, '0');
  return '$y-$m-$d $hh:$mm';
}

Color? _parseHexColor(String value) {
  final normalized = value.trim().replaceAll('#', '');
  if (!RegExp(r'^[0-9A-Fa-f]{6}$').hasMatch(normalized)) return null;
  return Color(int.parse('FF$normalized', radix: 16));
}

class _StyleCard extends StatelessWidget {
  const _StyleCard({
    required this.style,
    required this.isCurrent,
    required this.onSetCurrent,
    required this.onDelete,
  });

  final GarageWrapStyle style;
  final bool isCurrent;
  final VoidCallback onSetCurrent;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCurrent
              ? Colors.indigo.withValues(alpha: 0.35)
              : Colors.black.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  style.name,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
              if (isCurrent)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.indigo,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    '현재',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _ColorDot(hex: style.baseColor, label: '메인'),
              if (style.accentColor != null) _ColorDot(hex: style.accentColor!, label: '악센트'),
              if (style.roofColor != null) _ColorDot(hex: style.roofColor!, label: '루프'),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MiniChip(label: style.finishType.label),
              if (style.filmBrand.trim().isNotEmpty) _MiniChip(label: style.filmBrand.trim()),
              if (style.filmProduct.trim().isNotEmpty) _MiniChip(label: style.filmProduct.trim()),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              OutlinedButton(
                onPressed: onSetCurrent,
                child: const Text('현재 스타일로 설정'),
              ),
              const Spacer(),
              IconButton(
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline, color: Colors.red),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class _ColorDot extends StatelessWidget {
  const _ColorDot({required this.hex, required this.label});

  final String hex;
  final String label;

  @override
  Widget build(BuildContext context) {
    final normalized = hex.replaceAll('#', '');
    final color = Color(int.parse('FF$normalized', radix: 16));
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.black.withValues(alpha: 0.12)),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _StyleInput extends StatelessWidget {
  const _StyleInput({required this.controller, required this.label});

  final TextEditingController controller;
  final String label;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
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
