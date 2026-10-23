"""Les Guinzz: native Quaternius legs, original weights, three material panels."""
from pathlib import Path
import json
import bpy
import bmesh
from mathutils import Matrix

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'spikes/Unity3D/Assets/Characters/LesGuinzz'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
receipt = {}
for sex in ('Male', 'Female'):
    bpy.ops.import_scene.fbx(filepath=str(ROOT / f'spikes/Unity3D/Assets/Characters/Quaternius/Superhero_{sex}_FullBody.fbx'))
    imported = list(bpy.context.selected_objects)
    body = next(o for o in imported if o.type == 'MESH' and o.name.lower().startswith('superhero'))
    rig = next(m.object for m in body.modifiers if m.type == 'ARMATURE')
    pants = body.copy(); pants.data = body.data.copy()
    bpy.context.scene.collection.objects.link(pants)
    pants.name = f'{sex}_LesGuinzz'
    pants.data.transform(pants.matrix_world); pants.parent = None; pants.matrix_world = Matrix.Identity(4)
    pants.modifiers.clear()
    bm = bmesh.new(); bm.from_mesh(pants.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    for height, direction in ((.18, 1), (1.15, -1)):
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                              plane_co=(0, 0, height), plane_no=(0, 0, direction), clear_inner=True, dist=.000001)
    side = .145 if sex == 'Male' else .135
    for point, normal in (((side,0,0),(1,0,0)), ((-side,0,0),(1,0,0)),
                          ((0,.07,0),(0,1,0)), ((0,-.07,0),(0,1,0)), ((0,0,.235),(0,0,1)), ((0,0,.40),(0,0,1))):
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                              plane_co=point, plane_no=normal, dist=.000001)
    bm.to_mesh(pants.data); bm.free(); pants.data.update()
    bpy.ops.object.select_all(action='DESELECT'); pants.select_set(True); bpy.context.view_layer.objects.active = pants
    if pants.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    pants.data.materials.clear()
    for name, color in (('Guinzz fabric', (.26,.055,.58,1)), ('Guinzz panel', (.02,.75,.85,1)), ('Guinzz cuffs', (.025,.035,.07,1))):
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.diffuse_color = color; mat.use_nodes = True
        node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        node.inputs['Base Color'].default_value = color; node.inputs['Roughness'].default_value = .85
        pants.data.materials.append(mat)
    for p in pants.data.polygons:
        c = p.center
        p.material_index = 2 if c.z < .235 else 1 if abs(c.x) > side and abs(c.y) < .07 else 0
        p.use_smooth = True
    # Assign panels before the offset so boundary faces cannot change material.
    for v in pants.data.vertices:
        v.co += v.normal * .002
        # Hidden tuck stays inside the tee through a raised-thigh dodge.
        tuck = max(0, min(1, (v.co.z - 1.025) / .08)) * .08
        v.co.x *= 1 - tuck
        v.co.y *= 1 - tuck
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    assert all(0 < len(v.groups) <= 4 and abs(sum(g.weight for g in v.groups)-1) < .0001 for v in pants.data.vertices)
    modifier = pants.modifiers.new('Native weights', 'ARMATURE'); modifier.object = rig
    rig.select_set(True)
    path = OUT / f'{sex}_LesGuinzz.fbx'
    bpy.ops.export_scene.fbx(filepath=str(path), use_selection=True, add_leaf_bones=False, bake_anim=False, apply_scale_options='FBX_SCALE_ALL')
    receipt[sex] = {'vertices': len(pants.data.vertices), 'triangles': sum(len(p.vertices)-2 for p in pants.data.polygons),
                    'min_z_m': min(v.co.z for v in pants.data.vertices), 'max_z_m': max(v.co.z for v in pants.data.vertices), 'max_influences': 4}
    for obj in imported: obj.hide_set(True); obj.hide_render = True
    rig.hide_set(False)
    pants.location.x = -.45 if sex == 'Male' else .45
    rig.location.x += pants.location.x
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('LesGuinzz.blend')))
(OUT / 'PROVENANCE.json').write_text(json.dumps({'name': 'Les Guinzz', 'source': 'Quaternius Universal Base Characters',
    'license': 'CC0', 'method': 'Native lower body cut, 2 mm offset, inherited weights, authored matte color panels',
    'meshy_credits': 0, 'measurements': receipt}, indent=2)+'\n')
print(json.dumps(receipt))
