import 'package:flutter/material.dart';

import '../app_state.dart';
import '../models.dart';
import '../theme.dart';
import '../l10n.dart';

enum ProjectFilter { all, planning, design, booked }

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key, required this.onOpenProject, this.onCreateNew});
  final ValueChanged<String> onOpenProject;
  final VoidCallback? onCreateNew;

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  ProjectFilter _filter = ProjectFilter.all;

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final projects = _filtered(state.projects);
    final l10n = L10n.of(context);

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColors = isDark
        ? [
            const Color(0xFF0F172A),
            const Color(0xFF1E1B4B).withOpacity(0.4),
            const Color(0xFF1A0F2E).withOpacity(0.3),
          ]
        : [
            const Color(0xFFF8FAFC),
            const Color(0xFFEEF2FF).withOpacity(0.3),
            const Color(0xFFF5F3FF).withOpacity(0.2),
          ];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: bgColors,
          ),
        ),
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tx('마이 개러지', 'My Garage'),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: Color(0xFF4F46E5),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.tx('차량 촬영부터 디자인, 상담까지 내 개러지에서 모두 관리하세요.',
                        'Manage everything from capture to design and consultation in your garage.'),
                    style: TextStyle(
                      fontSize: 15,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),

                  _FilterChips(
                    selected: _filter,
                    onSelected: (value) => setState(() => _filter = value),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.tx('필터로 기획·디자인·예약 단계를 골라 볼 수 있어요.', 'Filter by planning, design, or booking stages.'),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (projects.isEmpty)
                    _EmptyState(l10n: l10n, onCreate: widget.onCreateNew)
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: projects.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 20),
                      itemBuilder: (context, index) => _ModernProjectCard(
                        project: projects[index],
                        onTap: () => widget.onOpenProject(projects[index].id),
                        l10n: l10n,
                      ),
                    ),
                ],
              ),
            ),
            
            Positioned(
              bottom: 24,
              right: 20,
              child: GestureDetector(
                onTap: widget.onCreateNew,
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4F46E5), Color(0xFF9333EA)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4F46E5).withOpacity(0.4),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 30),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<VehicleProject> _filtered(List<VehicleProject> projects) {
    switch (_filter) {
      case ProjectFilter.all:
        return projects;
      case ProjectFilter.planning:
        return projects.where((p) => p.captureCompleted && !p.designExplored).toList();
      case ProjectFilter.design:
        return projects.where((p) => p.designExplored && !p.consultationBooked).toList();
      case ProjectFilter.booked:
        return projects.where((p) => p.consultationBooked).toList();
    }
  }
}

class _EmptyState extends StatelessWidget {
  final L10n l10n;
  final VoidCallback? onCreate;
  const _EmptyState({required this.l10n, this.onCreate});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onSurface = Theme.of(context).colorScheme.onSurface;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: onSurface.withOpacity(0.07)),
      ),
      child: Column(
        children: [
          Image.asset(
            'assets/icons/wrap_clay/car_placeholder.png',
            width: 120,
            height: 120,
            fit: BoxFit.contain,
            color: isDark ? Colors.white.withOpacity(0.4) : Colors.black.withOpacity(0.25),
            colorBlendMode: BlendMode.srcIn,
          ),
          const SizedBox(height: 20),
          Text(
            l10n.tx('프로젝트가 없습니다.', 'No projects yet.'),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: onSurface.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('새 프로젝트 시작하기'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
              elevation: 0,
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.selected, required this.onSelected});
  final ProjectFilter selected;
  final ValueChanged<ProjectFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: ProjectFilter.values.map((filter) {
          final isSelected = selected == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: GestureDetector(
              onTap: () => onSelected(filter),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF9333EA)])
                      : null,
                  color: isSelected ? null : Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(100),
                  boxShadow: isSelected
                      ? [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))]
                      : [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 2))],
                ),
                child: Text(
                  _label(context, filter),
                  style: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _label(BuildContext context, ProjectFilter filter) {
    switch (filter) {
      case ProjectFilter.all: return L10n.of(context).tx('전체', 'All');
      case ProjectFilter.planning: return L10n.of(context).tx('기획', 'Planning');
      case ProjectFilter.design: return L10n.of(context).tx('디자인', 'Design');
      case ProjectFilter.booked: return L10n.of(context).tx('예약', 'Booked');
    }
  }
}

class _ModernProjectCard extends StatelessWidget {
  const _ModernProjectCard({
    required this.project,
    required this.onTap,
    required this.l10n,
  });
  final VehicleProject project;
  final VoidCallback onTap;
  final L10n l10n;

  @override
  Widget build(BuildContext context) {
    final l10n = this.l10n;
    final statusColor = _getStatusColor(project);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onSurface = Theme.of(context).colorScheme.onSurface;
    final cardColor = Theme.of(context).colorScheme.surface;
    final thumbBg = isDark ? Colors.white.withOpacity(0.05) : Colors.blueGrey.shade50;
    final iconColor = isDark ? Colors.white.withOpacity(0.3) : Colors.blueGrey.withOpacity(0.4);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.25 : 0.06),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 160,
              width: double.infinity,
              color: thumbBg,
              child: Stack(
                children: [
                  Center(
                    child: Image.asset(
                      'assets/icons/wrap_clay/car_placeholder.png',
                      width: 120,
                      height: 100,
                      fit: BoxFit.contain,
                      color: iconColor,
                      colorBlendMode: BlendMode.srcIn,
                    ),
                  ),
                  Positioned(
                    top: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: cardColor.withOpacity(0.92),
                        borderRadius: BorderRadius.circular(100),
                        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 10)],
                      ),
                      child: Text(
                        l10n.projectStageLabel(
                          consultationBooked: project.consultationBooked,
                          designExplored: project.designExplored,
                          captureCompleted: project.captureCompleted,
                        ),
                        style: TextStyle(color: statusColor, fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.vehicleName,
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                      color: onSurface,
                    ),
                  ),
                  if (project.selectedWrap != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '${project.selectedWrap!.brand} • ${project.selectedWrap!.finish}',
                        style: TextStyle(color: onSurface.withOpacity(0.5), fontSize: 13),
                      ),
                    ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${(project.progress * 100).toInt()}%',
                        style: TextStyle(fontWeight: FontWeight.w900, color: statusColor, fontSize: 14),
                      ),
                      Text(
                        l10n.projectStatusSubtitle(
                          consultationBooked: project.consultationBooked,
                          designExplored: project.designExplored,
                          captureCompleted: project.captureCompleted,
                        ),
                        style: TextStyle(color: onSurface.withOpacity(0.4), fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(100),
                    child: LinearProgressIndicator(
                      value: project.progress,
                      minHeight: 6,
                      backgroundColor: onSurface.withOpacity(0.08),
                      valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Icon(Icons.access_time_filled_rounded, size: 14, color: onSurface.withOpacity(0.35)),
                      const SizedBox(width: 6),
                      Text(
                        '${project.createdAt.year}.${project.createdAt.month}.${project.createdAt.day}',
                        style: TextStyle(color: onSurface.withOpacity(0.4), fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                      const Spacer(),
                      Icon(Icons.arrow_forward_ios_rounded, size: 14, color: onSurface.withOpacity(0.25)),
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

  Color _getStatusColor(VehicleProject p) {
    if (p.consultationBooked) return Colors.green.shade500;
    if (p.designExplored) return Colors.orange.shade500;
    if (p.captureCompleted) return Colors.blue.shade500;
    return Colors.blueGrey.shade400;
  }

}
