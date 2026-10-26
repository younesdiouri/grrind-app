# Faceted garments (#298, lookdev B): decimate one garment of a rigged FBX into large flat facets,
# keep its skin weights and the rest of the file (skin, armature) unchanged.
# Run: Blender -b -P facet.py -- <in.fbx> <out.fbx> <object name filter> <target triangles>
import sys
import bpy

source, output, keep, target = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
for obj in bpy.context.scene.objects:
    if obj.type != "MESH" or keep.lower() not in obj.name.lower():
        continue
    before = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    bpy.context.view_layer.objects.active = obj
    # Colour borders (Les Guinzz stripes) stay straight: their vertices are kept out of the collapse.
    faces = {}
    for p in obj.data.polygons:
        for key in p.edge_keys:
            faces.setdefault(key, []).append(p.material_index)
    # Hems, collar and sleeve openings (one face) stay straight as well.
    border = {v for key, materials in faces.items() if len(materials) == 1 or len(set(materials)) > 1 for v in key}
    keep_group = obj.vertex_groups.new(name="KeepBorders")
    keep_group.add([v.index for v in obj.data.vertices if v.index not in border], 1.0, "REPLACE")
    decimate = obj.modifiers.new("Facets", "DECIMATE")
    decimate.decimate_type = "COLLAPSE"
    decimate.vertex_group = keep_group.name
    decimate.ratio = min(1, int(target) / before)
    decimate.use_collapse_triangulate = True
    # The armature modifier must stay last: move the decimation before it and apply it alone.
    while obj.modifiers.find("Facets") > 0:
        bpy.ops.object.modifier_move_up(modifier="Facets")
    bpy.ops.object.modifier_apply(modifier="Facets")
    # Large facets cut inside the old smooth surface: push the cloth out so skin never pokes through.
    for vertex in obj.data.vertices:
        vertex.co += vertex.normal * .004
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.vertex_groups.remove(obj.vertex_groups["KeepBorders"])
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all()
    print("FACETS", obj.name, before, "->", sum(len(p.vertices) - 2 for p in obj.data.polygons))
for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in ("MESH", "ARMATURE"))
bpy.ops.export_scene.fbx(filepath=output, use_selection=True, add_leaf_bones=False, bake_anim=False,
                         apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")
