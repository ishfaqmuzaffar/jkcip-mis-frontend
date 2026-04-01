import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/auth_storage_service.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool isLoading = true;
  bool isSubmitting = false;
  bool isLoggingOut = false;
  String? errorMessage;

  int selectedIndex = 0;
  Map<String, dynamic>? currentUser;
  Map<String, dynamic> stats = {};
  Map<String, dynamic> overview = {};
  Map<String, dynamic> recentActivity = {};

  List<Map<String, dynamic>> users = [];
  List<Map<String, dynamic>> schemes = [];
  List<Map<String, dynamic>> projects = [];
  List<Map<String, dynamic>> beneficiaries = [];
  List<Map<String, dynamic>> approvals = [];

  @override
  void initState() {
    super.initState();
    loadDashboard();
  }

  String get currentRole => (currentUser?['role'] ?? '').toString();

  bool get isAdmin => currentRole == 'SUPER_ADMIN' || currentRole == 'ADMIN';

  bool get canCreate => isAdmin || currentRole == 'DEPARTMENT_OFFICER' || currentRole == 'DATA_ENTRY';

  bool get canReview => isAdmin || currentRole == 'DEPARTMENT_OFFICER';

  List<_NavItem> get navItems {
    final items = <_NavItem>[
      const _NavItem('Overview', Icons.grid_view_rounded),
      const _NavItem('Analytics', Icons.analytics_outlined),
      const _NavItem('Schemes', Icons.account_tree_outlined),
      const _NavItem('Projects', Icons.assignment_outlined),
      const _NavItem('Beneficiaries', Icons.people_alt_outlined),
      const _NavItem('Approvals', Icons.fact_check_outlined),
      if (isAdmin) const _NavItem('Users', Icons.groups_2_outlined),
      const _NavItem('Profile', Icons.badge_outlined),
    ];
    return items;
  }

  Future<void> loadDashboard() async {
    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final cachedUser = await AuthStorageService.getUser();

      final results = await Future.wait<dynamic>([
        ApiService.getDashboardStats(),
        ApiService.getDashboardOverview(),
        ApiService.getRecentActivity(),
        ApiService.getProfile(),
        ApiService.getSchemes(),
        ApiService.getProjects(),
        ApiService.getBeneficiaries(),
        ApiService.getApprovals(),
      ]);

      final loadedStats = Map<String, dynamic>.from(results[0] as Map<String, dynamic>);
      final loadedOverview = Map<String, dynamic>.from(results[1] as Map<String, dynamic>);
      final loadedRecent = Map<String, dynamic>.from(results[2] as Map<String, dynamic>);
      final profile = Map<String, dynamic>.from(results[3] as Map<String, dynamic>);
      final loadedSchemes = List<Map<String, dynamic>>.from(results[4] as List<Map<String, dynamic>>);
      final loadedProjects = List<Map<String, dynamic>>.from(results[5] as List<Map<String, dynamic>>);
      final loadedBeneficiaries = List<Map<String, dynamic>>.from(results[6] as List<Map<String, dynamic>>);
      final loadedApprovals = List<Map<String, dynamic>>.from(results[7] as List<Map<String, dynamic>>);

      final role = (profile['role'] ?? cachedUser?['role'] ?? '').toString();
      List<Map<String, dynamic>> loadedUsers = [];

      if (role == 'SUPER_ADMIN' || role == 'ADMIN') {
        try {
          loadedUsers = await ApiService.getUsers();
        } catch (_) {
          loadedUsers = [];
        }
      }

      await AuthStorageService.saveLogin(
        token: (await AuthStorageService.getToken()) ?? '',
        user: profile,
      );

      if (!mounted) return;
      setState(() {
        stats = loadedStats;
        overview = loadedOverview;
        recentActivity = loadedRecent;
        currentUser = profile;
        users = loadedUsers;
        schemes = loadedSchemes;
        projects = loadedProjects;
        beneficiaries = loadedBeneficiaries;
        approvals = loadedApprovals;

        final labels = navItems.map((e) => e.label).toList();
        if (selectedIndex >= labels.length) {
          selectedIndex = 0;
        }
      });
    } catch (e) {
      final message = e.toString().replaceFirst('Exception: ', '');
      if (!mounted) return;
      setState(() => errorMessage = message);

      if (message.toLowerCase().contains('unauthorized') || message.contains('401')) {
        await AuthStorageService.clear();
        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> logout() async {
    setState(() => isLoggingOut = true);
    await AuthStorageService.clear();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  int getIntStat(String key) {
    final value = stats[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  String get roleLabel {
    final role = (currentUser?['role'] ?? 'VIEWER').toString();
    return role.replaceAll('_', ' ');
  }

  List<Map<String, dynamic>> _asMapList(dynamic value) {
    if (value is List) {
      return value.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Map<String, int> _asCountMap(String key) {
    final source = overview[key];
    if (source is Map) {
      return source.map((k, v) => MapEntry(k.toString(), _toInt(v)));
    }
    return {};
  }

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  Future<void> _showCreateSchemeDialog() async {
    final titleController = TextEditingController();
    final codeController = TextEditingController();
    final deptController = TextEditingController(text: currentUser?['department']?.toString() ?? '');
    final descController = TextEditingController();
    final budgetController = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Text('Create Scheme'),
          content: SizedBox(
            width: 460,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _dialogField(titleController, 'Title'),
                  const SizedBox(height: 12),
                  _dialogField(codeController, 'Code'),
                  const SizedBox(height: 12),
                  _dialogField(deptController, 'Department'),
                  const SizedBox(height: 12),
                  _dialogField(descController, 'Description', maxLines: 3),
                  const SizedBox(height: 12),
                  _dialogField(budgetController, 'Budget', keyboardType: TextInputType.number),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: isSubmitting ? null : () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (titleController.text.trim().isEmpty ||
                          codeController.text.trim().isEmpty ||
                          deptController.text.trim().isEmpty) {
                        _showSnack('Title, code, and department are required.');
                        return;
                      }
                      setState(() => isSubmitting = true);
                      setLocalState(() {});
                      try {
                        await ApiService.createScheme({
                          'title': titleController.text.trim(),
                          'code': codeController.text.trim(),
                          'department': deptController.text.trim(),
                          'description': descController.text.trim(),
                          'budget': double.tryParse(budgetController.text.trim()) ?? 0,
                        });
                        if (!mounted) return;
                        Navigator.pop(context);
                        _showSnack('Scheme created successfully.');
                        await loadDashboard();
                      } catch (e) {
                        _showSnack(e.toString().replaceFirst('Exception: ', ''));
                      } finally {
                        if (mounted) setState(() => isSubmitting = false);
                      }
                    },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateProjectDialog() async {
    final nameController = TextEditingController();
    final codeController = TextEditingController();
    final deptController = TextEditingController(text: currentUser?['department']?.toString() ?? '');
    final descController = TextEditingController();
    final budgetController = TextEditingController();
    final beneficiaryCountController = TextEditingController();
    int? selectedSchemeId = schemes.isNotEmpty ? _toInt(schemes.first['id']) : null;
    String status = 'PLANNED';
    String priority = 'MEDIUM';

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Text('Create Project'),
          content: SizedBox(
            width: 500,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _dialogField(nameController, 'Project Name'),
                  const SizedBox(height: 12),
                  _dialogField(codeController, 'Code'),
                  const SizedBox(height: 12),
                  _dialogField(deptController, 'Department'),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int?>(
                    value: selectedSchemeId,
                    decoration: const InputDecoration(labelText: 'Scheme'),
                    items: [
                      const DropdownMenuItem<int?>(value: null, child: Text('No scheme selected')),
                      ...schemes.map(
                        (scheme) => DropdownMenuItem<int?>(
                          value: _toInt(scheme['id']),
                          child: Text('${scheme['title'] ?? 'Scheme'} (${scheme['code'] ?? '-'})'),
                        ),
                      ),
                    ],
                    onChanged: (value) => setLocalState(() => selectedSchemeId = value),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: status,
                          decoration: const InputDecoration(labelText: 'Status'),
                          items: const [
                            DropdownMenuItem(value: 'PLANNED', child: Text('PLANNED')),
                            DropdownMenuItem(value: 'ONGOING', child: Text('ONGOING')),
                            DropdownMenuItem(value: 'COMPLETED', child: Text('COMPLETED')),
                            DropdownMenuItem(value: 'ON_HOLD', child: Text('ON HOLD')),
                          ],
                          onChanged: (value) => setLocalState(() => status = value ?? 'PLANNED'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: priority,
                          decoration: const InputDecoration(labelText: 'Priority'),
                          items: const [
                            DropdownMenuItem(value: 'LOW', child: Text('LOW')),
                            DropdownMenuItem(value: 'MEDIUM', child: Text('MEDIUM')),
                            DropdownMenuItem(value: 'HIGH', child: Text('HIGH')),
                            DropdownMenuItem(value: 'CRITICAL', child: Text('CRITICAL')),
                          ],
                          onChanged: (value) => setLocalState(() => priority = value ?? 'MEDIUM'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _dialogField(descController, 'Description', maxLines: 3),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _dialogField(budgetController, 'Budget', keyboardType: TextInputType.number)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _dialogField(
                          beneficiaryCountController,
                          'Beneficiary Count',
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: isSubmitting ? null : () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (nameController.text.trim().isEmpty ||
                          codeController.text.trim().isEmpty ||
                          deptController.text.trim().isEmpty) {
                        _showSnack('Name, code, and department are required.');
                        return;
                      }
                      setState(() => isSubmitting = true);
                      setLocalState(() {});
                      try {
                        await ApiService.createProject({
                          'name': nameController.text.trim(),
                          'code': codeController.text.trim(),
                          'department': deptController.text.trim(),
                          'description': descController.text.trim(),
                          'status': status,
                          'priority': priority,
                          'budget': double.tryParse(budgetController.text.trim()) ?? 0,
                          'beneficiaryCount': int.tryParse(beneficiaryCountController.text.trim()) ?? 0,
                          if (selectedSchemeId != null) 'schemeId': selectedSchemeId,
                        });
                        if (!mounted) return;
                        Navigator.pop(context);
                        _showSnack('Project created successfully.');
                        await loadDashboard();
                      } catch (e) {
                        _showSnack(e.toString().replaceFirst('Exception: ', ''));
                      } finally {
                        if (mounted) setState(() => isSubmitting = false);
                      }
                    },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateBeneficiaryDialog() async {
    final fullNameController = TextEditingController();
    final referenceController = TextEditingController();
    final genderController = TextEditingController();
    final districtController = TextEditingController();
    final blockController = TextEditingController();
    final phoneController = TextEditingController();
    final remarksController = TextEditingController();
    final amountController = TextEditingController();
    int? selectedSchemeId = schemes.isNotEmpty ? _toInt(schemes.first['id']) : null;
    int? selectedProjectId = projects.isNotEmpty ? _toInt(projects.first['id']) : null;

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Text('Add Beneficiary'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _dialogField(fullNameController, 'Full Name'),
                  const SizedBox(height: 12),
                  _dialogField(referenceController, 'Reference Number'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _dialogField(genderController, 'Gender')),
                      const SizedBox(width: 12),
                      Expanded(child: _dialogField(phoneController, 'Phone')),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _dialogField(districtController, 'District')),
                      const SizedBox(width: 12),
                      Expanded(child: _dialogField(blockController, 'Block')),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int?>(
                    value: selectedSchemeId,
                    decoration: const InputDecoration(labelText: 'Scheme'),
                    items: [
                      const DropdownMenuItem<int?>(value: null, child: Text('No scheme selected')),
                      ...schemes.map(
                        (scheme) => DropdownMenuItem<int?>(
                          value: _toInt(scheme['id']),
                          child: Text('${scheme['title'] ?? 'Scheme'} (${scheme['code'] ?? '-'})'),
                        ),
                      ),
                    ],
                    onChanged: (value) => setLocalState(() => selectedSchemeId = value),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int?>(
                    value: selectedProjectId,
                    decoration: const InputDecoration(labelText: 'Project'),
                    items: [
                      const DropdownMenuItem<int?>(value: null, child: Text('No project selected')),
                      ...projects.map(
                        (project) => DropdownMenuItem<int?>(
                          value: _toInt(project['id']),
                          child: Text('${project['name'] ?? 'Project'} (${project['code'] ?? '-'})'),
                        ),
                      ),
                    ],
                    onChanged: (value) => setLocalState(() => selectedProjectId = value),
                  ),
                  const SizedBox(height: 12),
                  _dialogField(amountController, 'Sanctioned Amount', keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  _dialogField(remarksController, 'Remarks', maxLines: 3),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: isSubmitting ? null : () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (fullNameController.text.trim().isEmpty || referenceController.text.trim().isEmpty) {
                        _showSnack('Full name and reference number are required.');
                        return;
                      }
                      setState(() => isSubmitting = true);
                      setLocalState(() {});
                      try {
                        await ApiService.createBeneficiary({
                          'fullName': fullNameController.text.trim(),
                          'referenceNumber': referenceController.text.trim(),
                          'gender': genderController.text.trim(),
                          'district': districtController.text.trim(),
                          'block': blockController.text.trim(),
                          'phone': phoneController.text.trim(),
                          'remarks': remarksController.text.trim(),
                          'sanctionedAmount': double.tryParse(amountController.text.trim()) ?? 0,
                          if (selectedSchemeId != null) 'schemeId': selectedSchemeId,
                          if (selectedProjectId != null) 'projectId': selectedProjectId,
                        });
                        if (!mounted) return;
                        Navigator.pop(context);
                        _showSnack('Beneficiary created successfully.');
                        await loadDashboard();
                      } catch (e) {
                        _showSnack(e.toString().replaceFirst('Exception: ', ''));
                      } finally {
                        if (mounted) setState(() => isSubmitting = false);
                      }
                    },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showCreateApprovalDialog() async {
    final titleController = TextEditingController();
    final refController = TextEditingController();
    final entityTypeController = TextEditingController(text: 'PROJECT');
    final departmentController = TextEditingController(text: currentUser?['department']?.toString() ?? '');
    final remarksController = TextEditingController();
    int? selectedProjectId = projects.isNotEmpty ? _toInt(projects.first['id']) : null;
    String priority = 'MEDIUM';

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Text('Create Approval Request'),
          content: SizedBox(
            width: 500,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _dialogField(titleController, 'Title'),
                  const SizedBox(height: 12),
                  _dialogField(refController, 'Reference Number'),
                  const SizedBox(height: 12),
                  _dialogField(entityTypeController, 'Entity Type'),
                  const SizedBox(height: 12),
                  _dialogField(departmentController, 'Department'),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int?>(
                    value: selectedProjectId,
                    decoration: const InputDecoration(labelText: 'Related Project'),
                    items: [
                      const DropdownMenuItem<int?>(value: null, child: Text('No project selected')),
                      ...projects.map(
                        (project) => DropdownMenuItem<int?>(
                          value: _toInt(project['id']),
                          child: Text('${project['name'] ?? 'Project'} (${project['code'] ?? '-'})'),
                        ),
                      ),
                    ],
                    onChanged: (value) => setLocalState(() => selectedProjectId = value),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: priority,
                    decoration: const InputDecoration(labelText: 'Priority'),
                    items: const [
                      DropdownMenuItem(value: 'LOW', child: Text('LOW')),
                      DropdownMenuItem(value: 'MEDIUM', child: Text('MEDIUM')),
                      DropdownMenuItem(value: 'HIGH', child: Text('HIGH')),
                      DropdownMenuItem(value: 'CRITICAL', child: Text('CRITICAL')),
                    ],
                    onChanged: (value) => setLocalState(() => priority = value ?? 'MEDIUM'),
                  ),
                  const SizedBox(height: 12),
                  _dialogField(remarksController, 'Remarks', maxLines: 3),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: isSubmitting ? null : () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (titleController.text.trim().isEmpty ||
                          refController.text.trim().isEmpty ||
                          entityTypeController.text.trim().isEmpty ||
                          departmentController.text.trim().isEmpty) {
                        _showSnack('Title, reference number, entity type, and department are required.');
                        return;
                      }
                      setState(() => isSubmitting = true);
                      setLocalState(() {});
                      try {
                        await ApiService.createApproval({
                          'title': titleController.text.trim(),
                          'referenceNo': refController.text.trim(),
                          'entityType': entityTypeController.text.trim(),
                          'department': departmentController.text.trim(),
                          'priority': priority,
                          'remarks': remarksController.text.trim(),
                          if (selectedProjectId != null) 'projectId': selectedProjectId,
                        });
                        if (!mounted) return;
                        Navigator.pop(context);
                        _showSnack('Approval request created successfully.');
                        await loadDashboard();
                      } catch (e) {
                        _showSnack(e.toString().replaceFirst('Exception: ', ''));
                      } finally {
                        if (mounted) setState(() => isSubmitting = false);
                      }
                    },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateApprovalStatus(int id, String status) async {
    try {
      setState(() => isSubmitting = true);
      await ApiService.updateApprovalStatus(id: id, status: status);
      _showSnack('Approval updated to $status.');
      await loadDashboard();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => isSubmitting = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  TextField _dialogField(
    TextEditingController controller,
    String label, {
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(labelText: label),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 1100;
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      drawer: isDesktop ? null : Drawer(child: _buildSidebar()),
      body: SafeArea(
        child: Row(
          children: [
            if (isDesktop) SizedBox(width: 300, child: _buildSidebar()),
            Expanded(
              child: Column(
                children: [
                  _buildTopBar(isDesktop),
                  Expanded(
                    child: isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : errorMessage != null
                            ? _ErrorView(message: errorMessage!, onRetry: loadDashboard)
                            : RefreshIndicator(
                                onRefresh: loadDashboard,
                                child: SingleChildScrollView(
                                  physics: const AlwaysScrollableScrollPhysics(),
                                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                                  child: _buildContent(theme),
                                ),
                              ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(bool isDesktop) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE6ECF5))),
      ),
      child: Row(
        children: [
          if (!isDesktop)
            Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
            ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'JKCIP Management Information System',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF102A43),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Live administrative dashboard with institutional metrics, MIS workflows, and role-based access.',
                  style: TextStyle(
                    color: Colors.blueGrey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          OutlinedButton.icon(
            onPressed: isLoading ? null : loadDashboard,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      color: const Color(0xFF0B3C6F),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0x1FFFFFFF))),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      height: 52,
                      width: 52,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.account_balance, color: Colors.white),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Text(
                        'JKCIP MIS',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  currentUser?['fullName']?.toString() ?? 'Authorized User',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.14),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    roleLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: navItems.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = navItems[index];
                final isSelected = selectedIndex == index;
                return Material(
                  color: isSelected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      setState(() => selectedIndex = index);
                      if (Scaffold.maybeOf(context)?.isDrawerOpen ?? false) {
                        Navigator.pop(context);
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                      child: Row(
                        children: [
                          Icon(item.icon, color: isSelected ? const Color(0xFF0B3C6F) : Colors.white),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              item.label,
                              style: TextStyle(
                                color: isSelected ? const Color(0xFF0B3C6F) : Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0B3C6F),
                ),
                onPressed: isLoggingOut ? null : logout,
                icon: isLoggingOut
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.logout_rounded),
                label: const Text('Logout'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(ThemeData theme) {
    final label = navItems[selectedIndex].label;

    switch (label) {
      case 'Analytics':
        return _buildAnalyticsView();
      case 'Schemes':
        return _buildSchemesView();
      case 'Projects':
        return _buildProjectsView();
      case 'Beneficiaries':
        return _buildBeneficiariesView();
      case 'Approvals':
        return _buildApprovalsView();
      case 'Users':
        return _UsersView(users: users);
      case 'Profile':
        return _ProfileView(user: currentUser ?? const {});
      default:
        return _buildOverviewView();
    }
  }

  Widget _buildOverviewView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeroBanner(),
        const SizedBox(height: 22),
        _buildKpis(),
        const SizedBox(height: 22),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 980;
            if (stacked) {
              return Column(
                children: [
                  _buildStatusBarChart(),
                  const SizedBox(height: 20),
                  _buildApprovalsPieChart(),
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: _buildStatusBarChart()),
                const SizedBox(width: 20),
                Expanded(flex: 2, child: _buildApprovalsPieChart()),
              ],
            );
          },
        ),
        const SizedBox(height: 22),
        _buildRecentActivityPanel(),
      ],
    );
  }

  Widget _buildHeroBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0E467F), Color(0xFF1A6ABA)],
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x18000000), blurRadius: 24, offset: Offset(0, 14)),
        ],
      ),
      child: Wrap(
        runSpacing: 18,
        spacing: 18,
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 680,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Operational Overview',
                  style: TextStyle(color: Color(0xFFD8E9FA), fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  'Welcome, ${currentUser?['fullName'] ?? 'User'}. Monitor schemes, projects, beneficiaries, and approvals from one professional MIS dashboard.',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'This interface now pulls live MIS modules from your backend and supports role-based workflows for viewing, creation, and approvals.',
                  style: TextStyle(color: Color(0xFFD8E9FA), height: 1.5),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white.withOpacity(0.14)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Access Profile',
                  style: TextStyle(color: Color(0xFFD8E9FA), fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
                Text(
                  roleLabel,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  currentUser?['department']?.toString().isNotEmpty == true
                      ? currentUser!['department'].toString()
                      : 'Department not assigned',
                  style: const TextStyle(color: Color(0xFFD8E9FA)),
                ),
                const SizedBox(height: 12),
                Text(
                  canReview
                      ? 'Review access enabled'
                      : canCreate
                          ? 'Submission access enabled'
                          : 'View-only access',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpis() {
    final cards = [
      _KpiData(title: 'Total Users', value: getIntStat('totalUsers').toString(), subtitle: 'Registered system users', icon: Icons.groups_outlined),
      _KpiData(title: 'Schemes', value: getIntStat('totalSchemes').toString(), subtitle: 'All schemes in MIS', icon: Icons.account_tree_outlined),
      _KpiData(title: 'Projects', value: getIntStat('totalProjects').toString(), subtitle: 'Tracked projects', icon: Icons.assignment_outlined),
      _KpiData(title: 'Beneficiaries', value: getIntStat('totalBeneficiaries').toString(), subtitle: 'Registered beneficiaries', icon: Icons.people_alt_outlined),
      _KpiData(title: 'Pending Approvals', value: getIntStat('pendingApprovals').toString(), subtitle: 'Awaiting decision', icon: Icons.pending_actions_outlined),
      _KpiData(title: 'Approved Approvals', value: getIntStat('approvedApprovals').toString(), subtitle: 'Already approved items', icon: Icons.verified_outlined),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: cards.length,
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 320,
        mainAxisExtent: 190,
        mainAxisSpacing: 18,
        crossAxisSpacing: 18,
      ),
      itemBuilder: (context, index) => _KpiCard(data: cards[index]),
    );
  }

  Widget _buildStatusBarChart() {
    final barData = <_ChartBarData>[
      _ChartBarData('Schemes', getIntStat('totalSchemes')),
      _ChartBarData('Projects', getIntStat('totalProjects')),
      _ChartBarData('Beneficiaries', getIntStat('totalBeneficiaries')),
      _ChartBarData('Pending', getIntStat('pendingApprovals')),
      _ChartBarData('Approved', getIntStat('approvedApprovals')),
      _ChartBarData('Critical', getIntStat('criticalApprovals')),
    ];
    final maxValue = math.max(1, barData.map((e) => e.value).fold<int>(0, math.max));

    return _Panel(
      title: 'MIS Volume Snapshot',
      subtitle: 'High-level comparison across major programme entities.',
      child: SizedBox(
        height: 320,
        child: BarChart(
          BarChartData(
            alignment: BarChartAlignment.spaceAround,
            maxY: maxValue.toDouble() * 1.25,
            gridData: FlGridData(
              show: true,
              horizontalInterval: math.max(1, maxValue / 4).toDouble(),
              drawVerticalLine: false,
            ),
            borderData: FlBorderData(show: false),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 38,
                  getTitlesWidget: (value, meta) => Text(
                    value.toInt().toString(),
                    style: const TextStyle(fontSize: 11, color: Color(0xFF486581)),
                  ),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    final index = value.toInt();
                    if (index < 0 || index >= barData.length) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(barData[index].label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                    );
                  },
                ),
              ),
            ),
            barGroups: List.generate(barData.length, (index) {
              return BarChartGroupData(
                x: index,
                barRods: [
                  BarChartRodData(
                    toY: barData[index].value.toDouble(),
                    width: 24,
                    borderRadius: BorderRadius.circular(8),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1B6FB8), Color(0xFF6EA8D9)],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildApprovalsPieChart() {
    final sections = [
      _PieData('Pending', getIntStat('pendingApprovals'), const Color(0xFFF5A623)),
      _PieData('Approved', getIntStat('approvedApprovals'), const Color(0xFF1D8D5C)),
      _PieData('Rejected', getIntStat('rejectedApprovals'), const Color(0xFFCC4E5C)),
      _PieData('Critical', getIntStat('criticalApprovals'), const Color(0xFF1B6FB8)),
    ];
    final total = sections.fold<int>(0, (sum, item) => sum + item.value);

    return _Panel(
      title: 'Approval Distribution',
      subtitle: 'Current approval mix based on live backend totals.',
      child: Column(
        children: [
          SizedBox(
            height: 240,
            child: total == 0
                ? const Center(child: Text('No approval data available yet.'))
                : PieChart(
                    PieChartData(
                      sectionsSpace: 3,
                      centerSpaceRadius: 56,
                      sections: sections.map((item) {
                        final percentage = total == 0 ? 0.0 : (item.value / total) * 100;
                        return PieChartSectionData(
                          color: item.color,
                          value: item.value.toDouble(),
                          title: item.value == 0 ? '' : '${percentage.toStringAsFixed(0)}%',
                          radius: 58,
                          titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12),
                        );
                      }).toList(),
                    ),
                  ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 14,
            runSpacing: 10,
            children: sections
                .map(
                  (item) => Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 10, height: 10, decoration: BoxDecoration(color: item.color, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Text('${item.label}: ${item.value}'),
                    ],
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivityPanel() {
    final recentSchemes = _asMapList(recentActivity['schemes']);
    final recentProjects = _asMapList(recentActivity['projects']);
    final recentBeneficiaries = _asMapList(recentActivity['beneficiaries']);
    final recentApprovals = _asMapList(recentActivity['approvals']);

    return LayoutBuilder(
      builder: (context, constraints) {
        final stacked = constraints.maxWidth < 980;
        final widgets = [
          _Panel(
            title: 'Recent Schemes',
            subtitle: 'Most recently created schemes.',
            child: _ActivityList(items: recentSchemes, titleKey: 'title', subtitleBuilder: (item) => '${item['code'] ?? '-'} • ${item['department'] ?? '-'}'),
          ),
          _Panel(
            title: 'Recent Projects',
            subtitle: 'Latest project records.',
            child: _ActivityList(items: recentProjects, titleKey: 'name', subtitleBuilder: (item) => '${item['code'] ?? '-'} • ${item['status'] ?? '-'}'),
          ),
          _Panel(
            title: 'Recent Beneficiaries',
            subtitle: 'Latest beneficiary entries.',
            child: _ActivityList(items: recentBeneficiaries, titleKey: 'fullName', subtitleBuilder: (item) => '${item['referenceNumber'] ?? '-'} • ${item['district'] ?? '-'}'),
          ),
          _Panel(
            title: 'Recent Approvals',
            subtitle: 'Latest approval activity.',
            child: _ActivityList(items: recentApprovals, titleKey: 'title', subtitleBuilder: (item) => '${item['referenceNo'] ?? '-'} • ${item['status'] ?? '-'}'),
          ),
        ];

        if (stacked) {
          return Column(children: _withSpacing(widgets, const SizedBox(height: 20)));
        }

        return Column(
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: widgets[0]), const SizedBox(width: 20), Expanded(child: widgets[1])]),
            const SizedBox(height: 20),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: widgets[2]), const SizedBox(width: 20), Expanded(child: widgets[3])]),
          ],
        );
      },
    );
  }

  Widget _buildAnalyticsView() {
    final schemeStatus = _asCountMap('schemesByStatus');
    final projectStatus = _asCountMap('projectsByStatus');
    final approvalStatus = _asCountMap('approvalsByStatus');
    final beneficiaryStatus = _asCountMap('beneficiariesByStatus');
    final projectPriority = _asCountMap('projectPriorityMix');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          title: 'Analytics Board',
          subtitle: 'Detailed breakdown of live MIS status and priority distributions.',
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 980;
            final rows = [
              _buildCountPanel('Schemes by Status', schemeStatus),
              _buildCountPanel('Projects by Status', projectStatus),
              _buildCountPanel('Approvals by Status', approvalStatus),
              _buildCountPanel('Beneficiaries by Status', beneficiaryStatus),
              _buildCountPanel('Project Priority Mix', projectPriority),
            ];
            if (stacked) {
              return Column(children: _withSpacing(rows, const SizedBox(height: 20)));
            }
            return Wrap(spacing: 20, runSpacing: 20, children: rows.map((e) => SizedBox(width: 420, child: e)).toList());
          },
        ),
      ],
    );
  }

  Widget _buildCountPanel(String title, Map<String, int> values) {
    final items = values.entries.toList();
    return _Panel(
      title: title,
      subtitle: 'Summary generated from backend overview endpoint.',
      child: items.isEmpty
          ? const Text('No data available.')
          : Column(
              children: items
                  .map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              entry.key.replaceAll('_', ' '),
                              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF243B53)),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEAF3FB),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              entry.value.toString(),
                              style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF14539A)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildSchemesView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHeader(
          title: 'Schemes',
          subtitle: 'Live list of schemes from the MIS backend.',
          actionLabel: 'Create Scheme',
          canShowAction: canCreate,
          onAction: _showCreateSchemeDialog,
        ),
        const SizedBox(height: 20),
        _buildDataTablePanel(
          title: 'Scheme Register',
          subtitle: 'Scheme title, department, status, and linked totals.',
          columns: const ['Code', 'Title', 'Department', 'Status', 'Projects', 'Beneficiaries'],
          rows: schemes.map((scheme) {
            final count = Map<String, dynamic>.from((scheme['_count'] ?? {}) as Map);
            return [
              scheme['code']?.toString() ?? '-',
              scheme['title']?.toString() ?? '-',
              scheme['department']?.toString() ?? '-',
              scheme['status']?.toString() ?? '-',
              _toInt(count['projects']).toString(),
              _toInt(count['beneficiaries']).toString(),
            ];
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildProjectsView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHeader(
          title: 'Projects',
          subtitle: 'Operational project tracking with status and priority.',
          actionLabel: 'Create Project',
          canShowAction: canCreate,
          onAction: _showCreateProjectDialog,
        ),
        const SizedBox(height: 20),
        _buildDataTablePanel(
          title: 'Project Register',
          subtitle: 'Project name, linked scheme, status, priority, and workload.',
          columns: const ['Code', 'Name', 'Scheme', 'Status', 'Priority', 'Beneficiaries'],
          rows: projects.map((project) {
            final count = Map<String, dynamic>.from((project['_count'] ?? {}) as Map);
            final scheme = project['scheme'] is Map ? Map<String, dynamic>.from(project['scheme'] as Map) : <String, dynamic>{};
            return [
              project['code']?.toString() ?? '-',
              project['name']?.toString() ?? '-',
              scheme['title']?.toString() ?? '-',
              project['status']?.toString() ?? '-',
              project['priority']?.toString() ?? '-',
              _toInt(count['beneficiaries']).toString(),
            ];
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildBeneficiariesView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHeader(
          title: 'Beneficiaries',
          subtitle: 'Approved and supported beneficiary records.',
          actionLabel: 'Add Beneficiary',
          canShowAction: canCreate,
          onAction: _showCreateBeneficiaryDialog,
        ),
        const SizedBox(height: 20),
        _buildDataTablePanel(
          title: 'Beneficiary Register',
          subtitle: 'Beneficiary linkage to schemes and projects.',
          columns: const ['Reference', 'Full Name', 'District', 'Scheme', 'Project', 'Status'],
          rows: beneficiaries.map((beneficiary) {
            final scheme = beneficiary['scheme'] is Map ? Map<String, dynamic>.from(beneficiary['scheme'] as Map) : <String, dynamic>{};
            final project = beneficiary['project'] is Map ? Map<String, dynamic>.from(beneficiary['project'] as Map) : <String, dynamic>{};
            return [
              beneficiary['referenceNumber']?.toString() ?? '-',
              beneficiary['fullName']?.toString() ?? '-',
              beneficiary['district']?.toString() ?? '-',
              scheme['title']?.toString() ?? '-',
              project['name']?.toString() ?? '-',
              beneficiary['status']?.toString() ?? '-',
            ];
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildApprovalsView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHeader(
          title: 'Approvals',
          subtitle: 'Workflow decisions and pending cases.',
          actionLabel: 'Create Approval',
          canShowAction: canCreate,
          onAction: _showCreateApprovalDialog,
        ),
        const SizedBox(height: 20),
        _Panel(
          title: 'Approval Queue',
          subtitle: 'Approve, reject, or review existing workflow items.',
          child: approvals.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(child: Text('No approvals found.')),
                )
              : Column(
                  children: approvals
                      .map(
                        (approval) => Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE4EAF2)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          approval['title']?.toString() ?? 'Untitled Approval',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF102A43),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          '${approval['referenceNo'] ?? '-'} • ${approval['department'] ?? '-'} • ${approval['priority'] ?? '-'}',
                                          style: const TextStyle(color: Color(0xFF486581)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  _statusBadge(approval['status']?.toString() ?? 'UNKNOWN'),
                                ],
                              ),
                              if ((approval['remarks']?.toString() ?? '').isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Text(
                                  approval['remarks'].toString(),
                                  style: const TextStyle(color: Color(0xFF243B53), height: 1.5),
                                ),
                              ],
                              if (canReview && (approval['status']?.toString() == 'PENDING')) ...[
                                const SizedBox(height: 14),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: isSubmitting ? null : () => _updateApprovalStatus(_toInt(approval['id']), 'APPROVED'),
                                      icon: const Icon(Icons.check_circle_outline),
                                      label: const Text('Approve'),
                                    ),
                                    OutlinedButton.icon(
                                      onPressed: isSubmitting ? null : () => _updateApprovalStatus(_toInt(approval['id']), 'REJECTED'),
                                      icon: const Icon(Icons.cancel_outlined),
                                      label: const Text('Reject'),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildModuleHeader({
    required String title,
    required String subtitle,
    required String actionLabel,
    required bool canShowAction,
    required VoidCallback onAction,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _SectionHeader(title: title, subtitle: subtitle),
        ),
        if (canShowAction)
          ElevatedButton.icon(
            onPressed: isSubmitting ? null : onAction,
            icon: const Icon(Icons.add_rounded),
            label: Text(actionLabel),
          ),
      ],
    );
  }

  Widget _buildDataTablePanel({
    required String title,
    required String subtitle,
    required List<String> columns,
    required List<List<String>> rows,
  }) {
    return _Panel(
      title: title,
      subtitle: subtitle,
      child: rows.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: Text('No records found.')),
            )
          : SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(const Color(0xFFF3F6FB)),
                columns: columns.map((column) => DataColumn(label: Text(column))).toList(),
                rows: rows
                    .map((row) => DataRow(cells: row.map((value) => DataCell(Text(value))).toList()))
                    .toList(),
              ),
            ),
    );
  }

  Widget _statusBadge(String status) {
    Color background;
    Color foreground;

    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
      case 'SUPPORTED':
      case 'COMPLETED':
        background = const Color(0xFFE7F7EF);
        foreground = const Color(0xFF1D8D5C);
        break;
      case 'PENDING':
      case 'ONGOING':
      case 'VERIFIED':
      case 'IDENTIFIED':
        background = const Color(0xFFFFF3E0);
        foreground = const Color(0xFFB26A00);
        break;
      case 'REJECTED':
      case 'RETURNED':
      case 'INACTIVE':
      case 'ON_HOLD':
      case 'CLOSED':
        background = const Color(0xFFFCE8EA);
        foreground = const Color(0xFFCC4E5C);
        break;
      default:
        background = const Color(0xFFEAF3FB);
        foreground = const Color(0xFF14539A);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(100)),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(color: foreground, fontWeight: FontWeight.w800, fontSize: 12),
      ),
    );
  }

  List<Widget> _withSpacing(List<Widget> widgets, Widget spacer) {
    final output = <Widget>[];
    for (var i = 0; i < widgets.length; i++) {
      output.add(widgets[i]);
      if (i != widgets.length - 1) {
        output.add(spacer);
      }
    }
    return output;
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SectionHeader({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF102A43)),
        ),
        const SizedBox(height: 6),
        Text(subtitle, style: const TextStyle(color: Color(0xFF486581), height: 1.5)),
      ],
    );
  }
}

class _Panel extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _Panel({required this.title, required this.subtitle, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 18, offset: Offset(0, 10))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF102A43))),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: Color(0xFF486581), height: 1.5)),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final _KpiData data;

  const _KpiCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 18, offset: Offset(0, 10))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFEAF3FB), borderRadius: BorderRadius.circular(16)),
                child: Icon(data.icon, color: const Color(0xFF14539A)),
              ),
              const Spacer(),
              const Icon(Icons.trending_up_rounded, color: Color(0xFF7C8DA6)),
            ],
          ),
          const Spacer(),
          Text(data.value, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Color(0xFF102A43))),
          const SizedBox(height: 8),
          Text(data.title, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF243B53))),
          const SizedBox(height: 4),
          Text(data.subtitle, style: const TextStyle(color: Color(0xFF7B8794), height: 1.4)),
        ],
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 220),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE4EAF2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF7B8794), fontSize: 12, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(color: Color(0xFF102A43), fontWeight: FontWeight.w700, height: 1.4)),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520),
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 18, offset: Offset(0, 10))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 48, color: Color(0xFFCC4E5C)),
            const SizedBox(height: 14),
            const Text('Unable to load dashboard', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF486581), height: 1.5)),
            const SizedBox(height: 18),
            ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Try Again')),
          ],
        ),
      ),
    );
  }
}

class _UsersView extends StatelessWidget {
  final List<Map<String, dynamic>> users;

  const _UsersView({required this.users});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          title: 'User Administration',
          subtitle: 'Visible only for privileged roles. Loaded dynamically from /users.',
        ),
        const SizedBox(height: 20),
        _Panel(
          title: 'Registered Users',
          subtitle: 'Current list of system accounts.',
          child: users.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(child: Text('No users found.')),
                )
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    headingRowColor: WidgetStateProperty.all(const Color(0xFFF3F6FB)),
                    columns: const [
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Email')),
                      DataColumn(label: Text('Role')),
                      DataColumn(label: Text('Status')),
                      DataColumn(label: Text('Department')),
                    ],
                    rows: users
                        .map(
                          (user) => DataRow(
                            cells: [
                              DataCell(Text(user['fullName']?.toString() ?? '-')),
                              DataCell(Text(user['email']?.toString() ?? '-')),
                              DataCell(Text((user['role']?.toString() ?? '-').replaceAll('_', ' '))),
                              DataCell(Text(user['status']?.toString() ?? '-')),
                              DataCell(Text(user['department']?.toString().isNotEmpty == true ? user['department'].toString() : '-')),
                            ],
                          ),
                        )
                        .toList(),
                  ),
                ),
        ),
      ],
    );
  }
}

class _ProfileView extends StatelessWidget {
  final Map<String, dynamic> user;

  const _ProfileView({required this.user});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          title: 'Profile',
          subtitle: 'Authenticated user information fetched from /auth/me.',
        ),
        const SizedBox(height: 20),
        _Panel(
          title: 'Profile Details',
          subtitle: 'Current session identity and account information.',
          child: Wrap(
            runSpacing: 16,
            spacing: 16,
            children: [
              _SummaryTile(label: 'Full Name', value: user['fullName']?.toString() ?? 'N/A'),
              _SummaryTile(label: 'Email', value: user['email']?.toString() ?? 'N/A'),
              _SummaryTile(label: 'Role', value: (user['role']?.toString() ?? 'VIEWER').replaceAll('_', ' ')),
              _SummaryTile(label: 'Status', value: user['status']?.toString() ?? 'N/A'),
              _SummaryTile(label: 'Department', value: user['department']?.toString().isNotEmpty == true ? user['department'].toString() : 'Not assigned'),
              _SummaryTile(label: 'Phone', value: user['phone']?.toString().isNotEmpty == true ? user['phone'].toString() : 'Not provided'),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActivityList extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final String titleKey;
  final String Function(Map<String, dynamic>) subtitleBuilder;

  const _ActivityList({required this.items, required this.titleKey, required this.subtitleBuilder});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Text('No recent activity found.');
    }

    return Column(
      children: items
          .map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    margin: const EdgeInsets.only(top: 6),
                    decoration: const BoxDecoration(color: Color(0xFF14539A), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item[titleKey]?.toString() ?? '-',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF243B53)),
                        ),
                        const SizedBox(height: 4),
                        Text(subtitleBuilder(item), style: const TextStyle(color: Color(0xFF486581), height: 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;

  const _NavItem(this.label, this.icon);
}

class _KpiData {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;

  const _KpiData({required this.title, required this.value, required this.subtitle, required this.icon});
}

class _ChartBarData {
  final String label;
  final int value;

  const _ChartBarData(this.label, this.value);
}

class _PieData {
  final String label;
  final int value;
  final Color color;

  const _PieData(this.label, this.value, this.color);
}
