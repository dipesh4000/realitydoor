from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

import httpx

from app.core.config import Settings


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.supabase_url.rstrip("/")
        self._key = settings.supabase_secret_key

    @property
    def enabled(self) -> bool:
        return bool(self._base_url and self._key)

    def _headers(self) -> dict[str, str]:
        return {"apikey": self._key, "Authorization": f"Bearer {self._key}"}

    @staticmethod
    def _object_url(base_url: str, bucket: str, object_path: str) -> str:
        encoded = "/".join(quote(part, safe="") for part in object_path.split("/"))
        return f"{base_url}/storage/v1/object/{quote(bucket, safe='')}/{encoded}"

    async def upload(self, bucket: str, object_path: str, data: bytes, mime_type: str) -> str:
        url = self._object_url(self._base_url, bucket, object_path)
        headers = {**self._headers(), "Content-Type": mime_type, "x-upsert": "false"}
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, headers=headers, content=data)
            response.raise_for_status()
        return f"supabase://{bucket}/{object_path}"

    async def download(self, storage_path: str) -> bytes:
        bucket, object_path = self.parse_path(storage_path)
        url = self._object_url(self._base_url, bucket, object_path)
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.get(url, headers=self._headers())
            response.raise_for_status()
            return response.content

    async def delete(self, storage_path: str) -> None:
        if not storage_path.startswith("supabase://"):
            path = Path(storage_path)
            if path.exists():
                path.unlink()
            return
        bucket, object_path = self.parse_path(storage_path)
        url = self._object_url(self._base_url, bucket, object_path)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(url, headers=self._headers())
            if response.status_code not in {200, 204, 404}:
                response.raise_for_status()

    @staticmethod
    def parse_path(storage_path: str) -> tuple[str, str]:
        if not storage_path.startswith("supabase://"):
            raise ValueError("Not a Supabase storage path")
        bucket_and_path = storage_path.removeprefix("supabase://")
        bucket, separator, object_path = bucket_and_path.partition("/")
        if not separator or not bucket or not object_path:
            raise ValueError("Invalid Supabase storage path")
        return bucket, object_path
