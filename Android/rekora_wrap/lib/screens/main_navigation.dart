import 'package:flutter/material.dart';

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
    return Scaffold(
      body: IndexedStack(
        index: _selectedTabIndex,
        children: [
          const Placeholder(),
          const Placeholder(),
          const Placeholder(),
          const Placeholder(),
          const Placeholder(),
          const Placeholder(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTabIndex,
        onTap: _selectTab,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.folder),
            label: 'Projects',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_customize),
            label: 'AI Wrap',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.palette),
            label: 'Design',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.garage),
            label: 'Garage',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
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
