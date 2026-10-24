"""Calibrate the Meshy source without changing its topology or UVs."""
from pathlib import Path
import json
import bpy
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ASSET / 'CR_Cailloux_master.blend'))
for obj in list(bpy.data.collections['LOW'].objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
meshes = [o for o in bpy.context.selected_objects if o.type == 'MESH']
points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
scale = 1.3 / (hi.z - lo.z)
origin = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for obj in meshes:
    matrix = obj.matrix_world.copy()
    obj.parent = None
    for vertex in obj.data.vertices:
        vertex.co = (matrix @ vertex.co - origin) * scale
    obj.matrix_world.identity()
    obj.name = 'CR_Cailloux_Body_LOD0'
    for col in list(obj.users_collection): col.objects.unlink(obj)
    bpy.data.collections['LOW'].objects.link(obj)
    for mat in obj.data.materials:
        node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        node.inputs['Roughness'].default_value = .85
        node.inputs['Metallic'].default_value = 0
        for image_node in mat.node_tree.nodes:
            if image_node.type == 'TEX_IMAGE' and image_node.image:
                image_node.image.pack()
                out = ASSET / 'textures'; out.mkdir(exist_ok=True)
                image_node.image.filepath_raw = str(out / 'BaseColor.png')
                image_node.image.file_format = 'PNG'
                image_node.image.save()
bpy.context.view_layer.update()
report = {'native_dimensions_m': list(hi-lo), 'dimensions_m': list((hi-lo)*scale),
          'height_m': 1.3, 'triangles': sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),
          'width_height': (hi.x-lo.x)/(hi.z-lo.z), 'reference_width_height': 1.097,
          'scale': scale, 'topology_modified': False}
assert abs(report['width_height']/1.097-1) < .02
assert report['triangles'] < 7000
(ASSET / 'review/raw-measurements.json').write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'CR_Cailloux_raw.blend'))
print(json.dumps(report))
