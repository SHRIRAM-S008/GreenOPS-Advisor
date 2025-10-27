import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the backend directory to the path for imports
sys.path.insert(0, os.path.dirname(__file__))

from utils import parse_cpu_to_cores, parse_mem_to_gb
from ai_advisor import compute_rightsizing
from registry import analyze_image_optimization_opportunities
from security import analyze_security

class TestGreenOpsAdvisor(unittest.TestCase):
    
    def test_parse_cpu_to_cores(self):
        """Test CPU parsing function"""
        # Test milli-cores
        self.assertEqual(parse_cpu_to_cores("100m"), 0.1)
        self.assertEqual(parse_cpu_to_cores("500m"), 0.5)
        
        # Test whole cores
        self.assertEqual(parse_cpu_to_cores("1"), 1.0)
        self.assertEqual(parse_cpu_to_cores("2"), 2.0)
        
        # Test invalid input
        self.assertEqual(parse_cpu_to_cores("invalid"), 0.0)
        self.assertEqual(parse_cpu_to_cores(""), 0.0)
    
    def test_parse_mem_to_gb(self):
        """Test memory parsing function"""
        # Test Mi units
        self.assertAlmostEqual(parse_mem_to_gb("1024Mi"), 1.0, places=3)
        self.assertAlmostEqual(parse_mem_to_gb("512Mi"), 0.5, places=3)
        
        # Test Gi units
        self.assertAlmostEqual(parse_mem_to_gb("1Gi"), 1.0, places=3)
        self.assertAlmostEqual(parse_mem_to_gb("2Gi"), 2.0, places=3)
        
        # Test invalid input
        self.assertEqual(parse_mem_to_gb("invalid"), 0.0)
        self.assertEqual(parse_mem_to_gb(""), 0.0)
    
    def test_compute_rightsizing(self):
        """Test rightsizing computation"""
        workload_data = {
            "cpu_requested": "2",
            "memory_requested": "4Gi",
            "cpu_used": 0.5,
            "memory_used": 1.0
        }
        
        result = compute_rightsizing(workload_data)
        
        # Check that suggested values are reasonable
        self.assertGreater(result["suggested_cpu"], 0)
        self.assertGreater(result["suggested_mem_gb"], 0)
        self.assertGreater(result["monthly_saving_usd"], 0)
        
        # With 25% buffer, suggested values should be around 1.25x usage
        self.assertAlmostEqual(result["suggested_cpu"], 0.5 * 1.25, places=2)
        self.assertAlmostEqual(result["suggested_mem_gb"], 1.0 * 1.25, places=2)
    
    def test_analyze_image_optimization_opportunities(self):
        """Test image optimization analysis"""
        # Mock workload data
        workload_data = {
            "spec": {
                "template": {
                    "spec": {
                        "containers": [
                            {
                                "name": "test-container",
                                "image": "nginx:latest"
                            }
                        ]
                    }
                }
            }
        }
        
        # For now, we'll test that the function doesn't crash
        # A real test would mock the registry API calls
        result = analyze_image_optimization_opportunities(workload_data)
        self.assertIsInstance(result, dict)
        self.assertIn("opportunities", result)
        self.assertIn("analyzed_containers", result)
    
    def test_analyze_security(self):
        """Test security analysis"""
        # Mock workload data with missing security context
        workload_data = {
            "spec": {
                "template": {
                    "spec": {
                        "containers": [
                            {
                                "name": "test-container",
                                "image": "nginx:latest"
                            }
                        ]
                    }
                }
            }
        }
        
        result = analyze_security(workload_data)
        self.assertIsInstance(result, list)
        
        # Should have security recommendations
        self.assertGreater(len(result), 0)
        
        # Check that recommendations have the expected structure
        for recommendation in result:
            self.assertIn("type", recommendation)
            self.assertIn("description", recommendation)
            self.assertIn("confidence_score", recommendation)
            self.assertIn("risk_level", recommendation)

if __name__ == '__main__':
    unittest.main()