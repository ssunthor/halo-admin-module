import click
import os
import sys

def _get_sera_stub(config):
    import grpc
    
    sera_stubs = config.get('paths', {}).get('sera_stubs_path')
    if sera_stubs and os.path.exists(sera_stubs) and sera_stubs not in sys.path:
        sys.path.insert(0, sera_stubs)
    
    import sera_standard_pb2_grpc
    
    grpc_config = config.get('system_services', {}).get('grpc', {})
    host = grpc_config['host']
    if host == '0.0.0.0': host = 'localhost'
    port = grpc_config['port']
    
    address = f"{host}:{port}"
    
    channel = grpc.insecure_channel(address)
    return sera_standard_pb2_grpc.SeraAppServiceStub(channel)

@click.group(name="module")
def module_cli():
    """Module-specific commands (Info, Health)"""
    pass

@module_cli.command(name="info")
@click.option('--grpc', is_flag=True, help="Output raw gRPC response")
@click.pass_context
def get_info(ctx, grpc):
    """Retrieves App Info via the SERA Standard gRPC"""
    config = ctx.obj.get('config')
    try:
        from google.protobuf.empty_pb2 import Empty
        stub = _get_sera_stub(config)
        response = stub.GetAppInfo(Empty(), timeout=5)
        
        if grpc:
            from google.protobuf.json_format import MessageToJson
            click.echo(MessageToJson(response, preserving_proto_field_name=True))
            return
            
        click.secho(f"=== {response.acronym} Info ===", fg="cyan", bold=True)
        click.echo(f"Name/Desc: {response.description}")
        click.echo(f"Version:   {response.version}")
        click.echo(f"Category:  {response.category}")
        click.echo(f"Dependencies: {', '.join(response.downstream_dependencies)}")
    except Exception as e:
        click.secho(f"Failed to get info: {e}", fg="red")

@module_cli.command(name="check-health")
@click.option('--grpc', is_flag=True, help="Output raw gRPC response")
@click.pass_context
def check_health(ctx, grpc):
    """Retrieves Deep Health via the SERA Standard gRPC"""
    config = ctx.obj.get('config')
    try:
        from google.protobuf.empty_pb2 import Empty
        stub = _get_sera_stub(config)
        response = stub.GetDeepHealth(Empty(), timeout=5)
        
        if grpc:
            from google.protobuf.json_format import MessageToJson
            click.echo(MessageToJson(response, preserving_proto_field_name=True))
            return
        
        color = "green" if response.overall_status == "HEALTHY" else "red"
        click.secho(f"Overall Status: {response.overall_status}", fg=color, bold=True)
        
        for dep in response.dependency_health_matrix:
            dep_color = "green" if dep.status == "OK" else "yellow"
            click.echo(f" - {dep.dependency_name}: ", nl=False)
            click.secho(f"{dep.status}", fg=dep_color, nl=False)
            click.echo(f" ({dep.details})")
    except Exception as e:
        click.secho(f"Failed to get deep health: {e}", fg="red")
