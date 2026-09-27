from pathlib import Path
import runpy

runpy.run_path('.github/scripts/fix_account_factory_v15.py', run_name='__main__')

p = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/PersonaGeneratorTest.java')
s = p.read_text()
old = '        assertTrue(pw.length() >= 20);\n'
new = '        assertTrue(pw.length() >= 8 && pw.length() <= 20);\n        assertEquals(16, pw.length());\n'
if old not in s:
    raise SystemExit('legacy password assertion marker not found')
p.write_text(s.replace(old, new, 1))
