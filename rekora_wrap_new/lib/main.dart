import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/auth_provider.dart';
import 'screens/main_navigation.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: RekoraWrapApp()));
}

class RekoraWrapApp extends ConsumerWidget {
  const RekoraWrapApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'Rekora Wrap',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
        ),
        useMaterial3: true,
      ),
      home: Consumer(
        builder: (context, ref, child) {
          final authState = ref.watch(authStateProvider);

          return authState.when(
            loading: () => const LoadingScreen(),
            error: (error, stackTrace) => ErrorScreen(error: error.toString()),
            data: (user) {
              if (user != null) {
                return const MainNavigation();
              }
              return const LoginScreen();
            },
          );
        },
      ),
    );
  }
}

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Initializing Rekora Wrap...',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class ErrorScreen extends StatelessWidget {
  final String error;

  const ErrorScreen({Key? key, required this.error}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Initialization Error'),
            const SizedBox(height: 8),
            Text(error),
          ],
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late WidgetRef _ref;

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rekora Wrap - Login'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 32),
            Icon(
              Icons.directions_car,
              size: 80,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(height: 32),
            Text(
              'Rekora Wrap',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Vehicle Wrapping Design & Preview',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 64),
            // Apple Sign-In Button
            Consumer(
              builder: (context, ref, child) {
                return ElevatedButton.icon(
                  onPressed: () => _handleAppleSignIn(ref),
                  icon: const Icon(Icons.apple),
                  label: const Text('Sign in with Apple'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(280, 50),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            // Google Sign-In Button
            Consumer(
              builder: (context, ref, child) {
                return ElevatedButton.icon(
                  onPressed: () => _handleGoogleSignIn(ref),
                  icon: const Icon(Icons.g_mobiledata),
                  label: const Text('Sign in with Google'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(280, 50),
                  ),
                );
              },
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Future<void> _handleAppleSignIn(WidgetRef ref) async {
    try {
      // TODO: Implement Apple Sign-In
      // 1. Get Apple ID Token using sign_in_with_apple package
      // 2. Call signInWithApple in auth provider
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Apple Sign-In - Implementation needed')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Apple Sign-In Error: $e')),
      );
    }
  }

  Future<void> _handleGoogleSignIn(WidgetRef ref) async {
    try {
      // TODO: Implement Google Sign-In
      // 1. Get Google ID Token using google_sign_in package
      // 2. Call signInWithGoogle in auth provider
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Google Sign-In - Implementation needed')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Google Sign-In Error: $e')),
      );
    }
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rekora Wrap'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _handleLogout(context),
          ),
        ],
      ),
      body: const Center(
        child: Text('Welcome to Rekora Wrap!'),
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context) async {
    // TODO: Implement logout
  }
}
