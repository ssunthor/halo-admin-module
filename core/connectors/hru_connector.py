import sys
import logging
import grpc
from typing import Dict, Any, Generator, Optional
import json
from google.protobuf.json_format import MessageToDict

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

    def _clean_device_json_fields(self, device: dict):
        if "tenant_info" in device:
            ti = device["tenant_info"]
            if "custom_fields_json" in ti:
                if ti["custom_fields_json"]:
                    try:
                        ti["custom_fields"] = json.loads(ti["custom_fields_json"])
                    except Exception:
                        pass
                del ti["custom_fields_json"]
                
        if "audit" in device:
            ad = device["audit"]
            if "segment_data_json" in ad:
                if ad["segment_data_json"]:
                    try:
                        ad["segment_data"] = json.loads(ad["segment_data_json"])
                    except Exception:
                        pass
                del ad["segment_data_json"]
                
            if "gnid_data_json" in ad:
                if ad["gnid_data_json"]:
                    try:
                        ad["gnid_data"] = json.loads(ad["gnid_data_json"])
                    except Exception:
                        pass
                del ad["gnid_data_json"]

    def get_tenant_topology(self, tenant_acronym: str = "", expand_devices: bool = True, limit: int = 0, offset: int = 0, omit_devices: bool = False) -> list:
        stub = self._get_stub()
        if not stub:
            return []
            
        try:
            req = self.hru_pb2.TenantTopologyRequest(
                tenant_acronym=tenant_acronym,
                expand_devices=expand_devices,
                limit=limit,
                offset=offset,
                omit_devices=omit_devices
            )
            response = stub.GetTenantTopology(req)
            if response.success:
                results = []
                for t in response.result:
                    data = MessageToDict(t, preserving_proto_field_name=True)
                    for device in data.get("devices", []):
                        self._clean_device_json_fields(device)
                    results.append(data)
                return results
            else:
                logger.error(f"HRU GetTenantTopology returned error: {response.message}")
                return []
        except grpc.RpcError as e:
            logger.error(f"gRPC call failed for GetTenantTopology: {e}")
            return []

    def get_tenant_configs(self, tenant_acronym: str = "", limit: int = 0, offset: int = 0) -> list:
        stub = self._get_stub()
        if not stub:
            return []
            
        try:
            req = self.hru_pb2.TenantConfigsRequest(
                tenant_acronym=tenant_acronym,
                limit=limit,
                offset=offset
            )
            response = stub.GetTenantConfigs(req)
            if response.success:
                return json.loads(response.result_json) if response.result_json else []
            else:
                logger.error(f"HRU GetTenantConfigs returned error: {response.message}")
                return []
        except grpc.RpcError as e:
            logger.error(f"gRPC call failed for GetTenantConfigs: {e}")
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
                data = MessageToDict(response.result, preserving_proto_field_name=True)
                self._clean_device_json_fields(data)
                return data
            return {}
        except grpc.RpcError as e:
            logger.error(f"gRPC call failed for NetboxDevice: {e}")
            return {}


