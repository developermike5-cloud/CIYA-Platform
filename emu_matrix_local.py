import base64, json, time, urllib.request, urllib.error, urllib.parse, subprocess, os, signal

proc = subprocess.Popen(["./node_modules/.bin/firebase", "emulators:start", "--only", "firestore", "--project", "ciya-test"],
    stdout=open("/tmp/emu_matrix.log", "w"), stderr=subprocess.STDOUT, env={**os.environ, "PATH": os.environ["PATH"]})
FS = "http://127.0.0.1:8080/v1/projects/ciya-test/databases/(default)"
for _ in range(60):
    try:
        urllib.request.urlopen("http://127.0.0.1:8080/", timeout=2); break
    except Exception: time.sleep(1)
else:
    print(open("/tmp/emu_matrix.log").read()[-1200:]); raise SystemExit(1)

def direct(url, method, body=None, headers=None):
    h = {"Content-Type": "application/json"}; h.update(headers or {})
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()[:400]}

OWN = {"Authorization": "Bearer owner"}
for cid, tier, level in [("courseA","beginner","Beginner"), ("courseB","beginner","Beginner"), ("courseC","advanced","Advanced")]:
    direct(f"{FS}/documents/courses/{cid}", "PATCH",
        body={"fields": {"title": {"stringValue": cid}, "tier": {"stringValue": tier}, "level": {"stringValue": level}}}, headers=OWN)
r = direct(f"{FS}/documents/users/student1", "PATCH",
    body={"fields": {"email": {"stringValue": "s1@x.com"}, "fullName": {"stringValue": "S One"},
                     "approvalStatus": {"stringValue": "Approved"}, "progress": {"mapValue": {"fields": {}}}}}, headers=OWN)
print("seed:", "ok" if "name" in r else json.dumps(r)[:200])

def b64(d): return base64.urlsafe_b64encode(d).rstrip(b"=").decode()
now = int(time.time())
tok = b64(json.dumps({"alg":"none","typ":"JWT"}).encode()) + "." + b64(json.dumps({"sub":"student1","aud":"ciya-test","iat":now-60,"exp":now+3600,"email":"s1@x.com","email_verified":True,"firebase":{"identities":{},"sign_in_provider":"password"},"user_id":"student1"}).encode()) + ".ZmFrZXNpZw"
USER = {"Authorization": "Bearer " + tok}

def wr(paths, fields):
    mask = "&".join(f"updateMask.fieldPaths={p}" for p in paths)
    r = direct(f"{FS}/documents/users/student1?{mask}", "PATCH", body={"fields": fields}, headers=USER)
    err = r.get("http_error")
    if err and err != 403:
        return err, r["body"][:200]
    return err or 200
def slot(cid, done): return {"mapValue": {"fields": {"courseId": {"stringValue": cid}, "completed": {"booleanValue": done}}}}
def pm(fields):
    return {"mapValue": {"fields": {k: ({"stringValue": v} if isinstance(v, str) else {"booleanValue": v}) for k, v in fields.items()}}}

A, B, C = "courseA", "courseB", "courseC"
res = []
res.append(("T0 plain fullName self-write", 200, wr(["fullName"], {"fullName": {"stringValue": "S One Edit"}})))
res.append(("T1 enroll free A", 200, wr([f"progress.{A}.durationMode", f"progress.{A}.createdAt", "beginnerEnrollment"],
    {"progress": {"mapValue": {"fields": {A: pm({"durationMode": "standard"})["mapValue"]["fields"]}}}, "beginnerEnrollment": slot(A, False)})))
res.append(("T2 second free B while A incomplete", 403, wr(["beginnerEnrollment"], {"beginnerEnrollment": slot(B, False)})))
res.append(("T3 claim completed, no completedAt", 403, wr(["beginnerEnrollment"], {"beginnerEnrollment": slot(A, True)})))
res.append(("T4 complete A (completedAt + slot done)", 200, wr([f"progress.{A}.completedAt", "beginnerEnrollment"],
    {"progress": {"mapValue": {"fields": {A: pm({"durationMode": "standard", "completedAt": "2026-11-06T08:00:00Z"})["mapValue"]["fields"]}}}, "beginnerEnrollment": slot(A, True)})))
res.append(("T5 second free B after A completed", 200, wr(["beginnerEnrollment"], {"beginnerEnrollment": slot(B, False)})))
res.append(("T6 slot to paid course C", 403, wr(["beginnerEnrollment"], {"beginnerEnrollment": slot(C, False)})))
res.append(("T7 paid C progress, slot untouched", 200, wr([f"progress.{C}.durationMode"],
    {"progress": {"mapValue": {"fields": {C: pm({"durationMode": "standard"})["mapValue"]["fields"]}}}})))
res.append(("T8 clear slot while B incomplete", 403, wr(["beginnerEnrollment"], {})))
res.append(("T9 profile edit still allowed", 200, wr(["fullName"], {"fullName": {"stringValue": "S One Two"}})))
res.append(("T10 approvalStatus self-set (pre-existing allowed)", 200, wr(["approvalStatus"], {"approvalStatus": {"stringValue": "Approved"}})))

print()
fails = 0
for label, want, got in res:
    ok = got == want
    fails += (not ok)
    print(("PASS" if ok else f"FAIL want {want}"), "|", label, "| got", got)
print("FAILS:", fails)
proc.send_signal(signal.SIGTERM)
try: proc.wait(timeout=20)
except Exception: proc.kill()
