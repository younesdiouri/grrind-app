"""Fit CC0 Quaternius rig and articulated hands to the approved Meshy base. Run in Blender."""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'spikes/art-source/mmo-athlete-v1'

def cut(obj,point,normal,keep_positive=False,hand_region=False):
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=0.00001,plane_co=point,plane_no=normal)
    reject=[]
    for v in bm.verts:
        if hand_region and (abs(v.co.x)<.27 or v.co.z>.91):continue
        d=(v.co-point).dot(normal)
        if (d<-.00001 if keep_positive else d>.00001):reject.append(v)
    bmesh.ops.delete(bm,geom=reject,context='VERTS')
    bm.to_mesh(obj.data);bm.free();obj.data.update()

# Restart from the untouched normalized mesh, making this operation reproducible.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'meshy-textured.glb'))
body=next(o for o in bpy.data.objects if o.type=='MESH');body.name='Athlete'
body.scale*=1.7/body.dimensions.z
bpy.context.view_layer.objects.active=body
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
body.location.z-=min(v.co.z for v in body.data.vertices)
bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
bpy.ops.import_scene.fbx(filepath=str(ROOT/'spikes/Unity3D/Assets/Characters/Quaternius/Superhero_Male_FullBody.fbx'))
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
donor=bpy.data.objects['SuperHero_Male']
for obj in [body,donor]:
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(obj.data);bm.free()
rig.name='AthleteRig'
original={b.name:(b.head_local.copy(),b.tail_local.copy(),b.matrix_local.copy()) for b in rig.data.bones}
wrists={s:Vector((sign*.344,-.004,.818)) for s,sign in [('l',1),('r',-1)]}
directions={s:Vector((sign*.39,-.015,-.92)).normalized() for s,sign in [('l',1),('r',-1)]}
rotations={s:Vector((-sign,0,0)).rotation_difference(directions[s]) for s,sign in [('l',1),('r',-1)]}
# Preserve the front/back orientation: Quaternius faces +Y, new model faces -Y.
from mathutils import Quaternion
turn=Quaternion((0,0,1),math.pi)
rotations={s:(turn@Vector((-sign,0,0))).rotation_difference(directions[s])@turn for s,sign in [('l',1),('r',-1)]}
def handpoint(v,s):
    d=v-original['hand_'+s][0]
    d.x*=.90;d.y*=1.20;d.z*=1.20
    return wrists[s]+rotations[s]@d
hands=[]
for s,sign in [('l',1),('r',-1)]:
    mesh=donor.data.copy();h=bpy.data.objects.new('ArticulatedHand_'+s,mesh);bpy.context.collection.objects.link(h)
    # Copy skin weights before trimming, preserving the authored finger articulation.
    for g in donor.vertex_groups:h.vertex_groups.new(name=g.name)
    cut(h,original['hand_'+s][0],Vector((-sign,0,0)),True)
    for v in h.data.vertices:v.co=handpoint(v.co,s)
    cut(body,wrists[s]-directions[s]*.015,directions[s],hand_region=True)
    for mod in list(h.modifiers):h.modifiers.remove(mod)
    h.data.materials.clear();hands.append(h)

joints={
'pelvis':((0,.01,.80),(0,.005,.91)),
'spine_01':((0,.005,.91),(0,.005,1.015)),
'spine_02':((0,.005,1.015),(0,.005,1.115)),
'spine_03':((0,.005,1.115),(0,.012,1.255)),
'neck_01':((0,.012,1.255),(0,.009,1.315)),
'Head':((0,.009,1.315),(0,.009,1.55)),
'root':((0,0,0),(0,.3,0))}
for s,sign in [('l',1),('r',-1)]:
    shoulder=(sign*.14,.002,1.192);elbow=(sign*.246,-.003,1.016)
    joints.update({
      'clavicle_'+s:((sign*.028,.01,1.23),shoulder),
      'upperarm_'+s:(shoulder,elbow),
      'lowerarm_'+s:(elbow,wrists[s]),
      'hand_'+s:(wrists[s],handpoint(original['hand_'+s][1],s)),
      'thigh_'+s:((sign*.079,.014,.811),(sign*.111,-.022,.472)),
      'calf_'+s:((sign*.111,-.022,.472),(sign*.143,.006,.105)),
      'foot_'+s:((sign*.143,.006,.105),(sign*.153,-.103,.039)),
      'ball_'+s:((sign*.153,-.103,.039),(sign*.153,-.17,.039)),
      'ball_leaf_'+s:((sign*.153,-.17,.039),(sign*.153,-.20,.039))})
bpy.ops.object.select_all(action='DESELECT');rig.hide_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
    b.use_connect=False
    if b.name in joints:b.head,b.tail=map(Vector,joints[b.name])
    elif b.name.endswith(('_l','_r')) and any(k in b.name for k in ['index','middle','ring','pinky','thumb']):
        s=b.name[-1];b.head=handpoint(original[b.name][0],s);b.tail=handpoint(original[b.name][1],s)
    b.use_deform=b.name!='root' and 'leaf' not in b.name
    if b.name.endswith(('_l','_r')) and any(k in b.name for k in ['hand','index','middle','ring','pinky','thumb']):
        b.align_roll(rotations[b.name[-1]]@original[b.name][2].col[2].to_3d())
    else:b.align_roll(Vector((0,-1,0)))
bpy.ops.object.mode_set(mode='OBJECT')
# Retain only the approved body, adapted armature and donor hands.
for o in list(bpy.data.objects):
    if o not in [body,rig,*hands]:bpy.data.objects.remove(o,do_unlink=True)
mat=bpy.data.materials.new('HandsSkin');mat.diffuse_color=(.56,.32,.17,1);mat.use_nodes=True
mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.56,.32,.17,1)
mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.85
for h in hands:
    h.data.materials.append(mat);h.parent=rig;m=h.modifiers.new('HumanoidSkin','ARMATURE');m.object=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fitted-rig.blend'))
print(json.dumps({'bones':len(rig.data.bones),'body_vertices':len(body.data.vertices),'hands':[(h.name,len(h.data.vertices)) for h in hands]}))
