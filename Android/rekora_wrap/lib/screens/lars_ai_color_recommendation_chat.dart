import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';

class LARSAIColorRecommendationChat extends StatefulWidget {
  const LARSAIColorRecommendationChat({super.key});

  @override
  State<LARSAIColorRecommendationChat> createState() => _LARSAIColorRecommendationChatState();
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
    if (_inputController.text.trim().isEmpty) return;

    final userText = _inputController.text.trim();
    _inputController.clear();

    // Add user message
    messages.add(_AIMessage(
      id: DateTime.now().toString(),
      role: 'user',
      text: userText,
    ));

    setState(() => isLoading = true);
    _scrollToBottom();

    // Simulate AI response
    await Future.delayed(const Duration(milliseconds: 1000));

    // Generate AI response (simplified - would call actual AI service)
    String aiResponse = _generateAIResponse(userText);

    messages.add(_AIMessage(
      id: DateTime.now().toString(),
      role: 'assistant',
      text: aiResponse,
    ));

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

  String _generateAIResponse(String userInput) {
    // Simplified AI response generation
    return l10n.tx(
      '좋은 선택입니다! 이러한 선호도에 맞는 최고의 랩핑 컬러를 추천하겠습니다.',
      'Great choice! I\'ll recommend the best wrapping colors for your preferences.',
    );
  }

  void selectColor(WrapColor wrap) {
    // Add to history
    colorHistory.add(MapEntry(wrap, DateTime.now()));

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
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () async {
                          final image = await _picker.pickImage(source: ImageSource.gallery);
                          if (image != null) {
                            // Handle image selection
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
                          color: _inputController.text.isEmpty ? Colors.grey : aiColor,
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
          child: Text(
            message.text,
            style: const TextStyle(color: Colors.white),
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
