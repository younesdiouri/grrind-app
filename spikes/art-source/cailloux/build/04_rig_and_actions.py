"""Adapt the Meshy bind to rigid stone and author compact, planted combat gestures.

The two downloaded presets are retained as motion references. Their humanoid torso
deformation and lateral travel were rejected; these actions keep their direct/counter
intent and contact timing without shipping the unwanted movement.
"""
from pathlib import Path
import json
import math
import shutil
import bpy
from mathutils import Vector, Matrix, Euler

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
DEST = ROOT / 'spikes/Unity3D/Assets/Characters/Cailloux'
DEST.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ASSET / 'CR_Cailloux_rig_source.blend'))
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 30
rig = bpy.data.objects['Armature']
mesh = bpy.data.objects['char1']
for obj in list(bpy.data.objects):
    if obj not in (rig, mesh): bpy.data.objects.remove(obj, do_unlink=True)
rig.animation_data_clear()
world = mesh.matrix_world.copy()
mesh.parent = None
for vertex in mesh.data.vertices: vertex.co = world @ vertex.co
mesh.matrix_world.identity()
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    # glTF importer creates display tails 100x longer than the actual joints.
    bone.use_connect = False
    bone.tail = bone.head + (bone.tail - bone.head) * .01
bpy.ops.object.mode_set(mode='OBJECT')
rig.name = 'CR_Cailloux_Rig'
mesh.name = 'CR_Cailloux_Body_LOD0'
mesh.data.name = 'CR_Cailloux_Mesh'
mesh.parent = rig
mesh.matrix_parent_inverse.identity()
mesh.matrix_basis.identity()

for name in ('LOW', 'RIG_DEF', 'REF', 'HIGH', 'RIG_CTRL', 'COLLISION', 'SOCKETS', 'EXPORT'):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in scene.collection.children: scene.collection.children.link(col)
for obj, name in ((mesh, 'LOW'), (rig, 'RIG_DEF')):
    for col in list(obj.users_collection): col.objects.unlink(obj)
    bpy.data.collections[name].objects.link(obj)

# The face and torso form ONE stone, so human neck/spine skinning cannot bend them.
torso_names = {'Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront'}
indices = {g.index:g.name for g in mesh.vertex_groups}
torso_group = mesh.vertex_groups['Spine']
for vertex in mesh.data.vertices:
    weights = [(indices[g.group], g.weight) for g in vertex.groups]
    torso_weight = sum(w for n,w in weights if n in torso_names)
    for name, _ in weights:
        if name in torso_names: mesh.vertex_groups[name].remove([vertex.index])
    if torso_weight: torso_group.add([vertex.index], torso_weight, 'REPLACE')
    weights = sorted([(g.group,g.weight) for g in vertex.groups if g.weight > .00001], key=lambda x:x[1], reverse=True)[:4]
    total = sum(w for _,w in weights)
    assert total > 0
    for group in list(vertex.groups): mesh.vertex_groups[group.group].remove([vertex.index])
    for group,weight in weights: mesh.vertex_groups[group].add([vertex.index], weight/total, 'REPLACE')

for mat in mesh.data.materials:
    mat.name = 'CaillouxStone'
    node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Roughness'].default_value = .85
    node.inputs['Metallic'].default_value = 0
    for tex in mat.node_tree.nodes:
        if tex.type == 'TEX_IMAGE' and tex.image:
            tex.image.pack()
            tex.image.filepath_raw = str(DEST / 'BaseColor.png')
            tex.image.file_format = 'PNG'
            tex.image.save()

rest = {b.name:b.matrix_local.copy() for b in rig.data.bones}
heads = {b.name:b.head_local.copy() for b in rig.data.bones}
tails = {b.name:b.tail_local.copy() for b in rig.data.bones}
order = sorted(rig.pose.bones, key=lambda b:len(b.parent_recursive))
legs = {b.name for b in rig.pose.bones if any(t in b.name for t in ('Leg','Foot','Toe'))}
guard = {'Left':Vector((.50,-.245,.88)), 'Right':Vector((-.50,-.245,.88))}

def aimed(name, point, direction):
    q = (tails[name]-heads[name]).normalized().rotation_difference(direction.normalized())
    return Matrix.Translation(point) @ q.to_matrix().to_4x4() @ rest[name].to_quaternion().to_matrix().to_4x4()

def arm(side, wrist, torso, fist_direction):
    sign = 1 if side == 'Left' else -1
    shoulder = torso @ heads[side+'Arm']
    l1 = (heads[side+'ForeArm']-heads[side+'Arm']).length
    l2 = (heads[side+'Hand']-heads[side+'ForeArm']).length
    delta = wrist - shoulder
    distance = min(delta.length, (l1+l2)*.97)
    axis = delta.normalized()
    wrist = shoulder + axis*distance
    along = (l1*l1-l2*l2+distance*distance)/(2*distance)
    radius = math.sqrt(max(0,l1*l1-along*along))
    pole = Vector((sign,.15,-.6))
    pole = (pole-axis*pole.dot(axis)).normalized()
    elbow = shoulder+axis*along+pole*radius
    return {side+'Arm':aimed(side+'Arm',shoulder,elbow-shoulder),
            side+'ForeArm':aimed(side+'ForeArm',elbow,wrist-elbow),
            side+'Hand':aimed(side+'Hand',wrist,fist_direction)}

def pulse(p, peak=.5):
    t = p/peak if p <= peak else (1-p)/(1-peak)
    return math.sin(max(0,min(1,t))*math.pi/2)**2

def pose(kind, p):
    amount = pulse(p)
    left, right = guard['Left'].copy(), guard['Right'].copy()
    pitch = yaw = lean = 0.0
    if kind == 'Idle':
        amount = math.sin(p*2*math.pi)
        left.z += .003*amount; right.z -= .003*amount
    elif kind == 'Attack':
        right = right.lerp(Vector((-.23,-.54,1.04)), amount)
        yaw = .24*amount; pitch = .06*amount
    elif kind == 'Hit':
        pitch = -.18*amount
        left.z += .045*amount; right.z += .045*amount
    elif kind == 'Critical':
        prep = pulse(p,.24) if p < .5 else 0
        right = right.lerp(Vector((-.47,-.16,1.24)), prep*.85)
        right = right.lerp(Vector((-.24,-.53,.94)), amount)
        pitch = .09*amount; yaw = .27*amount
    elif kind == 'Dodge':
        pitch = -.22*amount; lean = .10*amount
        left.y += .07*amount; right.y += .07*amount
    elif kind == 'Combo':
        left.z += .10*amount; right.z += .10*amount
        left.x += .025*amount; right.x -= .025*amount
    elif kind == 'Counter':
        parry = pulse(p*2,.44) if p < .5 else 0
        left = left.lerp(Vector((.58,-.34,1.08)), parry*.85)
        right = right.lerp(Vector((-.22,-.54,1.08)), amount)
        yaw = .27*amount; pitch = .055*amount
    pivot = Vector((0,0,.67))  # inferred: centre of the rigid torso, below the face
    torso = Matrix.Translation(pivot) @ Euler((pitch,lean,yaw),'XYZ').to_matrix().to_4x4() @ Matrix.Translation(-pivot)
    matrices = {name:(rest[name].copy() if name in legs else torso @ rest[name]) for name in rest}
    matrices.update(arm('Left',left,torso,Vector((0,-1,.04))))
    matrices.update(arm('Right',right,torso,Vector((0,-1,.02))))
    for bone in order:
        bone.matrix = matrices[bone.name]
        bpy.context.view_layer.update()
    return matrices

for action in list(bpy.data.actions): bpy.data.actions.remove(action)
rig.animation_data_create()
contract = {'fps':30,'root_motion':False,'canonical_contact_phase':.5,'clips':[]}
for name in ('Idle','Attack','Hit','Critical','Dodge','Combo','Counter','WorkshopIdle'):
    kind = 'Idle' if name == 'WorkshopIdle' else name
    end = 75 if kind == 'Idle' else 30
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    action.use_fake_user = True
    for frame in range(end+1):
        scene.frame_set(frame)
        pose(kind,frame/end)
        for bone in order:
            bone.rotation_mode = 'QUATERNION'
            bone.keyframe_insert('location',frame=frame,group=bone.name)
            bone.keyframe_insert('rotation_quaternion',frame=frame,group=bone.name)
            bone.keyframe_insert('scale',frame=frame,group=bone.name)
    for curve in action.fcurves:
        for key in curve.keyframe_points: key.interpolation = 'LINEAR'
    if kind != 'Idle': action.pose_markers.new('contact').frame = end//2
    contract['clips'].append({'name':name,'frames':[0,end],'length_s':end/30,'loop':kind=='Idle','contact_s':None if kind=='Idle' else .5})

rig.animation_data.action = bpy.data.actions['Idle']
scene.frame_start = 0; scene.frame_end = 75; scene.frame_set(0)
for obj in scene.objects: obj.select_set(obj in (rig,mesh))
bpy.context.view_layer.objects.active = rig
out = DEST / 'Cailloux.fbx'
bpy.ops.export_scene.fbx(filepath=str(out), use_selection=True, object_types={'ARMATURE','MESH'},
    apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', add_leaf_bones=False,
    bake_anim=True, bake_anim_use_all_actions=True, bake_anim_use_nla_strips=False,
    bake_anim_simplify_factor=0, path_mode='STRIP')
(ASSET / 'animation-contract.json').write_text(json.dumps(contract,indent=2))
manifest = {'source_task':'01a16a60-444a-7189-a1c2-574dccd5f249','rig_task':'01a16a62-1f2b-7730-b599-47b4e88ff6db',
    'animation_reference_task':'01a16a63-2c86-770a-9c9b-3b2370bffcc6','consumed_credits':46,
    'height_m':1.3,'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'bones':list(rest),
    'texture':{'file':'BaseColor.png','size':2048,'color_space':'sRGB'},'root_motion':False,
    'modifications':['applied metre scale','shortened glTF display tails','collapsed torso/head weights to rigid stone','four normalized influences maximum','compact authored IK punches and counter after rejecting raw preset deformation','fixed foot transforms'],
    'inferred':['real height','pivot positions','hidden sole detail','adapted attack/counter paths'],
    'animation_contract':'animation-contract.json'}
(ASSET / 'asset-manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'CR_Cailloux_master.blend'))
print(json.dumps(manifest))
