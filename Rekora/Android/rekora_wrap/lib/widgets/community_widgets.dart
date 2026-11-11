import 'dart:convert';
import '../services/community_moderation.dart';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_state.dart';
import '../config.dart';
import '../models.dart';
import '../l10n.dart';
import '../theme.dart';

class CommunityComposer extends StatefulWidget {
  const CommunityComposer({super.key});

  @override
  State<CommunityComposer> createState() => _CommunityComposerState();
}

class _CommunityComposerState extends State<CommunityComposer> {
  final _controller = TextEditingController();
  final _picker = ImagePicker();
  File? _image;
  bool _posting = false;
  String _category = _categories.first.$1;

  static const _categories = [
    ('general', '자유'),
    ('review', '시공 후기'),
    ('color', '컬러 추천'),
    ('care', '케어/관리'),
    ('partial', '부분 랩핑'),
    ('coating', '코팅/보호'),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = L10n.of(context);
    return Card(
      elevation: 0,
      color: WrapTheme.card(context),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _controller,
              maxLines: 3,
              minLines: 1,
              decoration: InputDecoration(
                hintText: t.postPlaceholder,
                border: InputBorder.none,
              ),
            ),
            if (_image != null) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.file(
                  _image!,
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton.icon(
                  onPressed: _pickImage,
                  icon: const Icon(Icons.photo_outlined),
                  label: Text(t.attachImage),
                ),
                const Spacer(),
                DropdownButton<String>(
                  value: _category,
                  items: _categories
                      .map(
                        (c) => DropdownMenuItem(
                          value: c.$1,
                          child: Text(L10n.of(context).categoryLabel(c.$1)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _category = v);
                  },
                  underline: const SizedBox.shrink(),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: _posting ? null : () => _submit(context),
                  child: Text(_posting ? t.posting : t.postButton),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
    );
    if (picked == null) return;
    setState(() {
      _image = File(picked.path);
    });
  }

  Future<void> _submit(BuildContext context) async {
    final state = AppStateScope.of(context);
    final t = L10n.of(context);
    final text = _controller.text.trim();
    if (CommunityModeration.containsBlockedTerm(text)) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(t.tx('부적절한 표현이 포함되어 있습니다. 내용을 수정해 주세요.', 'The post contains words that are not allowed. Please edit it.')),
      ));
      return;
    }
    if (text.isEmpty && _image == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(
        SnackBar(
          content: Text(
            t.tx('내용이나 이미지를 입력해 주세요.', 'Please enter text or attach an image.'),
          ),
        ),
      );
      return;
    }
    setState(() => _posting = true);
    try {
      Map<String, dynamic>? attachment;
      if (_image != null) {
        final bytes = await _image!.readAsBytes();
        final extension = _image!.path.toLowerCase();
        final mimeType = extension.endsWith('.png')
            ? 'image/png'
            : extension.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
        attachment = {
          'base64': base64Encode(bytes),
          'mimeType': mimeType,
          'fileName': _image!.uri.pathSegments.isNotEmpty ? _image!.uri.pathSegments.last : 'image.jpg',
        };
      }

      final response = await http.post(
        Uri.parse('${Config.communitySiteUrl}/api/community/posts'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'title': text.isNotEmpty
              ? text.split('\n').first.trim()
              : t.tx('이미지 공유', 'Shared image'),
          'content': text.isNotEmpty ? text : t.tx('이미지 공유', 'Shared image'),
          'categoryKey': _category,
          'authorName': state.profile.name,
          ...?attachment == null ? null : {'media': attachment},
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final payload = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(payload['error'] ?? 'Failed to upload post');
      }

      await state.refreshRemoteCommunityFeed();
      setState(() {
        _posting = false;
        _controller.clear();
        _image = null;
      });
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.uploaded)));
    } catch (error) {
      setState(() => _posting = false);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error is Exception ? error.toString().replaceFirst('Exception: ', '') : 'Failed to upload post')),
      );
    }
  }
}

class CommunityPostTile extends StatelessWidget {
  const CommunityPostTile({super.key, required this.post});
  final CommunityPost post;

  Future<void> _onModerationAction(BuildContext context, String value) async {
    final t = L10n.of(context);
    final messenger = ScaffoldMessenger.of(context);
    if (value == 'block') {
      await CommunityModeration.block(post.author);
      messenger.showSnackBar(SnackBar(
        content: Text(t.tx('이 작성자의 글을 숨겼습니다.', 'Posts from this author are now hidden.')),
      ));
      return;
    }
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text(t.tx('신고 사유', 'Report reason')),
        children: [
          for (final r in CommunityModeration.reasons)
            SimpleDialogOption(
              onPressed: () => Navigator.of(ctx).pop(r),
              child: Text(_reasonLabel(t, r)),
            ),
        ],
      ),
    );
    if (reason == null) return;
    final ok = await CommunityModeration.report(postId: post.id, postAuthor: post.author, reason: reason);
    messenger.showSnackBar(SnackBar(
      content: Text(ok
          ? t.tx('신고가 접수되었습니다. 검토 후 조치하겠습니다.', 'Report received. We will review it.')
          : t.tx('신고를 접수하지 못했습니다. 로그인 후 다시 시도해 주세요.', 'Could not send the report. Sign in and try again.')),
    ));
  }

  String _reasonLabel(L10n t, String reason) {
    switch (reason) {
      case 'abuse':
        return t.tx('욕설·괴롭힘', 'Abuse or harassment');
      case 'sexual':
        return t.tx('음란물', 'Sexual content');
      case 'spam':
        return t.tx('스팸·광고', 'Spam or advertising');
      case 'illegal':
        return t.tx('불법 정보', 'Illegal content');
      default:
        return t.tx('기타', 'Other');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final t = L10n.of(context);
    final title = _localizedTitle(t);
    final content = _localizedContent(t);
    final ctaLabel = _localizedCtaLabel(t);
    final youtubeThumb = _youtubeThumbnailUrl(post.ctaHref);
    return InkWell(
      onTap: () => _openDetail(context, title, content),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WrapTheme.card(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: WrapTheme.border(context)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: const Color(0xFF1C2F59),
                  child: Text(
                    post.author.isNotEmpty ? post.author[0] : '?',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.author,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        _timeAgo(context, post.createdAt),
                        style: TextStyle(
                          color: WrapTheme.mutedText(context),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: t.tx('신고 및 차단', 'Report or block'),
                  icon: Icon(Icons.more_horiz, color: WrapTheme.mutedText(context), size: 20),
                  onSelected: (value) => _onModerationAction(context, value),
                  itemBuilder: (_) => [
                    PopupMenuItem(value: 'report', child: Text(t.tx('이 글 신고', 'Report this post'))),
                    PopupMenuItem(value: 'block', child: Text(t.tx('이 작성자 차단', 'Block this author'))),
                  ],
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: WrapTheme.badge(context),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    t.translateCategoryFromKo(post.category),
                    style: TextStyle(
                      color: WrapTheme.badgeText(context),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (!post.isRemote)
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'delete') {
                        state.removePost(post.id);
                        ScaffoldMessenger.of(
                          context,
                        ).showSnackBar(SnackBar(content: Text(t.deleted)));
                      }
                    },
                    itemBuilder: (_) => [
                      PopupMenuItem(value: 'delete', child: Text(t.delete)),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 10),
            if (title != null && title.isNotEmpty) ...[
              Text(
                title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
            ],
            Text(
              content,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
            if (post.imagePath != null) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(File(post.imagePath!), fit: BoxFit.cover),
              ),
            ],
            if (post.mediaUrl != null) ...[
              const SizedBox(height: 10),
            if (post.mediaType == 'image')
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(post.mediaUrl!, fit: BoxFit.cover),
              )
            else if (post.mediaType == 'video')
              OutlinedButton.icon(
                onPressed: () => _openCta(post.mediaUrl!),
                icon: const Icon(Icons.play_circle_outline, size: 18),
                label: Text(t.tx('첨부된 동영상 열기', 'Open attached video')),
              ),
          ],
            if (youtubeThumb != null && post.mediaUrl == null) ...[
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () => _openCta(post.ctaHref!),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Image.network(youtubeThumb, fit: BoxFit.cover),
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.play_arrow_rounded,
                          color: Colors.white,
                          size: 34,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (ctaLabel != null && post.ctaHref != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => _openCta(post.ctaHref!),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: Text(ctaLabel),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _openDetail(BuildContext context, String? title, String content) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null && title.isNotEmpty) ...[
                  Text(
                    title,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  content,
                  style: const TextStyle(fontSize: 16, height: 1.55),
                ),
                if (_youtubeThumbnailUrl(post.ctaHref) != null && post.mediaUrl == null) ...[
                  const SizedBox(height: 14),
                  GestureDetector(
                    onTap: () => _openCta(post.ctaHref!),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Image.network(_youtubeThumbnailUrl(post.ctaHref)!),
                          Container(
                            width: 62,
                            height: 62,
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 38,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if (post.mediaUrl != null) ...[
                  const SizedBox(height: 14),
                  if (post.mediaType == 'image')
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(post.mediaUrl!, fit: BoxFit.cover),
                    )
                  else if (post.mediaType == 'video')
                    OutlinedButton.icon(
                      onPressed: () => _openCta(post.mediaUrl!),
                      icon: const Icon(Icons.play_circle_outline, size: 18),
                      label: Text(L10n.of(context).tx('동영상 열기', 'Open Video')),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String? _localizedTitle(L10n t) {
    if (t.code == 'en') return post.titleEn ?? post.title;
    return post.titleKo ?? post.title;
  }

  String _localizedContent(L10n t) {
    if (t.code == 'en') return post.contentEn ?? post.content;
    return post.contentKo ?? post.content;
  }

  String? _localizedCtaLabel(L10n t) {
    if (t.code == 'en') return post.ctaLabelEn ?? post.ctaLabelKo;
    return post.ctaLabelKo ?? post.ctaLabelEn;
  }

  Future<void> _openCta(String href) async {
    final resolved = href.startsWith('http://') || href.startsWith('https://')
        ? href
        : href.startsWith('/')
        ? '${Config.communitySiteUrl}$href'
        : '${Config.communitySiteUrl}/$href';
    final uri = Uri.tryParse(resolved);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String? _youtubeThumbnailUrl(String? href) {
    if (href == null || href.isEmpty) return null;
    final uri = Uri.tryParse(href);
    if (uri == null) return null;
    final host = uri.host.replaceFirst('www.', '').replaceFirst('m.', '');
    String? id;
    if (host == 'youtu.be') {
      id = uri.pathSegments.isNotEmpty ? uri.pathSegments.first : null;
    } else if (host.contains('youtube.com')) {
      if (uri.pathSegments.isNotEmpty &&
          (uri.pathSegments.first == 'shorts' ||
              uri.pathSegments.first == 'live' ||
              uri.pathSegments.first == 'embed') &&
          uri.pathSegments.length > 1) {
        id = uri.pathSegments[1];
      } else {
        id = uri.queryParameters['v'];
      }
    }
    if (id == null || id.isEmpty) return null;
    return 'https://img.youtube.com/vi/$id/hqdefault.jpg';
  }

  String _timeAgo(BuildContext context, DateTime date) {
    final t = L10n.of(context);
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return t.tx('방금 전', 'Just now');
    if (diff.inHours < 1) {
      return t.code == 'en'
          ? '${diff.inMinutes} minutes ago'
          : '${diff.inMinutes}분 전';
    }
    if (diff.inDays < 1) {
      return t.code == 'en'
          ? '${diff.inHours} hours ago'
          : '${diff.inHours}시간 전';
    }
    return t.code == 'en' ? '${diff.inDays} days ago' : '${diff.inDays}일 전';
  }
}

/// A feed item that hides posts from authors this user has blocked.
class CommunityFeedItem extends StatelessWidget {
  const CommunityFeedItem({super.key, required this.post});
  final CommunityPost post;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Set<String>>(
      future: CommunityModeration.blockedAuthors(),
      builder: (context, snapshot) {
        if (snapshot.data?.contains(post.author) ?? false) return const SizedBox.shrink();
        return CommunityPostTile(post: post);
      },
    );
  }
}
