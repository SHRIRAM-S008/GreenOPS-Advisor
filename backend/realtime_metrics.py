import asyncio
import json
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        """Accept a WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connection established. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket connection closed. Total connections: {len(self.active_connections)}")
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")
            
    async def broadcast(self, message: str):
        """Broadcast a message to all connected WebSockets"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
                
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

# Global connection manager
manager = ConnectionManager()

async def handle_websocket_connection(websocket: WebSocket):
    """Handle a WebSocket connection for real-time metrics"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Keep the connection alive
            data = await websocket.receive_text()
            
            # Handle client commands
            if data == "collect":
                # Send acknowledgment that collection has started
                await manager.send_personal_message("Metrics collection started", websocket)
                # In a real implementation, this would trigger actual metrics collection
                # and broadcast the results to all connected clients
            else:
                # Echo the message back for other commands
                await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected")
    except Exception as e:
        manager.disconnect(websocket)
        logger.error(f"WebSocket error: {e}")

def create_metrics_update_payload(metrics_data: Dict[str, Any]) -> str:
    """Create a JSON payload for metrics updates"""
    payload = {
        "type": "metrics_update",
        "data": metrics_data,
        "timestamp": asyncio.get_event_loop().time()
    }
    return json.dumps(payload)

async def broadcast_metrics_update(metrics_data: Dict[str, Any]):
    """Broadcast metrics update to all connected clients"""
    payload = create_metrics_update_payload(metrics_data)
    await manager.broadcast(payload)

def get_active_connections_count() -> int:
    """Get the number of active WebSocket connections"""
    return len(manager.active_connections)