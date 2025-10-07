"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function R2UploadTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""; 

  async function fetchList() {
    try {
      const res = await fetch(`${apiBase}/s3/test`);
      if (!res.ok) throw new Error("List request failed");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setMessage(err?.message || "Failed to list objects");
    }
  }

  async function handleUpload() {
    if (!file) {
      setMessage("Select a file first");
      return;
    }
    setUploading(true);
    setMessage("");
    setUploadedUrl("");
    try {
      const key = `uploads/${Date.now()}_${encodeURIComponent(file.name)}`;
      const contentType = file.type || "application/octet-stream";
      const presignRes = await fetch(
        `${apiBase}/s3/test2?key=${encodeURIComponent(
          key
        )}&contentType=${encodeURIComponent(contentType)}&expires=600`
      );
      if (!presignRes.ok) throw new Error("Failed to get presigned URL");
      const presignData = await presignRes.json();
      const putUrl: string = presignData.url;

      const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      // After upload, fetch list to get a GET url for the key
      await fetchList();
      // Find the item and show its getUrl if present
      const match = (items || []).find((i) => i.key === key);
      if (match?.getUrl) {
        setUploadedUrl(match.getUrl);
      } else {
        // As a fallback, re-fetch list fresh and try again
        const listRes = await fetch(`${apiBase}/s3/test?expires=600`);
        const listData = await listRes.json();
        const match2 = (listData.items || []).find((i: any) => i.key === key);
        if (match2?.getUrl) setUploadedUrl(match2.getUrl);
      }
      setMessage("Upload successful");
    } catch (err: any) {
      setMessage(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>R2 Upload Test (Presigned URL)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || !file} className="bg-primary">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="outline" onClick={fetchList}>
                Refresh List
              </Button>
            </div>
          </div>

          {message && <div className="text-sm text-muted-foreground">{message}</div>}
          {uploadedUrl && (
            <div className="text-sm">
              Uploaded URL: {" "}
              <a href={uploadedUrl} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bucket Objects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-y">
                  <th className="text-left px-3 py-2">Key</th>
                  <th className="text-right px-3 py-2">Size</th>
                  <th className="text-left px-3 py-2">Last Modified</th>
                  <th className="text-left px-3 py-2">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((it) => (
                  <tr key={it.key}>
                    <td className="px-3 py-2 break-all">{it.key}</td>
                    <td className="px-3 py-2 text-right">{it.size ?? "-"}</td>
                    <td className="px-3 py-2">
                      {it.lastModified ? new Date(it.lastModified).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {it.getUrl ? (
                        <a href={it.getUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-muted-foreground" colSpan={4}>
                      No items. Click Refresh List.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


