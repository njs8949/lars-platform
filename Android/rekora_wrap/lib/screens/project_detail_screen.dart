import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher_string.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';
import 'visualizer_screen.dart';
import 'booking_screen.dart';

class ProjectDetailScreen extends StatefulWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  late TextEditingController _notesController;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final l10n = L10n.of(context);
    VehicleProject? found;
    for (final item in state.projects) {
      if (item.id == widget.projectId) {
        found = item;
        break;
      }
    }

    if (found == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.myGarageTitle)),
        body: Center(child: Text(l10n.garageNotFound)),
      );
    }

    final project = found;

    if (_notesController.text != project.notes) {
      _notesController.text = project.notes;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(project.vehicleName),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SummaryCard(project: project, l10n: l10n),
            const SizedBox(height: 20),
            _Timeline(
              project: project,
              onCapture: () => _captureAndMark(state, project.id),
              onDesign: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      body: SafeArea(
                        child: const VisualizerScreen(),
                      ),
                    ),
                  ),
                );
              },
              onBook: () {
                state.markConsultationBooked(project.id);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BookingScreen()),
                );
              },
            ),
            const SizedBox(height: 20),
            _WrapSection(
              project: project,
              onPick: () => _showWrapPicker(context, state, project.id),
            ),
            const SizedBox(height: 20),
            _ActionButtons(
              project: project,
              onCapture: () => state.markCaptureCompleted(project.id),
              onDesign: () => state.markDesignExplored(project.id),
              onBook: (date) async {
                if (date != null) {
                  project.consultationDate = date;
                  project.consultationBooked = true;
                  state.notifyListeners();
                  if (mounted) {
                    _openBookingChat(context, state, project, date);
                  }
                }
              },
            ),
            const SizedBox(height: 20),
            _NotesSection(
              controller: _notesController,
              onSave: (value) => state.updateNotes(project.id, value),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Future<void> _openBookingChat(
    BuildContext context,
    AppState state,
    VehicleProject project,
    DateTime date,
  ) async {
    final nameController = TextEditingController(text: state.profile.name);
    final contactController = TextEditingController();
    final memoController = TextEditingController(text: _notesController.text);

    final l10n = L10n.of(context);
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    l10n.consultationSheetTitle,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(l10n.consultationKakaoNote,
                  style: TextStyle(color: WrapTheme.mutedText(context))),
              const SizedBox(height: 12),
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: l10n.consultationNameLabel,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: contactController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: l10n.consultationContactLabel,
                  hintText: l10n.consultationContactHint,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: memoController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: l10n.consultationMemoLabel,
                  hintText: l10n.consultationMemoHint,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.send),
                  label: Text(l10n.consultationSendBtn),
                  onPressed: () {
                    final summary = StringBuffer()
                      ..writeln('[Rekora Wrap 상담 요청]')
                      ..writeln('차량: ${project.vehicleName}')
                      ..writeln(
                        '시공 희망일: ${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} '
                        '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}',
                      )
                      ..writeln('성함: ${nameController.text.trim()}')
                      ..writeln('연락처: ${contactController.text.trim()}');
                    final memo = memoController.text.trim();
                    if (memo.isNotEmpty) summary.writeln('메모: $memo');

                    final url = Uri.encodeFull(
                      'https://pf.kakao.com/_krxgcn/chat?message=${summary.toString()}',
                    );
                    launchUrlString(url);
                    Navigator.pop(sheetContext);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.consultationSentMsg)),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showWrapPicker(BuildContext context, AppState state, String projectId) async {
    final l10n = L10n.of(context);
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) {
        return DraggableScrollableSheet(
          expand: false,
          maxChildSize: 0.9,
          minChildSize: 0.5,
          initialChildSize: 0.7,
          builder: (ctx, scrollController) {
            return Column(
              children: [
                Container(
                  width: 64,
                  height: 4,
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  decoration: BoxDecoration(
                    color: WrapTheme.border(context),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                Text(l10n.wrapSelectSheetTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    children: [
                      _WrapPickerSection(
                        title: l10n.wrapFilmSection,
                        wraps: state.wraps,
                        onSelect: (wrap) {
                          final ok = state.setWrapForProject(projectId, wrap);
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                ok ? l10n.wrapSelectedMsg(wrap.displayName) : l10n.wrapQuotaExceededMsg,
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 12),
                      _WrapPickerSection(
                        title: 'Color PPF (FLEXIShield)',
                        wraps: state.colorPpfWraps,
                        onSelect: (wrap) {
                          final ok = state.setWrapForProject(projectId, wrap);
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                ok ? l10n.wrapSelectedMsg(wrap.displayName) : l10n.wrapQuotaExceededMsg,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _captureAndMark(AppState state, String projectId) async {
    final picked = await _picker.pickImage(source: ImageSource.camera, maxWidth: 2048);
    if (picked == null) return;
    state.markCaptureCompleted(projectId);
    if (!mounted) return;
    final l10n = L10n.of(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.vehicleCapturedMsg)),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.project, required this.l10n});
  final VehicleProject project;
  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(project.vehicleName, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(
            '${project.createdAt.year}.${project.createdAt.month}.${project.createdAt.day}',
            style: const TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                l10n.projectStageLabel(
                  consultationBooked: project.consultationBooked,
                  designExplored: project.designExplored,
                  captureCompleted: project.captureCompleted,
                ),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              Builder(
                builder: (ctx) => Text(
                  L10n.of(ctx).progressPercent((project.progress * 100).round()),
                  style: const TextStyle(color: Colors.white70),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: project.progress,
            color: Colors.white,
            backgroundColor: Colors.white24,
            minHeight: 8,
            borderRadius: BorderRadius.circular(10),
          ),
        ],
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline({
    required this.project,
    required this.onCapture,
    required this.onDesign,
    required this.onBook,
  });
  final VehicleProject project;
  final VoidCallback onCapture;
  final VoidCallback onDesign;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.processTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Column(
          children: [
            _TimelineTile(
              title: l10n.captureStepTitle,
              subtitle: l10n.captureStepDesc,
              icon: Icons.camera_alt_outlined,
              done: project.captureCompleted,
              onTap: onCapture,
            ),
            _TimelineTile(
              title: l10n.designStepTitle,
              subtitle: l10n.designStepDesc,
              icon: Icons.palette_outlined,
              done: project.designExplored || project.selectedWrap != null,
              onTap: onDesign,
            ),
            _TimelineTile(
              title: l10n.bookingStepTitle,
              subtitle: l10n.bookingStepDesc,
              icon: Icons.calendar_month_outlined,
              done: project.consultationBooked,
              onTap: onBook,
            ),
          ],
        ),
      ],
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.done,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            Icon(icon, color: done ? Colors.green : WrapTheme.mutedText(context)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(color: WrapTheme.mutedText(context))),
                ],
              ),
            ),
            Icon(done ? Icons.check_circle : Icons.radio_button_unchecked,
                color: done ? Colors.green : WrapTheme.mutedText(context)),
          ],
        ),
      ),
    );
  }
}

class _WrapSection extends StatelessWidget {
  const _WrapSection({required this.project, required this.onPick});
  final VehicleProject project;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Builder(
          builder: (ctx) {
            final l10n = L10n.of(ctx);
            return Row(
              children: [
                Text(l10n.wrapSelectSheetTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                TextButton(onPressed: onPick, child: Text(l10n.wrapChangeBtn)),
              ],
            );
          },
        ),
        const SizedBox(height: 8),
        if (project.selectedWrap == null)
          Builder(
            builder: (ctx) => Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: WrapTheme.card(ctx),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: WrapTheme.border(ctx)),
              ),
              child: Text(L10n.of(ctx).noWrapSelected),
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: WrapTheme.card(context),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: WrapTheme.border(context)),
            ),
            child: Row(
              children: [
                Container(width: 54, height: 54, decoration: BoxDecoration(color: project.selectedWrap!.swatch, borderRadius: BorderRadius.circular(14))),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(project.selectedWrap!.displayName, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text('${project.selectedWrap!.finish} • ${project.selectedWrap!.texturePreview}', style: TextStyle(color: WrapTheme.mutedText(context))),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _WrapPickerSection extends StatelessWidget {
  const _WrapPickerSection({
    required this.title,
    required this.wraps,
    required this.onSelect,
  });

  final String title;
  final List<WrapColor> wraps;
  final ValueChanged<WrapColor> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        ...wraps.map(
          (wrap) => ListTile(
            leading: CircleAvatar(backgroundColor: wrap.swatch),
            title: Text(wrap.displayName),
            subtitle: Text('${wrap.finish} • ${wrap.texturePreview}'),
            onTap: () => onSelect(wrap),
          ),
        ),
        if (wraps.isEmpty)
          Builder(
            builder: (ctx) => Text(
              L10n.of(ctx).noResults,
              style: TextStyle(color: WrapTheme.mutedText(ctx)),
            ),
          ),
      ],
    );
  }
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({required this.project, required this.onCapture, required this.onDesign, required this.onBook});
  final VehicleProject project;
  final VoidCallback onCapture;
  final VoidCallback onDesign;
  final Future<void> Function(DateTime?) onBook;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Builder(
          builder: (ctx) {
            final l10n = L10n.of(ctx);
            return Column(
              children: [
                FilledButton.icon(
                  onPressed: project.captureCompleted ? null : onCapture,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: Text(l10n.markCaptureBtn),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: project.designExplored ? null : onDesign,
                  icon: const Icon(Icons.auto_awesome),
                  label: Text(l10n.markDesignBtn),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                ),
                const SizedBox(height: 10),
                ElevatedButton.icon(
                  onPressed: () async {
                    final pickedDate = await showDatePicker(
                      context: ctx,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (pickedDate == null) return;
                    final pickedTime = await showTimePicker(
                      context: ctx,
                      initialTime: TimeOfDay.now(),
                    );
                    if (pickedTime == null) return;
                    final combined = DateTime(
                      pickedDate.year,
                      pickedDate.month,
                      pickedDate.day,
                      pickedTime.hour,
                      pickedTime.minute,
                    );
                    await onBook(combined);
                  },
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: Text(
                    project.consultationBooked && project.consultationDate != null
                        ? l10n.bookingScheduledLabel(
                            '${project.consultationDate!.month}/${project.consultationDate!.day} '
                            '${project.consultationDate!.hour.toString().padLeft(2, '0')}:${project.consultationDate!.minute.toString().padLeft(2, '0')}',
                          )
                        : l10n.bookAppointmentBtn,
                  ),
                  style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _NotesSection extends StatelessWidget {
  const _NotesSection({required this.controller, required this.onSave});
  final TextEditingController controller;
  final ValueChanged<String> onSave;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Builder(
          builder: (ctx) => Text(L10n.of(ctx).notesSection, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(height: 8),
        Builder(
          builder: (ctx) => TextField(
          controller: controller,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: L10n.of(ctx).notesHint,
            filled: true,
            fillColor: WrapTheme.card(context),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: WrapTheme.border(context)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: WrapTheme.border(context)),
            ),
          ),
          onChanged: onSave,
        ),
        ),
      ],
    );
  }
}
