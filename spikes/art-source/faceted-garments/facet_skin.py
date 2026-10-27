# Faceted skin (#299): decimate the visible skin (head, neck, arms, hands) of a rigged FBX into flat
# facets like the clothes of #298, keeping its weights and its NoseWide shape key.
# Run: Blender -b -P facet_skin.py -- <in.fbx> <out.fbx> <object name filter> <ratio> <body|all|legs>
# The ratio applies to the faceted region only. "body" leaves the head and neck smooth: they carry
# the faces and expressions of #282; "legs" facets only the shins, below the cut of the bare legs at 43 cm (QuaterniusPoc).
import sys
import bpy
import bmesh
from mathutils.kdtree import KDTree

source, output, keep, ratio, mode = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
for obj in bpy.context.scene.objects:
    if obj.type != "MESH" or keep.lower() not in obj.name.lower():
        continue
    mesh = obj.data
    before = sum(len(p.vertices) - 2 for p in mesh.polygons)
    bpy.context.view_layer.objects.active = obj
    # Collapse cannot run on a mesh with shape keys: keep each key as offsets from the basis, and
    # give every decimated vertex the offset of the nearest original vertex afterwards.
    keys = {}
    if mesh.shape_keys:
        basis = mesh.shape_keys.key_blocks[0]
        tree = KDTree(len(mesh.vertices))
        for i, point in enumerate(basis.data):
            tree.insert(point.co, i)
        tree.balance()
        keys = {k.name: [k.data[i].co - basis.data[i].co for i in range(len(mesh.vertices))] for k in mesh.shape_keys.key_blocks[1:]}
        bpy.ops.object.shape_key_remove(all=True)
    # Meshy exports split their UV islands into loose pieces: weld them, or every edge reads as a rim.
    welded = bmesh.new()
    welded.from_mesh(mesh)
    bmesh.ops.remove_doubles(welded, verts=welded.verts, dist=1e-5)
    welded.to_mesh(mesh)
    welded.free()
    # Protected: the openings under the clothes, the fingers (they would melt), and in body mode the
    # head and neck.
    groups = {g.index: g.name for g in obj.vertex_groups}
    smooth = ("index", "middle", "pinky", "ring", "thumb") + (("Head", "neck") if mode == "body" else ())
    edges = {}
    for p in mesh.polygons:
        for key in p.edge_keys:
            edges[key] = edges.get(key, 0) + 1
    rim = {v for key, count in edges.items() if count == 1 for v in key}
    # The nose shapes of #304 stay dense: collapsed nostrils tear into jagged spikes once a key moves them.
    nose = {i for name, offsets in keys.items() if name.startswith("Nose") for i, d in enumerate(offsets) if d.length > 1e-6}
    def protected(v):
        if mode == "legs" and (obj.matrix_world @ v.co).z > .38:
            return True
        return v.index in rim or v.index in nose or any(groups[g.group].startswith(smooth) and g.weight > .3 for g in v.groups)
    free = {v.index for v in mesh.vertices if not protected(v)}
    collapse = obj.vertex_groups.new(name="Collapse")
    collapse.add(list(free), 1.0, "REPLACE")
    # The modifier's ratio counts every triangle: aim it so only the free region shrinks.
    region = sum(len(p.vertices) - 2 for p in mesh.polygons if all(i in free for i in p.vertices))
    decimate = obj.modifiers.new("Facets", "DECIMATE")
    decimate.decimate_type = "COLLAPSE"
    decimate.vertex_group = collapse.name
    decimate.use_symmetry = True
    decimate.symmetry_axis = "X"
    decimate.ratio = (before - region * (1 - float(ratio))) / before
    decimate.use_collapse_triangulate = True
    while obj.modifiers.find("Facets") > 0:
        bpy.ops.object.modifier_move_up(modifier="Facets")
    bpy.ops.object.modifier_apply(modifier="Facets")
    if keys:
        obj.shape_key_add(name="Basis")
        for name, offsets in keys.items():
            block = obj.shape_key_add(name=name)
            for vertex in mesh.vertices:
                block.data[vertex.index].co = vertex.co + offsets[tree.find(vertex.co)[1]]
    # In body mode the head keeps its smooth normals; everything else shows its facets.
    head = {v.index for v in mesh.vertices if mode == "body" and any(groups.get(g.group, "").startswith(("Head", "neck")) and g.weight > .3 for g in v.groups)}
    # The dense nose is smooth too: flat, its little concave nostril faces turn into dark specks
    # under the hard key light of Unity.
    nose = {v.index for v in mesh.vertices if keys and any(offsets[tree.find(v.co)[1]].length > 1e-6
            for name, offsets in keys.items() if name.startswith("Nose"))}
    for polygon in mesh.polygons:
        polygon.use_smooth = all(i in head for i in polygon.vertices) or all(i in nose for i in polygon.vertices)
    obj.vertex_groups.remove(obj.vertex_groups["Collapse"])
    if obj.vertex_groups:  # a static mesh (the raid boss) has no weights to limit
        bpy.ops.object.vertex_group_limit_total(limit=4)
        bpy.ops.object.vertex_group_normalize_all()
    print("FACETS", obj.name, before, "->", sum(len(p.vertices) - 2 for p in mesh.polygons), "keys", list(keys))
for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in ("MESH", "ARMATURE"))
bpy.ops.export_scene.fbx(filepath=output, use_selection=True, add_leaf_bones=False, bake_anim=False,
                         apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")
