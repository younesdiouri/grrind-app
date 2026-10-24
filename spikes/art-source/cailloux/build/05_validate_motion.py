from pathlib import Path
import json
import bpy
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ASSET / 'CR_Cailloux_master.blend'))
rig = bpy.data.objects['CR_Cailloux_Rig']
mesh = bpy.data.objects['CR_Cailloux_Body_LOD0']
feet = [v.index for v in mesh.data.vertices if v.co.z < .12 and sum(g.weight for g in v.groups if any(n in mesh.vertex_groups[g.group].name for n in ('Leg','Foot','Toe'))) > .999]
torso = [v.index for v in mesh.data.vertices if sum(g.weight for g in v.groups if mesh.vertex_groups[g.group].name in ('Spine','LeftShoulder','RightShoulder')) > .999]
assert len(feet)>100 and len(torso)>100

def sample():
    dg = bpy.context.evaluated_depsgraph_get()
    obj = mesh.evaluated_get(dg)
    data = obj.to_mesh()
    points = [obj.matrix_world @ v.co for v in data.vertices]
    obj.to_mesh_clear()
    return points

report = {'clips':{},'errors':[],'foot_vertices':len(feet),'rigid_torso_vertices':len(torso)}
for action in bpy.data.actions:
    rig.animation_data.action = action
    if action.slots: rig.animation_data.action_slot = action.slots[0]
    start,end = map(int,action.frame_range)
    bpy.context.scene.frame_set(start)
    first = sample()
    distances = [(first[torso[i]]-first[torso[-i-1]]).length for i in range(20)]
    drift = rigid = joint_step = 0.0
    previous_joints = None
    low = 10.0
    for frame in range(start,end+1):
        bpy.context.scene.frame_set(frame)
        points = sample()
        joints = [bone.head.copy() for bone in rig.pose.bones]
        if previous_joints is not None:
            joint_step = max(joint_step,max((a-b).length for a,b in zip(joints,previous_joints)))
        previous_joints = joints
        drift = max(drift,max((points[i]-first[i]).length for i in feet))
        low = min(low,min(p.z for p in points))
        rigid = max(rigid,max(abs((points[torso[i]]-points[torso[-i-1]]).length-distances[i]) for i in range(20)))
    seam = max((a-b).length for a,b in zip(first,points))
    report['clips'][action.name]={'foot_drift_m':drift,'torso_pair_distance_error_m':rigid,'min_ground_z_m':low,'loop_or_guard_seam_m':seam,'max_joint_step_per_frame_m':joint_step}
    if drift>.002 or rigid>.0001 or low<-.003 or seam>.001 or joint_step>.08:
        report['errors'].append(action.name)
(ASSET / 'review/motion-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
assert not report['errors'], report['errors']
