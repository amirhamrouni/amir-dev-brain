from pathlib import Path
import runpy

runpy.run_path('.github/scripts/fix_account_factory_v16.py', run_name='__main__')

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')

# Persist the last email verification code as plaintext for owner reuse.
p = root / 'AppDb.java'
s = p.read_text()
s = s.replace('v.put("attempt_count", a.attemptCount); v.put("notes", a.notes); v.put("diagnostic_path", a.diagnosticPath); v.put("last_code", crypto.encrypt(a.lastCode));',
              'v.put("attempt_count", a.attemptCount); v.put("notes", a.notes); v.put("diagnostic_path", a.diagnosticPath); v.put("last_code", a.lastCode == null ? "" : a.lastCode);')
s = s.replace('a.lastCode = crypto.decrypt(nz(c.getString(c.getColumnIndexOrThrow("last_code"))));',
              'a.lastCode = readLastCode(nz(c.getString(c.getColumnIndexOrThrow("last_code"))));')
marker = '    private static String nz(String v) { return v == null ? "" : v; }\n'
helper = '''    private String readLastCode(String stored) {\n        if (stored == null || stored.trim().isEmpty()) return "";\n        try { String d = crypto.decrypt(stored); if (d != null && !d.trim().isEmpty()) return d; }\n        catch (Throwable ignored) {}\n        return stored;\n    }\n\n'''
if 'private String readLastCode(' not in s:
    s = s.replace(marker, helper + marker, 1)
p.write_text(s)

# Do not lose a message just because its body was not populated on the first fetch.
p = root / 'MailTmClient.java'
s = p.read_text()
start = s.index('    public String waitForCode(')
end = s.index('    private synchronized List<String> activeDomains()', start)
new_wait = '''    public String waitForCode(String token, int timeoutSeconds, String platform, long notBeforeEpochSeconds) {\n        long deadline = System.currentTimeMillis() + timeoutSeconds * 1000L;\n        java.util.HashSet<String> completed = new java.util.HashSet<>();\n        java.util.HashMap<String,Long> retryAfter = new java.util.HashMap<>();\n        String platformLower = platform == null ? "" : platform.toLowerCase(Locale.ROOT);\n        while (System.currentTimeMillis() < deadline) {\n            try {\n                List<JSONObject> items = messages(token);\n                items.sort(Comparator.comparing((JSONObject x) -> x.optString("createdAt", "")).reversed());\n                ArrayList<String> deferred = new ArrayList<>();\n                long now = System.currentTimeMillis();\n                for (JSONObject item : items) {\n                    String id = item.optString("id", "");\n                    if (id.trim().isEmpty() || completed.contains(id)) continue;\n                    long created = epoch(item.optString("createdAt", ""));\n                    if (notBeforeEpochSeconds > 0 && created > 0 && created < notBeforeEpochSeconds - 45) { completed.add(id); continue; }\n                    if (now < retryAfter.getOrDefault(id, 0L)) continue;\n                    JSONObject full = message(token, id);\n                    String blob = messageBlob(full);\n                    String code = OtpUtil.extractCode(blob);\n                    if (code.trim().isEmpty()) { retryAfter.put(id, now + 5000L); continue; }\n                    completed.add(id);\n                    if (!platformLower.trim().isEmpty() && blob.toLowerCase(Locale.ROOT).contains(platformLower)) return code;\n                    deferred.add(code);\n                }\n                if (!deferred.isEmpty()) return deferred.get(0);\n            } catch (Exception ignored) {}\n            try { Thread.sleep(3000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); return ""; }\n        }\n        return "";\n    }\n\n'''
s = s[:start] + new_wait + s[end:]
p.write_text(s)

# Display the code plainly in the app log and notes as soon as it arrives.
p = root / 'Runner.java'
s = p.read_text()
old = 'if (!code.trim().isEmpty()) { current.lastCode=code; db.update(current); }'
new = 'if (!code.trim().isEmpty()) { current.lastCode=code; current.notes="EMAIL CODE: " + code; db.update(current); log(current.id,"PASS","EMAIL CODE: " + code + " (saved plaintext)"); }'
if old not in s:
    raise SystemExit('Runner code marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Keep the verification page open and wait for the owner to enter/confirm the displayed code manually.
p = root / 'FlowEngine.java'
s = p.read_text()
old = 'if (web.fillOtp(code)) { listener.onState(state, "email code inserted"); settle(650); web.clickProgress(); settle(2600); continue; }'
new = '''listener.onState(state, "email code available; enter it and confirm manually");\n                    long manualDeadline = System.currentTimeMillis() + Math.max(180000L, cfg.emailCodeTimeoutSeconds * 1000L);\n                    boolean advanced = false;\n                    while (System.currentTimeMillis() < manualDeadline) {\n                        settle(800);\n                        String u = web.currentUrl().toLowerCase(Locale.ROOT);\n                        String s2 = (u.contains("/signup/email/digit-code") || u.contains("/signup/email/verify")) ? "EMAIL_OTP" : web.detectState();\n                        if (!"EMAIL_OTP".equals(s2)) { listener.onState(s2, "manual confirmation detected; resuming"); advanced = true; break; }\n                    }\n                    if (advanced) continue;\n                    return resultWithDiag(web, account, "EMAIL_OTP_WAITING_CONFIRMATION", state);'''
if old not in s:
    raise SystemExit('FlowEngine code marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Build-time source contract checks.
assert 'saved plaintext' in (root / 'Runner.java').read_text()
assert 'email code available; enter it and confirm manually' in (root / 'FlowEngine.java').read_text()
assert 'retryAfter.put(id, now + 5000L)' in (root / 'MailTmClient.java').read_text()
assert 'v.put("last_code", a.lastCode == null ? "" : a.lastCode)' in (root / 'AppDb.java').read_text()
