# Exports one garment of a body FBX to GLB, bind pose, original UVs, for Meshy retexture (#298).
# Run: Blender -b -P export_garment.py -- <in.fbx> <name filter> <out.glb>
import sys
import bpy

source, keep, output = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects:
    o.select_set(False)
garment = [o for o in meshes if keep.lower() in o.name.lower() and "skin" not in o.name.lower()]
print("GARMENT", [o.name for o in meshes], "->", [o.name for o in garment])
for o in garment:
    o.select_set(True)
    # Meshy needs the geometry only; the armature and its modifier stay out.
    for modifier in list(o.modifiers):
        o.modifiers.remove(modifier)
    o.parent = None
bpy.ops.export_scene.gltf(filepath=output, use_selection=True, export_format="GLB", export_skins=False,
                          export_animations=False, export_texcoords=True, export_normals=True, export_materials="PLACEHOLDER")
