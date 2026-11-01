"""Fit the approved Meshy hood to both real heads without remeshing or changing UVs."""
from pathlib import Path
import json
import shutil
import bpy
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
DEST = ROOT / 'spikes/Unity3D/Assets/Characters/Moumoutivation'
DEST.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'PR_Moumoutivation_master'
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

def collection(name):
    result = bpy.data.collections.new(name)
    scene.collection.children.link(result)
    return result

refs = collection('REF')
low = collection('LOW')
sockets = collection('SOCKETS')

def move(obj, target):
    for previous in list(obj.users_collection):
        previous.objects.unlink(obj)
    target.objects.link(obj)

manifest = {
    'units': 'metres', 'authoring_axes': 'Z up, +Y front to match imported Quaternius body rest space',
    'attachment': 'Unity Humanoid Head; FBX baked in body rest space, worldPositionStays',
    'source_task': '01a197d3-445d-77be-84fc-3b9fd1b0243e', 'consumed_credits': 35,
    'texture': {'file': 'BaseColor.png', 'color_space': 'sRGB', 'size': 2048},
    'inferred': ['back and depth', 'inner lining', '20 mm below chin', '15 mm rear offset'],
    'variants': {},
}

for body in ('Male', 'Female'):
    bpy.ops.import_scene.fbx(filepath=str(ROOT / f'spikes/Unity3D/Assets/Characters/FacialPilot/{body}SportFace_Faceted.fbx'))
    imported = list(bpy.context.selected_objects)
    skin = next(o for o in imported if o.type == 'MESH' and o.name.endswith('_Sport_Skin'))
    rig = next(o for o in imported if o.type == 'ARMATURE')
    head_group = skin.vertex_groups['Head'].index
    points = [skin.matrix_world @ v.co for v in skin.data.vertices
              if any(g.group == head_group and g.weight > .5 for g in v.groups)]
    head_min = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    head_max = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    head_size = head_max - head_min
    # Approved portrait: large fleece crown and ears; these are inferred physical dimensions.
    size = Vector((head_size.x * 2.2, head_size.y * 1.4, head_size.z * 1.58))
    centre = Vector((0, (head_min.y + head_max.y) / 2 - .015, head_min.z - .020 + size.z / 2))
    for obj in imported:
        obj.name = 'REF_' + body + '_' + obj.name
        move(obj, refs)
        obj.hide_render = True
        obj.hide_set(True)
    socket = bpy.data.objects.new('SOCKET_Head_' + body, None)
    socket.matrix_world = rig.matrix_world @ rig.data.bones['Head'].matrix_local
    sockets.objects.link(socket)
    bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
    hood = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
    hood.name = 'PR_Moumoutivation_' + body + '_LOD0'
    world = [hood.matrix_world @ v.co for v in hood.data.vertices]
    minimum = Vector(tuple(min(p[i] for p in world) for i in range(3)))
    maximum = Vector(tuple(max(p[i] for p in world) for i in range(3)))
    native_size = maximum - minimum
    native_centre = (minimum + maximum) / 2
    for vertex, point in zip(hood.data.vertices, world):
        # Meshy faces -Y; Quaternius imported FBXs face +Y. Rotate 180 degrees around Z.
        vertex.co = Vector(tuple((point[i] - native_centre[i]) / native_size[i] * size[i]
                                 * (-1 if i < 2 else 1) + centre[i] for i in range(3)))
    hood.matrix_world.identity()
    # Face shading changes only; preserve all source triangles, normals data, UVs and texture.
    for face in hood.data.polygons:
        face.use_smooth = False
    hood.data.update()
    hood.data.name = hood.name
    move(hood, low)
    triangles = sum(len(face.vertices) - 2 for face in hood.data.polygons)
    assert triangles == 2094 and len(hood.data.uv_layers) > 0
    bpy.ops.object.select_all(action='DESELECT')
    hood.select_set(True)
    bpy.context.view_layer.objects.active = hood
    bpy.ops.export_scene.fbx(filepath=str(DEST / (body + '.fbx')), use_selection=True,
                             bake_anim=False, apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
    manifest['variants'][body] = {'triangles': triangles, 'head_bounds': [list(head_min), list(head_max)],
                                'dimensions_m': list(size), 'centre_m': list(centre), 'scale': list(hood.scale)}
    hood.hide_set(True)

shutil.copy2(ASSET / 'source_base_color.png', DEST / 'BaseColor.png')
for image in bpy.data.images:
    if image.size[0] and not image.packed_file:
        image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'PR_Moumoutivation_master.blend'))
(ASSET / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(DEST / 'PROVENANCE.json').write_text(json.dumps({
    'name': 'La Moumoutivation', 'source': 'Meshy 7.1 multi-image-to-3d',
    'task_id': manifest['source_task'], 'credits': 35,
    'license': 'Meshy generated asset; not Quaternius CC0',
    'concept': 'Built-in ImageGen; approved by author on 2026-11-01',
    'changes': 'Body-specific affine fit in Blender, flat face shading; topology and UVs preserved',
    'triangles_per_fit': 2094, 'texture': 'BaseColor.png, sRGB, 2048x2048',
    'inferred': manifest['inferred'],
}, indent=2) + '\n')
print(json.dumps(manifest))
