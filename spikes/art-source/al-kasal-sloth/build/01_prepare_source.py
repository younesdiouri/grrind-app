"""Calibrate Meshy geometry for Unity; keep the generated topology and UVs."""
from pathlib import Path
import json
import bpy
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
UNITY = ASSET.parents[1] / 'Unity3D/Assets/Characters/AlKasal'
UNITY.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ASSET / 'CR_AlKasal_master.blend'))
for obj in list(bpy.data.collections['LOW'].objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
meshes = [o for o in bpy.context.selected_objects if o.type == 'MESH']
points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
factor = 2.6 / (hi.z - lo.z)
origin = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for index, obj in enumerate(meshes):
    matrix = obj.matrix_world.copy()
    obj.parent = None
    for vertex in obj.data.vertices:
        vertex.co = (matrix @ vertex.co - origin) * factor
    obj.matrix_world.identity()
    obj.name = 'CR_AlKasal_Body_LOD0' + (str(index) if index else '')
    for col in list(obj.users_collection): col.objects.unlink(obj)
    bpy.data.collections['LOW'].objects.link(obj)
    for mat in obj.data.materials:
        node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        node.inputs['Roughness'].default_value = .85
        node.inputs['Metallic'].default_value = 0
        for tex in mat.node_tree.nodes:
            if tex.type == 'TEX_IMAGE' and tex.image:
                tex.image.pack()
                tex.image.filepath_raw = str(UNITY / 'BaseColor.png')
                tex.image.file_format = 'PNG'
                tex.image.save()
bpy.context.view_layer.update()
report = {'native_dimensions_m': list(hi-lo), 'dimensions_m': list((hi-lo)*factor),
          'height_m': 2.6, 'triangles': sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),
          'width_height': (hi.x-lo.x)/(hi.z-lo.z), 'reference_width_height': .935,
          'topology_modified': False, 'rig': 'none, whole-body idle and contact reaction only'}
assert report['triangles'] < 7000
assert abs(report['width_height']/.935-1) < .05, report
(ASSET / 'review/raw-measurements.json').write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'CR_AlKasal_master.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes: obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.fbx(filepath=str(UNITY / 'AlKasal.fbx'), use_selection=True,
    object_types={'MESH'}, axis_forward='-Z', axis_up='Y', add_leaf_bones=False, bake_anim=False)
print(json.dumps(report))
