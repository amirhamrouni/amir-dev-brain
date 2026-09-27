from pathlib import Path
import re

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')

# Android file writing compatibility.
p = root / 'WebAutomation.java'
s = p.read_text()
s = s.replace('Files.writeString(htmlFile.toPath(), html == null ? "" : html, StandardCharsets.UTF_8);',
              'try (FileOutputStream out = new FileOutputStream(htmlFile)) { out.write((html == null ? "" : html).getBytes(StandardCharsets.UTF_8)); }')
s = s.replace('Files.writeString(jsonFile.toPath(), meta.toString(2), StandardCharsets.UTF_8);',
              'try (FileOutputStream out = new FileOutputStream(jsonFile)) { out.write(meta.toString(2).getBytes(StandardCharsets.UTF_8)); }')
p.write_text(s)

p = root / 'Runner.java'
s = p.read_text()
s = s.replace('Files.writeString(jp.toPath(),json.toString(2),StandardCharsets.UTF_8);',
              'try (java.io.FileOutputStream out = new java.io.FileOutputStream(jp)) { out.write(json.toString(2).getBytes(StandardCharsets.UTF_8)); }')
s = s.replace('Files.writeString(tp.toPath(),text.toString(),StandardCharsets.UTF_8);',
              'try (java.io.FileOutputStream out = new java.io.FileOutputStream(tp)) { out.write(text.toString().getBytes(StandardCharsets.UTF_8)); }')
p.write_text(s)

# Android Keystore AES-GCM must provide its own randomized IV for encryption.
p = root / 'CryptoBox.java'
s = p.read_text()
pattern = r'byte\[\]\s+iv\s*=\s*new byte\[12\];\s*R\.nextBytes\(iv\);\s*Cipher\s+c\s*=\s*Cipher\.getInstance\("AES/GCM/NoPadding"\);\s*c\.init\(Cipher\.ENCRYPT_MODE,\s*key\(\),\s*new GCMParameterSpec\(128,\s*iv\)\);\s*byte\[\]\s+out\s*=\s*c\.doFinal\(plain\.getBytes\(StandardCharsets\.UTF_8\)\);'
replacement = 'Cipher c = Cipher.getInstance("AES/GCM/NoPadding");\n            c.init(Cipher.ENCRYPT_MODE, key());\n            byte[] iv = c.getIV();\n            byte[] out = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));'
s, n = re.subn(pattern, replacement, s, count=1)
if n != 1 and 'byte[] iv = c.getIV();' not in s:
    raise SystemExit('CryptoBox encryption patch not applied')
p.write_text(s)

# GENERATE must never crash the activity without a visible diagnostic.
p = root / 'MainActivity.java'
s = p.read_text()
s = s.replace('Button generate=button("GENERATE"); generate.setOnClickListener(v->generateBatch());',
              'Button generate=button("GENERATE"); generate.setOnClickListener(v->safeGenerateBatch());')
marker = '    private void generateBatch() {'
guard = '    private void safeGenerateBatch() {\n        try { generateBatch(); }\n        catch (Throwable t) {\n            android.util.Log.e("AmirFactory", "GENERATE failed", t);\n            logUi("[FATAL] GENERATE " + t.getClass().getSimpleName() + ": " + String.valueOf(t.getMessage()));\n        }\n    }\n\n'
if 'private void safeGenerateBatch()' not in s:
    if marker not in s:
        raise SystemExit('generateBatch marker not found')
    s = s.replace(marker, guard + marker)
p.write_text(s)

# Mail.tm has returned both Hydra collection objects and top-level arrays.
p = root / 'MailTmClient.java'
s = p.read_text()
s = s.replace('JSONObject obj = new JSONObject(r.body);\n        JSONArray rows = array(obj, "hydra:member", "member");', 'JSONArray rows = collection(r.body);')
array_marker = '''    private static JSONArray array(JSONObject o, String a, String b) {\n        JSONArray x = o.optJSONArray(a); return x != null ? x : (o.optJSONArray(b) != null ? o.optJSONArray(b) : new JSONArray());\n    }'''
collection_helper = '''    static JSONArray collection(String body) throws Exception {\n        String s = body == null ? "" : body.trim();\n        if (s.isEmpty()) return new JSONArray();\n        if (s.charAt(0) == '[') return new JSONArray(s);\n        JSONObject obj = new JSONObject(s);\n        return array(obj, "hydra:member", "member");\n    }\n\n''' + array_marker
if 'static JSONArray collection(String body)' not in s:
    if array_marker not in s:
        raise SystemExit('MailTmClient array helper marker not found')
    s = s.replace(array_marker, collection_helper)
else:
    s = s.replace('static JSONArray collection(String body) {', 'static JSONArray collection(String body) throws Exception {')
p.write_text(s)

# A phone/CAPTCHA checkpoint during preflight is a checkpoint, not a generic error.
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

# API 26 compatibility for methods introduced much later.
for p in root.glob('*.java'):
    s = p.read_text()
    s = s.replace('.isBlank()', '.trim().isEmpty()')
    s = re.sub(r'Set\.of\((.*?)\)', r'new java.util.HashSet<>(java.util.Arrays.asList(\1))', s, flags=re.S)
    p.write_text(s)

# Focused parser regression tests for both Mail.tm response shapes.
t = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/MailTmClientTest.java')
t.parent.mkdir(parents=True, exist_ok=True)
t.write_text('''package com.amir.accountfactory;\n\nimport org.junit.Test;\nimport static org.junit.Assert.*;\n\npublic class MailTmClientTest {\n    @Test public void parsesHydraObjectCollection() throws Exception {\n        String body = "{\\\"hydra:member\\\":[{\\\"domain\\\":\\\"example.test\\\",\\\"isActive\\\":true}]}";\n        assertEquals(1, MailTmClient.collection(body).length());\n    }\n    @Test public void parsesTopLevelArrayCollection() throws Exception {\n        String body = "[{\\\"domain\\\":\\\"example.test\\\",\\\"isActive\\\":true}]";\n        assertEquals(1, MailTmClient.collection(body).length());\n    }\n}\n''')
