"""Check all delivery FBXs in clean scenes, including UVs and mirrored dimensions."""
from pathlib import Path
import json
import bpy

ASSET = Path(__file__).resolve().parents[1]
DEST = ASSET.parents[2] / 'spikes/Unity3D/Assets/Characters/GoldenBoxingGloves'
report = {}
for body, length in [('Male', .27), ('Female', .25)]:
    for side in ('r', 'l'):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(DEST / f'{body}_{side}.fbx'))
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        assert len(meshes) == 1
        obj = meshes[0]
        tris = sum(len(p.vertices)-2 for p in obj.data.polygons)
        assert tris == 1852 and obj.data.uv_layers
        assert all(abs(a-b) < .0001 for a,b in zip(obj.dimensions, (length, length*.625, length*.472)))
        report[body+'_'+side] = {'triangles': tris, 'uv_layers': len(obj.data.uv_layers),
                                 'dimensions_m': list(obj.dimensions), 'pass': True}
(ASSET / 'roundtrip.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report))
