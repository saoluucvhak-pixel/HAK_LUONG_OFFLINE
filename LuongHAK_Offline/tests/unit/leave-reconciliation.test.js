"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { reconcile, checkRequest, attendanceMutation } = require("../../core/leave-reconciliation");
const approval = (date, amount, extra = {}) => ({
  "Mã NV": "A", "Số HĐLĐ": "H1", "Từ ngày": date, "Đến ngày": date, "Số ngày nghỉ": amount, "Trạng thái duyệt": "Đã duyệt", ...extra
});
const champ = (month, kind, values) => ({ "Kỳ": month, "Mã NV": "A", "Hình thức công": kind, ...values });

test("A half-day PN matches the approval; entitlement counts it once", () => {
  const db = { nghiphep: [approval("2026-10-05", 0.5)], chamcong: [champ("2026-10", "PN", {"05": "0,5"})],
    quyenloiphep: [{ "Năm áp dụng": 2026, "Mã NV": "A", "Số HĐLĐ": "H1", "Số ngày được cấp": 0.25 }] };
  const r = reconcile(db, "2026-10");
  assert.equal(r.entries[0].status, "Khớp");
  assert.deepEqual(r.blockers, []);
  assert.deepEqual(r.warnings, [{ ma:"A", contract:"H1", used:0.5, limit:0.25, excess:0.25 }]);
});

test("Only unambiguous approved leave can be applied; mismatches and duplicate PN are blockers", () => {
  const db = { nghiphep: [approval("2026-10-05", 1), approval("2026-10-06", 1, { "Đến ngày": "2026-10-07" }), approval("2026-10-08", 0.5)],
    chamcong: [champ("2026-10", "PN", {"08":1, "09":0.5}), champ("2026-10", "PN", {"09":0.5})] };
  const r = reconcile(db,"2026-10");
  assert.deepEqual(r.entries.filter(x=>x.apply).map(x=>x.date),["2026-10-05"]);
  assert.deepEqual(r.blockers.map(x=>x.date),["2026-10-08","2026-10-09"]);
});

test("A closed month's attendance is counted once and against its contract, not another contract", () => {
  const old = champ("2026-09", "PN", {"01":1});
  const db = { chamcong:[old,champ("2026-10","PN",{"05":1})], kyluong:[{ky:"2026-09",input:{data:{chamcong:[old]}}}],
    hopdong:[{"Mã NV":"A","Số HĐLĐ":"H1","Ngày vào làm":"2026-01-01"}],
    quyenloiphep:[{"Mã NV":"A","Số HĐLĐ":"H1","Năm áp dụng":2026,"Số ngày được cấp":1},{"Mã NV":"A","Số HĐLĐ":"H2","Năm áp dụng":2026,"Số ngày được cấp":10}] };
  assert.deepEqual(reconcile(db,"2026-10").warnings,[{ma:"A",contract:"H1",used:2,limit:1,excess:1}]);
});

test("PN conflicts with unpaid leave; rejected and pending applications are advisory", () => {
  const db = { nghiphep:[approval("2026-10-05",1,{"Loại nghỉ":"Nghỉ không hưởng lương"}),approval("2026-10-06",1,{"Trạng thái duyệt":"Từ chối"}),approval("2026-10-07",1,{"Trạng thái duyệt":"Chờ duyệt"})],
    chamcong:[champ("2026-10","PN",{"05":1,"06":1,"07":1})] };
  const r = reconcile(db,"2026-10");
  assert.deepEqual(r.blockers.map(x=>x.date),["2026-10-05"]);
  assert.equal(r.entries[1].status,"Đơn không còn hiệu lực");
  assert.equal(r.entries[2].status,"Đơn đang chờ duyệt");
});


test("Every attendance type is visible on approved full sick, unpaid and maternity days", () => {
  const sick = approval("2026-10-05",1);
  const unpaid = approval("2026-10-06",1,{"Loại nghỉ":"Nghỉ không hưởng lương"});
  const maternity = approval("2026-10-07",1,{"Loại nghỉ":"Nghỉ thai sản"});
  const db = { nghiphep:[unpaid,maternity], nghiom:[sick], chamcong:[champ("2026-10","TC6",{"05":1}), champ("2026-10","CC",{"06":1}), champ("2026-10","TRCH",{"07":1})] };
  const r = reconcile(db,"2026-10");
  assert.deepEqual(r.blockers.map(x=>Object.keys(x.forms)),[["TC6"],["CC"],["TRCH"]]);
});

test("Proposal reserves approved annual days, including undivided dates, and rejects a request exceeding carry plus grant", () => {
  const old = approval("2026-02-02",2,{"Đến ngày":"2026-02-05"});
  const db = { nghiphep:[old], chamcong:[champ("2026-02","PN",{"03":1}),champ("2026-06","PN",{"01":0.5})],
    quyenloiphep:[{"Mã NV":"A","Số HĐLĐ":"H1","Năm áp dụng":2026,"Số ngày được cấp":2,"Số ngày cộng dồn năm trước":1}],
    hopdong:[{"Mã NV":"A","Số HĐLĐ":"H1","Ngày vào làm":"2026-01-01"}] };
  assert.equal(checkRequest(db,approval("2026-10-05",0.5)),"");
  assert.match(checkRequest(db,approval("2026-10-05",1)),/Vượt hạn mức.*2,5\/3.*0,5 ngày/);
  assert.equal(checkRequest(db,approval("2026-10-05",1,{"Loại nghỉ":"Nghỉ không hưởng lương"})),"");
  assert.match(checkRequest(db,approval("2026-12-31",2,{"Đến ngày":"2027-01-01"})),/từng năm/);
});

test("Paid personal leave matching PN does not deplete the annual allowance", () => {
  const db = { nghiphep:[approval("2026-10-05",0.5,{"Loại nghỉ":"Nghỉ việc riêng có hưởng lương"})],
    chamcong:[champ("2026-10","PN",{"05":0.5})],
    quyenloiphep:[{"Mã NV":"A","Số HĐLĐ":"H1","Năm áp dụng":2026,"Số ngày được cấp":0}] };
  const result = reconcile(db,"2026-10");
  assert.equal(result.entries[0].status,"Khớp");
  assert.equal(result.balances[0].used,0);
});


test("Historical excess stays visible and blocks a new request, without blocking a month with no new leave usage", () => {
  const old = champ("2026-09", "PN", {"01":1});
  const db = { chamcong:[old], kyluong:[{ky:"2026-09",input:{data:{chamcong:[old]}}},{ "Kỳ": "invalid" }],
    quyenloiphep:[{"Mã NV":"A","Số HĐLĐ":"H1","Năm áp dụng":2026,"Số ngày được cấp":0.5}] };
  const r = reconcile(db,"2026-10");
  assert.equal(r.warnings[0].excess,0.5);
  assert.equal(r.quotaBlockers.length,0);
  assert.match(checkRequest(db,approval("2026-10-05",0.5)),/Vượt hạn mức phép năm/);
  db.chamcong.push(champ("2026-10","PN",{"05":0.5}));
  assert.equal(reconcile(db,"2026-10").quotaBlockers[0].excess,1);
});


test("Approved sickness blocks attendance in every form and permits corrections", () => {
  const db = { nghiom: [approval("2026-10-05", 2, { "Đến ngày": "2026-10-06" }), approval("2026-10-07", 0.5), approval("2026-10-08", 1, { "Trạng thái duyệt": "Chờ duyệt" })] };
  for (const type of ["BT","PN","CL","TC1","CC","TRCH"]) {
    const before = champ("2026-10", type, { "05": 1 });
    assert.match(attendanceMutation(db, null, before), /đã duyệt nghỉ ốm/);
    assert.match(attendanceMutation(db, before, { ...before, "06": 0.5 }), /2026-10-06/);
    assert.equal(attendanceMutation(db, before, { ...before, "05": "" }), "");
    assert.match(attendanceMutation(db, before, { ...before, "07": 0.5 }), /2026-10-07/);
    assert.equal(attendanceMutation(db, before, { ...before, "08": 1 }), "");
  }
});


test("Paid leave permits PN only and unpaid and maternity days reject PN too", () => {
  const db = { nghiphep: [
    approval("2026-10-05", 0.5),
    approval("2026-10-06", 1, {"Loại nghỉ":"Nghỉ việc riêng có hưởng lương"}),
    approval("2026-10-07", 1, {"Loại nghỉ":"Nghỉ không hưởng lương"}),
    approval("2026-10-08", 1, {"Loại nghỉ":"Nghỉ thai sản"})
  ] };
  assert.equal(attendanceMutation(db, null, champ("2026-10","PN",{"05":0.5,"06":1})), "");
  for (const type of ["BT","CC","TC1","CL"]) {
    assert.match(attendanceMutation(db, null, champ("2026-10",type,{"05":0.5})), /chỉ ghi công PN/);
  }
  assert.match(attendanceMutation(db, null, champ("2026-10","PN",{"07":1})), /nghỉ không hưởng lương/);
  assert.match(attendanceMutation(db, null, champ("2026-10","PN",{"08":1})), /nghỉ thai sản/);
  assert.equal(reconcile({...db,chamcong:[champ("2026-10","BT",{"05":0.5})]},"2026-10").blockers[0].status, "Ngày nghỉ có lương chỉ được ghi PN");
});
