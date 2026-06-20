# backend/cache.py
# Very small in-memory cache. For production replace with Redis.
from time import time

_cache = {}

def set_cache(key, value, ttl=300):
    _cache[key] = {"value": value, "expiry": time() + ttl}

def get_cache(key):
    item = _cache.get(key)
    if not item:
        return None
    if item["expiry"] < time():
        del _cache[key]
        return None
    return item["value"]
