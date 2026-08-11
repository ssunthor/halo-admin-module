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

    def update_tenant_customization(self, payload: dict) -> dict:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.UpdateTenantCustomizationRequest(
            tenant_slug=payload.get("tenant_slug", ""),
            tenant_category=payload.get("tenant_category", ""),
            tenant_tier=payload.get("tenant_tier", ""),
            update_policy=payload.get("update_policy", ""),
            owner=payload.get("owner", ""),
            purpose=payload.get("purpose", ""),
            maintenance_window=payload.get("maintenance_window", ""),
            configuration_payload=payload.get("configuration_payload", "")
        )
        try:
            resp = self.stub.UpdateTenantCustomization(req, metadata=self.metadata, timeout=10)
            return {"success": resp.success, "message": resp.message}
        except Exception as e:
            logger.error(f"Error updating tenant customization: {e}")
            raise

    def sync_git_inventory(self, project_name: str = "") -> dict:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GitInventorySyncRequest(project_name=project_name)
        try:
            resp = self.stub.GitInventorySync(req, metadata=self.metadata, timeout=120)
            return {"success": resp.success, "message": resp.message}
        except Exception as e:
            logger.error(f"Error syncing git inventory: {e}")
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

    def get_halo_documentation_tree(self) -> list:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GetHaloDocumentationTreeRequest()
        try:
            resp = self.stub.GetHaloDocumentationTree(req, metadata=self.metadata, timeout=30)
            if not resp.success:
                raise Exception(f"Failed to fetch halo documentation tree: {resp.message}")
            return [{
                "filename": d.filename,
                "raw_markdown": d.raw_markdown,
                "doc_type": d.doc_type,
                "category": d.category,
                "name": d.name,
                "acronym": d.acronym,
                "version": d.version,
                "author": d.author,
                "status": d.status,
                "date": d.date,
                "relative_path": d.relative_path,
                "project_name": d.project_name
            } for d in resp.documents]
        except Exception as e:
            logger.error(f"Error fetching halo documentation tree: {e}")
            raise

    def get_git_audit(self, project_name: str = "", audit_id: str = "") -> list:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GitAuditRequest(project_name=project_name, id=audit_id)
        try:
            resp = self.stub.GitAudit(req, metadata=self.metadata, timeout=30)
            if not resp.success:
                raise Exception(f"Failed to fetch git audit logs: {resp.message}")
            import json
            return json.loads(resp.result_json)
        except Exception as e:
            logger.error(f"Error fetching git audit logs: {e}")
            raise

    def trigger_git_release(self, project_name: str, source_branch: str, target_branch: str, author: str, skip_changelog: bool = False, keep_branch: bool = True, debug: bool = True):
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GitReleaseRequest(
            project_name=project_name,
            source_branch=source_branch,
            target_branch=target_branch,
            skip_changelog_generation=skip_changelog,
            keep_branch=keep_branch,
            debug=debug,
            author=author
        )
        # Returns a generator for the gRPC stream
        return self.stub.GitRelease(req, metadata=self.metadata)

    def trigger_git_retry(self, project_name: str, pipeline_id: int, merge_id: int, author: str, skip_warnings: bool = False, debug: bool = True):
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GitRetryRequest(
            project_name=project_name,
            pipeline_id=pipeline_id,
            merge_id=merge_id,
            skip_warnings=skip_warnings,
            debug=debug,
            author=author
        )
        # Returns a generator for the gRPC stream
        return self.stub.GitRetry(req, metadata=self.metadata)

    def trigger_git_delete(self, project_name: str, branch_name: str = "", container_tag: str = "", author: str = "Unknown") -> dict:
        if not self.stub:
            raise Exception("HAU Connector is not connected.")
            
        req = self.hau_pb2.GitDeleteRequest(
            project_name=project_name,
            branch_name=branch_name,
            container_tag=container_tag,
            author=author
        )
        try:
            resp = self.stub.GitDelete(req, metadata=self.metadata, timeout=120)
            return {"success": resp.success, "message": resp.message}
        except Exception as e:
            logger.error(f"Error triggering git delete: {e}")
            raise
