"""Throttle classes for websites app."""

from django.core.cache import caches
from rest_framework.throttling import SimpleRateThrottle


class PublicSiteThrottle(SimpleRateThrottle):
    """Rate-limit public site requests by IP (60/min default)."""

    scope = "public_site"
    cache = caches["throttle"]

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
