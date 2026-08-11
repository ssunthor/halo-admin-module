import click
import logging

@click.group(name="cache")
def cache_cli():
    """Cache and Cooldown related commands"""
    pass

@cache_cli.command(name="clear")
@click.pass_context
def clear_cache(ctx):
    """Clears Redis cache and database cooldowns (incidents)"""
    config = ctx.obj.get('config', {})
    
    
    # Clear Redis (which includes daemon cooldown locks and API caches)
    redis_url = config.get('redis', {}).get('url')
    if not redis_url:
        click.secho("✗ Redis URL not found in config. Please set redis.url in settings.yaml", fg="red")
        return
        
    # Let's obscure the password when logging to the console
    safe_redis_url = redis_url.replace(redis_url.split('@')[0].split(':')[-1], '********') if '@' in redis_url else redis_url
    
    click.echo(f"Flushing Redis cache and cooldown locks at {safe_redis_url}...")
    try:
        from core.io_handlers.redis_handler import RedisHandler
        redis_handler = RedisHandler(redis_url=redis_url)
        if redis_handler.client:
            redis_handler.client.flushdb()
            redis_handler.client.set("__SERA_DB_OWNER__", "HAM - Cache")
            click.secho("✓ Redis cache and daemon cooldowns flushed.", fg="green")
        else:
            click.secho("✗ Redis connection failed.", fg="red")
    except Exception as e:
        click.secho(f"✗ Error flushing Redis: {e}", fg="red")
