"""Fit the original Meshy loop to real Quaternius heads, keeping topology and UVs."""
from pathlib import Path
import json
import math
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
DEST = ROOT / 'spikes/Unity3D/Assets/Characters/BandeauEclair'
DEST.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('PR_BandeauEclair_master')
bpy.context.window.scene = scene
collections = {}
for name in ('REF', 'LOW', 'SOCKETS'):
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    collections[name] = collection

def move(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)

manifest = {'units': 'metres', 'authoring_axes': 'Z up, -Y front',
            'attachment': 'Unity Humanoid Head, baked rest-space placement, worldPositionStays',
            'source_task': '01a15fb3-a126-77a8-be26-d9c0d4d45624', 'consumed_credits': 35,
            'texture': {'path': 'source_base_color.png', 'color_space': 'sRGB', 'size': 2048},
            'inferred': ['45 mm fabric height', 'back and side fit', '2 mm skin clearance'], 'variants': {}}
for body, z in [('Male', 1.737), ('Female', 1.695)]:
    bpy.ops.import_scene.fbx(filepath=str(ROOT / f'spikes/Unity3D/Assets/Characters/Quaternius/Superhero_{body}_FullBody.fbx'))
    refs = list(bpy.context.selected_objects)
    head = next(o for o in refs if o.type == 'MESH' and o.name.lower().startswith('superhero_'+body.lower()))
    rig = next(o for o in refs if o.type == 'ARMATURE')
    head_rest = rig.matrix_world @ rig.data.bones['Head'].matrix_local
    world = [head.matrix_world @ v.co for v in head.data.vertices]
    skin = BVHTree.FromPolygons(world, [list(p.vertices) for p in head.data.polygons])
    for obj in refs:
        obj.name = 'REF_' + body + '_' + obj.name
        move(obj, collections['REF'])
        obj.hide_render = True
        obj.hide_set(True)
        if obj.type == 'MESH':
            obj.data.materials.clear()
    for style, filename in [('parted', 'Hair_SimpleParted_Rigged'), ('buzzed', None), ('buns', 'Hair_Buns_Rigged')]:
        hair = None
        if filename:
            bpy.ops.import_scene.fbx(filepath=str(ROOT / f'spikes/Unity3D/Assets/Characters/Quaternius/{filename}.fbx'))
            refs = list(bpy.context.selected_objects)
            mesh = next(o for o in refs if o.type == 'MESH')
            hair_rig = next(o for o in refs if o.type == 'ARMATURE')
            # Both source coiffures are rigidly weighted to Head. Match the actual body's rest bone.
            rest = hair_rig.matrix_world @ hair_rig.data.bones['Head'].matrix_local
            transform = head_rest @ rest.inverted() @ mesh.matrix_world
            hair = BVHTree.FromPolygons([transform @ v.co for v in mesh.data.vertices], [list(p.vertices) for p in mesh.data.polygons])
            for obj in refs:
                move(obj, collections['REF'])
                obj.hide_render = True
                obj.hide_set(True)
                if obj.type == 'MESH': obj.data.materials.clear()
        bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
        band = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
        band.name = 'PR_BandeauEclair_' + body + '_' + style
        band.data = band.data.copy()
        points = [band.matrix_world @ v.co for v in band.data.vertices]
        radii = [math.hypot(p.x, p.y) for p in points]
        rmin, rmax = min(radii), max(radii)
        zmin, zmax = min(p.z for p in points), max(p.z for p in points)
        clearances = []
        for vertex, p, radius in zip(band.data.vertices, points, radii):
            height = z + ((p.z-zmin)/(zmax-zmin)-.5)*.045
            direction = Vector((p.x/radius, p.y/radius, 0))
            origin = Vector((0, 0, height))
            hit, _, _, distance = skin.ray_cast(origin, direction, .3)
            assert hit is not None, (body, list(p), height)
            # The band passes over the front fringe; the rear buns naturally sit outside it.
            if hair and direction.y < 0:
                h, _, _, d = hair.ray_cast(origin+direction*.3, -direction, .3)
                if h is not None:
                    # Fit the fringe, never the large rear/side bun volumes caught by a grazing ray.
                    distance = max(distance, min(.3-d, distance+.008))
            clearance = .002 + .007*(radius-rmin)/(rmax-rmin)
            vertex.co = Vector((direction.x*(distance+clearance), direction.y*(distance+clearance), height))
            clearances.append(clearance)
        band.matrix_world.identity()
        band.data.update()
        move(band, collections['LOW'])
        bpy.ops.object.select_all(action='DESELECT')
        band.hide_set(False)
        band.select_set(True)
        bpy.context.view_layer.objects.active = band
        path = DEST / (body + '-' + style + '.fbx')
        bpy.ops.export_scene.fbx(filepath=str(path), use_selection=True, bake_anim=False,
                                 apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
        tris = sum(len(p.vertices)-2 for p in band.data.polygons)
        assert tris == 1542
        manifest['variants'][body+'-'+style] = {'file': str(path.relative_to(ROOT)), 'triangles': tris,
                                              'forehead_z_m': z, 'clearance_min_m': min(clearances),
                                              'clearance_max_m': max(clearances), 'scale': list(band.scale)}
        band.hide_set(True)

image = bpy.data.images.load(str(ASSET / 'reference.png'), check_existing=True)
reference = bpy.data.objects.new('REF_BandeauConcept', None)
reference.empty_display_type = 'IMAGE'
reference.data = image
collections['REF'].objects.link(reference)
reference.hide_render = True
reference.hide_set(True)
for obj in collections['LOW'].objects:
    for material in obj.data.materials:
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image and not node.image.packed_file:
                node.image.pack()
if not image.packed_file:
    image.pack()
bpy.data.libraries.write(str(ASSET / 'PR_BandeauEclair_master.blend'), {scene}, fake_user=True, compress=True)
(ASSET / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest))
