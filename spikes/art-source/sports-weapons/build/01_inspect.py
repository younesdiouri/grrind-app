from pathlib import Path
import bpy,json
ROOT=Path(__file__).resolve().parents[2]
for name in ['fer-play','huilesson']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/name/'source.glb'))
 for o in bpy.context.scene.objects:
  if o.type=='MESH': print(name,o.name,list(o.dimensions),sum(len(p.vertices)-2 for p in o.data.polygons),[list(v.co) for v in list(o.data.vertices)[:2]])
