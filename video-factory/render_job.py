#!/usr/bin/env python3
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


def fail(msg: str, code: int = 2):
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"cannot read JSON {path}: {exc}")


def require_job(job: dict):
    script = str(job.get("script", "")).strip()
    terms = job.get("terms") or []
    if not script:
        fail("job.script is required")
    if not isinstance(terms, list) or not 3 <= len(terms) <= 20:
        fail("job.terms must be a JSON list with 3..20 visual search terms")
    terms = [str(x).strip() for x in terms if str(x).strip()]
    if len(terms) < 3:
        fail("not enough usable visual terms")
    job["script"] = script
    job["terms"] = terms


def replace_assignment(text: str, key: str, value: str) -> str:
    pattern = rf"(?m)^(\s*{re.escape(key)}\s*=\s*).*$"
    new, n = re.subn(pattern, rf"\g<1>{value}", text, count=1)
    if n != 1:
        fail(f"config key not found: {key}")
    return new


def json_toml_array(value: str) -> str:
    return json.dumps([value] if value else [], ensure_ascii=True)


def choose_source(job: dict):
    requested = str(job.get("source", "auto")).lower().strip()
    available = {
        "pexels": os.getenv("PEXELS_API_KEY", "").strip(),
        "pixabay": os.getenv("PIXABAY_API_KEY", "").strip(),
        "coverr": os.getenv("COVERR_API_KEY", "").strip(),
    }
    if requested != "auto":
        if requested not in available:
            fail(f"unsupported online source: {requested}")
        if not available[requested]:
            fail(f"{requested.upper()} API key is missing")
        return requested, available
    for name in ("pexels", "pixabay", "coverr"):
        if available[name]:
            return name, available
    fail("no stock provider API key configured; add PEXELS_API_KEY, PIXABAY_API_KEY, or COVERR_API_KEY")


def prepare_config(mpt: Path, source: str, keys: dict):
    example = mpt / "config.example.toml"
    config = mpt / "config.toml"
    if not example.exists():
        fail("MoneyPrinterTurbo config.example.toml not found")
    text = example.read_text(encoding="utf-8")
    text = replace_assignment(text, "video_source", json.dumps(source))
    text = replace_assignment(text, "pexels_api_keys", json_toml_array(keys["pexels"]))
    text = replace_assignment(text, "pixabay_api_keys", json_toml_array(keys["pixabay"]))
    text = replace_assignment(text, "coverr_api_keys", json_toml_array(keys["coverr"]))
    text = replace_assignment(text, "subtitle_provider", json.dumps("edge"))
    config.write_text(text, encoding="utf-8")


def install_arabic_font(mpt: Path, wanted: str):
    target = mpt / "resource" / "fonts" / wanted
    if target.exists():
        return
    candidates = [
        Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf"),
        Path("/usr/share/fonts/opentype/noto/NotoSansArabic-Bold.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf"),
    ]
    for src in candidates:
        if src.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, target)
            return
    fail("Arabic Noto font not found; install fonts-noto-core")


def run(cmd, cwd: Path, capture=False):
    print("+", " ".join(map(str, cmd)))
    return subprocess.run(
        [str(x) for x in cmd],
        cwd=str(cwd),
        check=True,
        text=True,
        capture_output=capture,
    )


def ffprobe(path: Path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_streams", "-show_format",
            "-of", "json", str(path)
        ],
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def qc_video(path: Path, preset: dict):
    data = ffprobe(path)
    streams = data.get("streams", [])
    fmt = data.get("format", {})
    duration = float(fmt.get("duration", 0) or 0)
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    qc = preset.get("qc", {})
    errors = []
    if not video:
        errors.append("missing video stream")
    if qc.get("require_audio", True) and not audio:
        errors.append("missing audio stream")
    if duration < float(qc.get("min_duration_seconds", 10)):
        errors.append(f"duration too short: {duration:.2f}s")
    if duration > float(qc.get("max_duration_seconds", 70)):
        errors.append(f"duration too long: {duration:.2f}s")
    if video and qc.get("require_portrait", True):
        w = int(video.get("width", 0) or 0)
        h = int(video.get("height", 0) or 0)
        if h <= w:
            errors.append(f"video is not portrait: {w}x{h}")
    return {
        "pass": not errors,
        "errors": errors,
        "duration_seconds": round(duration, 2),
        "video": {"width": video.get("width"), "height": video.get("height"), "codec": video.get("codec_name")} if video else None,
        "audio": {"codec": audio.get("codec_name")} if audio else None,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--job", required=True)
    p.add_argument("--mpt-dir", required=True)
    p.add_argument("--preset", default="video-factory/preset.default.json")
    p.add_argument("--out-dir", default="video-factory/out")
    args = p.parse_args()

    job_path = Path(args.job).resolve()
    mpt = Path(args.mpt_dir).resolve()
    preset_path = Path(args.preset).resolve()
    out_dir = Path(args.out_dir).resolve()
    job = load_json(job_path)
    preset = load_json(preset_path)
    require_job(job)
    source, keys = choose_source(job)
    prepare_config(mpt, source, keys)

    font_name = str(job.get("font_name", preset.get("font_name", "NotoSansArabic-Bold.ttf")))
    install_arabic_font(mpt, font_name)

    voice = str(job.get("voice", preset.get("voice", "ar-TN-HediNeural")))
    voice_rate = float(job.get("voice_rate", preset.get("voice_rate", 1.02)))
    voice_volume = float(job.get("voice_volume", preset.get("voice_volume", 1.0)))
    aspect = str(job.get("aspect", preset.get("aspect", "9:16")))
    clip_duration = int(job.get("clip_duration", preset.get("clip_duration", 3)))
    bgm_type = str(job.get("bgm_type", preset.get("bgm_type", "none")))
    bgm_volume = float(job.get("bgm_volume", preset.get("bgm_volume", 0.0)))
    subtitle_position = str(job.get("subtitle_position", preset.get("subtitle_position", "custom")))
    custom_position = float(job.get("subtitle_custom_position", preset.get("subtitle_custom_position", 72)))
    font_size = int(job.get("font_size", preset.get("font_size", 58)))
    terms = ",".join(job["terms"])

    cmd = [
        "uv", "run", "python", "cli.py",
        "--video-script", job["script"],
        "--video-terms", terms,
        "--video-language", str(job.get("language", preset.get("language", "ar-TN"))),
        "--video-source", source,
        "--video-count", str(int(job.get("video_count", preset.get("video_count", 1)))),
        "--video-aspect", aspect,
        "--video-concat-mode", str(job.get("concat_mode", preset.get("concat_mode", "sequential"))),
        "--video-transition-mode", str(job.get("transition_mode", preset.get("transition_mode", "none"))),
        "--video-clip-duration", str(clip_duration),
        "--match-materials-to-script",
        "--voice-name", voice,
        "--voice-rate", str(voice_rate),
        "--voice-volume", str(voice_volume),
        "--bgm-type", bgm_type,
        "--bgm-volume", str(bgm_volume),
        "--subtitle-enabled",
        "--font-name", font_name,
        "--font-size", str(font_size),
        "--text-fore-color", str(job.get("text_fore_color", preset.get("text_fore_color", "#FFFFFF"))),
        "--stroke-color", str(job.get("stroke_color", preset.get("stroke_color", "#000000"))),
        "--stroke-width", str(float(job.get("stroke_width", preset.get("stroke_width", 2.5)))),
        "--subtitle-position", subtitle_position,
        "--n-threads", str(int(job.get("n_threads", preset.get("n_threads", 2)))),
    ]
    if subtitle_position == "custom":
        cmd.extend(["--custom-position", str(custom_position)])

    before = set((mpt / "storage" / "tasks").glob("*/final-*.mp4")) if (mpt / "storage" / "tasks").exists() else set()
    run(cmd, mpt)
    after = set((mpt / "storage" / "tasks").glob("*/final-*.mp4"))
    created = sorted(after - before, key=lambda x: x.stat().st_mtime)
    if not created:
        created = sorted(after, key=lambda x: x.stat().st_mtime)
    if not created:
        fail("render completed but no final-*.mp4 was found", 1)

    final = created[-1]
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", str(job.get("id") or job.get("title") or "video")).strip("-") or "video"
    output = out_dir / f"{slug}.mp4"
    shutil.copy2(final, output)

    qc = qc_video(output, preset)
    report = {
        "job": str(job_path),
        "source": source,
        "voice": voice,
        "output": str(output),
        "moneyprinter_output": str(final),
        "qc": qc,
    }
    report_path = out_dir / f"{slug}.qc.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not qc["pass"]:
        fail("video QC failed: " + "; ".join(qc["errors"]), 1)


if __name__ == "__main__":
    main()
