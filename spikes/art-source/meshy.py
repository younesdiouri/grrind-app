"""Meshy API client for GRRIND character assets (skill grrind-character-art).

The key is read from MESHY_API_KEY or ~/.config/grrind/meshy.key, never from the repository.
Every paid task appends its parameters and consumed credits to <out>/tasks.json.

    python3 -I spikes/art-source/meshy.py body <image.png> <out-dir>
    python3 -I spikes/art-source/meshy.py prop <image.png> <out-dir> <polycount>
    python3 -I spikes/art-source/meshy.py rig <image-to-3d-task-id> <out-dir>
    python3 -I spikes/art-source/meshy.py edit <image.png> <out-dir> <prompt>
"""
import base64
import json
import os
import pathlib
import sys
import time
import urllib.request

API = "https://api.meshy.ai/openapi/v1"


def key():
    value = os.environ.get("MESHY_API_KEY")
    if value:
        return value.strip()
    return (pathlib.Path.home() / ".config/grrind/meshy.key").read_text().strip()


def call(method, path, body=None):
    request = urllib.request.Request(
        API + path,
        method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + key(), "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(pathlib.Path(path).read_bytes()).decode()


def wait(kind, task_id):
    while True:
        task = call("GET", f"/{kind}/{task_id}")
        print(f"{kind} {task_id}: {task['status']} {task.get('progress', 0)}%", flush=True)
        if task["status"] in ("SUCCEEDED", "FAILED", "CANCELED"):
            return task
        time.sleep(15)


def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as response:
        path.write_bytes(response.read())
    print("wrote", path)


def record(out, entry):
    log = out / "tasks.json"
    tasks = json.loads(log.read_text()) if log.exists() else []
    tasks.append(entry)
    log.write_text(json.dumps(tasks, indent=2, ensure_ascii=False) + "\n")


def generate(image, out, polycount, pose):
    # Flagship model, high-definition geometry; the budget is set here, never by decimating later.
    params = {
        "ai_model": "meshy-7.1",
        "geometry_resolution": "2k",
        "should_texture": True,
        "enable_pbr": False,
        "texture_resolution": "2k",
        "should_remesh": True,
        "topology": "triangle",
        "target_polycount": polycount,
        "pose_mode": pose,
        # Keep the input's exact look: enhancement re-draws the face and reopens the fists.
        "image_enhancement": False,
        "target_formats": ["glb", "fbx"],
        "multi_view_thumbnails": True,
    }
    task_id = call("POST", "/image-to-3d", {**params, "image_url": data_uri(image)})["result"]
    task = wait("image-to-3d", task_id)
    record(out, {"task": task_id, "kind": "image-to-3d", "input": str(image), "params": params,
                 "status": task["status"], "credits": task.get("consumed_credits"),
                 "error": (task.get("task_error") or {}).get("message")})
    if task["status"] != "SUCCEEDED":
        sys.exit(f"generation failed: {task.get('task_error')}")
    run = out / task_id
    for fmt in ("glb", "fbx"):
        download(task["model_urls"][fmt], run / f"model.{fmt}")
    download(task["texture_urls"][0]["base_color"], run / "basecolor.png")
    for view, url in (task.get("thumbnail_urls") or {}).items():
        download(url, run / f"view-{view}.png")


def rig(task_id, out):
    rig_id = call("POST", "/rigging", {"input_task_id": task_id, "height_meters": 1.7})["result"]
    task = wait("rigging", rig_id)
    record(out, {"task": rig_id, "kind": "rigging", "input": task_id, "status": task["status"],
                 "credits": task.get("consumed_credits"),
                 "error": (task.get("task_error") or {}).get("message")})
    if task["status"] != "SUCCEEDED":
        sys.exit(f"rigging failed: {task.get('task_error')}")
    run = out / task_id / "rig"
    download(task["result"]["rigged_character_fbx_url"], run / "rigged.fbx")
    download(task["result"]["rigged_character_glb_url"], run / "rigged.glb")


def edit(image, out, prompt):
    params = {"ai_model": "nano-banana-pro", "prompt": prompt, "aspect_ratio": "4:3"}
    task_id = call("POST", "/image-to-image", {**params, "reference_image_urls": [data_uri(image)]})["result"]
    task = wait("image-to-image", task_id)
    record(out, {"task": task_id, "kind": "image-to-image", "input": str(image), "params": params,
                 "status": task["status"], "credits": task.get("consumed_credits"),
                 "error": (task.get("task_error") or {}).get("message")})
    if task["status"] != "SUCCEEDED":
        sys.exit(f"edit failed: {task.get('task_error')}")
    download(task["image_urls"][0], out / f"{task_id}.png")


if __name__ == "__main__":
    command, source, out = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    if command == "body":
        generate(source, out, 30000, "")  # input is already a T-pose; forcing one reopens the fists
    elif command == "prop":
        generate(source, out, int(sys.argv[4]), "")
    elif command == "edit":
        edit(source, out, sys.argv[4])
    elif command == "rig":
        rig(source, out)
    else:
        sys.exit(__doc__)
