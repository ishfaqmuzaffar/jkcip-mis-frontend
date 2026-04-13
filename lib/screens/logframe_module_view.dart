import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../services/api_service.dart';

class LogframeModuleView extends StatefulWidget {
  final bool canManage;
  const LogframeModuleView({super.key, required this.canManage});

  @override
  State<LogframeModuleView> createState() => _LogframeModuleViewState();
}

class _LogframeModuleViewState extends State<LogframeModuleView> {
  bool isLoading = true;
  bool isUploading = false;
  String? error;

  Map<String, dynamic> summary = const {};
  List<Map<String, dynamic>> outcomes = const [];
  List<Map<String, dynamic>> tree = const [];
  List<Map<String, dynamic>> indicators = const [];

  Uint8List? selectedBytes;
  String? selectedFileName;
  Map<String, dynamic>? preview;
  String importMode = 'skip';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final results = await Future.wait([
        ApiService.getLogframeSummary(),
        ApiService.getLogframeOutcomes(),
        ApiService.getLogframeTree(),
        ApiService.getLogframeIndicators(),
      ]);

      if (!mounted) return;
      setState(() {
        summary = Map<String, dynamic>.from(results[0] as Map);
        outcomes = List<Map<String, dynamic>>.from(results[1] as List);
        tree = List<Map<String, dynamic>>.from(results[2] as List);
        indicators = List<Map<String, dynamic>>.from(results[3] as List);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> _pickAndPreview() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      withData: true,
      allowedExtensions: ['csv', 'xlsx'],
    );

    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.bytes == null) {
      _showSnack('Could not read the selected file.');
      return;
    }

    setState(() {
      isUploading = true;
      selectedBytes = file.bytes;
      selectedFileName = file.name;
      preview = null;
    });

    try {
      final response = await ApiService.previewLogframeImport(
        bytes: file.bytes!,
        filename: file.name,
      );
      if (!mounted) return;
      setState(() => preview = response);
      _showSnack('Preview generated successfully.');
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => isUploading = false);
    }
  }

  Future<void> _commitImport() async {
    if (selectedBytes == null || selectedFileName == null) {
      _showSnack('Pick a CSV or XLSX file first.');
      return;
    }

    setState(() => isUploading = true);
    try {
      final response = await ApiService.commitLogframeImport(
        bytes: selectedBytes!,
        filename: selectedFileName!,
        mode: importMode,
      );
      final committed = Map<String, dynamic>.from(response['committed'] as Map? ?? const {});
      _showSnack(
        'Import completed: ${committed['createdNodes'] ?? 0} nodes, ${committed['createdIndicators'] ?? 0} indicators created.',
      );
      await _loadData();
      if (!mounted) return;
      setState(() => preview = response);
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => isUploading = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  int _intValue(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  double _doubleValue(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  Map<String, dynamic> get _totals => Map<String, dynamic>.from(summary['totals'] as Map? ?? const {});
  List<dynamic> get _levels => List<dynamic>.from(summary['byLevel'] as List? ?? const []);
  Map<String, dynamic> get _previewSummary => Map<String, dynamic>.from(preview?['summary'] as Map? ?? const {});
  List<dynamic> get _previewRows => List<dynamic>.from(preview?['rows'] as List? ?? const []);

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (error != null) {
      return _ErrorState(message: error!, onRetry: _loadData);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _hero(),
        const SizedBox(height: 22),
        _summaryCards(),
        const SizedBox(height: 22),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 1180;
            if (stacked) {
              return Column(
                children: [
                  _outcomePerformance(),
                  const SizedBox(height: 20),
                  _progressTotals(),
                  const SizedBox(height: 20),
                  _levelBreakdown(),
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: _outcomePerformance()),
                const SizedBox(width: 20),
                Expanded(
                  flex: 2,
                  child: Column(
                    children: [
                      _progressTotals(),
                      const SizedBox(height: 20),
                      _levelBreakdown(),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 22),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 1080;
            if (stacked) {
              return Column(
                children: [
                  _treePanel(),
                  const SizedBox(height: 20),
                  _indicatorPanel(),
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: _treePanel()),
                const SizedBox(width: 20),
                Expanded(flex: 3, child: _indicatorPanel()),
              ],
            );
          },
        ),
        if (widget.canManage) ...[
          const SizedBox(height: 22),
          _importPanel(),
        ],
      ],
    );
  }

  Widget _hero() {
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text(
            'Logframe & Import Management',
            style: TextStyle(color: Color(0xFFD8E9FA), fontWeight: FontWeight.w700),
          ),
          SizedBox(height: 10),
          Text(
            'A dedicated module for indicator hierarchy, achievement tracking, and programme reporting in the same visual language as the MIS.',
            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, height: 1.3),
          ),
          SizedBox(height: 10),
          Text(
            'Use the import tools below to upload a structured CSV or XLSX file, preview duplicates, and then commit only new or changed logframe records.',
            style: TextStyle(color: Color(0xFFD8E9FA), height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _summaryCards() {
    final cards = [
      _StatCard('Total Nodes', _intValue(summary['totalNodes']).toString(), Icons.account_tree_outlined),
      _StatCard('Indicators', _intValue(summary['totalIndicators']).toString(), Icons.analytics_outlined),
      _StatCard('Active Indicators', _intValue(summary['activeIndicators']).toString(), Icons.verified_outlined),
      _StatCard('Achievement Rate', '${_doubleValue(summary['achievementRate']).toStringAsFixed(0)}%', Icons.track_changes_outlined),
    ];

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: cards.map((card) => SizedBox(width: 220, child: card)).toList(),
    );
  }

  Widget _outcomePerformance() {
    return _Panel(
      title: 'Outcome Performance',
      subtitle: 'How each outcome is progressing against logged indicator results.',
      child: outcomes.isEmpty
          ? const _EmptyTile(message: 'Outcome data will appear here once the logframe import is seeded.')
          : Column(
              children: outcomes.map((outcome) {
                final rate = _doubleValue(outcome['achievementRate']);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFD),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFDCE6F2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${outcome['code'] ?? ''} • ${outcome['title'] ?? ''}',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF102A43)),
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            minHeight: 10,
                            value: (rate.clamp(0, 100)) / 100,
                            backgroundColor: const Color(0xFFE6EEF8),
                            color: const Color(0xFF1A6ABA),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${_intValue(outcome['achievedIndicators'])}/${_intValue(outcome['indicators'])} indicators achieved • ${rate.toStringAsFixed(1)}%',
                          style: TextStyle(color: Colors.blueGrey.shade700, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _progressTotals() {
    final items = [
      ['Annual target', _totals['annualTarget']],
      ['Annual result', _totals['annualResult']],
      ['Cumulative target', _totals['cumulativeTarget']],
      ['Cumulative result', _totals['cumulativeResult']],
      ['Male', _totals['maleValue']],
      ['Female', _totals['femaleValue']],
      ['Youth', _totals['youthValue']],
      ['Households', _totals['householdValue']],
    ];

    return _Panel(
      title: 'Progress Totals',
      subtitle: 'Consolidated values currently available in the backend.',
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: items.map((item) {
          return Container(
            width: 110,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFD),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFDCE6F2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item[0].toString(), style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade700, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(_doubleValue(item[1]).toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: Color(0xFF102A43))),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _levelBreakdown() {
    return _Panel(
      title: 'Level Breakdown',
      subtitle: 'Indicator distribution across logframe levels.',
      child: _levels.isEmpty
          ? const _EmptyTile(message: 'Level-wise breakdown is not available yet.')
          : Column(
              children: _levels.map((entry) {
                final row = Map<String, dynamic>.from(entry as Map);
                return ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(row['level']?.toString() ?? '-', style: const TextStyle(fontWeight: FontWeight.w700)),
                  trailing: Text('${_intValue(row['indicators'])} indicators', style: const TextStyle(fontWeight: FontWeight.w700)),
                );
              }).toList(),
            ),
    );
  }

  Widget _treePanel() {
    return _Panel(
      title: 'Logframe Tree',
      subtitle: 'Imported hierarchy of outreach, outcomes, and outputs.',
      child: tree.isEmpty
          ? const _EmptyTile(message: 'The tree will appear after the backend import script seeds the actual logframe structure.')
          : Column(
              children: tree.map((node) => _TreeNodeCard(node: node, depth: 0)).toList(),
            ),
    );
  }

  Widget _indicatorPanel() {
    return _Panel(
      title: 'Indicator Register',
      subtitle: 'A quick view of the first indicators currently available.',
      child: indicators.isEmpty
          ? const _EmptyTile(message: 'Indicator records will show here once imported from the logframe seed.')
          : Column(
              children: indicators.take(12).map((indicator) {
                final code = indicator['code']?.toString() ?? '-';
                final name = indicator['name']?.toString() ?? '-';
                final node = Map<String, dynamic>.from(indicator['logframeNode'] as Map? ?? const {});
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFD),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFDCE6F2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$code • $name', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF102A43))),
                        const SizedBox(height: 6),
                        Text(
                          '${node['title'] ?? 'Unassigned'} • ${indicator['unit'] ?? 'No unit'}',
                          style: TextStyle(color: Colors.blueGrey.shade700, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _importPanel() {
    return _Panel(
      title: 'Import Logframe File',
      subtitle: 'Upload a structured CSV or XLSX file, preview duplicates, then commit new or changed records.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFD),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFDCE6F2)),
            ),
            child: Wrap(
              runSpacing: 12,
              spacing: 12,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: isUploading ? null : _pickAndPreview,
                  icon: const Icon(Icons.upload_file_rounded),
                  label: Text(isUploading ? 'Processing...' : 'Choose file & preview'),
                ),
                if (selectedFileName != null)
                  Text('Selected: $selectedFileName', style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(width: 12),
                SizedBox(
                  width: 220,
                  child: DropdownButtonFormField<String>(
                    value: importMode,
                    decoration: const InputDecoration(labelText: 'Commit mode'),
                    items: const [
                      DropdownMenuItem(value: 'skip', child: Text('Skip duplicates')),
                      DropdownMenuItem(value: 'update', child: Text('Update changed records')),
                    ],
                    onChanged: isUploading ? null : (value) => setState(() => importMode = value ?? 'skip'),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: isUploading || preview == null ? null : _commitImport,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0E467F), foregroundColor: Colors.white),
                  icon: const Icon(Icons.cloud_done_outlined),
                  label: const Text('Commit import'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Recommended columns: level, node_code, node_title, parent_node_code, indicator_code, indicator_name, description, unit, baseline, mid_target, end_target, frequency, source, responsibility.',
            style: TextStyle(color: Colors.blueGrey.shade700, height: 1.45),
          ),
          const SizedBox(height: 16),
          if (preview == null)
            const _EmptyTile(message: 'Preview results will appear here after you upload a file.')
          else ...[
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _miniStat('Rows', _intValue(_previewSummary['totalRows']).toString()),
                _miniStat('Valid', _intValue(_previewSummary['validRows']).toString()),
                _miniStat('Invalid', _intValue(_previewSummary['invalidRows']).toString()),
                _miniStat('New nodes', _intValue(_previewSummary['newNodes']).toString()),
                _miniStat('New indicators', _intValue(_previewSummary['newIndicators']).toString()),
                _miniStat('Duplicates', _intValue(_previewSummary['duplicateIndicators']).toString()),
                _miniStat('Changed', _intValue(_previewSummary['changedIndicators']).toString()),
              ],
            ),
            const SizedBox(height: 16),
            ..._previewRows.take(12).map((entry) {
              final row = Map<String, dynamic>.from(entry as Map);
              final node = Map<String, dynamic>.from(row['node'] as Map? ?? const {});
              final indicator = Map<String, dynamic>.from(row['indicator'] as Map? ?? const {});
              final status = row['status']?.toString() ?? 'unknown';
              final messages = List<dynamic>.from(row['messages'] as List? ?? const []);
              final errors = List<dynamic>.from(row['errors'] as List? ?? const []);
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFD),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFDCE6F2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _statusChip(status),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Row ${row['rowNumber']} • ${indicator['code'] ?? '-'} • ${indicator['name'] ?? ''}',
                              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF102A43)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Node: ${node['code'] ?? '-'} • ${node['title'] ?? '-'}', style: TextStyle(color: Colors.blueGrey.shade700)),
                      if (messages.isNotEmpty) ...messages.map((message) => Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('• $message', style: TextStyle(color: Colors.blueGrey.shade700)),
                      )),
                      if (errors.isNotEmpty) ...errors.map((message) => Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('• $message', style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w700)),
                      )),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Container(
      width: 130,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCE6F2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Colors.blueGrey.shade700, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: Color(0xFF102A43))),
        ],
      ),
    );
  }

  Widget _statusChip(String status) {
    Color color;
    switch (status) {
      case 'new':
        color = const Color(0xFF0F9D58);
        break;
      case 'changed':
        color = const Color(0xFFD97706);
        break;
      case 'duplicate':
        color = const Color(0xFF2563EB);
        break;
      default:
        color = const Color(0xFFDC2626);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12),
      ),
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
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE3EAF3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Color(0xFF102A43))),
          const SizedBox(height: 6),
          Text(subtitle, style: TextStyle(color: Colors.blueGrey.shade600, height: 1.45)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _StatCard(this.title, this.value, this.icon);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE3EAF3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFEAF2FC),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, color: const Color(0xFF1A6ABA)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: Colors.blueGrey.shade700, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 26, color: Color(0xFF102A43))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTile extends StatelessWidget {
  final String message;
  const _EmptyTile({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCE6F2)),
      ),
      child: Text(message, style: TextStyle(color: Colors.blueGrey.shade700, height: 1.45)),
    );
  }
}

class _TreeNodeCard extends StatelessWidget {
  final Map<String, dynamic> node;
  final int depth;
  const _TreeNodeCard({required this.node, required this.depth});

  @override
  Widget build(BuildContext context) {
    final children = List<Map<String, dynamic>>.from(node['children'] as List? ?? const []);
    final indicators = List<Map<String, dynamic>>.from(node['indicators'] as List? ?? const []);

    return Container(
      margin: EdgeInsets.only(left: depth * 14.0, bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCE6F2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${node['code'] ?? '-'} • ${node['title'] ?? '-'}',
            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF102A43)),
          ),
          const SizedBox(height: 4),
          Text(
            '${node['level'] ?? '-'} • ${indicators.length} indicators',
            style: TextStyle(color: Colors.blueGrey.shade700, fontWeight: FontWeight.w600),
          ),
          if (children.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...children.map((child) => _TreeNodeCard(node: child, depth: depth + 1)),
          ],
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 540),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE3EAF3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 42, color: Color(0xFFB54708)),
            const SizedBox(height: 12),
            const Text('Logframe data could not be loaded', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.blueGrey.shade700, height: 1.5)),
            const SizedBox(height: 16),
            ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
