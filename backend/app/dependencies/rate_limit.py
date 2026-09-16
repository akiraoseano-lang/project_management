from fastapi import HTTPException, Request, status

from app.core.redis import redis_client


class LoginRateLimiter:
    def __init__(
        self,
        limit: int = 5,
        window: int = 60
    ):
        self.limit = limit
        self.window = window

    def check(self, request: Request, email: str):
        client_ip = request.client.host

        ip_key = f"rate_limit:login:ip:{client_ip}"
        email_key = f"rate_limit:login:email:{email.lower()}"

        ip_attempts = int(redis_client.get(ip_key) or 0)
        email_attempts = int(redis_client.get(email_key) or 0)

        if ip_attempts >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts from this IP. Please try again later."
            )

        if email_attempts >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts for this account. Please try again later."
            )

    def record_failure(self, request: Request, email: str):
        client_ip = request.client.host

        ip_key = f"rate_limit:login:ip:{client_ip}"
        email_key = f"rate_limit:login:email:{email.lower()}"

        ip_attempts = redis_client.incr(ip_key)

        if ip_attempts == 1:
            redis_client.expire(
                ip_key,
                self.window
            )

        email_attempts = redis_client.incr(email_key)

        if email_attempts == 1:
            redis_client.expire(
                email_key,
                self.window
            )

class IPRateLimiter:
    def __init__(
        self,
        limit: int,
        window: int,
        key_prefix: str
    ):
        self.limit = limit
        self.window = window
        self.key_prefix = key_prefix

    def __call__(self, request: Request):
        client_ip = request.client.host

        key = f"rate_limit:{self.key_prefix}:ip:{client_ip}"

        current = redis_client.incr(key)

        if current == 1:
            redis_client.expire(
                key,
                self.window
            )

        if current > self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )