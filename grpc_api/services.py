import logging
import grpc
from concurrent import futures
from typing import Dict, Any

try:
    import sera_standard_pb2_grpc
except ImportError:
    pass

from grpc_api.sera_standard_service import SeraStandardServiceImpl

logger = logging.getLogger(__name__)

def serve(config: Dict[str, Any]):
    grpc_config = config['system_services']['grpc']
    host = grpc_config['host']
    port = grpc_config['port']
    max_workers = int(grpc_config['max_workers'])
    
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=max_workers))
    
    # Add SERA Standard Service
    sera_standard_pb2_grpc.add_SeraAppServiceServicer_to_server(
        SeraStandardServiceImpl(config), server
    )

    address = f"{host}:{port}"
    server.add_insecure_port(address)
    logger.info(f"--- Starting SAM gRPC Server on {address} ---")
    server.start()
    server.wait_for_termination()
