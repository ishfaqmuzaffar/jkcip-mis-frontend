import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/api_service.dart';
import '../services/auth_storage_service.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isSubmitting = false;
  bool _hidePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final response = await ApiService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      final token = (response['accessToken'] ?? '').toString();
      final user = response['user'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(response['user'] as Map<String, dynamic>)
          : <String, dynamic>{};

      if (token.isEmpty) {
        throw Exception('Backend did not return an access token.');
      }

      await AuthStorageService.saveLogin(token: token, user: user);

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isCompact = constraints.maxWidth < 980;

          return Row(
            children: [
              if (!isCompact)
                Expanded(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF0B325B), Color(0xFF1763A1), Color(0xFF1E88B5)],
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(56),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(color: Colors.white.withOpacity(0.16)),
                                ),
                                child: const Text(
                                  'JKCIP Programme Management Unit',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                                ),
                              ),
                              const SizedBox(height: 32),
                              const Text(
                                'A complete MIS for schemes, projects, beneficiaries, approvals, and executive reporting.',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 34,
                                  fontWeight: FontWeight.w800,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 18),
                              const Text(
                                'This redesigned interface is aligned with the live backend and built for disciplined, government-grade operations across departments.',
                                style: TextStyle(color: Color(0xFFD8E6F5), fontSize: 16, height: 1.7),
                              ),
                              const SizedBox(height: 36),
                              Wrap(
                                spacing: 16,
                                runSpacing: 16,
                                children: const [
                                  _FeatureBadge(icon: Icons.dashboard_outlined, label: 'Executive dashboard'),
                                  _FeatureBadge(icon: Icons.account_tree_outlined, label: 'Scheme to project flow'),
                                  _FeatureBadge(icon: Icons.verified_outlined, label: 'Approval lifecycle'),
                                  _FeatureBadge(icon: Icons.groups_outlined, label: 'Beneficiary oversight'),
                                ],
                              ),
                            ],
                          ),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.10),
                              borderRadius: BorderRadius.circular(28),
                              border: Border.all(color: Colors.white.withOpacity(0.14)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Connected backend',
                                  style: TextStyle(
                                    color: Color(0xFFD8E6F5),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  AppConfig.baseUrl,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 470),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(28),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Sign in to JKCIP MIS',
                                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Use your authorized credentials to enter the MIS and access dashboards, operational modules, and reports.',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: const Color(0xFF5E6B7A),
                                    height: 1.6,
                                  ),
                                ),
                                const SizedBox(height: 28),
                                TextFormField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  decoration: const InputDecoration(
                                    labelText: 'Official email',
                                    prefixIcon: Icon(Icons.alternate_email_rounded),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Please enter your email.';
                                    }
                                    if (!value.contains('@')) {
                                      return 'Please enter a valid email.';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16),
                                TextFormField(
                                  controller: _passwordController,
                                  obscureText: _hidePassword,
                                  decoration: InputDecoration(
                                    labelText: 'Password',
                                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                                    suffixIcon: IconButton(
                                      onPressed: () => setState(() => _hidePassword = !_hidePassword),
                                      icon: Icon(
                                        _hidePassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                      ),
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter your password.';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 24),
                                ElevatedButton.icon(
                                  onPressed: _isSubmitting ? null : _submit,
                                  icon: _isSubmitting
                                      ? const SizedBox(
                                          height: 18,
                                          width: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Icon(Icons.login_rounded),
                                  label: Text(_isSubmitting ? 'Signing in...' : 'Sign in'),
                                ),
                                const SizedBox(height: 22),
                                Container(
                                  padding: const EdgeInsets.all(18),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF6F8FC),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: const Color(0xFFE2EAF2)),
                                  ),
                                  child: const Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(Icons.info_outline_rounded, color: Color(0xFF0F4C81)),
                                      SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          'This screen is intentionally kept focused. All MIS complexity appears after authentication in the redesigned operational dashboard.',
                                          style: TextStyle(height: 1.55, color: Color(0xFF536274)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _FeatureBadge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FeatureBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.14)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 10),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
