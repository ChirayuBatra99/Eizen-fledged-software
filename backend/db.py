import os
from collections.abc import Callable
from typing import Any

import psycopg
from psycopg import ClientCursor
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = os.getenv("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL is not set")
        _pool = ConnectionPool(
            conninfo=url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
            open=True,
        )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def query(text: str, params: Any = None) -> list[dict[str, Any]]:
    with get_pool().connection() as conn:
        result = conn.execute(text, params)
        return list(result.fetchall()) if result.description else []



#Not needed   ---->
class Tx:
    def __init__(self, conn: psycopg.Connection):
        self.conn = conn

    def query(self, text: str, params: Any = None) -> list[dict[str, Any]]:
        result = self.conn.execute(text, params)
        return list(result.fetchall()) if result.description else []


def with_transaction(fn: Callable[[Tx], Any]) -> Any:
    with get_pool().connection() as conn:
        with conn.transaction():
            return fn(Tx(conn))


def execute_script(sql: str) -> None:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    with psycopg.connect(url, autocommit=True, cursor_factory=ClientCursor) as conn:
        conn.execute(sql)

#  <---- Not needed   