"""Re-export a Meshy rigged FBX with its armature scale applied (metres, unit bone scale).

Meshy stores bones in centimetres under a 0.01 armature scale; Unity's Humanoid then animates
the character a hundred times too large. Geometry, UVs and weights are left untouched.

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
        --python spikes/art-source/normalize_meshy_rig.py -- <rigged.fbx> <out.fbx>
"""
import sys

import bpy

source, target = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
for obj in bpy.context.scene.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
# Drop helper bones Unity mistakes for eyes; they carry no weights.
armature = bpy.context.view_layer.objects.active
bpy.ops.object.mode_set(mode="EDIT")
for name in ("headfront", "head_end"):
    bone = armature.data.edit_bones.get(name)
    if bone:
        armature.data.edit_bones.remove(bone)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.export_scene.fbx(
    filepath=target,
    apply_scale_options="FBX_SCALE_ALL",
    bake_space_transform=False,
    add_leaf_bones=False,
    use_armature_deform_only=True,
    bake_anim=False,
    path_mode="STRIP",
)
print("normalised", target)
