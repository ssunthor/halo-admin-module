import sys
import grpc
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class HAUConnector:
    def __init__(self, config: Dict[str, Any]):
        stubs_path = config["paths"]["hau_stubs_path"]
        if stubs_path not in sys.path:
            sys.path.insert(0, stubs_path)
            
        try:
            import hau_pb2
            import hau_pb2_grpc
            self.hau_pb2 = hau_pb2
            self.hau_pb2_grpc = hau_pb2_grpc
        except ImportError as e:
            logger.error(f"HAU gRPC stubs not found. Connector will fail: {e}")
            self.hau_pb2 = None
            self.hau_pb2_grpc = None
            
        hau_cfg = config['connectors']['hau']
        address = f"{hau_cfg['host']}:{hau_cfg['port']}"
        self.timeout = hau_cfg['timeout_seconds']
        
        acronym = config.get('module_info', {}).get('acronym', 'HAM')
        self.metadata = (('x-client-id', acronym),)

        if self.hau_pb2_grpc:
            try:
                options = [
                    ('grpc.max_receive_message_length', 50 * 1024 * 1024),
                    ('grpc.max_send_message_length', 50 * 1024 * 1024)
                ]
                self.channel = grpc.insecure_channel(address, options=options)
                # Use the correct HauServiceStub from hau_pb2_grpc
                self.stub = getattr(self.hau_pb2_grpc, "HauServiceStub", None)
                if self.stub:
                    self.stub = self.stub(self.channel)
                logger.info(f"Connected to HAU gRPC service at {address}")
            except Exception as e:
                logger.error(f"Failed to initialize HAU connector channel: {e}")
                self.stub = None
        else:
            self.stub = None

    def ping(self) -> Dict[str, Any]:
        return {"status": "ok", "message": "HAU Connector scaffolded."}

    def get_inventory(self, tenant_slug: str = "") -> Dict[str, Any]:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
        
        req = self.hau_pb2.InventoryListRequest(tenant_slug=tenant_slug)
        try:
            resp = self.stub.InventoryList(req, metadata=self.metadata, timeout=self.timeout)
            if not resp.success:
                raise Exception(f"Failed to fetch inventory: {resp.message}")
            import json
            return json.loads(resp.result_json)
        except Exception as e:
            logger.error(f"Error fetching inventory: {e}")
            raise

    def get_git_inventory(self, project_name: str = "") -> dict:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GitInventoryRequest(project_name=project_name)
        try:
            # Set a slightly longer timeout (e.g., 60 seconds) because fetching git inventory can take a few seconds
            resp = self.stub.GitInventory(req, metadata=self.metadata, timeout=60)
            if not resp.success:
                raise Exception(f"Failed to fetch git inventory: {resp.message}")
            import json
            return json.loads(resp.result_json)
        except Exception as e:
            logger.error(f"Error fetching git inventory: {e}")
            raise

    def get_changelog(self, project_name: str) -> str:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GetChangelogRequest(project_name=project_name)
        try:
            resp = self.stub.GetChangelog(req, metadata=self.metadata, timeout=30)
            if not resp.success:
                raise Exception(f"Failed to fetch changelog: {resp.message}")
            return resp.raw_yaml_changelog
        except Exception as e:
            logger.error(f"Error fetching changelog for {project_name}: {e}")
            raise

    def get_documentation(self, project_name: str) -> list:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GetDocumentationRequest(project_name=project_name)
        try:
            resp = self.stub.GetDocumentation(req, metadata=self.metadata, timeout=30)
            if not resp.success:
                raise Exception(f"Failed to fetch documentation: {resp.message}")
            return [{"filename": d.filename, "raw_markdown": d.raw_markdown} for d in resp.documents]
        except Exception as e:
            logger.error(f"Error fetching documentation for {project_name}: {e}")
            raise
