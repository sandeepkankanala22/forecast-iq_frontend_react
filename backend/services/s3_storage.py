"""
S3 storage backend for logs and output files.
When S3_BUCKET is set in env, file writes go to S3 instead of local data dir.
"""

import os
from pathlib import Path
from typing import Optional

# Optional boto3 - already in requirements for Bedrock
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    ClientError = Exception

_PROJECT_ROOT = Path(__file__).resolve().parent


def s3_enabled() -> bool:
    """True if S3 storage is configured and available.
    Set USE_S3=false in .env to force local storage for testing (even if S3_BUCKET is set).
    """
    if os.getenv("USE_S3", "true").strip().lower() in ("false", "0", "no"):
        return False
    return bool(os.getenv("S3_BUCKET")) and boto3 is not None


def _s3_enabled() -> bool:
    return s3_enabled()


def _get_s3_client():
    if not _s3_enabled():
        return None
    region = os.getenv("S3_REGION") or os.getenv("AWS_REGION") or "us-east-1"
    return boto3.client("s3", region_name=region)


def _s3_key(*parts: str) -> str:
    base = (os.getenv("S3_PREFIX", "forecast-agent") or "forecast-agent").strip("/")
    joined = "/".join(p.strip("/") for p in parts if p)
    return f"{base}/{joined}" if joined else base.rstrip("/")


def upload_file(local_path: Path, s3_key: str) -> Optional[str]:
    """Upload a local file to S3. Returns S3 key or None if S3 disabled/failed."""
    if not _s3_enabled() or not Path(local_path).is_file():
        return None
    try:
        key = s3_key
        client = _get_s3_client()
        bucket = os.getenv("S3_BUCKET")
        client.upload_file(str(local_path), bucket, key)
        return key
    except Exception:
        return None


def upload_bytes(data: bytes, s3_key: str) -> bool:
    """Upload raw bytes to S3. Returns True on success."""
    if not _s3_enabled():
        return False
    try:
        client = _get_s3_client()
        bucket = os.getenv("S3_BUCKET")
        client.put_object(Bucket=bucket, Key=s3_key, Body=data)
        return True
    except Exception as exc:
        import sys
        print(f"[s3_storage] upload_bytes failed for key={s3_key!r}: {exc}", file=sys.stderr)
        return False


def upload_json(data: dict, s3_key: str) -> bool:
    """Upload JSON dict to S3."""
    import json
    return upload_bytes(
        json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8"),
        s3_key
    )


def get_presigned_download_url(s3_key: str, expires_in: int = 3600) -> Optional[str]:
    """Generate presigned URL for download. Returns None if S3 disabled/failed."""
    if not _s3_enabled():
        return None
    try:
        client = _get_s3_client()
        bucket = os.getenv("S3_BUCKET")
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=expires_in,
        )
    except Exception:
        return None


def download_to_temp(s3_key: str) -> Optional[Path]:
    """Download S3 object to temp file. Returns path or None."""
    if not _s3_enabled():
        return None
    import tempfile
    try:
        client = _get_s3_client()
        bucket = os.getenv("S3_BUCKET")
        local = Path(tempfile.gettempdir()) / Path(s3_key).name
        client.download_file(bucket, s3_key, str(local))
        return local
    except Exception:
        return None


def s3_output_key(*parts: str) -> str:
    """Build S3 key for output files (e.g. output/user_input.json)."""
    return _s3_key("output", *parts)


def s3_logs_key(*parts: str) -> str:
    """Build S3 key for log files (e.g. logs/session_xxx/main.log)."""
    return _s3_key("logs", *parts)
