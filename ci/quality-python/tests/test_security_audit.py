import pathlib
import tempfile
import unittest
from importlib.util import module_from_spec, spec_from_file_location
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=spec_from_file_location("security_audit",ROOT/"security_audit.py")
module=module_from_spec(spec)
spec.loader.exec_module(module)
class SecurityAuditTests(unittest.TestCase):
    def test_flags_dynamic_execution_without_leaking_source(self):
        with tempfile.TemporaryDirectory() as d:
            pathlib.Path(d,"app.py").write_text("eval(user_input)\n",encoding="utf-8")
            report=module.scan(pathlib.Path(d))
            self.assertEqual(report["high"],1)
            self.assertNotIn("eval(user_input)",str(report))
    def test_ignores_build_folders(self):
        with tempfile.TemporaryDirectory() as d:
            build=pathlib.Path(d,"node_modules")
            build.mkdir()
            (build/"app.js").write_text("eval(input)",encoding="utf-8")
            self.assertEqual(module.scan(pathlib.Path(d))["scannedFiles"],0)
    def test_detects_tls_bypass(self):
        with tempfile.TemporaryDirectory() as d:
            pathlib.Path(d,"api.py").write_text("requests.get(url, verify=False)",encoding="utf-8")
            self.assertEqual(module.scan(pathlib.Path(d))["findings"][0]["rule"],"SEC004")
    def scan_text(self, name, text):
        with tempfile.TemporaryDirectory() as d:
            pathlib.Path(d,name).write_text(text,encoding="utf-8")
            return module.scan(pathlib.Path(d))
    def test_regex_exec_and_other_exec_methods_are_not_dynamic_execution(self):
        report=self.scan_text("a.js","var m = /^(\\d+)$/.exec(String(v));\nvar n = re.exec(s); stmt.exec(sql);\nobj.eval(x);\n")
        self.assertEqual(report["high"],0)
    def test_real_dynamic_execution_is_still_flagged(self):
        for text in ("eval(code)\n","x = eval (code)\n","exec(cmd)\n","var f = new Function('a', body);\n","child_process.exec(cmd)\n","cp.execSync(cmd)\n","window.setTimeout(function(){ eval(s) })\n"):
            self.assertEqual(self.scan_text("a.js",text)["high"],1,text)
    def test_comment_lines_are_not_findings(self):
        report=self.scan_text("a.js","// KHÔNG dùng eval()/new Function()\n  * eval(x) trong chú thích khối\n# exec(cmd)\n")
        self.assertEqual(report["findings"],[])
    def test_minified_vendor_files_and_bundle_fragments_are_skipped(self):
        with tempfile.TemporaryDirectory() as d:
            pathlib.Path(d,"lib.min.js").write_text("eval(x)",encoding="utf-8")
            parts=pathlib.Path(d,"app-src"); parts.mkdir(); (parts/"01-a.js").write_text("el.innerHTML = x;",encoding="utf-8")
            pathlib.Path(d,"app.js").write_text("el.innerHTML = x;",encoding="utf-8")
            report=module.scan(pathlib.Path(d))
            self.assertEqual(report["scannedFiles"],1)
            self.assertEqual(len(report["findings"]),1)
    def test_extra_folders_can_be_excluded(self):
        with tempfile.TemporaryDirectory() as d:
            tests=pathlib.Path(d,"tests"); tests.mkdir(); (tests/"t.js").write_text("cp.execSync(cmd)",encoding="utf-8")
            self.assertEqual(module.scan(pathlib.Path(d))["high"],1)
            self.assertEqual(module.scan(pathlib.Path(d),exclude=["tests"])["scannedFiles"],0)
if __name__=="__main__":unittest.main()
