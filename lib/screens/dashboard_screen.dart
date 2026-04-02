import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/api_service.dart';
import '../services/auth_storage_service.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool _loading = true;
  bool _busy = false;
  String? _error;

  int _selectedIndex = 0;

  Map<String, dynamic> _profile = {};
  Map<String, dynamic> _stats = {};
  Map<String, dynamic> _overview = {};
  Map<String, dynamic> _recentActivity = {};
  Map<String, dynamic> _schemesSummary = {};
  Map<String, dynamic> _projectsSummary = {};
  Map<String, dynamic> _beneficiariesSummary = {};
  Map<String, dynamic> _approvalsSummary = {};
  Map<String, dynamic> _usersSummary = {};

  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _schemes = [];
  List<Map<String, dynamic>> _projects = [];
  List<Map<String, dynamic>> _beneficiaries = [];
  List<Map<String, dynamic>> _approvals = [];

  final _searchController = TextEditingController();
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool get _isAdmin => ['SUPER_ADMIN', 'ADMIN'].contains(_role);
  bool get _canCreate => _isAdmin || ['DEPARTMENT_OFFICER', 'DATA_ENTRY'].contains(_role);
  bool get _canReview => _isAdmin || _role == 'DEPARTMENT_OFFICER';
  String get _role => (_profile['role'] ?? 'VIEWER').toString();

  List<_NavigationItem> get _navItems {
    return [
      const _NavigationItem(label: 'Overview', icon: Icons.space_dashboard_outlined),
      const _NavigationItem(label: 'Schemes', icon: Icons.account_tree_outlined),
      const _NavigationItem(label: 'Projects', icon: Icons.inventory_2_outlined),
      const _NavigationItem(label: 'Beneficiaries', icon: Icons.groups_outlined),
      const _NavigationItem(label: 'Approvals', icon: Icons.fact_check_outlined),
      if (_isAdmin) const _NavigationItem(label: 'Users', icon: Icons.admin_panel_settings_outlined),
      const _NavigationItem(label: 'Control Room', icon: Icons.monitor_heart_outlined),
      const _NavigationItem(label: 'Profile', icon: Icons.badge_outlined),
    ];
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final cachedUser = await AuthStorageService.getUser();

      final primaryResults = await Future.wait<dynamic>([
        ApiService.getProfile(),
        ApiService.getDashboardStats(),
        ApiService.getDashboardOverview(),
        ApiService.getRecentActivity(),
        ApiService.getSchemes(),
        ApiService.getSchemesSummary(),
        ApiService.getProjects(),
        ApiService.getProjectsSummary(),
        ApiService.getBeneficiaries(),
        ApiService.getBeneficiariesSummary(),
        ApiService.getApprovals(),
        ApiService.getApprovalsSummary(),
      ]);

      final profile = Map<String, dynamic>.from(primaryResults[0] as Map<String, dynamic>);
      final role = (profile['role'] ?? cachedUser?['role'] ?? 'VIEWER').toString();

      List<Map<String, dynamic>> loadedUsers = [];
      Map<String, dynamic> loadedUsersSummary = {};
      if (role == 'SUPER_ADMIN' || role == 'ADMIN') {
        try {
          final extraResults = await Future.wait<dynamic>([
            ApiService.getUsers(),
            ApiService.getUsersSummary(),
          ]);
          loadedUsers = List<Map<String, dynamic>>.from(extraResults[0] as List<Map<String, dynamic>>);
          loadedUsersSummary = Map<String, dynamic>.from(extraResults[1] as Map<String, dynamic>);
        } catch (_) {}
      }

      await AuthStorageService.saveLogin(
        token: (await AuthStorageService.getToken()) ?? '',
        user: profile,
      );

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _stats = Map<String, dynamic>.from(primaryResults[1] as Map<String, dynamic>);
        _overview = Map<String, dynamic>.from(primaryResults[2] as Map<String, dynamic>);
        _recentActivity = Map<String, dynamic>.from(primaryResults[3] as Map<String, dynamic>);
        _schemes = List<Map<String, dynamic>>.from(primaryResults[4] as List<Map<String, dynamic>>);
        _schemesSummary = Map<String, dynamic>.from(primaryResults[5] as Map<String, dynamic>);
        _projects = List<Map<String, dynamic>>.from(primaryResults[6] as List<Map<String, dynamic>>);
        _projectsSummary = Map<String, dynamic>.from(primaryResults[7] as Map<String, dynamic>);
        _beneficiaries = List<Map<String, dynamic>>.from(primaryResults[8] as List<Map<String, dynamic>>);
        _beneficiariesSummary = Map<String, dynamic>.from(primaryResults[9] as Map<String, dynamic>);
        _approvals = List<Map<String, dynamic>>.from(primaryResults[10] as List<Map<String, dynamic>>);
        _approvalsSummary = Map<String, dynamic>.from(primaryResults[11] as Map<String, dynamic>);
        _users = loadedUsers;
        _usersSummary = loadedUsersSummary;
      });
    } catch (e) {
      final message = e.toString().replaceFirst('Exception: ', '');
      if (!mounted) return;
      setState(() => _error = message);
      if (message.toLowerCase().contains('unauthorized')) {
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
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _logout() async {
    await AuthStorageService.clear();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  double _toDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _titleCaseEnum(String value) {
    return value
        .split('_')
        .where((part) => part.trim().isNotEmpty)
        .map((part) => '${part[0]}${part.substring(1).toLowerCase()}')
        .join(' ');
  }

  String _formatCurrency(num value) {
    final text = value.round().toString();
    if (text.length <= 3) return '₹$text';

    final lastThree = text.substring(text.length - 3);
    var remaining = text.substring(0, text.length - 3);
    final groups = <String>[];
    while (remaining.length > 2) {
      groups.insert(0, remaining.substring(remaining.length - 2));
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) {
      groups.insert(0, remaining);
    }
    return '₹${groups.join(',')},$lastThree';
  }

  List<Map<String, dynamic>> get _filteredSchemes => _applySearch(
        _schemes,
        (item) => '${item['title']} ${item['code']} ${item['department']} ${item['status']}',
      );

  List<Map<String, dynamic>> get _filteredProjects => _applySearch(
        _projects,
        (item) => '${item['name']} ${item['code']} ${item['department']} ${item['status']} ${item['priority']}',
      );

  List<Map<String, dynamic>> get _filteredBeneficiaries => _applySearch(
        _beneficiaries,
        (item) => '${item['fullName']} ${item['referenceNumber']} ${item['district']} ${item['block']} ${item['status']}',
      );

  List<Map<String, dynamic>> get _filteredApprovals => _applySearch(
        _approvals,
        (item) => '${item['title']} ${item['referenceNo']} ${item['department']} ${item['status']} ${item['priority']}',
      );

  List<Map<String, dynamic>> get _filteredUsers => _applySearch(
        _users,
        (item) => '${item['fullName']} ${item['email']} ${item['role']} ${item['status']}',
      );

  List<Map<String, dynamic>> _applySearch(
    List<Map<String, dynamic>> items,
    String Function(Map<String, dynamic>) mapper,
  ) {
    if (_search.trim().isEmpty) return items;
    final query = _search.toLowerCase();
    return items.where((item) => mapper(item).toLowerCase().contains(query)).toList();
  }

  Future<void> _withBusy(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openCreateSchemeDialog() async {
    final title = TextEditingController();
    final code = TextEditingController();
    final department = TextEditingController(text: _profile['department']?.toString() ?? '');
    final description = TextEditingController();
    final budget = TextEditingController();
    final startDate = TextEditingController();
    final endDate = TextEditingController();

    await _showFormDialog(
      titleText: 'Create scheme',
      body: Column(
        children: [
          _field(title, 'Scheme title'),
          const SizedBox(height: 12),
          _field(code, 'Scheme code'),
          const SizedBox(height: 12),
          _field(department, 'Department'),
          const SizedBox(height: 12),
          _field(description, 'Description', maxLines: 3),
          const SizedBox(height: 12),
          _field(budget, 'Budget', keyboardType: TextInputType.number),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _field(startDate, 'Start date (YYYY-MM-DD)')),
              const SizedBox(width: 12),
              Expanded(child: _field(endDate, 'End date (YYYY-MM-DD)')),
            ],
          ),
        ],
      ),
      onSubmit: () async {
        if (title.text.trim().isEmpty || code.text.trim().isEmpty || department.text.trim().isEmpty) {
          throw Exception('Title, code, and department are required.');
        }
        await ApiService.createScheme({
          'title': title.text.trim(),
          'code': code.text.trim(),
          'department': department.text.trim(),
          if (description.text.trim().isNotEmpty) 'description': description.text.trim(),
          if (budget.text.trim().isNotEmpty) 'budget': double.tryParse(budget.text.trim()) ?? 0,
          if (startDate.text.trim().isNotEmpty) 'startDate': startDate.text.trim(),
          if (endDate.text.trim().isNotEmpty) 'endDate': endDate.text.trim(),
        });
      },
      successMessage: 'Scheme created successfully.',
    );
  }

  Future<void> _openCreateProjectDialog() async {
    final name = TextEditingController();
    final code = TextEditingController();
    final department = TextEditingController(text: _profile['department']?.toString() ?? '');
    final description = TextEditingController();
    final budget = TextEditingController();
    final beneficiaryCount = TextEditingController();
    final startDate = TextEditingController();
    final endDate = TextEditingController();
    String status = 'PLANNED';
    String priority = 'MEDIUM';
    int? schemeId = _schemes.isNotEmpty ? _toInt(_schemes.first['id']) : null;

    await _showFormDialog(
      titleText: 'Create project',
      body: StatefulBuilder(
        builder: (context, setLocalState) => Column(
          children: [
            _field(name, 'Project name'),
            const SizedBox(height: 12),
            _field(code, 'Project code'),
            const SizedBox(height: 12),
            _field(department, 'Department'),
            const SizedBox(height: 12),
            DropdownButtonFormField<int?>(
              value: schemeId,
              decoration: const InputDecoration(labelText: 'Linked scheme'),
              items: [
                const DropdownMenuItem<int?>(value: null, child: Text('No linked scheme')),
                ..._schemes.map(
                  (scheme) => DropdownMenuItem<int?>(
                    value: _toInt(scheme['id']),
                    child: Text('${scheme['title']} (${scheme['code']})'),
                  ),
                ),
              ],
              onChanged: (value) => setLocalState(() => schemeId = value),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'PLANNED', child: Text('Planned')),
                      DropdownMenuItem(value: 'ONGOING', child: Text('Ongoing')),
                      DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                      DropdownMenuItem(value: 'ON_HOLD', child: Text('On hold')),
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
                      DropdownMenuItem(value: 'LOW', child: Text('Low')),
                      DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                      DropdownMenuItem(value: 'HIGH', child: Text('High')),
                      DropdownMenuItem(value: 'CRITICAL', child: Text('Critical')),
                    ],
                    onChanged: (value) => setLocalState(() => priority = value ?? 'MEDIUM'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _field(description, 'Description', maxLines: 3),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(budget, 'Budget', keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(child: _field(beneficiaryCount, 'Planned beneficiary count', keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(startDate, 'Start date (YYYY-MM-DD)')),
                const SizedBox(width: 12),
                Expanded(child: _field(endDate, 'End date (YYYY-MM-DD)')),
              ],
            ),
          ],
        ),
      ),
      onSubmit: () async {
        if (name.text.trim().isEmpty || code.text.trim().isEmpty || department.text.trim().isEmpty) {
          throw Exception('Name, code, and department are required.');
        }
        await ApiService.createProject({
          'name': name.text.trim(),
          'code': code.text.trim(),
          'department': department.text.trim(),
          'status': status,
          'priority': priority,
          if (description.text.trim().isNotEmpty) 'description': description.text.trim(),
          if (budget.text.trim().isNotEmpty) 'budget': double.tryParse(budget.text.trim()) ?? 0,
          if (beneficiaryCount.text.trim().isNotEmpty)
            'beneficiaryCount': int.tryParse(beneficiaryCount.text.trim()) ?? 0,
          if (schemeId != null) 'schemeId': schemeId,
          if (startDate.text.trim().isNotEmpty) 'startDate': startDate.text.trim(),
          if (endDate.text.trim().isNotEmpty) 'endDate': endDate.text.trim(),
        });
      },
      successMessage: 'Project created successfully.',
    );
  }

  Future<void> _openCreateBeneficiaryDialog() async {
    final fullName = TextEditingController();
    final reference = TextEditingController();
    final gender = TextEditingController();
    final district = TextEditingController();
    final block = TextEditingController();
    final phone = TextEditingController();
    final remarks = TextEditingController();
    final sanctionedAmount = TextEditingController();
    String? selectedScheme = _schemes.isNotEmpty ? _schemes.first['id'].toString() : null;
    String? selectedProject = _projects.isNotEmpty ? _projects.first['id'].toString() : null;

    await _showFormDialog(
      titleText: 'Add beneficiary',
      body: StatefulBuilder(
        builder: (context, setLocalState) => Column(
          children: [
            _field(fullName, 'Full name'),
            const SizedBox(height: 12),
            _field(reference, 'Reference number'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(gender, 'Gender')),
                const SizedBox(width: 12),
                Expanded(child: _field(phone, 'Phone')),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(district, 'District')),
                const SizedBox(width: 12),
                Expanded(child: _field(block, 'Block')),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: selectedScheme,
              decoration: const InputDecoration(labelText: 'Linked scheme'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('No linked scheme')),
                ..._schemes.map(
                  (scheme) => DropdownMenuItem<String?>(
                    value: scheme['id'].toString(),
                    child: Text('${scheme['title']} (${scheme['code']})'),
                  ),
                ),
              ],
              onChanged: (value) => setLocalState(() => selectedScheme = value),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: selectedProject,
              decoration: const InputDecoration(labelText: 'Linked project'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('No linked project')),
                ..._projects.map(
                  (project) => DropdownMenuItem<String?>(
                    value: project['id'].toString(),
                    child: Text('${project['name']} (${project['code']})'),
                  ),
                ),
              ],
              onChanged: (value) => setLocalState(() => selectedProject = value),
            ),
            const SizedBox(height: 12),
            _field(sanctionedAmount, 'Sanctioned amount', keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            _field(remarks, 'Remarks', maxLines: 3),
          ],
        ),
      ),
      onSubmit: () async {
        if (fullName.text.trim().isEmpty || reference.text.trim().isEmpty) {
          throw Exception('Full name and reference number are required.');
        }
        await ApiService.createBeneficiary({
          'fullName': fullName.text.trim(),
          'referenceNumber': reference.text.trim(),
          if (gender.text.trim().isNotEmpty) 'gender': gender.text.trim(),
          if (district.text.trim().isNotEmpty) 'district': district.text.trim(),
          if (block.text.trim().isNotEmpty) 'block': block.text.trim(),
          if (phone.text.trim().isNotEmpty) 'phone': phone.text.trim(),
          if (remarks.text.trim().isNotEmpty) 'remarks': remarks.text.trim(),
          if (sanctionedAmount.text.trim().isNotEmpty)
            'sanctionedAmount': double.tryParse(sanctionedAmount.text.trim()) ?? 0,
          if (selectedScheme != null) 'schemeId': int.tryParse(selectedScheme!),
          if (selectedProject != null) 'projectId': int.tryParse(selectedProject!),
        });
      },
      successMessage: 'Beneficiary added successfully.',
    );
  }

  Future<void> _openCreateApprovalDialog() async {
    final title = TextEditingController();
    final reference = TextEditingController();
    final entityType = TextEditingController(text: 'PROJECT');
    final department = TextEditingController(text: _profile['department']?.toString() ?? '');
    final remarks = TextEditingController();
    final dueDate = TextEditingController();
    String priority = 'MEDIUM';
    String? projectId = _projects.isNotEmpty ? _projects.first['id'].toString() : null;

    await _showFormDialog(
      titleText: 'Raise approval item',
      body: StatefulBuilder(
        builder: (context, setLocalState) => Column(
          children: [
            _field(title, 'Approval title'),
            const SizedBox(height: 12),
            _field(reference, 'Reference number'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(entityType, 'Entity type')),
                const SizedBox(width: 12),
                Expanded(child: _field(department, 'Department')),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: const [
                DropdownMenuItem(value: 'LOW', child: Text('Low')),
                DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                DropdownMenuItem(value: 'HIGH', child: Text('High')),
                DropdownMenuItem(value: 'CRITICAL', child: Text('Critical')),
              ],
              onChanged: (value) => setLocalState(() => priority = value ?? 'MEDIUM'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: projectId,
              decoration: const InputDecoration(labelText: 'Project'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('No linked project')),
                ..._projects.map(
                  (project) => DropdownMenuItem<String?>(
                    value: project['id'].toString(),
                    child: Text('${project['name']} (${project['code']})'),
                  ),
                ),
              ],
              onChanged: (value) => setLocalState(() => projectId = value),
            ),
            const SizedBox(height: 12),
            _field(dueDate, 'Due date (YYYY-MM-DD)'),
            const SizedBox(height: 12),
            _field(remarks, 'Remarks', maxLines: 3),
          ],
        ),
      ),
      onSubmit: () async {
        if (title.text.trim().isEmpty || reference.text.trim().isEmpty || department.text.trim().isEmpty) {
          throw Exception('Title, reference number, and department are required.');
        }
        await ApiService.createApproval({
          'title': title.text.trim(),
          'referenceNo': reference.text.trim(),
          'entityType': entityType.text.trim(),
          'department': department.text.trim(),
          'priority': priority,
          if (projectId != null) 'projectId': int.tryParse(projectId!),
          if (dueDate.text.trim().isNotEmpty) 'dueDate': dueDate.text.trim(),
          if (remarks.text.trim().isNotEmpty) 'remarks': remarks.text.trim(),
        });
      },
      successMessage: 'Approval item created successfully.',
    );
  }

  Future<void> _showFormDialog({
    required String titleText,
    required Widget body,
    required Future<void> Function() onSubmit,
    required String successMessage,
  }) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: !_busy,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(titleText),
          content: SizedBox(
            width: 620,
            child: SingleChildScrollView(child: body),
          ),
          actions: [
            TextButton(
              onPressed: _busy ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: _busy
                  ? null
                  : () async {
                      try {
                        await _withBusy(onSubmit);
                        if (!mounted) return;
                        Navigator.pop(context);
                        _showSnack(successMessage);
                        await _loadAll();
                      } catch (e) {
                        _showSnack(e.toString().replaceFirst('Exception: ', ''));
                      }
                    },
              child: Text(_busy ? 'Saving...' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateSchemeStatus(Map<String, dynamic> scheme) async {
    String status = (scheme['status'] ?? 'DRAFT').toString();
    final description = TextEditingController(text: scheme['description']?.toString() ?? '');
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Update scheme: ${scheme['code']}'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: 'DRAFT', child: Text('Draft')),
                  DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
                  DropdownMenuItem(value: 'CLOSED', child: Text('Closed')),
                ],
                onChanged: (value) => status = value ?? 'DRAFT',
              ),
              const SizedBox(height: 12),
              _field(description, 'Description', maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _withBusy(() async {
                  await ApiService.updateSchemeStatus(
                    id: _toInt(scheme['id']),
                    status: status,
                    description: description.text.trim(),
                  );
                });
                if (!mounted) return;
                Navigator.pop(context);
                _showSnack('Scheme status updated.');
                await _loadAll();
              } catch (e) {
                _showSnack(e.toString().replaceFirst('Exception: ', ''));
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateProjectStatus(Map<String, dynamic> project) async {
    String status = (project['status'] ?? 'PLANNED').toString();
    String priority = (project['priority'] ?? 'MEDIUM').toString();
    final description = TextEditingController(text: project['description']?.toString() ?? '');

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Update project: ${project['code']}'),
        content: SizedBox(
          width: 460,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: 'PLANNED', child: Text('Planned')),
                        DropdownMenuItem(value: 'ONGOING', child: Text('Ongoing')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                        DropdownMenuItem(value: 'ON_HOLD', child: Text('On hold')),
                      ],
                      onChanged: (value) => status = value ?? 'PLANNED',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: priority,
                      decoration: const InputDecoration(labelText: 'Priority'),
                      items: const [
                        DropdownMenuItem(value: 'LOW', child: Text('Low')),
                        DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                        DropdownMenuItem(value: 'HIGH', child: Text('High')),
                        DropdownMenuItem(value: 'CRITICAL', child: Text('Critical')),
                      ],
                      onChanged: (value) => priority = value ?? 'MEDIUM',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _field(description, 'Description', maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _withBusy(() async {
                  await ApiService.updateProjectStatus(
                    id: _toInt(project['id']),
                    status: status,
                    priority: priority,
                    description: description.text.trim(),
                  );
                });
                if (!mounted) return;
                Navigator.pop(context);
                _showSnack('Project updated successfully.');
                await _loadAll();
              } catch (e) {
                _showSnack(e.toString().replaceFirst('Exception: ', ''));
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateBeneficiaryStatus(Map<String, dynamic> beneficiary) async {
    String status = (beneficiary['status'] ?? 'IDENTIFIED').toString();
    final remarks = TextEditingController(text: beneficiary['remarks']?.toString() ?? '');
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Update beneficiary: ${beneficiary['referenceNumber']}'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: 'IDENTIFIED', child: Text('Identified')),
                  DropdownMenuItem(value: 'VERIFIED', child: Text('Verified')),
                  DropdownMenuItem(value: 'APPROVED', child: Text('Approved')),
                  DropdownMenuItem(value: 'SUPPORTED', child: Text('Supported')),
                ],
                onChanged: (value) => status = value ?? 'IDENTIFIED',
              ),
              const SizedBox(height: 12),
              _field(remarks, 'Remarks', maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _withBusy(() async {
                  await ApiService.updateBeneficiaryStatus(
                    id: _toInt(beneficiary['id']),
                    status: status,
                    remarks: remarks.text.trim(),
                  );
                });
                if (!mounted) return;
                Navigator.pop(context);
                _showSnack('Beneficiary updated successfully.');
                await _loadAll();
              } catch (e) {
                _showSnack(e.toString().replaceFirst('Exception: ', ''));
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateApprovalStatus(Map<String, dynamic> approval) async {
    String status = (approval['status'] ?? 'PENDING').toString();
    String priority = (approval['priority'] ?? 'MEDIUM').toString();
    final remarks = TextEditingController(text: approval['remarks']?.toString() ?? '');
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Review approval: ${approval['referenceNo']}'),
        content: SizedBox(
          width: 460,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                        DropdownMenuItem(value: 'APPROVED', child: Text('Approved')),
                        DropdownMenuItem(value: 'REJECTED', child: Text('Rejected')),
                        DropdownMenuItem(value: 'RETURNED', child: Text('Returned')),
                      ],
                      onChanged: (value) => status = value ?? 'PENDING',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: priority,
                      decoration: const InputDecoration(labelText: 'Priority'),
                      items: const [
                        DropdownMenuItem(value: 'LOW', child: Text('Low')),
                        DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                        DropdownMenuItem(value: 'HIGH', child: Text('High')),
                        DropdownMenuItem(value: 'CRITICAL', child: Text('Critical')),
                      ],
                      onChanged: (value) => priority = value ?? 'MEDIUM',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _field(remarks, 'Remarks', maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _withBusy(() async {
                  await ApiService.updateApprovalStatus(
                    id: _toInt(approval['id']),
                    status: status,
                    priority: priority,
                    remarks: remarks.text.trim(),
                  );
                });
                if (!mounted) return;
                Navigator.pop(context);
                _showSnack('Approval updated successfully.');
                await _loadAll();
              } catch (e) {
                _showSnack(e.toString().replaceFirst('Exception: ', ''));
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateUserStatus(Map<String, dynamic> user) async {
    String status = (user['status'] ?? 'ACTIVE').toString();
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Update user: ${user['fullName']}'),
        content: SizedBox(
          width: 380,
          child: DropdownButtonFormField<String>(
            value: status,
            decoration: const InputDecoration(labelText: 'Status'),
            items: const [
              DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
              DropdownMenuItem(value: 'INACTIVE', child: Text('Inactive')),
            ],
            onChanged: (value) => status = value ?? 'ACTIVE',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _withBusy(() async {
                  await ApiService.updateUserStatus(id: _toInt(user['id']), status: status);
                });
                if (!mounted) return;
                Navigator.pop(context);
                _showSnack('User status updated.');
                await _loadAll();
              } catch (e) {
                _showSnack(e.toString().replaceFirst('Exception: ', ''));
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    int maxLines = 1,
    TextInputType? keyboardType,
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
    final theme = Theme.of(context);

    return Scaffold(
      key: _scaffoldKey,
      body: SafeArea(
        child: Row(
          children: [
            if (MediaQuery.of(context).size.width >= 1120)
              SizedBox(width: 300, child: _buildSidebar()),
            Expanded(
              child: Column(
                children: [
                  _buildTopBar(theme),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _loadAll,
                      child: _loading
                          ? const Center(child: CircularProgressIndicator())
                          : _error != null
                              ? _buildErrorState()
                              : ListView(
                                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                                  children: [_buildActiveView()],
                                ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      drawer: MediaQuery.of(context).size.width < 1120 ? Drawer(child: _buildSidebar()) : null,
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget? _buildFloatingActionButton() {
    if (!_canCreate) return null;
    final label = _navItems[_selectedIndex].label;
    switch (label) {
      case 'Schemes':
        return FloatingActionButton.extended(
          onPressed: _openCreateSchemeDialog,
          icon: const Icon(Icons.add),
          label: const Text('New Scheme'),
        );
      case 'Projects':
        return FloatingActionButton.extended(
          onPressed: _openCreateProjectDialog,
          icon: const Icon(Icons.add),
          label: const Text('New Project'),
        );
      case 'Beneficiaries':
        return FloatingActionButton.extended(
          onPressed: _openCreateBeneficiaryDialog,
          icon: const Icon(Icons.person_add_alt_1),
          label: const Text('Add Beneficiary'),
        );
      case 'Approvals':
        return FloatingActionButton.extended(
          onPressed: _openCreateApprovalDialog,
          icon: const Icon(Icons.playlist_add_check_circle_outlined),
          label: const Text('New Approval'),
        );
      default:
        return null;
    }
  }

  Widget _buildTopBar(ThemeData theme) {
    final compact = MediaQuery.of(context).size.width < 1120;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
      child: Row(
        children: [
          if (compact)
            IconButton(
              onPressed: () => _scaffoldKey.currentState?.openDrawer(),
              icon: const Icon(Icons.menu_rounded),
            ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _navItems[_selectedIndex].label,
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Connected to ${AppConfig.baseUrl}',
                  style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFF6B7785)),
                ),
              ],
            ),
          ),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _search = value),
              decoration: InputDecoration(
                hintText: 'Search current module',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _search.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _search = '');
                        },
                        icon: const Icon(Icons.close_rounded),
                      ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          FilledButton.tonalIcon(
            onPressed: _loadAll,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0B325B), Color(0xFF114B84)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(Icons.monitor_heart_outlined, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
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
                  (_profile['fullName'] ?? 'Authorized user').toString(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                ),
                const SizedBox(height: 6),
                Text(
                  _titleCaseEnum(_role),
                  style: const TextStyle(color: Color(0xFFD5E6F7)),
                ),
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.12)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'System state',
                        style: TextStyle(color: Color(0xFFD5E6F7), fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${_toInt(_stats['totalProjects'])} projects • ${_toInt(_stats['totalBeneficiaries'])} beneficiaries',
                        style: const TextStyle(color: Colors.white, height: 1.45),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _navItems.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = _navItems[index];
                final selected = index == _selectedIndex;
                return Material(
                  color: selected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(18),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () {
                      setState(() => _selectedIndex = index);
                      if (MediaQuery.of(context).size.width < 1120) Navigator.pop(context);
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                      child: Row(
                        children: [
                          Icon(item.icon, color: selected ? const Color(0xFF114B84) : Colors.white),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.label,
                              style: TextStyle(
                                color: selected ? const Color(0xFF114B84) : Colors.white,
                                fontWeight: FontWeight.w700,
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
                  foregroundColor: const Color(0xFF114B84),
                ),
                onPressed: _logout,
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Logout'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          children: [
            const Icon(Icons.error_outline_rounded, size: 48, color: Color(0xFFD05454)),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Something went wrong.',
              style: const TextStyle(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadAll,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveView() {
    switch (_navItems[_selectedIndex].label) {
      case 'Schemes':
        return _buildSchemesView();
      case 'Projects':
        return _buildProjectsView();
      case 'Beneficiaries':
        return _buildBeneficiariesView();
      case 'Approvals':
        return _buildApprovalsView();
      case 'Users':
        return _buildUsersView();
      case 'Control Room':
        return _buildControlRoomView();
      case 'Profile':
        return _buildProfileView();
      default:
        return _buildOverviewView();
    }
  }

  Widget _buildOverviewView() {
    final kpis = [
      _KpiCardData(title: 'Schemes', value: _toInt(_stats['totalSchemes']).toString(), subtitle: 'Tracked in MIS', icon: Icons.account_tree_outlined),
      _KpiCardData(title: 'Projects', value: _toInt(_stats['totalProjects']).toString(), subtitle: 'Operational pipeline', icon: Icons.inventory_2_outlined),
      _KpiCardData(title: 'Beneficiaries', value: _toInt(_stats['totalBeneficiaries']).toString(), subtitle: 'Registered records', icon: Icons.groups_outlined),
      _KpiCardData(title: 'Pending approvals', value: _toInt(_stats['pendingApprovals']).toString(), subtitle: 'Awaiting review', icon: Icons.pending_actions_outlined),
      _KpiCardData(title: 'Critical approvals', value: _toInt(_stats['criticalApprovals']).toString(), subtitle: 'Immediate attention', icon: Icons.priority_high_rounded),
      _KpiCardData(title: 'Supported beneficiaries', value: _toInt(_stats['supportedBeneficiaries']).toString(), subtitle: 'Reached support stage', icon: Icons.volunteer_activism_outlined),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildExecutiveBanner(),
        const SizedBox(height: 22),
        Wrap(
          spacing: 18,
          runSpacing: 18,
          children: kpis.map((item) => SizedBox(width: 250, child: _KpiCard(data: item))).toList(),
        ),
        const SizedBox(height: 22),
        LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 1180) {
              return Column(
                children: [
                  _buildModuleHealthCard(),
                  const SizedBox(height: 18),
                  _buildStatusStackCard(),
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildModuleHealthCard()),
                const SizedBox(width: 18),
                Expanded(child: _buildStatusStackCard()),
              ],
            );
          },
        ),
        const SizedBox(height: 22),
        LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 1180) {
              return Column(
                children: [
                  _buildPriorityChartCard(),
                  const SizedBox(height: 18),
                  _buildRecentActivityCard(),
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildPriorityChartCard()),
                const SizedBox(width: 18),
                Expanded(child: _buildRecentActivityCard()),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildExecutiveBanner() {
    final totalBudget = _schemes.fold<double>(0, (sum, item) => sum + _toDouble(item['budget'])) +
        _projects.fold<double>(0, (sum, item) => sum + _toDouble(item['budget']));

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0B325B), Color(0xFF1763A1)],
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Wrap(
        spacing: 18,
        runSpacing: 18,
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 720,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Executive MIS command view',
                  style: TextStyle(color: Color(0xFFD6E5F6), fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  'Welcome back, ${_profile['fullName'] ?? 'Officer'}. This redesigned dashboard is fully aligned with your backend modules and exposes live scheme, project, beneficiary, approval, and user data.',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    height: 1.28,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Use this as the PMU operating surface for monitoring programme flow, spotting bottlenecks, and maintaining data discipline.',
                  style: TextStyle(color: Color(0xFFD6E5F6), height: 1.55),
                ),
              ],
            ),
          ),
          Container(
            width: 300,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.14)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Live portfolio value', style: TextStyle(color: Color(0xFFD6E5F6))),
                const SizedBox(height: 8),
                Text(
                  _formatCurrency(totalBudget),
                  style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                _MetricLine(label: 'Active schemes', value: _toInt(_stats['activeSchemes']).toString()),
                _MetricLine(label: 'Ongoing projects', value: _toInt(_stats['ongoingProjects']).toString()),
                _MetricLine(label: 'Approved approvals', value: _toInt(_stats['approvedApprovals']).toString()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModuleHealthCard() {
    final items = [
      ('Schemes', _toInt(_stats['totalSchemes']), _toInt(_stats['activeSchemes'])),
      ('Projects', _toInt(_stats['totalProjects']), _toInt(_stats['ongoingProjects'])),
      ('Beneficiaries', _toInt(_stats['totalBeneficiaries']), _toInt(_stats['supportedBeneficiaries'])),
      ('Approvals', _toInt(_stats['pendingApprovals']) + _toInt(_stats['approvedApprovals']) + _toInt(_stats['rejectedApprovals']), _toInt(_stats['approvedApprovals'])),
    ];

    return _SectionCard(
      title: 'Module health',
      subtitle: 'Quick progress split across all backend entities.',
      child: Column(
        children: items.map((item) {
          final total = item.$2 == 0 ? 1 : item.$2;
          final progress = item.$3 / total;
          return Padding(
            padding: const EdgeInsets.only(bottom: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(item.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text('${item.$3} of ${item.$2}'),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progress.clamp(0, 1),
                    minHeight: 10,
                    backgroundColor: const Color(0xFFE7EEF6),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildStatusStackCard() {
    final projectStatus = _toMap(_overview['projectsByStatus']);
    final approvalStatus = _toMap(_overview['approvalsByStatus']);
    final beneficiaryStatus = _toMap(_overview['beneficiariesByStatus']);

    return _SectionCard(
      title: 'Status distribution',
      subtitle: 'Stacked bars from the live dashboard overview endpoint.',
      child: SizedBox(
        height: 300,
        child: BarChart(
          BarChartData(
            maxY: math.max(
              1,
              [
                projectStatus.values.fold<int>(0, (a, b) => a + b),
                approvalStatus.values.fold<int>(0, (a, b) => a + b),
                beneficiaryStatus.values.fold<int>(0, (a, b) => a + b),
              ].reduce(math.max),
            ).toDouble(),
            barTouchData: BarTouchData(enabled: true),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    const labels = ['Projects', 'Approvals', 'Beneficiaries'];
                    final index = value.toInt();
                    if (index < 0 || index >= labels.length) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(labels[index]),
                    );
                  },
                ),
              ),
            ),
            gridData: const FlGridData(show: false),
            borderData: FlBorderData(show: false),
            barGroups: [
              _stackedBar(0, projectStatus),
              _stackedBar(1, approvalStatus),
              _stackedBar(2, beneficiaryStatus),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPriorityChartCard() {
    final mix = _toMap(_overview['projectPriorityMix']);
    final total = mix.values.fold<int>(0, (sum, item) => sum + item);
    final sections = mix.entries.where((entry) => entry.value > 0).map((entry) {
      final value = entry.value.toDouble();
      return PieChartSectionData(
        value: value,
        title: total == 0 ? '0%' : '${((value / total) * 100).round()}%',
        radius: 72,
        titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
      );
    }).toList();

    return _SectionCard(
      title: 'Project priority mix',
      subtitle: 'Priority spread of projects as reported by the backend.',
      child: Column(
        children: [
          SizedBox(
            height: 220,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 52,
                sections: sections.isEmpty
                    ? [PieChartSectionData(value: 1, title: 'No data', radius: 72)]
                    : sections,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 10,
            children: mix.entries
                .map((entry) => _LegendChip(label: _titleCaseEnum(entry.key), value: entry.value.toString()))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivityCard() {
    final combined = <_ActivityItem>[];

    for (final item in _listFromRecent('schemes')) {
      combined.add(_ActivityItem(
        title: item['title']?.toString() ?? 'Scheme created',
        subtitle: '${item['code'] ?? '-'} • ${item['department'] ?? '-'}',
        type: 'Scheme',
        date: item['createdAt']?.toString() ?? '',
      ));
    }
    for (final item in _listFromRecent('projects')) {
      combined.add(_ActivityItem(
        title: item['name']?.toString() ?? 'Project created',
        subtitle: '${item['code'] ?? '-'} • ${item['department'] ?? '-'}',
        type: 'Project',
        date: item['createdAt']?.toString() ?? '',
      ));
    }
    for (final item in _listFromRecent('beneficiaries')) {
      combined.add(_ActivityItem(
        title: item['fullName']?.toString() ?? 'Beneficiary added',
        subtitle: '${item['referenceNumber'] ?? '-'} • ${item['district'] ?? 'Unknown'}',
        type: 'Beneficiary',
        date: item['createdAt']?.toString() ?? '',
      ));
    }
    for (final item in _listFromRecent('approvals')) {
      combined.add(_ActivityItem(
        title: item['title']?.toString() ?? 'Approval added',
        subtitle: '${item['referenceNo'] ?? '-'} • ${item['department'] ?? '-'}',
        type: 'Approval',
        date: item['createdAt']?.toString() ?? '',
      ));
    }

    combined.sort((a, b) => b.date.compareTo(a.date));

    return _SectionCard(
      title: 'Recent activity',
      subtitle: 'Latest entities entering the MIS system.',
      child: Column(
        children: combined.take(8).map((item) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF7FAFE),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE3ECF5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F0FB),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.bolt_outlined, color: Color(0xFF114B84)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(item.subtitle, style: const TextStyle(color: Color(0xFF607080))),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _StatusPill(label: item.type),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  List<Map<String, dynamic>> _listFromRecent(String key) {
    final data = _recentActivity[key];
    if (data is List) {
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Map<String, int> _toMap(dynamic source) {
    if (source is Map) {
      return source.map((key, value) => MapEntry(key.toString(), _toInt(value)));
    }
    return {};
  }

  BarChartGroupData _stackedBar(int x, Map<String, int> source) {
    final rods = <BarChartRodStackItem>[];
    double current = 0;
    for (final entry in source.entries) {
      final next = current + entry.value;
      rods.add(BarChartRodStackItem(current, next, Colors.primaries[rods.length % Colors.primaries.length]));
      current = next;
    }
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: current,
          width: 42,
          borderRadius: BorderRadius.circular(10),
          rodStackItems: rods,
        ),
      ],
    );
  }

  Widget _buildSchemesView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHero(
          title: 'Scheme registry',
          subtitle: 'Create, track, and maintain scheme master records aligned to backend scheme APIs.',
          actionLabel: _canCreate ? 'Create scheme' : null,
          onPressed: _canCreate ? _openCreateSchemeDialog : null,
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 18,
          runSpacing: 18,
          children: [
            _InfoCard(title: 'Total schemes', value: _schemes.length.toString()),
            _InfoCard(title: 'Active schemes', value: _toInt(_stats['activeSchemes']).toString()),
            _InfoCard(title: 'Departments', value: (_schemesSummary['departmentBreakdown'] as List?)?.length.toString() ?? '0'),
          ],
        ),
        const SizedBox(height: 20),
        _DataTableCard(
          title: 'Scheme list',
          subtitle: 'Full list pulled from /schemes',
          columns: const ['Code', 'Title', 'Department', 'Status', 'Budget', 'Projects', 'Beneficiaries', 'Actions'],
          rows: _filteredSchemes.map((scheme) {
            return [
              scheme['code']?.toString() ?? '-',
              scheme['title']?.toString() ?? '-',
              scheme['department']?.toString() ?? '-',
              _titleCaseEnum((scheme['status'] ?? 'DRAFT').toString()),
              _formatCurrency(_toDouble(scheme['budget'])),
              _toInt((scheme['_count'] ?? {})['projects']).toString(),
              _toInt((scheme['_count'] ?? {})['beneficiaries']).toString(),
              _canReview ? _InlineAction(label: 'Update', onTap: () => _updateSchemeStatus(scheme)) : const Text('-'),
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
        _buildModuleHero(
          title: 'Project operations',
          subtitle: 'Project planning, prioritisation, and execution monitoring from the live project module.',
          actionLabel: _canCreate ? 'Create project' : null,
          onPressed: _canCreate ? _openCreateProjectDialog : null,
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 18,
          runSpacing: 18,
          children: [
            _InfoCard(title: 'Total projects', value: _projects.length.toString()),
            _InfoCard(title: 'Ongoing', value: _toInt(_stats['ongoingProjects']).toString()),
            _InfoCard(title: 'Completed', value: _toInt(_stats['completedProjects']).toString()),
            _InfoCard(title: 'Critical priority', value: _toMap(_overview['projectPriorityMix'])['CRITICAL']?.toString() ?? '0'),
          ],
        ),
        const SizedBox(height: 20),
        _DataTableCard(
          title: 'Project list',
          subtitle: 'Projects with linked scheme information, priority, and workflow state.',
          columns: const ['Code', 'Name', 'Scheme', 'Department', 'Status', 'Priority', 'Budget', 'Actions'],
          rows: _filteredProjects.map((project) {
            final scheme = project['scheme'] is Map<String, dynamic>
                ? Map<String, dynamic>.from(project['scheme'] as Map<String, dynamic>)
                : <String, dynamic>{};
            return [
              project['code']?.toString() ?? '-',
              project['name']?.toString() ?? '-',
              scheme.isEmpty ? '—' : '${scheme['title']} (${scheme['code']})',
              project['department']?.toString() ?? '-',
              _titleCaseEnum((project['status'] ?? 'PLANNED').toString()),
              _titleCaseEnum((project['priority'] ?? 'MEDIUM').toString()),
              _formatCurrency(_toDouble(project['budget'])),
              _canReview ? _InlineAction(label: 'Update', onTap: () => _updateProjectStatus(project)) : const Text('-'),
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
        _buildModuleHero(
          title: 'Beneficiary management',
          subtitle: 'Register beneficiaries, attach them to schemes and projects, and advance them through support stages.',
          actionLabel: _canCreate ? 'Add beneficiary' : null,
          onPressed: _canCreate ? _openCreateBeneficiaryDialog : null,
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 18,
          runSpacing: 18,
          children: [
            _InfoCard(title: 'Total beneficiaries', value: _beneficiaries.length.toString()),
            _InfoCard(title: 'Supported', value: _toInt(_stats['supportedBeneficiaries']).toString()),
            _InfoCard(title: 'Districts covered', value: (_beneficiariesSummary['districtBreakdown'] as List?)?.length.toString() ?? '0'),
          ],
        ),
        const SizedBox(height: 20),
        _DataTableCard(
          title: 'Beneficiary list',
          subtitle: 'Operational beneficiary records from the backend.',
          columns: const ['Reference', 'Full name', 'District', 'Project', 'Scheme', 'Status', 'Amount', 'Actions'],
          rows: _filteredBeneficiaries.map((beneficiary) {
            final project = beneficiary['project'] is Map<String, dynamic>
                ? Map<String, dynamic>.from(beneficiary['project'] as Map<String, dynamic>)
                : <String, dynamic>{};
            final scheme = beneficiary['scheme'] is Map<String, dynamic>
                ? Map<String, dynamic>.from(beneficiary['scheme'] as Map<String, dynamic>)
                : <String, dynamic>{};
            return [
              beneficiary['referenceNumber']?.toString() ?? '-',
              beneficiary['fullName']?.toString() ?? '-',
              beneficiary['district']?.toString() ?? 'Unknown',
              project.isEmpty ? '—' : project['name']?.toString() ?? '—',
              scheme.isEmpty ? '—' : scheme['title']?.toString() ?? '—',
              _titleCaseEnum((beneficiary['status'] ?? 'IDENTIFIED').toString()),
              _formatCurrency(_toDouble(beneficiary['sanctionedAmount'])),
              _canReview ? _InlineAction(label: 'Update', onTap: () => _updateBeneficiaryStatus(beneficiary)) : const Text('-'),
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
        _buildModuleHero(
          title: 'Approvals workflow',
          subtitle: 'Create and review approval records with priority, due dates, and decision traceability.',
          actionLabel: _canCreate ? 'Raise approval' : null,
          onPressed: _canCreate ? _openCreateApprovalDialog : null,
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 18,
          runSpacing: 18,
          children: [
            _InfoCard(title: 'Pending approvals', value: _toInt(_stats['pendingApprovals']).toString()),
            _InfoCard(title: 'Approved', value: _toInt(_stats['approvedApprovals']).toString()),
            _InfoCard(title: 'Rejected', value: _toInt(_stats['rejectedApprovals']).toString()),
            _InfoCard(title: 'Critical priority', value: _toInt(_stats['criticalApprovals']).toString()),
          ],
        ),
        const SizedBox(height: 20),
        _DataTableCard(
          title: 'Approval queue',
          subtitle: 'Live approval records returned by the backend.',
          columns: const ['Reference', 'Title', 'Department', 'Project', 'Status', 'Priority', 'Due date', 'Actions'],
          rows: _filteredApprovals.map((approval) {
            final project = approval['project'] is Map<String, dynamic>
                ? Map<String, dynamic>.from(approval['project'] as Map<String, dynamic>)
                : <String, dynamic>{};
            return [
              approval['referenceNo']?.toString() ?? '-',
              approval['title']?.toString() ?? '-',
              approval['department']?.toString() ?? '-',
              project.isEmpty ? '—' : project['name']?.toString() ?? '—',
              _titleCaseEnum((approval['status'] ?? 'PENDING').toString()),
              _titleCaseEnum((approval['priority'] ?? 'MEDIUM').toString()),
              (approval['dueDate'] ?? '').toString().split('T').first,
              _canReview ? _InlineAction(label: 'Review', onTap: () => _updateApprovalStatus(approval)) : const Text('-'),
            ];
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildUsersView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHero(
          title: 'User administration',
          subtitle: 'Administrative oversight of access, roles, and user activity state.',
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 18,
          runSpacing: 18,
          children: [
            _InfoCard(title: 'Total users', value: _toInt(_stats['totalUsers']).toString()),
            _InfoCard(title: 'Active', value: _toInt(_stats['activeUsers']).toString()),
            _InfoCard(title: 'Inactive', value: _toInt(_stats['inactiveUsers']).toString()),
            _InfoCard(title: 'Roles represented', value: (_usersSummary['roles'] as List?)?.length.toString() ?? '0'),
          ],
        ),
        const SizedBox(height: 20),
        _DataTableCard(
          title: 'User list',
          subtitle: 'Visible only to admins, mapped to backend /users APIs.',
          columns: const ['Name', 'Email', 'Role', 'Status', 'Department', 'Phone', 'Actions'],
          rows: _filteredUsers.map((user) {
            return [
              user['fullName']?.toString() ?? '-',
              user['email']?.toString() ?? '-',
              _titleCaseEnum((user['role'] ?? 'VIEWER').toString()),
              _titleCaseEnum((user['status'] ?? 'ACTIVE').toString()),
              user['department']?.toString() ?? '—',
              user['phone']?.toString() ?? '—',
              _InlineAction(label: 'Update', onTap: () => _updateUserStatus(user)),
            ];
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildControlRoomView() {
    final schemeDept = (_schemesSummary['departmentBreakdown'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final projectDept = (_projectsSummary['departmentBreakdown'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final approvalDept = (_approvalsSummary['departmentBreakdown'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final districtSpread = (_beneficiariesSummary['districtBreakdown'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHero(
          title: 'Control room',
          subtitle: 'Cross-module operational intelligence for PMU reviews, meetings, and management interventions.',
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 1180) {
              return Column(
                children: [
                  _simpleListCard('Schemes by department', schemeDept, 'department'),
                  const SizedBox(height: 18),
                  _simpleListCard('Projects by department', projectDept, 'department'),
                  const SizedBox(height: 18),
                  _simpleListCard('Approvals by department', approvalDept, 'department'),
                  const SizedBox(height: 18),
                  _simpleListCard('Beneficiaries by district', districtSpread, 'district'),
                ],
              );
            }
            return Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _simpleListCard('Schemes by department', schemeDept, 'department')),
                    const SizedBox(width: 18),
                    Expanded(child: _simpleListCard('Projects by department', projectDept, 'department')),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(child: _simpleListCard('Approvals by department', approvalDept, 'department')),
                    const SizedBox(width: 18),
                    Expanded(child: _simpleListCard('Beneficiaries by district', districtSpread, 'district')),
                  ],
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _simpleListCard(String title, List<Map<String, dynamic>> items, String key) {
    return _SectionCard(
      title: title,
      subtitle: 'Direct summary output from backend grouped endpoints.',
      child: Column(
        children: items.isEmpty
            ? const [Text('No data available yet.')]
            : items.map((item) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAFE),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE3ECF5)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          item[key]?.toString() ?? 'Unknown',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 12),
                      _StatusPill(label: item['count']?.toString() ?? '0'),
                    ],
                  ),
                );
              }).toList(),
      ),
    );
  }

  Widget _buildProfileView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildModuleHero(
          title: 'Profile & session',
          subtitle: 'Authenticated user context returned by /auth/me.',
        ),
        const SizedBox(height: 20),
        _SectionCard(
          title: 'Current user',
          subtitle: 'Live identity and access footprint.',
          child: Column(
            children: [
              _ProfileRow(label: 'Full name', value: _profile['fullName']?.toString() ?? '-'),
              _ProfileRow(label: 'Email', value: _profile['email']?.toString() ?? '-'),
              _ProfileRow(label: 'Role', value: _titleCaseEnum(_role)),
              _ProfileRow(label: 'Status', value: _titleCaseEnum((_profile['status'] ?? 'ACTIVE').toString())),
              _ProfileRow(label: 'Department', value: _profile['department']?.toString() ?? 'Unassigned'),
              _ProfileRow(label: 'Phone', value: _profile['phone']?.toString() ?? 'Not provided'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildModuleHero({
    required String title,
    required String subtitle,
    String? actionLabel,
    VoidCallback? onPressed,
  }) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE2EAF2)),
      ),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        runSpacing: 16,
        spacing: 16,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 720,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(subtitle, style: const TextStyle(color: Color(0xFF617182), height: 1.6)),
              ],
            ),
          ),
          if (actionLabel != null && onPressed != null)
            ElevatedButton.icon(
              onPressed: onPressed,
              icon: const Icon(Icons.add_rounded),
              label: Text(actionLabel),
            ),
        ],
      ),
    );
  }
}

class _NavigationItem {
  final String label;
  final IconData icon;

  const _NavigationItem({required this.label, required this.icon});
}

class _KpiCardData {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;

  const _KpiCardData({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
  });
}

class _KpiCard extends StatelessWidget {
  final _KpiCardData data;

  const _KpiCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF2FB),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(data.icon, color: const Color(0xFF114B84)),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(data.value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(data.title, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(data.subtitle, style: const TextStyle(color: Color(0xFF637384))),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _SectionCard({required this.title, required this.subtitle, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(subtitle, style: const TextStyle(color: Color(0xFF617182), height: 1.6)),
            const SizedBox(height: 18),
            child,
          ],
        ),
      ),
    );
  }
}

class _MetricLine extends StatelessWidget {
  final String label;
  final String value;

  const _MetricLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Color(0xFFD6E5F6)))),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _LegendChip extends StatelessWidget {
  final String label;
  final String value;

  const _LegendChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F8FC),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE3ECF5)),
      ),
      child: Text('$label • $value', style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }
}

class _ActivityItem {
  final String title;
  final String subtitle;
  final String type;
  final String date;

  const _ActivityItem({
    required this.title,
    required this.subtitle,
    required this.type,
    required this.date,
  });
}

class _StatusPill extends StatelessWidget {
  final String label;

  const _StatusPill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF2FB),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF114B84)),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final String value;

  const _InfoCard({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF617182))),
              const SizedBox(height: 10),
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}

class _DataTableCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<String> columns;
  final List<List<dynamic>> rows;

  const _DataTableCard({
    required this.title,
    required this.subtitle,
    required this.columns,
    required this.rows,
  });

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: title,
      subtitle: subtitle,
      child: rows.isEmpty
          ? const Text('No records available for this view.')
          : SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 24,
                headingRowColor: MaterialStateProperty.all(const Color(0xFFF4F8FC)),
                columns: columns.map((column) => DataColumn(label: Text(column))).toList(),
                rows: rows.map((row) {
                  return DataRow(
                    cells: row.map((cell) {
                      if (cell is _InlineAction) {
                        return DataCell(
                          InkWell(
                            onTap: cell.onTap,
                            child: Text(
                              cell.label,
                              style: const TextStyle(
                                color: Color(0xFF114B84),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        );
                      }
                      if (cell is Widget) {
                        return DataCell(cell);
                      }
                      return DataCell(Text(cell.toString()));
                    }).toList(),
                  );
                }).toList(),
              ),
            ),
    );
  }
}

class _InlineAction {
  final String label;
  final VoidCallback onTap;

  const _InlineAction({required this.label, required this.onTap});
}

class _ProfileRow extends StatelessWidget {
  final String label;
  final String value;

  const _ProfileRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          SizedBox(
            width: 140,
            child: Text(label, style: const TextStyle(color: Color(0xFF617182))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
