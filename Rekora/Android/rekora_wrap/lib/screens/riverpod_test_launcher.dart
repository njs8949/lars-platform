import 'package:flutter/material.dart';
import 'visualizer_screen_riverpod.dart';

/// Riverpod 구현 테스트 런처
class RiverpodTestLauncher extends StatelessWidget {
  const RiverpodTestLauncher({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Riverpod Implementation Test'),
        centerTitle: true,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              '✨ Riverpod-based State Management',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Test the new implementation',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const VisualizerScreenRiverpod(),
                  ),
                );
              },
              icon: const Icon(Icons.dashboard),
              label: const Text('Open AI Wrapping (Riverpod)'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
              ),
            ),
            const SizedBox(height: 100),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '📋 Implementation Checklist:',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text('✅ Riverpod StateNotifierProvider'),
                  Text('✅ ref.watch() automatic sync'),
                  Text('✅ Centralized state management'),
                  Text('✅ Test color selection'),
                  Text('✅ Real-time UI updates'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
