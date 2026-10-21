"""Keep the original CC0 buzz cut outside the female skull after the actual Head rebind."""
from pathlib import Path
import json
import bpy
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'spikes/Unity3D/Assets/Characters'
scene = bpy.data.scenes.new('GRRIND Female buzzed fit')
bpy.context.window.scene = scene
bpy.ops.import_scene.fbx(filepath=str(SOURCE / 'Quaternius/Superhero_Female_FullBody.fbx'))
body = next(o for o in bpy.context.selected_objects if o.type == 'MESH' and o.name.lower().startswith('superhero_female'))
rig = next(m.object for m in body.modifiers if m.type == 'ARMATURE')
head = rig.matrix_world @ rig.data.bones['Head'].matrix_local
skull = BVHTree.FromPolygons([body.matrix_world @ v.co for v in body.data.vertices], [list(p.vertices) for p in body.data.polygons])
bpy.ops.import_scene.fbx(filepath=str(SOURCE / 'QuaterniusPOC/Hair_Buzzed.fbx'))
hair = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
hair_rig = next(m.object for m in hair.modifiers if m.type == 'ARMATURE')
rest = hair_rig.matrix_world @ hair_rig.data.bones['Head'].matrix_local
rebind = head @ rest.inverted()
world_to_mesh = hair.matrix_world.inverted() @ rebind.inverted()
origin = head.translation
moved = 0
largest = 0
for vertex in hair.data.vertices:
    target = rebind @ hair.matrix_world @ vertex.co
    # Preserve the authored hairline/sideburns; the mismatch is confined to the upper scalp.
    if target.z < 1.70:
        continue
    ray = target-origin
    distance = ray.length
    ray.normalize()
    hit, _, _, t = skull.ray_cast(origin+ray*.5, -ray, .5)
    assert hit is not None, 'Hair projection missed the real female head'
    radius = .5-t+.0025  # 2.5 mm outside skin, including polygon interpolation clearance.
    if radius > distance:
        moved += 1
        largest = max(largest, radius-distance)
        vertex.co = world_to_mesh @ (origin+ray*radius)
hair.data.update()
hair.name = 'Female_Hair_Buzzed'
bpy.ops.object.select_all(action='DESELECT')
hair.select_set(True)
hair_rig.select_set(True)
bpy.context.view_layer.objects.active = hair_rig
output = SOURCE / 'QuaterniusPOC/Female_Hair_Buzzed.fbx'
bpy.ops.export_scene.fbx(filepath=str(output), use_selection=True, add_leaf_bones=False, bake_anim=False,
                         apply_scale_options='FBX_SCALE_ALL')
print(json.dumps({'vertices_adjusted': moved, 'max_adjustment_m': largest, 'vertices':len(hair.data.vertices),
                  'clearance_m':.0025,'output':str(output)}))
