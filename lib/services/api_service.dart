import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_storage_service.dart';

class ApiService {
  static Uri _uri(String path) => Uri.parse('${AppConfig.baseUrl}$path');

  static Future<Map<String, String>> _headers({bool authenticated = false}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (authenticated) {
      final token = await AuthStorageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  static dynamic _decodeAny(String body) {
    if (body.isEmpty) return <String, dynamic>{};
    return jsonDecode(body);
  }

  static Map<String, dynamic> _decodeMap(http.Response response) {
    final decoded = _decodeAny(response.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return <String, dynamic>{'data': decoded};
  }

  static List<dynamic> _decodeList(http.Response response) {
    final decoded = _decodeAny(response.body);
    if (decoded is List) return decoded;
    if (decoded is Map<String, dynamic> && decoded['data'] is List) {
      return List<dynamic>.from(decoded['data'] as List);
    }
    return <dynamic>[];
  }

  static Exception _buildException(http.Response response) {
    try {
      final decoded = _decodeAny(response.body);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'];
        if (message is String && message.trim().isNotEmpty) {
          return Exception(message);
        }
        if (message is List && message.isNotEmpty) {
          return Exception(message.join(', '));
        }
      }
    } catch (_) {}

    if (response.statusCode == 401) {
      return Exception('Unauthorized');
    }
    if (response.statusCode == 403) {
      return Exception('Access denied for this module. Please sign out and sign in again. If it still fails, the backend role guard is blocking this request.');
    }
    return Exception('Request failed with status ${response.statusCode}.');
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      _uri('/auth/login'),
      headers: await _headers(),
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> getProfile() async {
    final response = await http.get(
      _uri('/auth/me'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await http.get(
      _uri('/dashboard/stats'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> getDashboardOverview() async {
    final response = await http.get(
      _uri('/dashboard/overview'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> getRecentActivity() async {
    final response = await http.get(
      _uri('/dashboard/recent-activity'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getUsers() async {
    final response = await http.get(
      _uri('/users'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getSchemes() async {
    final response = await http.get(
      _uri('/schemes'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> createScheme(Map<String, dynamic> data) async {
    final response = await http.post(
      _uri('/schemes'),
      headers: await _headers(authenticated: true),
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> updateSchemeStatus({
    required int id,
    required String status,
    String? description,
  }) async {
    final response = await http.patch(
      _uri('/schemes/$id/status'),
      headers: await _headers(authenticated: true),
      body: jsonEncode({
        'status': status,
        if (description != null && description.trim().isNotEmpty) 'description': description,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getProjects() async {
    final response = await http.get(
      _uri('/projects'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> createProject(Map<String, dynamic> data) async {
    final response = await http.post(
      _uri('/projects'),
      headers: await _headers(authenticated: true),
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> updateProjectStatus({
    required int id,
    String? status,
    String? priority,
    String? description,
  }) async {
    final response = await http.patch(
      _uri('/projects/$id/status'),
      headers: await _headers(authenticated: true),
      body: jsonEncode({
        if (status != null) 'status': status,
        if (priority != null) 'priority': priority,
        if (description != null && description.trim().isNotEmpty) 'description': description,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getBeneficiaries() async {
    final response = await http.get(
      _uri('/beneficiaries'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> createBeneficiary(Map<String, dynamic> data) async {
    final response = await http.post(
      _uri('/beneficiaries'),
      headers: await _headers(authenticated: true),
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> updateBeneficiaryStatus({
    required int id,
    required String status,
    String? remarks,
  }) async {
    final response = await http.patch(
      _uri('/beneficiaries/$id/status'),
      headers: await _headers(authenticated: true),
      body: jsonEncode({
        'status': status,
        if (remarks != null && remarks.trim().isNotEmpty) 'remarks': remarks,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getApprovals() async {
    final response = await http.get(
      _uri('/approvals'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> createApproval(Map<String, dynamic> data) async {
    final response = await http.post(
      _uri('/approvals'),
      headers: await _headers(authenticated: true),
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<Map<String, dynamic>> updateApprovalStatus({
    required int id,
    required String status,
    String? priority,
    String? remarks,
  }) async {
    final response = await http.patch(
      _uri('/approvals/$id/status'),
      headers: await _headers(authenticated: true),
      body: jsonEncode({
        'status': status,
        if (priority != null) 'priority': priority,
        if (remarks != null && remarks.trim().isNotEmpty) 'remarks': remarks,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }


  static Future<Map<String, dynamic>> getLogframeSummary({int? year}) async {
    final suffix = year == null ? '' : '?year=$year';
    final response = await http.get(
      _uri('/logframe/dashboard/summary$suffix'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getLogframeOutcomes({int? year}) async {
    final suffix = year == null ? '' : '?year=$year';
    final response = await http.get(
      _uri('/logframe/dashboard/outcomes$suffix'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getLogframeTree() async {
    final response = await http.get(
      _uri('/logframe/tree'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

  static Future<List<Map<String, dynamic>>> getLogframeIndicators() async {
    final response = await http.get(
      _uri('/logframe/indicators'),
      headers: await _headers(authenticated: true),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    throw _buildException(response);
  }

}
