"""Conservative offline security scanner for HAK projects (Python 3.10+)."""
from __future__ import annotations
import argparse
import json
import pathlib
import re

RULES = (
 ("SEC001","high","Possible hardcoded credential",re.compile(r"(?i)\b(?:password|api_key|secret_key|access_token)\s*[:=]\s*['\"][^'\"]{8,}['\"]")),
 # eval(...) / exec(...) gọi trực tiếp, new Function(...), child_process.exec(...). KHÔNG bắt regex.exec(...) hay các phương thức .exec() khác:
 # bản cũ bắt mọi ".exec(" nên báo nhầm hàng chục lỗi "high" và che mất lỗi thật.
 ("SEC002","high","Dangerous dynamic execution",re.compile(r"(?<![.\w$])(?:eval|exec)\s*\(|\bnew\s+Function\s*\(|\b(?:child_process|cp)\s*\.\s*exec(?:Sync)?\s*\(")),
 ("SEC003","medium","Unsafe HTML injection sink",re.compile(r"\.innerHTML\s*=")),
 ("SEC004","medium","TLS certificate verification disabled",re.compile(r"\bverify\s*=\s*False\b")),
 ("SEC005","medium","Potentially unsafe subprocess shell",re.compile(r"\bshell\s*=\s*True\b")),
)
EXTENSIONS={".py",".js",".jsx",".ts",".tsx",".html",".gs"}
# app-src: các đoạn nguồn được ghép thành app.js (file được quét), quét cả hai sẽ đếm đôi mỗi phát hiện.
SKIP={".git","node_modules","dist","build",".venv","venv","coverage","app-src"}
# Thư viện bên thứ ba đã nén (xlsx.full.min.js, exceljs.min.js...): do npm audit và việc ghim phiên bản quản lý, không quét mẫu.
MINIFIED=(".min.js",)
# Dòng chỉ là chú thích (// ..., # ..., * ...): mô tả, không phải mã chạy.
COMMENT=re.compile(r"^\s*(?://|#|\*|/\*)")
def scan(root: pathlib.Path, max_files=5000, max_bytes=1_000_000, exclude=()):
    root=root.resolve()
    skip=SKIP|set(exclude)
    findings=[]
    scanned=0
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS or any(part in skip for part in path.relative_to(root).parts):
            continue
        if path.is_symlink() or path.stat().st_size > max_bytes or path.name.lower().endswith(MINIFIED):
            continue
        scanned+=1
        if scanned > max_files:
            raise RuntimeError("Scan file limit exceeded")
        for number,line in enumerate(path.read_text(encoding="utf-8",errors="replace").splitlines(),1):
            if COMMENT.match(line):
                continue
            for rule,severity,description,pattern in RULES:
                if pattern.search(line):
                    findings.append({"rule":rule,"severity":severity,"description":description,"file":str(path.relative_to(root)),"line":number})
    return {"schemaVersion":1,"scannedFiles":scanned,"findings":findings,"high":sum(f["severity"]=="high" for f in findings)}
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",default=".")
    p.add_argument("--out",default="hak-security-results.json")
    p.add_argument("--exclude",action="append",default=[],help="Tên thư mục bỏ qua thêm (lặp lại được), ví dụ: --exclude tests")
    args=p.parse_args()
    result=scan(pathlib.Path(args.root),exclude=args.exclude)
    pathlib.Path(args.out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"scannedFiles":result["scannedFiles"],"findings":len(result["findings"]),"high":result["high"]}))
    return 1 if result["high"] else 0
if __name__=="__main__":
    raise SystemExit(main())
