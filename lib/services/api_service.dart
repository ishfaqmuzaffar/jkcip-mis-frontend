import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_storage_service.dart';

class ApiService {
  static const Duration _timeout = Duration(seconds: 25);

  static Uri _uri(String path) => Uri.parse('${AppConfig.baseUrl}$path');

  static Future<Map<String, String>> _headers({bool authenticated = false}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      final token = await AuthStorageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  static Future<http.Response> _request(Future<http.Response> future) async {
    try {
      return await future.timeout(_timeout);
    } on TimeoutException {
      throw Exception('Request timed out. Please verify that the backend is reachable.');
    } catch (_) {
      rethrow;
    }
  }

  static dynamic _decodeBody(String body) {
    if (body.trim().isEmpty) return <String, dynamic>{};
    return jsonDecode(body);
  }

  static Map<String, dynamic> _decodeMap(http.Response response) {
    final decoded = _decodeBody(response.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'data': decoded};
  }

  static List<Map<String, dynamic>> _decodeList(http.Response response) {
    final decoded = _decodeBody(response.body);
    if (decoded is List) {
      return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    if (decoded is Map<String, dynamic> && decoded['data'] is List) {
      return (decoded['data'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    return [];
  }

  static Exception _exceptionFromResponse(http.Response response) {
    try {
      final payload = _decodeBody(response.body);
      if (payload is Map<String, dynamic>) {
        final message = payload['message'];
        if (message is String && message.trim().isNotEmpty) {
          return Exception(message.trim());
        }
        if (message is List && message.isNotEmpty) {
          return Exception(message.join(', '));
        }
      }
    } catch (_) {}

    switch (response.statusCode) {
      case 400:
        return Exception('Bad request. Please review the submitted information.');
      case 401:
        return Exception('Unauthorized');
      case 403:
        return Exception('You do not have permission for this action.');
      case 404:
        return Exception('Requested resource was not found.');
      case 500:
        return Exception('Server error. Please check the backend logs.');
      default:
        return Exception('Request failed with status ${response.statusCode}.');
    }
  }

  static Future<Map<String, dynamic>> _getMap(String path, {bool authenticated = true}) async {
    final response = await _request(
      http.get(_uri(path), headers: await _headers(authenticated: authenticated)),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _exceptionFromResponse(response);
  }

  static Future<List<Map<String, dynamic>>> _getList(String path, {bool authenticated = true}) async {
    final response = await _request(
      http.get(_uri(path), headers: await _headers(authenticated: authenticated)),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeList(response);
    }
    throw _exceptionFromResponse(response);
  }

  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> data,
      {bool authenticated = true}) async {
    final response = await _request(
      http.post(
        _uri(path),
        headers: await _headers(authenticated: authenticated),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _exceptionFromResponse(response);
  }

  static Future<Map<String, dynamic>> _patch(String path, Map<String, dynamic> data,
      {bool authenticated = true}) async {
    final response = await _request(
      http.patch(
        _uri(path),
        headers: await _headers(authenticated: authenticated),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decodeMap(response);
    }
    throw _exceptionFromResponse(response);
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) {
    return _post('/auth/login', {
      'email': email.trim(),
      'password': password,
    }, authenticated: false);
  }

  static Future<Map<String, dynamic>> register(Map<String, dynamic> data) {
    return _post('/auth/register', data, authenticated: false);
  }

  static Future<Map<String, dynamic>> getProfile() => _getMap('/auth/me');
  static Future<Map<String, dynamic>> getDashboardStats() => _getMap('/dashboard/stats');
  static Future<Map<String, dynamic>> getDashboardOverview() => _getMap('/dashboard/overview');
  static Future<Map<String, dynamic>> getRecentActivity() => _getMap('/dashboard/recent-activity');

  static Future<List<Map<String, dynamic>>> getUsers() => _getList('/users');
  static Future<Map<String, dynamic>> getUsersSummary() => _getMap('/users/summary');
  static Future<Map<String, dynamic>> updateUserStatus({required int id, required String status}) =>
      _patch('/users/$id/status', {'status': status});

  static Future<List<Map<String, dynamic>>> getSchemes() => _getList('/schemes');
  static Future<Map<String, dynamic>> getSchemesSummary() => _getMap('/schemes/summary');
  static Future<Map<String, dynamic>> createScheme(Map<String, dynamic> data) => _post('/schemes', data);
  static Future<Map<String, dynamic>> updateSchemeStatus({
    required int id,
    required String status,
    String? description,
  }) =>
      _patch('/schemes/$id/status', {
        'status': status,
        if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      });

  static Future<List<Map<String, dynamic>>> getProjects() => _getList('/projects');
  static Future<Map<String, dynamic>> getProjectsSummary() => _getMap('/projects/summary');
  static Future<Map<String, dynamic>> createProject(Map<String, dynamic> data) => _post('/projects', data);
  static Future<Map<String, dynamic>> updateProjectStatus({
    required int id,
    String? status,
    String? priority,
    String? description,
  }) =>
      _patch('/projects/$id/status', {
        if (status != null && status.isNotEmpty) 'status': status,
        if (priority != null && priority.isNotEmpty) 'priority': priority,
        if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      });

  static Future<List<Map<String, dynamic>>> getBeneficiaries() => _getList('/beneficiaries');
  static Future<Map<String, dynamic>> getBeneficiariesSummary() => _getMap('/beneficiaries/summary');
  static Future<Map<String, dynamic>> createBeneficiary(Map<String, dynamic> data) =>
      _post('/beneficiaries', data);
  static Future<Map<String, dynamic>> updateBeneficiaryStatus({
    required int id,
    required String status,
    String? remarks,
  }) =>
      _patch('/beneficiaries/$id/status', {
        'status': status,
        if (remarks != null && remarks.trim().isNotEmpty) 'remarks': remarks.trim(),
      });

  static Future<List<Map<String, dynamic>>> getApprovals() => _getList('/approvals');
  static Future<Map<String, dynamic>> getApprovalsSummary() => _getMap('/approvals/summary');
  static Future<Map<String, dynamic>> createApproval(Map<String, dynamic> data) => _post('/approvals', data);
  static Future<Map<String, dynamic>> updateApprovalStatus({
    required int id,
    required String status,
    String? priority,
    String? remarks,
  }) =>
      _patch('/approvals/$id/status', {
        'status': status,
        if (priority != null && priority.isNotEmpty) 'priority': priority,
        if (remarks != null && remarks.trim().isNotEmpty) 'remarks': remarks.trim(),
      });
}
