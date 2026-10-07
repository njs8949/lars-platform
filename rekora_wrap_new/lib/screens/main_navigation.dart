import 'package:flutter/material.dart';
import '../app_state.dart';
import '../l10n.dart';
import '../theme.dart';
import 'home_screen.dart';
import 'visualizer_screen_riverpod.dart';
import 'design_screen_riverpod.dart';
import 'garage_screen.dart';
import 'profile_screen.dart';

/// 메인 네비게이션 (탭 기반)
class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedTabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final l10n = L10n.of(context);

    return Scaffold(
      body: IndexedStack(
        index: _selectedTabIndex,
        children: [
          HomeScreen(onSelectTab: _selectTab),
          Container(
            color: WrapTheme.background(context),
            child: const Center(child: Text('Projects')),
          ),
          // 탭 2: AI 랩핑 메뉴 (VisualizerScreenRiverpod)
          const VisualizerScreenRiverpod(),
          // 탭 3: 디자인 허브 (DesignScreenRiverpod)
          const DesignScreenRiverpod(),
          // 탭 4: 마이 개러지
          GarageScreen(onSelectTab: _selectTab),
          // 탭 5: 프로필
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTabIndex,
        onTap: _selectTab,
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.home),
            label: l10n.tx('홈', 'Home'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.folder),
            label: l10n.tx('프로젝트', 'Projects'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard_customize),
            label: l10n.tx('AI 랩핑', 'AI Wrap'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.palette),
            label: l10n.tx('디자인', 'Design'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.garage),
            label: l10n.tx('개러지', 'Garage'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.person),
            label: l10n.tx('프로필', 'Profile'),
          ),
        ],
      ),
    );
  }

  void _selectTab(int index) {
    setState(() {
      _selectedTabIndex = index;
    });
  }
}
