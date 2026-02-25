#!/usr/bin/env python3
"""
LifeTracker Backend API Test Suite
Tests all CRUD endpoints for tasks, food plans, preferences, stats, and sync operations
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class LifeTrackerAPITester:
    def __init__(self, base_url: str):
        """Initialize the API tester with base URL"""
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # Store IDs for update/delete operations
        self.task_id = None
        self.food_plan_id = None
        
        # Test results tracking
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
        
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'response_data': response_data
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_data and not success:
            print(f"    Response: {response_data}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple[bool, Any]:
        """Make HTTP request and return success status and response data"""
        try:
            # Ensure endpoint doesn't start with /api if base_url already includes it
            if endpoint.startswith('/api') and self.base_url.endswith('/api'):
                endpoint = endpoint[4:]  # Remove /api prefix
            url = f"{self.base_url}{endpoint}"
            
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, params=params)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, params=params)
            else:
                return False, f"Unsupported HTTP method: {method}"
            
            # Check if request was successful
            if response.status_code >= 200 and response.status_code < 300:
                try:
                    return True, response.json()
                except json.JSONDecodeError:
                    return True, response.text
            else:
                return False, {
                    'status_code': response.status_code,
                    'text': response.text,
                    'headers': dict(response.headers)
                }
                
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        print("\n=== Testing Health Check ===")
        success, response = self.make_request('GET', '/api/')
        
        if success and isinstance(response, dict):
            expected_keys = ['message', 'status']
            has_expected_keys = all(key in response for key in expected_keys)
            self.log_test(
                "Health Check - GET /api/",
                has_expected_keys,
                f"Expected message and status, got: {list(response.keys())}",
                response
            )
        else:
            self.log_test(
                "Health Check - GET /api/",
                False,
                "Failed to get valid response",
                response
            )
    
    def test_task_crud(self):
        """Test all Task CRUD operations"""
        print("\n=== Testing Task CRUD Operations ===")
        
        # 1. Create Task
        task_data = {
            "title": "Morning workout",
            "description": "30 min cardio",
            "time": "2025-07-20T07:00:00Z",
            "category": "Health",
            "reminderEnabled": True
        }
        
        success, response = self.make_request('POST', '/api/tasks', task_data)
        
        if success and isinstance(response, dict) and ('id' in response or '_id' in response):
            self.task_id = response.get('id') or response.get('_id')
            expected_fields = ['title', 'description', 'time', 'category', 'status', 'reminderEnabled']
            has_fields = all(field in response for field in expected_fields)
            self.log_test(
                "Create Task - POST /api/tasks",
                has_fields and response['status'] == 'pending',
                f"Created task with ID: {self.task_id}, status: {response.get('status')}",
                response
            )
        else:
            self.log_test(
                "Create Task - POST /api/tasks",
                False,
                "Failed to create task or missing ID in response",
                response
            )
        
        # 2. Get All Tasks
        success, response = self.make_request('GET', '/api/tasks')
        
        if success and isinstance(response, list):
            self.log_test(
                "Get All Tasks - GET /api/tasks",
                len(response) > 0,
                f"Retrieved {len(response)} tasks",
                f"First task keys: {list(response[0].keys()) if response else 'No tasks'}"
            )
        else:
            self.log_test(
                "Get All Tasks - GET /api/tasks",
                False,
                "Failed to get tasks or response is not a list",
                response
            )
        
        # 3. Get Tasks with Status Filter
        success, response = self.make_request('GET', '/api/tasks', params={'status': 'pending'})
        
        if success and isinstance(response, list):
            all_pending = all(task.get('status') == 'pending' for task in response)
            self.log_test(
                "Filter Tasks by Status - GET /api/tasks?status=pending",
                all_pending,
                f"Retrieved {len(response)} pending tasks",
                f"Statuses: {[task.get('status') for task in response[:3]]}"
            )
        else:
            self.log_test(
                "Filter Tasks by Status - GET /api/tasks?status=pending",
                False,
                "Failed to filter tasks by status",
                response
            )
        
        # 4. Update Task Status
        if self.task_id:
            update_data = {
                "status": "completed",
                "completedAt": datetime.utcnow().isoformat()
            }
            
            success, response = self.make_request('PUT', f'/api/tasks/{self.task_id}', update_data)
            
            if success and isinstance(response, dict):
                status_updated = response.get('status') == 'completed'
                self.log_test(
                    "Update Task Status - PUT /api/tasks/{id}",
                    status_updated,
                    f"Updated task status to: {response.get('status')}",
                    response
                )
            else:
                self.log_test(
                    "Update Task Status - PUT /api/tasks/{id}",
                    False,
                    "Failed to update task status",
                    response
                )
        
        # 5. Get Single Task
        if self.task_id:
            success, response = self.make_request('GET', f'/api/tasks/{self.task_id}')
            
            if success and isinstance(response, dict):
                has_id = response.get('id') == self.task_id or response.get('_id') == self.task_id
                self.log_test(
                    "Get Single Task - GET /api/tasks/{id}",
                    has_id,
                    f"Retrieved task with ID: {response.get('id')}",
                    response
                )
            else:
                self.log_test(
                    "Get Single Task - GET /api/tasks/{id}",
                    False,
                    "Failed to get single task",
                    response
                )
        
        # 6. Delete Task (saving for later to test other endpoints)
        # We'll delete this task at the end
    
    def test_food_plan_crud(self):
        """Test all Food Plan CRUD operations"""
        print("\n=== Testing Food Plan CRUD Operations ===")
        
        # 1. Create Food Plan
        food_plan_data = {
            "date": "2025-07-20",
            "mealType": "breakfast", 
            "items": ["Oatmeal", "Banana", "Coffee"]
        }
        
        success, response = self.make_request('POST', '/api/food-plans', food_plan_data)
        
        if success and isinstance(response, dict) and ('id' in response or '_id' in response):
            self.food_plan_id = response.get('id') or response.get('_id')
            expected_fields = ['date', 'mealType', 'items', 'eaten', 'skipped']
            has_fields = all(field in response for field in expected_fields)
            self.log_test(
                "Create Food Plan - POST /api/food-plans",
                has_fields and not response.get('eaten', True),
                f"Created food plan with ID: {self.food_plan_id}",
                response
            )
        else:
            self.log_test(
                "Create Food Plan - POST /api/food-plans",
                False,
                "Failed to create food plan",
                response
            )
        
        # 2. Get All Food Plans
        success, response = self.make_request('GET', '/api/food-plans')
        
        if success and isinstance(response, list):
            self.log_test(
                "Get All Food Plans - GET /api/food-plans",
                len(response) > 0,
                f"Retrieved {len(response)} food plans",
                f"First plan keys: {list(response[0].keys()) if response else 'No plans'}"
            )
        else:
            self.log_test(
                "Get All Food Plans - GET /api/food-plans",
                False,
                "Failed to get food plans",
                response
            )
        
        # 3. Filter Food Plans by Date
        success, response = self.make_request('GET', '/api/food-plans', params={'date': '2025-07-20'})
        
        if success and isinstance(response, list):
            correct_date = all(plan.get('date') == '2025-07-20' for plan in response)
            self.log_test(
                "Filter Food Plans by Date - GET /api/food-plans?date=2025-07-20",
                correct_date and len(response) > 0,
                f"Retrieved {len(response)} plans for 2025-07-20",
                f"Dates: {[plan.get('date') for plan in response[:3]]}"
            )
        else:
            self.log_test(
                "Filter Food Plans by Date - GET /api/food-plans?date=2025-07-20",
                False,
                "Failed to filter food plans by date",
                response
            )
        
        # 4. Update Food Plan (mark as eaten)
        if self.food_plan_id:
            update_data = {"eaten": True}
            
            success, response = self.make_request('PUT', f'/api/food-plans/{self.food_plan_id}', update_data)
            
            if success and isinstance(response, dict):
                eaten_updated = response.get('eaten') is True
                self.log_test(
                    "Update Food Plan - PUT /api/food-plans/{id}",
                    eaten_updated,
                    f"Updated eaten status to: {response.get('eaten')}",
                    response
                )
            else:
                self.log_test(
                    "Update Food Plan - PUT /api/food-plans/{id}",
                    False,
                    "Failed to update food plan",
                    response
                )
        
        # 5. Get Single Food Plan
        if self.food_plan_id:
            success, response = self.make_request('GET', f'/api/food-plans/{self.food_plan_id}')
            
            if success and isinstance(response, dict):
                has_id = response.get('id') == self.food_plan_id or response.get('_id') == self.food_plan_id
                self.log_test(
                    "Get Single Food Plan - GET /api/food-plans/{id}",
                    has_id,
                    f"Retrieved food plan with ID: {response.get('id')}",
                    response
                )
            else:
                self.log_test(
                    "Get Single Food Plan - GET /api/food-plans/{id}",
                    False,
                    "Failed to get single food plan",
                    response
                )
    
    def test_preferences(self):
        """Test User Preferences endpoints"""
        print("\n=== Testing User Preferences ===")
        
        # 1. Get Preferences (should create default if not exists)
        success, response = self.make_request('GET', '/api/preferences')
        
        if success and isinstance(response, dict):
            expected_fields = ['darkMode', 'notificationFrequency']
            has_fields = all(field in response for field in expected_fields)
            self.log_test(
                "Get Preferences - GET /api/preferences",
                has_fields,
                f"Retrieved preferences with fields: {list(response.keys())}",
                response
            )
        else:
            self.log_test(
                "Get Preferences - GET /api/preferences",
                False,
                "Failed to get preferences",
                response
            )
        
        # 2. Update Preferences
        update_data = {
            "darkMode": False,
            "notificationFrequency": 10
        }
        
        success, response = self.make_request('PUT', '/api/preferences', update_data)
        
        if success and isinstance(response, dict):
            dark_mode_updated = response.get('darkMode') is False
            freq_updated = response.get('notificationFrequency') == 10
            self.log_test(
                "Update Preferences - PUT /api/preferences",
                dark_mode_updated and freq_updated,
                f"Updated darkMode: {response.get('darkMode')}, frequency: {response.get('notificationFrequency')}",
                response
            )
        else:
            self.log_test(
                "Update Preferences - PUT /api/preferences",
                False,
                "Failed to update preferences",
                response
            )
    
    def test_stats(self):
        """Test User Stats endpoints"""
        print("\n=== Testing User Stats ===")
        
        # 1. Get Stats (should create default if not exists)
        success, response = self.make_request('GET', '/api/stats')
        
        if success and isinstance(response, dict):
            expected_fields = ['currentStreak', 'longestStreak', 'totalTasksCompleted', 'completionRates']
            has_fields = all(field in response for field in expected_fields)
            self.log_test(
                "Get Stats - GET /api/stats",
                has_fields,
                f"Retrieved stats with fields: {list(response.keys())}",
                response
            )
        else:
            self.log_test(
                "Get Stats - GET /api/stats",
                False,
                "Failed to get stats",
                response
            )
        
        # 2. Update Stats
        update_data = {
            "currentStreak": 5,
            "longestStreak": 10,
            "totalTasksCompleted": 25,
            "completionRates": {"2025-07-20": 0.8}
        }
        
        success, response = self.make_request('PUT', '/api/stats', update_data)
        
        if success and isinstance(response, dict):
            streak_updated = response.get('currentStreak') == 5
            longest_updated = response.get('longestStreak') == 10
            total_updated = response.get('totalTasksCompleted') == 25
            self.log_test(
                "Update Stats - PUT /api/stats",
                streak_updated and longest_updated and total_updated,
                f"Updated currentStreak: {response.get('currentStreak')}, totalCompleted: {response.get('totalTasksCompleted')}",
                response
            )
        else:
            self.log_test(
                "Update Stats - PUT /api/stats",
                False,
                "Failed to update stats",
                response
            )
    
    def test_sync_operations(self):
        """Test Sync endpoints"""
        print("\n=== Testing Sync Operations ===")
        
        # 1. Test GET /api/sync (get all data)
        success, response = self.make_request('GET', '/api/sync')
        
        if success and isinstance(response, dict):
            expected_keys = ['tasks', 'foodPlans', 'preferences', 'stats']
            has_keys = all(key in response for key in expected_keys)
            self.log_test(
                "Get Sync Data - GET /api/sync",
                has_keys,
                f"Retrieved sync data with keys: {list(response.keys())}",
                {k: len(v) if isinstance(v, list) else type(v).__name__ for k, v in response.items()}
            )
        else:
            self.log_test(
                "Get Sync Data - GET /api/sync",
                False,
                "Failed to get sync data",
                response
            )
        
        # 2. Test POST /api/sync (sync data to cloud)
        sync_data = {
            "tasks": [
                {
                    "title": "Sync Test Task",
                    "description": "Testing sync functionality",
                    "time": "2025-07-21T09:00:00Z",
                    "category": "Work",
                    "status": "pending",
                    "reminderEnabled": True,
                    "createdAt": datetime.utcnow().isoformat()
                }
            ],
            "foodPlans": [
                {
                    "date": "2025-07-21",
                    "mealType": "lunch",
                    "items": ["Salad", "Chicken", "Water"],
                    "eaten": False,
                    "skipped": False,
                    "createdAt": datetime.utcnow().isoformat()
                }
            ]
        }
        
        success, response = self.make_request('POST', '/api/sync', sync_data)
        
        if success and isinstance(response, dict):
            has_message = 'message' in response and 'synced_count' in response
            synced_count = response.get('synced_count', 0)
            self.log_test(
                "Sync Data to Cloud - POST /api/sync",
                has_message and synced_count >= 2,
                f"Synced {synced_count} items: {response.get('message')}",
                response
            )
        else:
            self.log_test(
                "Sync Data to Cloud - POST /api/sync",
                False,
                "Failed to sync data",
                response
            )
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete the test task
        if self.task_id:
            success, response = self.make_request('DELETE', f'/api/tasks/{self.task_id}')
            self.log_test(
                "Delete Test Task - DELETE /api/tasks/{id}",
                success,
                "Cleaned up test task" if success else "Failed to delete test task",
                response
            )
        
        # Delete the test food plan
        if self.food_plan_id:
            success, response = self.make_request('DELETE', f'/api/food-plans/{self.food_plan_id}')
            self.log_test(
                "Delete Test Food Plan - DELETE /api/food-plans/{id}",
                success,
                "Cleaned up test food plan" if success else "Failed to delete test food plan",
                response
            )
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting LifeTracker Backend API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print("=" * 50)
        
        # Run all test suites
        self.test_health_check()
        self.test_task_crud()
        self.test_food_plan_crud()
        self.test_preferences()
        self.test_stats()
        self.test_sync_operations()
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        # Show failed tests details
        failed_tests = [test for test in self.test_results if "❌" in test['status']]
        if failed_tests:
            print(f"\n🚨 FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}")
                if test['details']:
                    print(f"    {test['details']}")
        
        return self.failed_tests == 0


def main():
    """Main function to run the tests"""
    # Use the local URL since public URL routing is not working
    BASE_URL = "http://localhost:8001/api"
    
    print("LifeTracker Backend API Test Suite")
    print("==================================")
    
    tester = LifeTrackerAPITester(BASE_URL)
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()