# Faceted garments (#298, lookdev B): decimate one garment of a rigged FBX into large flat facets,
# keep its skin weights and the rest of the file (skin, armature) unchanged.
# Run: Blender -b -P facet.py -- <in.fbx> <out.fbx> <object name filter> <target triangles> <offset m> [<covering garment fbx>]
import sys
import bpy
from mathutils.bvhtree import BVHTree

arguments = sys.argv[sys.argv.index("--") + 1:]
source, output, keep, target, offset = arguments[:5]
bpy.ops.wm.read_factory_settings(use_empty=True)
cover = None
if len(arguments) > 5:
    # The t-shirt worn over this garment, in the same bind pose: what it covers must sink beneath it.
    bpy.ops.import_scene.fbx(filepath=arguments[5])
    shirt = next(o for o in bpy.context.scene.objects if o.type == "MESH" and "tshirt" in o.name.lower())
    cover = BVHTree.FromPolygons([shirt.matrix_world @ v.co for v in shirt.data.vertices], [list(p.vertices) for p in shirt.data.polygons])
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o, do_unlink=True)
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
    # Left and right facets mirror each other: a garment reads as cut, not crumpled.
    decimate.use_symmetry = True
    decimate.symmetry_axis = "X"
    decimate.ratio = min(1, int(target) / before)
    decimate.use_collapse_triangulate = True
    # The armature modifier must stay last: move the decimation before it and apply it alone.
    while obj.modifiers.find("Facets") > 0:
        bpy.ops.object.modifier_move_up(modifier="Facets")
    bpy.ops.object.modifier_apply(modifier="Facets")
    # Large facets cut inside the old smooth surface: push the cloth out so skin never pokes through.
    # Borders stay where they were: pushing a hem along its normal grows spikes.
    open_edges = {}
    for p in obj.data.polygons:
        for key in p.edge_keys:
            open_edges[key] = open_edges.get(key, 0) + 1
    rim = {v for key, count in open_edges.items() if count == 1 for v in key}
    for vertex in obj.data.vertices:
        if vertex.index not in rim:
            # Outer layers (the t-shirt over the leggings' waist) get the larger offset; what the
            # t-shirt covers sinks 8 mm under it instead.
            world = obj.matrix_world @ vertex.co
            normal = (obj.matrix_world.to_3x3() @ vertex.normal).normalized()
            covered = cover is not None and cover.ray_cast(world, normal, .05)[0] is not None
            vertex.co += vertex.normal * (-.008 if covered else float(offset))
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
