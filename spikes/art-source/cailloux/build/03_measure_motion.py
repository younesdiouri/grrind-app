from pathlib import Path
import json
import bpy

ASSET = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ASSET / 'CR_Cailloux_motion_source.blend'))
rig = bpy.data.objects['Armature']
rig.animation_data.use_nla = False
report = {'meshes': [{'name':o.name,'matrix':[list(row) for row in o.matrix_world], 'parent':o.parent.name if o.parent else None} for o in bpy.data.objects if o.type=='MESH'], 'actions':{}}
for action in bpy.data.actions:
    rig.animation_data.action = action
    if action.slots: rig.animation_data.action_slot = action.slots[0]
    samples = []
    for frame in range(int(action.frame_range[0]),int(action.frame_range[1])+1):
        bpy.context.scene.frame_set(frame)
        points = {n:list(rig.matrix_world @ rig.pose.bones[n].head) for n in ('Hips','Head','LeftHand','RightHand','LeftFoot','RightFoot')}
        samples.append({'frame':frame,**points})
    contact = min(samples,key=lambda x:x['RightHand'][1])
    report['actions'][action.name]={'range':list(action.frame_range),'fps':bpy.context.scene.render.fps,'contact':contact,'samples':samples}
(ASSET / 'review/source-motion.json').write_text(json.dumps(report,indent=2))
print({k:{'range':v['range'],'contact':v['contact']} for k,v in report['actions'].items()})
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'CR_Cailloux_motion_source.blend'))
