  function tabAllowed(t) {
    if (t === "home") return true;
    if (t === "access") return !!(store && store.configureAccess && can("system.admin"));
    if (t === "backup") return can("system.admin") || can("backup.restore");
    if (t === "dm") return can("dm.edit") || can("payroll.view") || can("hr.view");
    if (t === "caidat") return can("dm.edit") || can("payroll.view");
    if (S[t]) return can("input.view");
    return TAB_PERM[t] ? can(TAB_PERM[t]) : true;
  }
