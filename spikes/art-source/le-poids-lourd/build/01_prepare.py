"""Preserve Meshy topology and UVs, size the prop and export its grip-centred FBX."""
from pathlib import Path
import json
import bpy
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
DEST = ASSET / 'exports'
DEST.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
obj = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
points = [obj.matrix_world @ v.co for v in obj.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
extent = hi-lo
assert extent.x > extent.y and extent.x > extent.z, f'Unexpected source axes: {extent}'
center = (lo+hi)/2
scale = Vector((.65/extent.x, .30/extent.y, .30/extent.z))
for vertex, point in zip(obj.data.vertices, points):
    vertex.co = Vector(tuple((point[i]-center[i])*scale[i] for i in range(3)))
# Meshy's grip is 56.6 x 49.0 mm. Narrow the rubber to 25 mm for the closed Quaternius hand.
# Preserve UVs, triangle winding and both weight stacks; blend back before the cyan collars.
for vertex in obj.data.vertices:
    q = vertex.co
    weight = max(0., min(1., (.145-abs(q.x))/.035))
    q.y = q.y*(1-weight) + (q.y-.00012)*(.025/.05658)*weight
    q.z = q.z*(1-weight) + (q.z+.00331)*(.025/.04900)*weight
obj.matrix_world.identity()
obj.name = 'PR_LePoidsLourd_LOD0'
obj.data.name = obj.name + '_Mesh'
low = bpy.data.collections.new('LOW'); bpy.context.scene.collection.children.link(low)
for old in list(obj.users_collection): old.objects.unlink(obj)
low.objects.link(obj)
tris = sum(len(p.vertices)-2 for p in obj.data.polygons)
assert 100 < tris <= 3000 and obj.data.uv_layers
for mat in obj.data.materials:
    for node in mat.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            node.image.pack()
            node.image.filepath_raw = str(DEST / 'BaseColor.png')
            node.image.file_format = 'PNG'; node.image.save()
bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.fbx(filepath=str(DEST/'LePoidsLourd.fbx'), use_selection=True, bake_anim=False, apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET/'PR_LePoidsLourd_master.blend'))
manifest = {'units':'metres', 'source_bounds':list(extent), 'dimensions_m':[.65,.30,.30], 'grip_diameter_m':.025, 'triangles':tris, 'vertices':len(obj.data.vertices), 'material_count':len(obj.data.materials), 'grip_center':'origin', 'long_axis':'X', 'texture':'BaseColor.png, sRGB, 2048px', 'inferred':['physical dimensions', 'back from generated views'], 'topology':'Meshy original, no remesh or decimation after texture', 'deviation':'Grip narrowed from 56.6 x 49 mm to 25 mm to fit fingers; overall length/diameter 2.17 versus source 1.66.'}
(ASSET/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
