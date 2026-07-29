import click
import logging
import sys
import os

from logging.config import dictConfig
from utils.config_loader import load_config
from utils.logging_setup import get_logging_config
from cli.commands.module_cmds import module_cli
from cli.commands.cache_cmds import cache_cli

logger = logging.getLogger(__name__)

@click.group(invoke_without_command=True)
@click.option("--port", type=int, default=None, help="Port for REST server")
@click.option("--host", type=str, default=None, help="Host for REST server")
@click.option("--log-level", type=str, default=None, help="Log level overrides config")
@click.option("--mode", type=str, help="Execution mode")
@click.pass_context
def cli(ctx, port, host, log_level, mode):
    if ctx.obj is None:
        ctx.obj = {}
    config = load_config()
    
    if log_level:
        if "logging" not in config:
            config["logging"] = {}
        config["logging"]["level"] = log_level
        
    ctx.obj['config'] = config
    
    # Ensure stubs are in path
    try:
        paths_cfg = config.get('paths', {})
        hau_stubs = paths_cfg.get('hau_stubs_path')
        sera_stubs = paths_cfg.get('sera_stubs_path')
        
        for p in [hau_stubs, sera_stubs]:
            if p and os.path.exists(p) and p not in sys.path:
                sys.path.insert(0, p)
    except Exception as e:
        logger.warning(f"Failed to append stubs to path: {e}")
        
    if ctx.invoked_subcommand is None:
        # Default behavior: start API server to maintain backward compatibility
        ctx.invoke(start_api_server, port=port, host=host)

@cli.command(name="start-api-server")
@click.option("--port", type=int, default=None)
@click.option("--host", type=str, default=None)
@click.pass_context
def start_api_server(ctx: click.Context, port, host):
    config = ctx.obj.get('config')
    dictConfig(get_logging_config(config))
    
    import uvicorn
    
    api_config = config.get('system_services', {}).get('api', {})
    final_port = port if port else api_config['port']
    final_host = host if host else api_config['host']
    
    log_config_dict = get_logging_config(config)
    
    # Needs to be imported inside so logging setup works correctly
    import logging
    app_logger = logging.getLogger(__name__)
    app_logger.info(f"--- Starting Halo Admin Module Backend Server on host {final_host} port {final_port}... ---")
    
    uvicorn.run(
        "rest_api.main:app", 
        host=final_host,
        port=final_port,
        log_config=log_config_dict,
        reload=False
    )

@cli.command(name="start-grpc-server")
@click.pass_context
def start_grpc_server(ctx: click.Context):
    config = ctx.obj.get('config')
    dictConfig(get_logging_config(config))
    
    import logging
    app_logger = logging.getLogger(__name__)
    app_logger.info("CLI: Request to start the HAM gRPC server.")

    from grpc_api.services import serve as run_grpc_server
    run_grpc_server(config)

cli.add_command(module_cli)
cli.add_command(cache_cli)

if __name__ == '__main__':
    cli()
