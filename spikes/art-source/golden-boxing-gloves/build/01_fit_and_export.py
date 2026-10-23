"""Fit the original Meshy glove to Quaternius wrists; preserve triangles and UVs."""
from pathlib import Path
import json
import bpy
import bmesh
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
DEST = ROOT / 'spikes/Unity3D/Assets/Characters/GoldenBoxingGloves'
DEST.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
low = bpy.data.collections.new('LOW')
scene.collection.children.link(low)
manifest = {'units': 'metres', 'source_task': '01a16814-afe5-7372-8cc8-0d0acb93157b',
            'consumed_credits': 35, 'source_triangles': 1852, 'variants': {},
            'inferred': ['physical size', 'hidden cuff interior', 'symmetric opposite glove'],
            'attachment': 'Quaternius hand_l/hand_r, rest world space, rigid parent',
            'texture': {'file': 'BaseColor.png', 'size': 2048, 'color_space': 'sRGB'}}
for body, length in [('Male', .270), ('Female', .250)]:
    bpy.ops.import_scene.fbx(filepath=str(ROOT / f'spikes/Unity3D/Assets/Characters/Quaternius/Superhero_{body}_FullBody.fbx'))
    refs = list(bpy.context.selected_objects)
    rig = next(o for o in refs if o.type == 'ARMATURE')
    wrists = {s: rig.matrix_world @ rig.data.bones['hand_'+s].head_local for s in ('r', 'l')}
    for obj in refs:
        bpy.data.objects.remove(obj, do_unlink=True)
    for side in ('r', 'l'):
        bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
        glove = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
        points = [glove.matrix_world @ v.co for v in glove.data.vertices]
        lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
        hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
        # Reference sheet: dorsal width/height .625, depth/height .472.
        scale = Vector((length*.625/(hi.x-lo.x), length*.472/(hi.y-lo.y), length/(hi.z-lo.z)))
        cuff = [p for p in points if p.z < lo.z + (hi.z-lo.z)*.12]
        center = Vector(((min(p.x for p in cuff)+max(p.x for p in cuff))/2,
                         (min(p.y for p in cuff)+max(p.y for p in cuff))/2, lo.z))
        sign = 1 if side == 'r' else -1
        for vertex, p in zip(glove.data.vertices, points):
            q = Vector(tuple((p[i]-center[i])*scale[i] for i in range(3)))
            # Source palm faces -Y; native Quaternius palm faces down in T-pose.
            vertex.co = wrists[side] + Vector((sign*(q.z-length*.21), q.x, q.y))
        glove.matrix_world.identity()
        bm = bmesh.new(); bm.from_mesh(glove.data)
        # Meshy splits vertices at flat normals/UV seams: preserve winding, flip only the mirror.
        if side == 'l': bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
        bm.to_mesh(glove.data); bm.free()
        glove.name = f'PR_GoldenGlove_{body}_{side}'
        glove.data.name = glove.name + '_Mesh'
        for old in list(glove.users_collection): old.objects.unlink(glove)
        low.objects.link(glove)
        bpy.ops.object.select_all(action='DESELECT')
        glove.select_set(True); bpy.context.view_layer.objects.active = glove
        path = DEST / f'{body}_{side}.fbx'
        bpy.ops.export_scene.fbx(filepath=str(path), use_selection=True, bake_anim=False,
                                 apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
        tris = sum(len(p.vertices)-2 for p in glove.data.polygons)
        assert tris == 1852 and glove.data.uv_layers
        manifest['variants'][body+'_'+side] = {'triangles': tris, 'wrist': list(wrists[side]),
             'length_m': length, 'width_m': length*.625, 'depth_m': length*.472,
             'cuff_back_m': length*.21, 'skin_cut_abs_x_m': abs(wrists[side].x)-.015}
        glove.hide_set(True)
for mat in {m for o in low.objects for m in o.data.materials}:
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image: node.image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'PR_GoldenBoxingGloves_master.blend'))
(ASSET / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest))
