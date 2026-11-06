import json, urllib.request, urllib.error

PROXY = "https://ciyacademy.netlify.app/.netlify/functions/firebase-proxy"
KEYH = {"x-proxy-key": "9c69a58bf25104d8f0fa0ea0a88b293efb4f61bc438be61b960f2e5ef295c37d", "Content-Type": "application/json"}
def pg(url, method, body=None):
    b = {"url": url, "method": method}
    if body is not None: b["body"] = body
    req = urllib.request.Request(f"{PROXY}?op=google", data=json.dumps(b).encode(), headers=KEYH, method="POST")
    try:
        return json.loads(urllib.request.urlopen(req, timeout=180).read().decode())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()[:500]}

DB = "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78"
PROJ = "gen-lang-client-0862975917"
UID = "student1"
TS = "2026-11-06T11:00:00.000Z"

def tok(uid=UID, email="s1@x.com"):
    return {"sub": uid, "email": email, "email_verified": True, "firebase": {"identities": {}, "sign_in_provider": "password"}}

def mocks_admin_false():
    return [
        {"function": "exists", "args": [{"exactValue": f"/databases/{DB}/documents/admins/{UID}"}], "result": {"value": False}},
        {"function": "exists", "args": [{"exactValue": f"/databases/{DB}/documents/users/{UID}"}], "result": {"value": True}},
        {"function": "get", "args": [{"exactValue": f"/databases/{DB}/documents/users/{UID}"}], "result": {"value": {"data": {"email": "s1@x.com"}}}},
    ] + course_mocks()

def course_mocks():
    out = []
    for cid, tier, level in [("courseA", "beginner", "Beginner"), ("courseB", "beginner", "Beginner"), ("courseC", "advanced", "Advanced")]:
        out.append({"function": "exists", "args": [{"exactValue": f"/databases/{DB}/documents/courses/{cid}"}], "result": {"value": True}})
        out.append({"function": "get", "args": [{"exactValue": f"/databases/{DB}/documents/courses/{cid}"}], "result": {"value": {"data": {"title": cid, "tier": tier, "level": level}}}})
    return out

SEED = {"email": "s1@x.com", "fullName": "S One", "approvalStatus": "Approved", "progress": {}, "createdAt": TS, "updatedAt": TS}

def case(name, expect, merged, path_uid=UID, token=None, no_token=False):
    path = f"/databases/{DB}/documents/users/{path_uid}"
    req = {"path": path, "method": "update"}
    if not no_token: req["token"] = token or tok()
    return {"name": name, "expectation": expect, "request": req, "resource": state_ref[0] if path_uid == UID else {"email": "s2@x.com"}, "requestResource": merged, "mocks": mocks_admin_false()}

state = dict(SEED)
state_ref = [state]
def apply(merged): state_ref[0] = merged

def upd(mask_fields, changed):
    # merged = state with changed fields applied (mask semantics: top-level replace for listed parents)
    merged = json.loads(json.dumps(state_ref[0]))
    for k, v in changed.items():
        if v is None: merged.pop(k, None)
        else: merged[k] = v
    return merged

TS_C = "2026-11-06T11:00:00.000Z"
cases = []

# T0 fullName self-write
m = upd(None, {"fullName": "S One Edit"})
cases.append(("T0 plain fullName self-write", "ALLOW", m, None, None, False)); apply(m)

# T1 enroll free A
m = upd(None, {"progress": {"courseA": {"durationMode": "standard", "createdAt": TS_C}}, "beginnerEnrollment": {"courseId": "courseA", "completed": False}})
cases.append(("T1 enroll free A", "ALLOW", m, None, None, False)); apply(m)

# T2 second free B while A incomplete -> DENY
m = upd(None, {"beginnerEnrollment": {"courseId": "courseB", "completed": False}})
cases.append(("T2 second free B while A incomplete", "DENY", m, None, None, False))

# T3 claim completed, no completedAt -> DENY
m = upd(None, {"beginnerEnrollment": {"courseId": "courseA", "completed": True}})
cases.append(("T3 claim completed, no completedAt", "DENY", m, None, None, False))

# T4 complete A
m = upd(None, {"progress": {**state_ref[0]["progress"], "courseA": {"durationMode": "standard", "createdAt": TS_C, "completedAt": "1762406400000"}}, "beginnerEnrollment": {"courseId": "courseA", "completed": True}})
cases.append(("T4 complete A (completedAt + slot done)", "ALLOW", m, None, None, False)); apply(m)

# T5 second free B after A completed
m = upd(None, {"beginnerEnrollment": {"courseId": "courseB", "completed": False}})
cases.append(("T5 second free B after A completed", "ALLOW", m, None, None, False)); apply(m)

# T6 slot to paid course C -> DENY
m = upd(None, {"beginnerEnrollment": {"courseId": "courseC", "completed": False}})
cases.append(("T6 slot to paid course C", "DENY", m, None, None, False))

# T7 paid C progress, slot untouched
m = upd(None, {"progress": {**state_ref[0]["progress"], "courseC": {"durationMode": "standard"}}})
cases.append(("T7 paid C progress, slot untouched", "ALLOW", m, None, None, False)); apply(m)

# T8 clear slot while B incomplete -> DENY
m = upd(None, {"beginnerEnrollment": None})
cases.append(("T8 clear slot while B incomplete", "DENY", m, None, None, False))

# T9 profile edit
m = upd(None, {"fullName": "S One Two"})
cases.append(("T9 profile edit still allowed", "ALLOW", m, None, None, False)); apply(m)

# T10 approvalStatus self-set
m = upd(None, {"approvalStatus": "Approved"})
cases.append(("T10 approvalStatus self-set", "ALLOW", m, None, None, False))

# T11 unauthenticated -> DENY
m = upd(None, {"fullName": "Anon Edit"})
cases.append(("T11 unauthenticated write", "DENY", m, None, None, True))

# T12 other user's doc -> DENY
m = {"fullName": "Hijack"}
cases.append(("T12 write other user's doc", "DENY", m, "student2", None, False))

# T13 self-set role -> DENY
m = upd(None, {"role": "superadmin"})
cases.append(("T13 self-set role", "DENY", m, None, None, False))

# T14 admins-doc admin (manage_students) updating student2 -> ALLOW
admin_tok = {"sub": "admin-uid-1", "email": "admin@ciya.com", "email_verified": True, "firebase": {"identities": {}, "sign_in_provider": "password"}}
admin_mocks = [
    {"function": "exists", "args": [{"exactValue": f"/databases/{DB}/documents/admins/admin-uid-1"}], "result": {"value": True}},
    {"function": "get", "args": [{"exactValue": f"/databases/{DB}/documents/admins/admin-uid-1"}], "result": {"value": {"data": {"role": "CIYA Admin", "permissions": ["manage_students"]}}}},
]
cases.append(("T14 admins-doc admin edits student", "ALLOW", {"fullName": "Admin Edit"}, "student2", admin_tok, False, admin_mocks))

cases = [c if len(c) == 7 else (*c, mocks_admin_false()) for c in cases]
src = open("firestore.rules").read()
# suite2: request.resource = merged doc, resource = the pre-state of that exact write
suite2 = []
prev = SEED
for name, expect, merged, puid, tk, notok, mk in cases:
    path = f"/databases/{DB}/documents/users/{puid or UID}"
    req = {"path": path, "method": "update"}
    if not notok:
        t = tk or tok()
        req["auth"] = {"uid": t["sub"], "token": t}
    seed = {"email": "s2@x.com", "fullName": "S Two"} if puid else prev
    suite2.append({"expectation": expect, "request": {**req, "resource": {"data": merged}},
                   "resource": {"data": json.loads(json.dumps(seed))}, "functionMocks": mk})
    if not puid and expect == "ALLOW":
        prev = merged

body = {"source": {"files": [{"name": "firestore.rules", "content": src}]}, "testSuite": {"testCases": suite2}}
r = pg(f"https://firebaserules.googleapis.com/v1/projects/{PROJ}:test", "POST", body)
if "testResults" not in r:
    print("API ERROR:", json.dumps(r)[:800]); raise SystemExit(1)
errs = [i for i in r.get("issues", []) if i.get("severity") == "ERROR"]
print("compile errors:", json.dumps(errs)[:400] if errs else "none")
npass = 0
for (name, expect, *_), tr in zip(cases, r["testResults"]):
    st = tr.get("state")
    ok = st == "SUCCESS"
    npass += ok
    line = f"{'PASS' if ok else 'FAIL'} {name}: want {expect}, got {st}"
    if not ok:
        line += " | " + json.dumps(tr.get("debugMessages", tr.get("errorPosition")))[:220]
    print(line)
print(f"\n{npass}/{len(cases)} passed")
