"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const appPath = path.resolve(__dirname, "../..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hak-access-"));
let app, page;

async function open() {
  app = await _electron.launch({
    executablePath: process.env.ELECTRON_PATH || require("electron"),
    args: ["--no-sandbox", appPath],
    env: { ...process.env, HAK_USER_DATA: profile, HAK_NO_SHELL: "1" }
  });
  page = await app.firstWindow();
  await page.waitForSelector("#main > *");
}

const home = () => page.locator("#nav button[data-k=home]");
const settings = () => page.locator("#nav button[data-k=access]");
const auth = () => page.evaluate(() => window.hakStore.authState());
const load = () => page.evaluate(() => JSON.parse(window.hakStore.load().text));
const field = (name) => page.locator('#main [data-f="' + name + '"]');
const primary = () => page.locator("#main button.big");
async function credentials(user, password) {
  await field("u").fill(user);
  await field("p").fill(password);
}
async function verifyDirect() {
  await home().waitFor();
  assert.equal((await auth()).user, "#local");
  assert.equal(await page.locator("[data-logout]").count(), 0);
  assert.equal((await load()).accessSettings.mode, "direct");
}
async function run() {
  fs.writeFileSync(path.join(profile, "data.json"), JSON.stringify({
    schemaVersion: 2, nhanvien: [{ "Mã NV": "ACCESS-FIXTURE", "Họ và tên": "Nhân viên kiểm thử" }]
  }));
  await open();
  await page.locator("[data-access-skip]").click();
  await verifyDirect();
  const before = await load();
  assert.deepEqual(before.nguoidung, []);
  assert.equal(before.nhanvien[0]["Mã NV"], "ACCESS-FIXTURE");

  await settings().click();
  await page.getByRole("button", { name: "Sử dụng tài khoản đăng nhập", exact: true }).click();
  await credentials("chuluong", "Access2026safe");
  await field("n").fill("Chủ hồ sơ");
  await field("p2").fill("KhongKhop2026");
  await primary().click();
  await page.getByText(/Hai lần nhập mật khẩu không khớp/).waitFor();
  assert.equal((await load()).accessSettings.mode, "direct");
  await field("p2").fill("Access2026safe");
  await primary().click();
  await page.locator("#modal [data-recovery]").waitFor();
  await page.locator("#modal footer button.pri").click();
  await home().waitFor();
  let data = await load();
  assert.equal(data.accessSettings.mode, "account");
  assert.equal(data.nguoidung.length, 1);
  assert.match(data.nguoidung[0].hash, /^[0-9a-f]{64}$/);
  assert.equal((await auth()).user, "chuluong");

  await app.close();
  await open();
  await field("u").waitFor();
  assert.equal((await auth()).ok, false);
  await credentials("chuluong", "Access2026safe");
  await primary().click();
  await home().waitFor();

  await settings().click();
  await page.getByRole("button", { name: "Một người sử dụng", exact: true }).click();
  await credentials("chuluong", "MatKhauSai2026");
  await primary().click();
  await page.getByText(/Sai tên đăng nhập hoặc mật khẩu/).waitFor();
  assert.equal((await load()).accessSettings.mode, "account");
  await field("p").fill("Access2026safe");
  await primary().click();
  await verifyDirect();
  data = await load();
  assert.deepEqual(data.nhanvien || [], before.nhanvien || []);
  assert.deepEqual(data.kyluong || [], before.kyluong || []);
  assert.equal(data.nguoidung.length, 1);

  await app.close();
  await open();
  await verifyDirect();
  console.log("PASS Thiết lập bỏ qua, tạo tài khoản, mở lại, chuyển chế độ xác thực và giữ dữ liệu");
}

run().catch(err => { console.error(err); process.exitCode = 1; }).finally(async () => {
  if (app) await app.close().catch(() => {});
  fs.rmSync(profile, { recursive: true, force: true });
});
