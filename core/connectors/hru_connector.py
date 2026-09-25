import sys
import logging
import grpc
from typing import Dict, Any, Generator, Optional
import json

logger = logging.getLogger(__name__)

class HRUConnector:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        stubs_path = config.get("paths", {}).get("hru_stubs_path")
        if stubs_path and stubs_path not in sys.path:
            sys.path.insert(0, stubs_path)
            
        try:
            import hru_pb2
            import hru_pb2_grpc
            self.hru_pb2 = hru_pb2
            self.hru_pb2_grpc = hru_pb2_grpc
        except ImportError as e:
            logger.error(f"HRU gRPC stubs not found. Connector will fail: {e}")
            self.hru_pb2 = None
            self.hru_pb2_grpc = None
        
        # Load HRU specific settings
        hru_config = self.config.get('connectors', {}).get('hru', {})
        self.host = hru_config.get('host', 'localhost')
        self.port = hru_config.get('port', 50122)
        self.address = f"{self.host}:{self.port}"
        self._channel = None
        self._stub = None
        logger.info(f"Initialized HRU Connector targeting {self.address}")
        
    def _get_stub(self) -> Optional[Any]:
        """Lazy load the gRPC channel and stub."""
        if not self._stub:
            try:
                self._channel = grpc.insecure_channel(self.address)
                self._stub = self.hru_pb2_grpc.HRUServiceStub(self._channel)
            except Exception as e:
                logger.error(f"Failed to initialize HRU gRPC channel: {e}")
                return None
        return self._stub

    def get_tenant_topology(self, tenant_acronym: str = "", expand_devices: bool = True) -> list:
        stub = self._get_stub()
        if not stub:
            return []
            
        try:
            req = self.hru_pb2.TenantTopologyRequest(
                tenant_acronym=tenant_acronym,
                expand_devices=expand_devices
            )
            response = stub.GetTenantTopology(req)
            if response.success:
                return json.loads(response.result_json) if response.result_json else []
            else:
                logger.error(f"HRU GetTenantTopology returned error: {response.message}")
                return []
        except grpc.RpcError as e:
            logger.error(f"gRPC call failed for GetTenantTopology: {e}")
            return []

    def sync_tenant(self, tenant_acronym: str) -> Generator[Dict[str, Any], None, None]:
        stub = self._get_stub()
        if not stub:
            yield {"success": False, "message": "Failed to connect to HRU service", "step": "error"}
            return
            
        try:
            req = self.hru_pb2.TenantSyncRequest(tenant_acronym=tenant_acronym)
            for response in stub.TenantSync(req):
                yield {
                    "success": response.success,
                    "message": response.message,
                    "step": response.step
                }
        except grpc.RpcError as e:
            logger.error(f"gRPC stream failed for TenantSync: {e}")
            yield {"success": False, "message": f"Connection lost during sync: {e.details()}", "step": "error"}

    def get_netbox_device(self, device_name: str) -> dict:
        stub = self._get_stub()
        if not stub:
            return {}
            
        try:
            req = self.hru_pb2.NetboxDeviceRequest(device_name=device_name)
            response = stub.NetboxDevice(req)
            if response.success:
                return json.loads(response.result_json) if response.result_json else {}
            return {}
        except grpc.RpcError as e:
            logger.error(f"gRPC call failed for NetboxDevice: {e}")
            return {}


