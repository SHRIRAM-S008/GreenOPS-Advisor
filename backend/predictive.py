from typing import Dict, Any, List
import numpy as np
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def predict_resource_usage(history_data: List[Dict[str, Any]], days_ahead: int = 7) -> Dict[str, Any]:
    """
    Predict future resource usage based on historical data using simple linear regression.
    
    Args:
        history_data (List[Dict[str, Any]]): Historical metrics data
        days_ahead (int): Number of days to predict ahead
        
    Returns:
        Dict[str, Any]: Predicted resource usage
    """
    try:
        if not history_data:
            return {"error": "No historical data provided"}
        
        # Extract timestamps and values
        timestamps = []
        cpu_values = []
        memory_values = []
        
        for record in history_data:
            # Convert timestamp to numeric value (days since epoch)
            timestamp = record.get("timestamp")
            if isinstance(timestamp, str):
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            elif isinstance(timestamp, (int, float)):
                # Assume it's already a timestamp
                dt = datetime.fromtimestamp(timestamp)
            else:
                # Default to current time
                dt = datetime.now()
                
            timestamps.append(dt.toordinal())  # Days since epoch
            cpu_values.append(record.get("cpu_cores_used", 0))
            memory_values.append(record.get("memory_gb_used", 0))
        
        if len(timestamps) < 2:
            return {"error": "Insufficient data for prediction"}
        
        # Convert to numpy arrays
        X = np.array(timestamps, dtype=float)
        cpu_y = np.array(cpu_values, dtype=float)
        memory_y = np.array(memory_values, dtype=float)
        
        # Normalize X to prevent numerical issues
        X_mean = np.mean(X)
        X_std = np.std(X) if np.std(X) > 0 else 1
        X_norm = (X - X_mean) / X_std
        
        # Simple linear regression for CPU
        cpu_slope, cpu_intercept = np.polyfit(X_norm, cpu_y, 1)
        
        # Simple linear regression for Memory
        memory_slope, memory_intercept = np.polyfit(X_norm, memory_y, 1)
        
        # Predict future values
        future_dates = []
        future_cpu = []
        future_memory = []
        
        last_date = timestamps[-1]
        for i in range(1, days_ahead + 1):
            future_date = last_date + i
            future_dates.append(future_date)
            
            # Normalize future date
            future_date_norm = (future_date - X_mean) / X_std
            
            # Predict values
            cpu_pred = cpu_slope * future_date_norm + cpu_intercept
            memory_pred = memory_slope * future_date_norm + memory_intercept
            
            # Ensure non-negative values
            future_cpu.append(max(0, cpu_pred))
            future_memory.append(max(0, memory_pred))
        
        # Calculate confidence intervals (simplified)
        cpu_std = np.std(cpu_y)
        memory_std = np.std(memory_y)
        
        predictions = []
        for i in range(len(future_dates)):
            date_obj = datetime.fromordinal(int(future_dates[i]))
            predictions.append({
                "date": date_obj.isoformat(),
                "cpu_cores_predicted": float(future_cpu[i]),
                "memory_gb_predicted": float(future_memory[i]),
                "cpu_confidence_lower": float(max(0, future_cpu[i] - cpu_std)),
                "cpu_confidence_upper": float(future_cpu[i] + cpu_std),
                "memory_confidence_lower": float(max(0, future_memory[i] - memory_std)),
                "memory_confidence_upper": float(future_memory[i] + memory_std)
            })
        
        return {
            "predictions": predictions,
            "trend": {
                "cpu_trend": "increasing" if cpu_slope > 0 else "decreasing" if cpu_slope < 0 else "stable",
                "memory_trend": "increasing" if memory_slope > 0 else "decreasing" if memory_slope < 0 else "stable"
            }
        }
        
    except Exception as e:
        logger.error(f"Error predicting resource usage: {str(e)}")
        return {"error": str(e)}

def calculate_capacity_recommendations(predictive_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate capacity recommendations based on predictive analytics.
    
    Args:
        predictive_data (Dict[str, Any]): Predictive analytics data
        
    Returns:
        Dict[str, Any]: Capacity recommendations
    """
    try:
        if "error" in predictive_data:
            return predictive_data
            
        predictions = predictive_data.get("predictions", [])
        if not predictions:
            return {"error": "No predictions available"}
        
        # Find peak predicted values
        max_cpu = max(pred["cpu_cores_predicted"] for pred in predictions)
        max_memory = max(pred["memory_gb_predicted"] for pred in predictions)
        
        # Add buffer (25% for safety)
        recommended_cpu = max_cpu * 1.25
        recommended_memory = max_memory * 1.25
        
        # Calculate cost implications
        # These would come from configuration in a real implementation
        cost_per_cpu_hour = 0.02
        cost_per_gb_hour = 0.005
        hours_per_month = 24 * 30
        
        monthly_cost = (recommended_cpu * cost_per_cpu_hour + 
                       recommended_memory * cost_per_gb_hour) * hours_per_month
        
        return {
            "recommended_cpu_cores": round(recommended_cpu, 3),
            "recommended_memory_gb": round(recommended_memory, 3),
            "monthly_cost_usd": round(monthly_cost, 2),
            "peak_prediction_date": predictions[-1]["date"] if predictions else None,
            "confidence": "medium"  # Based on data quality and model simplicity
        }
        
    except Exception as e:
        logger.error(f"Error calculating capacity recommendations: {str(e)}")
        return {"error": str(e)}