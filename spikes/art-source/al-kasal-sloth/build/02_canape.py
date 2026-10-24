"""Original faceted sofa minion; all dimensions inferred for a 1.25 m melee target."""
from pathlib import Path
import json
import bpy

ASSET = Path(__file__).resolve().parents[1]
UNITY = ASSET.parents[1] / 'Unity3D/Assets/Characters/Canape'
UNITY.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .9
    mat.diffuse_color = (*color, 1)
    return mat

plum = material('Plum', (.23, .075, .22))
seat = material('Cushion', (.40, .17, .37))
mint = material('Mint', (.25, .85, .72))
cream = material('Cream', (.92, .89, .76))
dark = material('Pupils', (.025, .03, .045))

def block(name, location, size, mat, bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=obj.modifiers.new('Angular cushion edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(mat)
    return obj

# Blender front is -Y; FBX is +Z forward in Unity.
block('PR_Canape_Base', (0,0,.40),(1.65,.76,.4),plum)
block('PR_Canape_Back', (0,.25,.90),(1.6,.30,.76),plum)
for x in [-.84,.84]: block('PR_Canape_Arm'+str(x),(x,-.04,.69),(.30,.85,.49),seat)
for x in [-.39,.39]: block('PR_Canape_Cushion'+str(x),(x,-.14,.65),(.72,.68,.18),seat,.07)
for x in [-.6,.6]:
    block('PR_Canape_Slipper'+str(x),(x,-.11,.12),(.42,.61,.24),cream,.045)
    block('PR_Canape_Sole'+str(x),(x,-.11,.035),(.44,.63,.07),mint,.015)
for x in [-.25,.25]:
    block('PR_Canape_Eye'+str(x),(x,.062,1.04),(.23,.09,.21),cream,.045)
    block('PR_Canape_Pupil'+str(x),(x+.02,.008,1.02),(.09,.025,.11),dark,.015)
    eyebrow=block('PR_Canape_Brow'+str(x),(x,-.001,1.18),(.27,.05,.07),dark,.005)
    eyebrow.rotation_euler.y=.18 if x<0 else -.18
block('PR_Canape_Mouth',(0,-.4,.44),(.26,.05,.055),dark,.01)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET/'PR_Canape_master.blend'))
bpy.ops.export_scene.fbx(filepath=str(UNITY/'Canape.fbx'),use_selection=True,
    object_types={'MESH'},axis_forward='-Z',axis_up='Y',bake_anim=False,add_leaf_bones=False)
report={'triangles':sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons),
        'authoring':'Original Blender bevelled cushion geometry, flat polygon planes',
        'height_m':1.28,'license':'Original project asset','inferred':'All proportions and faces'}
(ASSET/'review/canape-provenance.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
