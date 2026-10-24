from pathlib import Path
import json
import bpy

ASSET = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ASSET / 'rigged.glb'))
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
report = {'rig': rig.name, 'matrix': [list(row) for row in rig.matrix_world],
          'meshes': [{'name': o.name, 'dimensions': list(o.dimensions), 'vertices':len(o.data.vertices), 'groups':len(o.vertex_groups)} for o in bpy.data.objects if o.type == 'MESH'],
          'bones': [{'name': b.name, 'head': list(rig.matrix_world @ b.head_local), 'tail': list(rig.matrix_world @ b.tail_local)} for b in rig.data.bones]}
(ASSET / 'review/rig-source.json').write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'CR_Cailloux_rig_source.blend'))
print(json.dumps(report))
