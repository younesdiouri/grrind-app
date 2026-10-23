"""Check the delivered FBX using its intentional hand-grip pivot, not a floor pivot."""
from pathlib import Path
import json
import bpy
from mathutils import Vector

asset = Path(__file__).resolve().parents[1]
manifest = json.loads((asset/'asset-manifest.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(asset/'exports/LePoidsLourd.fbx'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert len(meshes) == 1
obj = meshes[0]
points = [obj.matrix_world @ v.co for v in obj.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
tris = sum(len(p.vertices)-2 for p in obj.data.polygons)
assert tris == manifest['triangles']
assert obj.data.uv_layers and len(obj.data.materials) == 1
assert all(abs(actual-expected)<.0001 for actual,expected in zip(hi-lo,manifest['dimensions_m']))
assert ((lo+hi)/2).length < .0001
assert all(abs(s-1)<.0001 for s in obj.scale)
assert (asset/'exports/BaseColor.png').is_file()
result = {'status':'PASS','triangles':tris,'dimensions_m':list(hi-lo),'center_m':list((lo+hi)/2),'uv_layers':len(obj.data.uv_layers),'pivot':'grip centre; lower extent -0.15 m is intentional'}
(asset/'roundtrip.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
