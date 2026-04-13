import 'package:flutter/material.dart';

class LogframeModuleView extends StatelessWidget {
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> outcomes;
  final List<Map<String, dynamic>> tree;
  final List<Map<String, dynamic>> indicators;
  final VoidCallback onRefresh;

  const LogframeModuleView({
    super.key,
    required this.summary,
    required this.outcomes,
    required this.tree,
    required this.indicators,
    required this.onRefresh,
  });

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

  String _format(dynamic value) {
    final number = _toDouble(value);
    if (number == number.roundToDouble()) return number.toInt().toString();
    return number.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    final totals = Map<String, dynamic>.from(summary['totals'] is Map ? summary['totals'] as Map : {});
    final byLevel = (summary['byLevel'] is List ? summary['byLevel'] as List : const [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _HeaderBanner(onRefresh: onRefresh),
        const SizedBox(height: 22),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _SummaryCard(title: 'Total Nodes', value: _toInt(summary['totalNodes']).toString(), icon: Icons.account_tree_outlined),
            _SummaryCard(title: 'Indicators', value: _toInt(summary['totalIndicators']).toString(), icon: Icons.stacked_bar_chart_rounded),
            _SummaryCard(title: 'Active Indicators', value: _toInt(summary['activeIndicators']).toString(), icon: Icons.verified_outlined),
            _SummaryCard(title: 'Achievement Rate', value: '${_format(summary['achievementRate'])}%', icon: Icons.track_changes_rounded),
          ],
        ),
        const SizedBox(height: 22),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: _Panel(
                title: 'Outcome Performance',
                subtitle: 'How each outcome is progressing against logged indicator results.',
                child: outcomes.isEmpty
                    ? const _EmptyBody(message: 'Outcome data will appear here once the logframe import is seeded.')
                    : Column(
                        children: outcomes.map((outcome) {
                          final totals = Map<String, dynamic>.from(outcome['totals'] is Map ? outcome['totals'] as Map : {});
                          final progress = _toDouble(outcome['achievementRate']);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FBFF),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFDCE7F4)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${outcome['code'] ?? '-'} · ${outcome['title'] ?? 'Outcome'}',
                                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF102A43)),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${_toInt(outcome['achievedIndicators'])}/${_toInt(outcome['indicators'])} indicators achieved',
                                              style: TextStyle(color: Colors.blueGrey.shade600, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '${_format(progress)}%',
                                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF14539A)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(999),
                                    child: LinearProgressIndicator(
                                      value: (progress.clamp(0, 100)) / 100,
                                      minHeight: 10,
                                      backgroundColor: const Color(0xFFE5EDF8),
                                      color: const Color(0xFF14539A),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 10,
                                    runSpacing: 10,
                                    children: [
                                      _MiniStatChip(label: 'Annual target', value: _format(totals['annualTarget'])),
                                      _MiniStatChip(label: 'Annual result', value: _format(totals['annualResult'])),
                                      _MiniStatChip(label: 'Cumulative target', value: _format(totals['cumulativeTarget'])),
                                      _MiniStatChip(label: 'Cumulative result', value: _format(totals['cumulativeResult'])),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              flex: 2,
              child: Column(
                children: [
                  _Panel(
                    title: 'Progress Totals',
                    subtitle: 'Consolidated values currently available in the backend.',
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _MiniStatChip(label: 'Annual target', value: _format(totals['annualTarget'])),
                        _MiniStatChip(label: 'Annual result', value: _format(totals['annualResult'])),
                        _MiniStatChip(label: 'Cumulative target', value: _format(totals['cumulativeTarget'])),
                        _MiniStatChip(label: 'Cumulative result', value: _format(totals['cumulativeResult'])),
                        _MiniStatChip(label: 'Male', value: _format(totals['maleValue'])),
                        _MiniStatChip(label: 'Female', value: _format(totals['femaleValue'])),
                        _MiniStatChip(label: 'Youth', value: _format(totals['youthValue'])),
                        _MiniStatChip(label: 'Households', value: _format(totals['householdValue'])),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  _Panel(
                    title: 'Level Breakdown',
                    subtitle: 'Indicator distribution across logframe levels.',
                    child: byLevel.isEmpty
                        ? const _EmptyBody(message: 'Level-wise breakdown is not available yet.')
                        : Column(
                            children: byLevel.map((row) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (row['level'] ?? 'UNKNOWN').toString(),
                                        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF243B53)),
                                      ),
                                    ),
                                    Text(
                                      '${_toInt(row['indicators'])} indicators',
                                      style: TextStyle(color: Colors.blueGrey.shade600, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _Panel(
                title: 'Logframe Tree',
                subtitle: 'Imported hierarchy of outreach, outcomes, and outputs.',
                child: tree.isEmpty
                    ? const _EmptyBody(message: 'The tree will appear after the backend import script seeds the actual logframe structure.')
                    : Column(
                        children: tree.take(8).map((node) => _TreeNodeTile(node: node)).toList(),
                      ),
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: _Panel(
                title: 'Indicator Register',
                subtitle: 'A quick view of the first indicators currently available.',
                child: indicators.isEmpty
                    ? const _EmptyBody(message: 'Indicator records will show here once imported from the logframe seed.')
                    : Column(
                        children: indicators.take(8).map((indicator) {
                          final progress = _toDouble(indicator['progressPercent']);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FBFF),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: const Color(0xFFDCE7F4)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${indicator['code'] ?? '-'} · ${indicator['name'] ?? 'Indicator'}',
                                    style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF102A43)),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    (indicator['description'] ?? indicator['unit'] ?? 'No description available').toString(),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: Colors.blueGrey.shade600),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(999),
                                          child: LinearProgressIndicator(
                                            value: (progress.clamp(0, 100)) / 100,
                                            minHeight: 8,
                                            backgroundColor: const Color(0xFFE5EDF8),
                                            color: const Color(0xFF2F855A),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        '${_format(progress)}%',
                                        style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2F855A)),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _HeaderBanner extends StatelessWidget {
  final VoidCallback onRefresh;

  const _HeaderBanner({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF123B6D), Color(0xFF14539A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x1A14539A), blurRadius: 24, offset: Offset(0, 12)),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'JKCIP Logframe Monitoring',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                SizedBox(height: 8),
                Text(
                  'A dedicated module for indicator hierarchy, achievement tracking, and programme reporting in the same visual language as the MIS.',
                  style: TextStyle(color: Color(0xFFD9E7F8), height: 1.6, fontSize: 15),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: BorderSide(color: Colors.white.withOpacity(0.35)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            ),
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Refresh logframe'),
          ),
        ],
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
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE4ECF5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF102A43))),
          const SizedBox(height: 6),
          Text(subtitle, style: TextStyle(color: Colors.blueGrey.shade600, height: 1.5)),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _SummaryCard({required this.title, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE4ECF5)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFEAF2FD),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: const Color(0xFF14539A)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: Colors.blueGrey.shade600, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF102A43))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniStatChip extends StatelessWidget {
  final String label;
  final String value;

  const _MiniStatChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCE7F4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Colors.blueGrey.shade600, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF102A43))),
        ],
      ),
    );
  }
}

class _TreeNodeTile extends StatelessWidget {
  final Map<String, dynamic> node;

  const _TreeNodeTile({required this.node});

  @override
  Widget build(BuildContext context) {
    final children = (node['children'] is List ? node['children'] as List : const [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final indicators = (node['indicators'] is List ? node['indicators'] as List : const []);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCE7F4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${node['code'] ?? '-'} · ${node['title'] ?? 'Node'}',
            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF102A43)),
          ),
          const SizedBox(height: 6),
          Text(
            '${node['level'] ?? 'LEVEL'} · ${indicators.length} indicators · ${children.length} children',
            style: TextStyle(color: Colors.blueGrey.shade600),
          ),
          if (children.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: children.take(4).map((child) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${child['code'] ?? '-'}',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF14539A)),
                ),
              )).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _EmptyBody extends StatelessWidget {
  final String message;

  const _EmptyBody({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCE7F4)),
      ),
      child: Text(message, style: TextStyle(color: Colors.blueGrey.shade600, height: 1.5)),
    );
  }
}
