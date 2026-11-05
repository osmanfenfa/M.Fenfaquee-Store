"""Readable server logs: time, level, where, message. Shows up in the terminal locally and in Render's Logs tab."""

import logging

LOG_FORMAT = "%(asctime)s %(levelname)-7s [%(name)s] %(message)s"


def setup_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if any(getattr(h, "_bukuma", False) for h in root.handlers):
        return  # already configured (e.g. uvicorn --reload)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt="%Y-%m-%d %H:%M:%S"))
    handler._bukuma = True  # type: ignore[attr-defined]
    root.addHandler(handler)
    root.setLevel(level)
    logging.getLogger("bukuma").setLevel(level)
