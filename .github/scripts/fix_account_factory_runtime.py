from pathlib import Path

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')

# Mail.tm has returned both Hydra collection objects and top-level arrays in the wild.
p = root / 'MailTmClient.java'
s = p.read_text()
s = s.replace('JSONObject obj = new JSONObject(r.body);\n        JSONArray rows = array(obj, "hydra:member", "member");', 'JSONArray rows = collection(r.body);')
marker = '''    private static JSONArray array(JSONObject o, String a, String b) {\n        JSONArray x = o.optJSONArray(a); return x != null ? x : (o.optJSONArray(b) != null ? o.optJSONArray(b) : new JSONArray());\n    }'''
helper = '''    static JSONArray collection(String body) {\n        String s = body == null ? "" : body.trim();\n        if (s.isEmpty()) return new JSONArray();\n        if (s.charAt(0) == '[') return new JSONArray(s);\n        JSONObject obj = new JSONObject(s);\n        return array(obj, "hydra:member", "member");\n    }\n\n''' + marker
if 'static JSONArray collection(String body)' not in s:
    if marker not in s:
        raise SystemExit('MailTmClient array helper marker not found')
    s = s.replace(marker, helper)
p.write_text(s)

# A phone/CAPTCHA checkpoint during preflight is a checkpoint, not a generic platform error.
p = root / 'Runner.java'
s = p.read_text()
old = '''                Set<String> failed = new HashSet<>();\n                for (Preflight r:preflight) if (!r.ok) failed.add(r.platform);\n                if (!failed.isEmpty()) {\n                    for (Account a:db.list()) {\n                        if (failed.contains(a.platform) && !"READY".equals(a.status)) {\n                            a.status="PREFLIGHT_FAILED"; a.lastState="PREFLIGHT_FAILED";\n                            a.notes="Live signup surface could not be validated; see diagnostics/logs."; db.update(a);\n                        }\n                    }\n                    ui.log("[WARN] Skipping failed platform(s): " + failed);\n                }'''
new = '''                Set<String> failed = new HashSet<>();\n                Map<String,String> failedState = new HashMap<>();\n                for (Preflight r:preflight) if (!r.ok) { failed.add(r.platform); failedState.put(r.platform, r.state); }\n                if (!failed.isEmpty()) {\n                    for (Account a:db.list()) {\n                        if (failed.contains(a.platform) && !"READY".equals(a.status)) {\n                            String preflightState = failedState.getOrDefault(a.platform, "PREFLIGHT_FAILED");\n                            if ("PHONE_REQUIRED".equals(preflightState)) {\n                                a.status="SMS_REQUIRED"; a.lastState="PHONE_REQUIRED";\n                                a.notes="Live preflight requires phone verification. No bypass attempted; platform skipped for unattended run.";\n                            } else if ("CAPTCHA_REQUIRED".equals(preflightState)) {\n                                a.status="CAPTCHA_REQUIRED"; a.lastState="CAPTCHA_REQUIRED";\n                                a.notes="Live preflight requires CAPTCHA. No bypass attempted; platform skipped for unattended run.";\n                            } else {\n                                a.status="PREFLIGHT_FAILED"; a.lastState=preflightState;\n                                a.notes="Live signup surface could not be validated; see diagnostics/logs.";\n                            }\n                            db.update(a);\n                        }\n                    }\n                    ui.log("[WARN] Skipping blocked/failed platform(s): " + failed + " states=" + failedState);\n                }'''
if old not in s:
    raise SystemExit('Runner failed-platform block not found')
s = s.replace(old, new)
old2 = '''            boolean ok=Set.of("SIGNUP_FORM","BIRTHDAY","EMAIL_OTP").contains(state);\n            String diag=ok?"":web.diagnostic(temp,"PREFLIGHT_"+state);\n            ui.log("[PREFLIGHT] " + platform + ": " + (ok?"PASS":"FAIL") + " state=" + state);\n            return new Preflight(platform,ok,state,diag);'''
new2 = '''            boolean ok=Set.of("SIGNUP_FORM","BIRTHDAY","EMAIL_OTP").contains(state);\n            boolean checkpoint=Set.of("PHONE_REQUIRED","CAPTCHA_REQUIRED").contains(state);\n            String diag=ok?"":web.diagnostic(temp,"PREFLIGHT_"+state);\n            ui.log("[PREFLIGHT] " + platform + ": " + (ok?"PASS":(checkpoint?"CHECKPOINT":"FAIL")) + " state=" + state);\n            return new Preflight(platform,ok,state,diag);'''
if old2 not in s:
    raise SystemExit('Runner preflight block not found')
s = s.replace(old2, new2)
p.write_text(s)

# Add a focused unit test for both response shapes.
t = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/MailTmClientTest.java')
t.parent.mkdir(parents=True, exist_ok=True)
t.write_text('''package com.amir.accountfactory;\n\nimport org.junit.Test;\nimport static org.junit.Assert.*;\n\npublic class MailTmClientTest {\n    @Test public void parsesHydraObjectCollection() {\n        String body = "{\\\"hydra:member\\\":[{\\\"domain\\\":\\\"example.test\\\",\\\"isActive\\\":true}]}";\n        assertEquals(1, MailTmClient.collection(body).length());\n    }\n    @Test public void parsesTopLevelArrayCollection() {\n        String body = "[{\\\"domain\\\":\\\"example.test\\\",\\\"isActive\\\":true}]";\n        assertEquals(1, MailTmClient.collection(body).length());\n    }\n}\n''')
