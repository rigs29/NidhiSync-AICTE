import os
import uuid
import mimetypes
from abc import ABC, abstractmethod
from typing import Tuple, Optional, Set
import boto3
from botocore.exceptions import (
    ClientError,
    ConnectionClosedError,
    EndpointConnectionError,
    NoCredentialsError,
    PartialCredentialsError,
)
from fastapi import HTTPException, status
from app.core.config import settings

# Operational S3/IAM error codes that legitimately warrant falling back to local disk on upload
S3_UPLOAD_FALLBACK_ERROR_CODES: Set[str] = {
    "AccessDenied",
    "AccountProblem",
    "AllAccessDisabled",
    "ExpiredToken",
    "InternalError",
    "InvalidAccessKeyId",
    "InvalidToken",
    "NoSuchBucket",
    "RequestTimeout",
    "ServiceUnavailable",
    "SignatureDoesNotMatch",
    "SlowDown",
    "TokenRefreshRequired",
}


def validate_file_signature(file_bytes: bytes, ext: str) -> None:
    """
    Validates magic-byte file signatures for PDF, JPEG, and PNG.
    Blocks disguised executables (MZ / ELF) and mismatched file headers.
    """
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload empty file",
        )

    # Reject Windows PE (MZ) and Linux ELF binaries immediately
    if file_bytes.startswith(b"MZ") or file_bytes.startswith(b"\x7fELF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Rejection: Executable binary signature detected.",
        )

    ext_lower = ext.lower().lstrip(".")
    if ext_lower == "pdf":
        if not file_bytes.lstrip().startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file signature: File does not start with a valid %PDF- header.",
            )
    elif ext_lower == "png":
        if not file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PNG file signature: File header does not match PNG magic bytes.",
            )
    elif ext_lower in ("jpg", "jpeg"):
        if not file_bytes.startswith(b"\xff\xd8\xff"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JPEG file signature: File header does not match JPEG magic bytes.",
            )


class BaseStorageProvider(ABC):
    @abstractmethod
    def save_file(self, file_bytes: bytes, original_filename: str, content_type: str) -> Tuple[str, str]:
        """Returns (storage_key, safe_filename)"""
        pass

    def save_file_with_provider(
        self, file_bytes: bytes, original_filename: str, content_type: str
    ) -> Tuple[str, str, str]:
        """Returns (storage_key, safe_filename, actual_provider_name)"""
        storage_key, safe_filename = self.save_file(file_bytes, original_filename, content_type)
        return storage_key, safe_filename, "LOCAL"

    @abstractmethod
    def get_file_content(self, storage_key: str) -> Tuple[bytes, str]:
        """Returns (file_bytes, content_type)"""
        pass

    @abstractmethod
    def get_download_url(self, storage_key: str, original_filename: str) -> Optional[str]:
        """Returns presigned URL if cloud, or None/API path for local streaming"""
        pass

    @abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        pass


class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, base_dir: str):
        self.base_dir = os.path.realpath(os.path.abspath(base_dir))
        os.makedirs(self.base_dir, exist_ok=True)

    def _sanitize_extension(self, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format .{ext}. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        return ext

    def _get_safe_path(self, storage_key: str) -> str:
        """
        Prevents path traversal and sibling-directory prefix bypasses
        using os.path.commonpath containment verification.
        """
        if not storage_key or "\x00" in storage_key:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Invalid file path")

        candidate = os.path.realpath(os.path.abspath(os.path.join(self.base_dir, storage_key)))
        try:
            common = os.path.commonpath([self.base_dir, candidate])
        except ValueError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Invalid file path")

        if common != self.base_dir or candidate == self.base_dir:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Invalid file path")

        return candidate

    def save_file_with_provider(
        self, file_bytes: bytes, original_filename: str, content_type: str
    ) -> Tuple[str, str, str]:
        ext = self._sanitize_extension(original_filename)
        validate_file_signature(file_bytes, ext)
        safe_name = f"fdr_{uuid.uuid4().hex}.{ext}"
        storage_path = self._get_safe_path(safe_name)

        with open(storage_path, "wb") as f:
            f.write(file_bytes)

        return safe_name, safe_name, "LOCAL"

    def save_file(self, file_bytes: bytes, original_filename: str, content_type: str) -> Tuple[str, str]:
        storage_key, safe_name, _ = self.save_file_with_provider(file_bytes, original_filename, content_type)
        return storage_key, safe_name

    def get_file_content(self, storage_key: str) -> Tuple[bytes, str]:
        file_path = self._get_safe_path(storage_key)
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found on server")

        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or "application/octet-stream"

        with open(file_path, "rb") as f:
            data = f.read()
        return data, content_type

    def get_download_url(self, storage_key: str, original_filename: str) -> Optional[str]:
        return f"{settings.API_V1_STR}/documents/download/{storage_key}"

    def delete_file(self, storage_key: str) -> bool:
        file_path = self._get_safe_path(storage_key)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False


class S3StorageProvider(BaseStorageProvider):
    def __init__(self, bucket_name: str, region_name: str = "ap-southeast-2"):
        self.bucket_name = bucket_name
        self.region_name = region_name
        self.client = boto3.client("s3", region_name=self.region_name)

    def _sanitize_extension(self, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format .{ext}. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        return ext

    @staticmethod
    def _raise_for_s3_client_error(exc: ClientError, operation: str) -> None:
        """
        Maps S3 ClientError responses explicitly to 404 (missing object),
        403 (access denied), or 502 (upstream S3 service error).
        """
        error_info = exc.response.get("Error", {})
        error_code = str(error_info.get("Code", ""))
        http_status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")

        if error_code in ("404", "NoSuchKey", "NotFound") or http_status == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"S3 document object not found during {operation}",
            )
        if (
            error_code in ("403", "AccessDenied", "AllAccessDisabled", "InvalidAccessKeyId", "SignatureDoesNotMatch")
            or http_status == 403
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to S3 document during {operation}",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"S3 storage service error ({error_code or 'UNKNOWN'}) during {operation}",
        )

    def save_file_with_provider(
        self, file_bytes: bytes, original_filename: str, content_type: str
    ) -> Tuple[str, str, str]:
        ext = self._sanitize_extension(original_filename)
        validate_file_signature(file_bytes, ext)
        safe_name = f"fdr_{uuid.uuid4().hex}.{ext}"
        key = f"documents/{safe_name}"

        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption="AES256",
                Metadata={"original_filename": original_filename}
            )
            return key, safe_name, "S3"
        except (
            NoCredentialsError,
            PartialCredentialsError,
            EndpointConnectionError,
            ConnectionClosedError,
        ) as e:
            print(f"[AWS S3 Warning] S3 credentials or endpoint unreachable ({type(e).__name__}). Falling back to local storage.")
            local_fallback = LocalStorageProvider(settings.STORAGE_DIR)
            return local_fallback.save_file_with_provider(file_bytes, original_filename, content_type)
        except ClientError as e:
            error_code = str(e.response.get("Error", {}).get("Code", ""))
            http_status = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0)
            if error_code in S3_UPLOAD_FALLBACK_ERROR_CODES or (isinstance(http_status, int) and http_status >= 500):
                print(f"[AWS S3 Warning] S3 upload rejected ({error_code}). Falling back to local storage.")
                local_fallback = LocalStorageProvider(settings.STORAGE_DIR)
                return local_fallback.save_file_with_provider(file_bytes, original_filename, content_type)
            raise

    def save_file(self, file_bytes: bytes, original_filename: str, content_type: str) -> Tuple[str, str]:
        storage_key, safe_name, _ = self.save_file_with_provider(file_bytes, original_filename, content_type)
        return storage_key, safe_name

    def get_file_content(self, storage_key: str) -> Tuple[bytes, str]:
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=storage_key)
            data = response["Body"].read()
            content_type = response.get("ContentType", "application/octet-stream")
            return data, content_type
        except ClientError as e:
            self._raise_for_s3_client_error(e, operation="read")
        except (
            NoCredentialsError,
            PartialCredentialsError,
            EndpointConnectionError,
            ConnectionClosedError,
        ):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="S3 storage service unavailable or credentials missing",
            )

    def get_download_url(self, storage_key: str, original_filename: str) -> Optional[str]:
        if not storage_key or not self.bucket_name:
            return None
        try:
            url = self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": storage_key,
                    "ResponseContentDisposition": f'inline; filename="{original_filename}"'
                },
                ExpiresIn=900
            )
            return url
        except (
            ClientError,
            NoCredentialsError,
            PartialCredentialsError,
            EndpointConnectionError,
            ConnectionClosedError,
        ):
            # Graceful degradation for FDR list/detail responses: return None so lists load successfully
            return None

    def delete_file(self, storage_key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except (
            ClientError,
            NoCredentialsError,
            PartialCredentialsError,
            EndpointConnectionError,
            ConnectionClosedError,
        ):
            return False


def get_storage(provider_name: Optional[str] = None) -> BaseStorageProvider:
    normalized = provider_name.strip().upper() if provider_name else None

    if normalized == "LOCAL":
        return LocalStorageProvider(settings.STORAGE_DIR)

    if normalized == "S3":
        if not settings.S3_BUCKET_NAME:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="S3 bucket is not configured for S3-stored document",
            )
        return S3StorageProvider(bucket_name=settings.S3_BUCKET_NAME, region_name=settings.AWS_REGION)

    # Default selection for new uploads based on global settings
    if settings.USE_AWS_S3 and settings.S3_BUCKET_NAME:
        try:
            return S3StorageProvider(bucket_name=settings.S3_BUCKET_NAME, region_name=settings.AWS_REGION)
        except (
            ClientError,
            NoCredentialsError,
            PartialCredentialsError,
            EndpointConnectionError,
            ConnectionClosedError,
        ) as e:
            print(f"[Storage Provider] Error initializing S3 provider: {e}. Using Local storage.")
            return LocalStorageProvider(settings.STORAGE_DIR)
    return LocalStorageProvider(settings.STORAGE_DIR)

