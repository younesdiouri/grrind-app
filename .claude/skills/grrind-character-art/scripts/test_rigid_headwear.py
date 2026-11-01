"""Compare the reusable fit against both shipped FBXs, including orientation and UVs."""
import json
from pathlib import Path
import runpy
import tempfile

import bpy

helper = runpy.run_path(str(Path(__file__).with_name('fit_rigid_headwear.py')))
ROOT, fit = helper['ROOT'], helper['fit']


def snapshot(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(path))
    mesh = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
    points = sorted(tuple(mesh.matrix_world @ v.co) for v in mesh.data.vertices)
    uvs = [tuple(loop.uv) for loop in mesh.data.uv_layers[0].data]
    return points, uvs, sum(len(face.vertices) - 2 for face in mesh.data.polygons)


asset = ROOT / 'spikes/art-source/moumoutivation'
baseline = ROOT / 'spikes/Unity3D/Assets/Characters/Moumoutivation'
with tempfile.TemporaryDirectory(prefix='grrind-headwear-') as temporary:
    output = Path(temporary) / 'fitted'
    manifest = fit(asset, output)
    for body in ('Male', 'Female'):
        previous, previous_uvs, previous_tris = snapshot(baseline / (body + '.fbx'))
        current, current_uvs, current_tris = snapshot(output / (body + '.fbx'))
        assert len(previous) == len(current), (body, 'vertex count changed')
        error = max(abs(a - b) for p, q in zip(previous, current) for a, b in zip(p, q))
        assert error < 1e-6, (body, 'geometry or orientation drift', error)
        assert previous_uvs == current_uvs, (body, 'exported UVs changed')
        assert previous_tris == current_tris == manifest['variants'][body]['triangles']
        print(body, 'shipped geometry, orientation, topology and UVs PASS; max error', error)

    invalid = Path(temporary) / 'invalid'
    invalid.mkdir()
    profile = json.loads((asset / 'headwear-fit.json').read_text())
    for change in ({'source_front': '+Z'}, {'size_ratios': [2.2, 0, 1.58]}):
        (invalid / 'headwear-fit.json').write_text(json.dumps({**profile, **change}))
        try:
            fit(invalid, invalid / 'output')
        except ValueError:
            pass
        else:
            raise AssertionError(('Invalid profile accepted', change))
        assert not (invalid / 'output').exists(), 'Invalid profile wrote output'
    print('Invalid orientation/size rejected before output PASS')
