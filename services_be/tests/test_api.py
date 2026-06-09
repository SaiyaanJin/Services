import unittest
from fastapi.testclient import TestClient
from app import create_app
from app.config import settings

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    def test_health_check(self):
        """Test health check endpoint returns 200 and database/sso metadata"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)
        self.assertIn("sso_verify_url", data)

    def test_settings_load(self):
        """Test configuration defaults load correctly"""
        self.assertIsNotNone(settings.MONGO_URI)
        self.assertIsNotNone(settings.SSO_BASE_URL)
        self.assertIsNotNone(settings.ALLOWED_CORS_ORIGIN)

    def test_unauthorized_dashboard_access(self):
        """Test that calling authenticated endpoint without token returns 401 Unauthorized"""
        response = self.client.get("/Dashboard")
        # Middleware should reject missing Authorization header
        self.assertEqual(response.status_code, 401)
        self.assertIn("Authorization header missing", response.json()["detail"])

if __name__ == '__main__':
    unittest.main()
