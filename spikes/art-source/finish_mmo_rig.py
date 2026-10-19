"""Bind body, close wrist seams and export a mobile Humanoid candidate. Run via Blender MCP."""
import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector,kdtree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'spikes/art-source/mmo-athlete-v1'
body=bpy.data.objects['Athlete'];rig=bpy.data.objects['AthleteRig']
hands=[bpy.data.objects['ArticulatedHand_'+s] for s in ['l','r']]
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# Facial features and hair must remain rigid, unlike the neck transition below them.
group=body.vertex_groups['Head'];ids=[v.index for v in body.data.vertices if v.co.z>1.315]
for g in body.vertex_groups:g.remove(ids)
group.add(ids,1,'REPLACE')
kd=kdtree.KDTree(len(body.data.vertices))
for v in body.data.vertices:
 if any(g.weight>0 for g in v.groups):kd.insert(v.co,v.index)
kd.balance();patched=0
for v in body.data.vertices:
 if not any(g.weight>0 for g in v.groups):
    _,idx,_=kd.find(v.co)
    for g in body.data.vertices[idx].groups:body.vertex_groups[g.group].add([v.index],g.weight,'REPLACE')
    patched+=1
# Match the donor hand's diffuse colour to the texture at the forearm cut.
image=next(n.image for n in body.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
uv=body.data.uv_layers.active.data
handmat=hands[0].data.materials[0]
# Use the very same texture sample at the wrist, avoiding divergent gamma/material tint.
nearest=min(body.data.loops,key=lambda l:(body.data.vertices[l.vertex_index].co-Vector((.35,-.025,.85))).length)
hand_uv=uv[nearest.index].uv.copy()
tex=handmat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
handmat.node_tree.links.new(tex.outputs['Color'],handmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for hand in hands:
 for loop in hand.data.uv_layers.active.data:loop.uv=hand_uv
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
for hand in hands:hand.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
# Bridge each of the two wrist openings. Unequal loop counts are triangulated by Blender.
bm=bmesh.new();bm.from_mesh(body.data)
for sign in [-1,1]:
 edges=[e for e in bm.edges if e.is_boundary and all(v.co.x*sign>.27 and .75<v.co.z<.90 for v in e.verts)]
 result=bmesh.ops.bridge_loops(bm,edges=edges)
 for f in result.get('faces',[]):
  f.material_index=1;f.smooth=True
  for loop in f.loops:loop[bm.loops.layers.uv.active].uv=hand_uv

for _ in range(4):bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if v.co.z<1.30],factor=.30,use_axis_x=True,use_axis_y=True,use_axis_z=True)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
# Limit influences to four and normalize for the native mobile renderer.
bpy.context.view_layer.objects.active=body
bpy.ops.object.vertex_group_limit_total(limit=4);bpy.ops.object.vertex_group_normalize_all(lock_active=False)
assert all(any(g.weight>0 for g in v.groups) for v in body.data.vertices),'Unweighted vertices'
body.data.calc_loop_triangles();before=len(body.data.loop_triangles)
if before>32000:
 mod=body.modifiers.new('Mobile topology','DECIMATE');mod.ratio=32000/before
 bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name)
# Cut a real ring at the boot boundary after decimation; classifying whole triangles
# leaves long skin slivers outside the cuff. Match its calf/foot weighting exactly.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,plane_co=Vector((0,0,.145)),plane_no=Vector((0,0,1)))
bm.to_mesh(body.data);bm.free()
for v in body.data.vertices:
 if .10<v.co.z<.20:
  for group in body.vertex_groups:group.remove([v.index])
  side='l' if v.co.x>0 else 'r';t=max(0,min(1,(v.co.z-.11)/.045))
  body.vertex_groups['calf_'+side].add([v.index],t,'REPLACE');body.vertex_groups['foot_'+side].add([v.index],1-t,'REPLACE')
assert all(any(g.weight>0 for g in v.groups) for v in body.data.vertices),'Cut lost skin weights'
for poly in body.data.polygons:poly.use_smooth=True
body.data.calc_loop_triangles()
# Extract only the base image used by this model, not historical packed images.
assert image.packed_file,'Missing packed base image'
data=image.packed_file.data;suffix='.png' if data.startswith(b'\x89PNG') else '.jpg'
texture=OUT/('athlete-basecolor'+suffix);texture.write_bytes(data);image.filepath_raw=str(texture)
export=ROOT/'spikes/Unity3D/Assets/Characters/MMOAthlete';export.mkdir(exist_ok=True)
(export/texture.name).write_bytes(data)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.fbx(filepath=str(export/'Athlete.fbx'),use_selection=True,object_types={'ARMATURE','MESH'},add_leaf_bones=False,bake_anim=False,path_mode='RELATIVE',axis_forward='-Z',axis_up='Y')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'athlete-skinned.blend'))
report={'triangles':len(body.data.loop_triangles),'bones':len(rig.data.bones),'unweighted_patched':patched,'status':'Humanoid candidate; animation and close-contact QA pending'}
(OUT/'rig-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
