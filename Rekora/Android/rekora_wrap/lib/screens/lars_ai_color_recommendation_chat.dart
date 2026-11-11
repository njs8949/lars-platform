import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state.dart';
import '../data/wrap_catalog.dart' as catalog;
import '../services/ai_chat_service.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';

class LARSAIColorRecommendationChat extends StatefulWidget {
  const LARSAIColorRecommendationChat({super.key});

  @override
  State<LARSAIColorRecommendationChat> createState() => _LARSAIColorRecommendationChatState();
}

class _ColorHint {
  const _ColorHint(this.label, this.labelEn, this.keywords, this.rgb);
  final String label;
  final String labelEn;
  final List<String> keywords;
  final List<double> rgb;
}

class _AIMessage {
  final String id;
  final String role; // 'user' or 'assistant'
  final String text;
  final List<WrapColor>? wraps;
  final XFile? image;

  _AIMessage({
    required this.id,
    required this.role,
    required this.text,
    this.wraps,
    this.image,
  });
}

class _LARSAIColorRecommendationChatState extends State<LARSAIColorRecommendationChat> {
  late L10n l10n;
  late AppState state;

  final List<_AIMessage> messages = [];
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool isLoading = false;
  // Photo picked with the + button, waiting to be sent with the next message.
  XFile? _pendingImage;
  final List<MapEntry<WrapColor, DateTime>> colorHistory = [];

  final ImagePicker _picker = ImagePicker();
  final List<WrapColor> allWraps = [];

  @override
  void initState() {
    super.initState();
  }

  void _initializeData() {
    if (messages.isNotEmpty) return;

    // Add welcome message
    messages.add(_AIMessage(
      id: DateTime.now().toString(),
      role: 'assistant',
      text: l10n.tx(
        '안녕하세요! 저는 LARS Rekora AI입니다. 당신의 자동차와 개인 스타일에 맞는 완벽한 랩핑 컬러를 추천해드리겠습니다.\n\n먼저, 당신의 차량 스타일은 어떤가요?',
        'Hello! I\'m LARS Rekora AI. I\'ll help you find the perfect wrap color for your vehicle and personal style.\n\nFirst, what\'s your vehicle style?',
      ),
    ));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    l10n = L10n.of(context);
    state = AppStateScope.of(context);
    _initializeData();
  }

  void sendMessage() async {
    final hasText = _inputController.text.trim().isNotEmpty;
    final attachment = _pendingImage;
    if (!hasText && attachment == null) return;

    final userText = _inputController.text.trim();
    _inputController.clear();

    // Add user message (with the attached photo, if any)
    messages.add(_AIMessage(
      id: DateTime.now().toString(),
      role: 'user',
      text: userText,
      image: attachment,
    ));
    if (attachment != null) _lastPhoto = attachment;
    setState(() => _pendingImage = null);

    setState(() => isLoading = true);
    _scrollToBottom();

    // Real AI reply from the backend (LARS Agent key held on the server). Falls back to the local reply on error.
    try {
      final photoBytes = attachment == null ? null : await attachment.readAsBytes();
      final history = [
        for (final m in messages) (role: m.role, text: m.text),
      ];
      final reply = await _aiChat.send(
        history: history,
        photo: photoBytes,
        isKorean: l10n.code != 'en',
      );
      messages.add(_AIMessage(
        id: DateTime.now().toString(),
        role: 'assistant',
        text: reply.text,
        wraps: reply.wraps.isEmpty ? null : reply.wraps,
      ));
    } catch (e) {
      debugPrint('AI chat failed: $e');
      final fallback = _generateAIResponse(userText, hasPhoto: attachment != null);
      messages.add(_AIMessage(
        id: DateTime.now().toString(),
        role: 'assistant',
        text: fallback.text,
        wraps: fallback.wraps,
      ));
    }

    setState(() => isLoading = false);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  int _chatStep = 0;
  final AiChatService _aiChat = AiChatService();
  // Last photo the user attached: handed to the AI wrap screen with the colour they pick.
  XFile? _lastPhoto;

  static const List<_ColorHint> _colorHints = [
    _ColorHint('흰색', 'white', ['흰', '화이트', 'white'], [1.0, 1.0, 1.0]),
    _ColorHint('검은색', 'black', ['검', '블랙', 'black'], [0.08, 0.08, 0.08]),
    _ColorHint('회색', 'grey', ['회색', '그레이', '실버', 'gray', 'grey', 'silver'], [0.55, 0.55, 0.58]),
    _ColorHint('빨강', 'red', ['빨강', '빨간', '레드', 'red'], [0.85, 0.1, 0.15]),
    _ColorHint('주황', 'orange', ['주황', '오렌지', 'orange'], [0.95, 0.5, 0.1]),
    _ColorHint('노랑', 'yellow', ['노랑', '노란', '옐로', 'yellow'], [1.0, 0.85, 0.1]),
    _ColorHint('초록', 'green', ['초록', '그린', 'green'], [0.1, 0.6, 0.25]),
    _ColorHint('파랑', 'blue', ['파랑', '파란', '블루', '네이비', 'blue', 'navy'], [0.1, 0.3, 0.9]),
    _ColorHint('보라', 'purple', ['보라', '퍼플', 'purple', 'violet'], [0.5, 0.2, 0.7]),
    _ColorHint('핑크', 'pink', ['핑크', '분홍', 'pink'], [0.95, 0.5, 0.7]),
    _ColorHint('브라운', 'brown', ['갈색', '브라운', '커피', 'brown', 'bronze'], [0.4, 0.26, 0.15]),
  ];

  /// Colour cards closest to the requested colour, taken from the same catalogue as the rest of the app.
  List<WrapColor> _recommendWraps(List<double> target, {int count = 6}) {
    double distance(WrapColor w) {
      final dr = w.swatch.r - target[0];
      final dg = w.swatch.g - target[1];
      final db = w.swatch.b - target[2];
      return dr * dr + dg * dg + db * db;
    }

    final sorted = List<WrapColor>.from(catalog.allWraps)..sort((a, b) => distance(a).compareTo(distance(b)));
    return sorted.take(count).toList();
  }

  ({String text, List<WrapColor>? wraps}) _generateAIResponse(String userInput, {bool hasPhoto = false}) {
    final lower = userInput.toLowerCase();
    _chatStep++;
    final photoLead = hasPhoto ? '사진을 확인했습니다. ' : '';

    // 1) A colour was named: recommend cards for it.
    for (final hint in _colorHints) {
      if (hint.keywords.any(lower.contains)) {
        final cards = _recommendWraps(hint.rgb);
        return (
          text: l10n.tx(
            '$photoLead${hint.label} 계열로 어울리는 랩핑 컬러 ${cards.length}가지를 골랐습니다. 카드를 눌러 미리 확인해 보세요. 마감(광택, 무광, 새틴, 메탈릭)도 알려 주시면 더 좁혀 드릴게요.',
            '${hint.labelEn} wraps are below. Tap a card to preview it. Tell me the finish (gloss, matte, satin, metallic) and I can narrow it down.',
          ),
          wraps: cards,
        );
      }
    }

    // 2) A finish was named.
    if (['광택', '글로스', 'gloss'].any(lower.contains)) {
      return (text: l10n.tx('광택 마감으로 정했습니다. 원하는 색상을 말씀해 주세요. (예: 흰색, 파랑, 빨강)', 'Gloss finish noted. Which colour would you like? (e.g. white, blue, red)'), wraps: null);
    }
    if (['무광', '매트', 'matte'].any(lower.contains)) {
      return (text: l10n.tx('무광 마감으로 정했습니다. 원하는 색상을 말씀해 주세요. (예: 검은색, 회색, 초록)', 'Matte finish noted. Which colour would you like? (e.g. black, grey, green)'), wraps: null);
    }
    if (['새틴', 'satin'].any(lower.contains)) {
      return (text: l10n.tx('새틴 마감으로 정했습니다. 원하는 색상을 말씀해 주세요.', 'Satin finish noted. Which colour would you like?'), wraps: null);
    }
    if (['메탈', 'metallic'].any(lower.contains)) {
      return (text: l10n.tx('메탈릭 마감으로 정했습니다. 원하는 색상을 말씀해 주세요. (예: 실버, 파랑, 검은색)', 'Metallic finish noted. Which colour would you like? (e.g. silver, blue, black)'), wraps: null);
    }

    // 3) Budget was named.
    if (['합리', '표준', '프리미엄', '예산', 'budget', 'premium', 'standard'].any(lower.contains)) {
      return (text: l10n.tx('예산 범위도 반영하겠습니다. 이제 원하는 색상을 말씀해 주시면 카드로 추천해 드릴게요.', 'Budget noted. Tell me a colour and I will show matching cards.'), wraps: null);
    }

    // 4) Nothing recognised: ask something different each time instead of repeating one sentence.
    if (hasPhoto) {
      return (text: l10n.tx('사진을 확인했습니다. 어떤 색으로 바꾸고 싶으신가요? (예: 흰색, 검은색, 빨강, 파랑)', 'Photo received. Which colour would you like? (e.g. white, black, red, blue)'), wraps: null);
    }
    const prompts = [
      ['원하시는 색상을 말씀해 주세요. (예: 흰색, 검은색, 빨강, 파랑)', 'Tell me the colour you want. (e.g. white, black, red, blue)'],
      ['마감도 고를 수 있어요. 광택, 무광, 새틴, 메탈릭 중 어떤 것이 좋으세요?', 'You can also pick the finish: gloss, matte, satin or metallic. Which one?'],
      ['차량 사진을 + 버튼으로 올려 주시면 그 차에 맞춰 골라 드릴게요.', 'Attach a photo with the + button and I will choose colours that suit that car.'],
    ];
    final pick = prompts[_chatStep % prompts.length];
    return (text: l10n.tx(pick[0], pick[1]), wraps: null);
  }

  void selectColor(WrapColor wrap) {
    // Add to history
    colorHistory.add(MapEntry(wrap, DateTime.now()));

    // Hand the photo (if any) and the colour over to the AI wrap screen, then open it.
    final state = AppStateScope.of(context);
    if (_lastPhoto != null) {
      state.setVehicleImage(File(_lastPhoto!.path));
      state.assistantPhotoPending = true;
    }
    state.setPendingWrap(wrap);
    assistantTabRequest.value = 2;

    // Add selection message
    final message = _AIMessage(
      id: DateTime.now().toString(),
      role: 'assistant',
      text: l10n.tx(
        '✅ **${wrap.displayName}** 색상을 선택했습니다!\n\n**마감재**: ${wrap.finish}\n**코드**: ${wrap.code}\n\n이 색상이 마음에 드시면, AI 랩핑 프리뷰에서 차량에 적용된 모습을 확인하실 수 있습니다.',
        '✅ You\'ve selected **${wrap.displayName}**!\n\n**Finish**: ${wrap.finish}\n**Code**: ${wrap.code}\n\nYou can preview this color on your vehicle in the AI wrapping preview.',
      ),
    );

    messages.add(message);

    // Post notification for other screens
    // (Similar to iOS NotificationCenter)
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = isDark ? const Color(0xFF1A1A1A) : const Color(0xFFF5F5F5);
    final cardBackground = isDark ? const Color(0xFF2A2A2A) : Colors.white;
    final aiColor = const Color(0xFF4F378A);

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: cardBackground,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'LARS Rekora AI',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  l10n.tx('온라인', 'Online'),
                  style: TextStyle(fontSize: 11, color: WrapTheme.mutedText(context)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Icon(Icons.auto_fix_high_rounded, color: aiColor, size: 24),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: messages.length + (isLoading ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == messages.length && isLoading) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        ...List.generate(3, (i) =>
                          Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: Colors.grey.withOpacity(0.3 + (i * 0.2)),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final message = messages[index];
                return _MessageTile(
                  message: message,
                  isDark: isDark,
                  backgroundColor: backgroundColor,
                  cardBackground: cardBackground,
                  aiColor: aiColor,
                  onSelectColor: selectColor,
                );
              },
            ),
          ),

          // Input area
          Container(
            color: cardBackground,
            child: Column(
              children: [
                const Divider(height: 1),
                if (_pendingImage != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(File(_pendingImage!.path), width: 64, height: 64, fit: BoxFit.cover),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            l10n.tx('사진이 첨부되었습니다', 'Photo attached'),
                            style: TextStyle(color: isDark ? Colors.white70 : Colors.black87),
                          ),
                        ),
                        IconButton(
                          onPressed: () => setState(() => _pendingImage = null),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () async {
                          final image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
                          if (image != null && mounted) {
                            setState(() => _pendingImage = image);
                          }
                        },
                        icon: Icon(Icons.add_circle, size: 28, color: aiColor),
                      ),
                      Expanded(
                        child: TextField(
                          controller: _inputController,
                          decoration: InputDecoration(
                            hintText: l10n.tx('메시지를 입력하세요...', 'Enter message...'),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                          onSubmitted: (_) => sendMessage(),
                        ),
                      ),
                      IconButton(
                        onPressed: sendMessage,
                        icon: Icon(
                          Icons.arrow_circle_up,
                          size: 28,
                          color: (_inputController.text.isEmpty && _pendingImage == null) ? Colors.grey : aiColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}

class _MessageTile extends StatelessWidget {
  final _AIMessage message;
  final bool isDark;
  final Color backgroundColor;
  final Color cardBackground;
  final Color aiColor;
  final Function(WrapColor) onSelectColor;

  const _MessageTile({
    required this.message,
    required this.isDark,
    required this.backgroundColor,
    required this.cardBackground,
    required this.aiColor,
    required this.onSelectColor,
  });

  @override
  Widget build(BuildContext context) {
    if (message.role == 'user') {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: aiColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (message.image != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(File(message.image!.path), width: 200, fit: BoxFit.cover),
                  ),
                ),
              if (message.text.isNotEmpty)
                Text(
                  message.text,
                  style: const TextStyle(color: Colors.white),
                ),
            ],
          ),
        ),
      );
    }

    // Assistant message
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.grey[700]! : Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_fix_high_rounded, size: 12, color: aiColor),
              const SizedBox(width: 4),
              Text(
                'LARS Rekora AI',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: aiColor),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            message.text,
            style: TextStyle(
              height: 1.4,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
