"""Reproduce the approved Moumoutivation fit with the shared rigid-headwear workflow."""
from pathlib import Path
import json
import runpy

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
helper = runpy.run_path(str(ROOT / '.claude/skills/grrind-character-art/scripts/fit_rigid_headwear.py'))
manifest = helper['fit'](ASSET, ROOT / 'spikes/Unity3D/Assets/Characters/Moumoutivation', ASSET)
print(json.dumps(manifest))
