"""
Domain errors raised by services, and how every error becomes a clear JSON
response ({"detail": "..."}) plus a useful log line.

Unexpected errors get a short error ID: the user sees it in the app, and the
full traceback is logged under the same ID (terminal locally, Render "Logs"
tab in production) so a reported problem can be found quickly.
"""

import logging
import uuid

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError

log = logging.getLogger("bukuma.errors")


class AppError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(AppError):
    """Duplicate values or an action blocked by related records."""

    status_code = status.HTTP_409_CONFLICT


class BusinessRuleError(AppError):
    """A request that is well-formed but breaks a shop rule (e.g. not enough stock)."""

    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT


def _where(request: Request) -> str:
    return f"{request.method} {request.url.path}"


def _error_id() -> str:
    return uuid.uuid4().hex[:8]


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        # Expected, user-fixable problems: log briefly, return the message as-is
        log.info("%s -> %s %s: %s", _where(request), exc.status_code, type(exc).__name__, exc.message)
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    @app.exception_handler(IntegrityError)
    async def _handle_integrity(request: Request, exc: IntegrityError) -> JSONResponse:
        eid = _error_id()
        log.warning("[%s] %s -> 409 database constraint: %s", eid, _where(request), exc.orig)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "This change conflicts with existing records (for example a duplicate name, "
                f"or something still linked to it). Nothing was saved. (error ID: {eid})"
            },
        )

    @app.exception_handler(OperationalError)
    async def _handle_db_down(request: Request, exc: OperationalError) -> JSONResponse:
        eid = _error_id()
        log.error("[%s] %s -> 503 database unavailable: %s", eid, _where(request), exc.orig)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "The database could not be reached. Check the internet connection and try again "
                f"in a minute. (error ID: {eid})"
            },
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        eid = _error_id()
        log.exception("[%s] Unexpected error on %s: %s: %s", eid, _where(request), type(exc).__name__, exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Server error while handling {_where(request)}: {type(exc).__name__}. "
                f"Nothing was saved. Please try again; if it keeps happening, report error ID {eid}."
            },
        )
