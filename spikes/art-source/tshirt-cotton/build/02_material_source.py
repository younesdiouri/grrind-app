"""Author restrained cotton on the accepted LOW; Meshy remains the design source."""
from pathlib import Path
import bpy,json,hashlib,struct
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
ASSET=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ASSET/'PR_TshirtCotton_retopology.blend'))
source=bpy.data.collections.new('COTTON_BAKE_SOURCE');bpy.context.scene.collection.children.link(source)
def digest(o):
 h=hashlib.sha256()
 for v in o.data.vertices:h.update(struct.pack('fff',*v.co))
 for uv in o.data.uv_layers.active.data:h.update(struct.pack('ff',*uv.uv))
 return h.hexdigest()
report={}
for low in bpy.data.collections['LOW'].objects:
 if low.type!='MESH':continue
 before=digest(low);sex='Male' if '_Male_' in low.name else 'Female'
 manifest=json.loads((ASSET/'asset-manifest.json').read_text())['variants'][sex]
 mat=bpy.data.materials.new('Authored cotton '+sex);mat.use_nodes=True;nt=mat.node_tree;nt.nodes.clear()
 def node(kind):return nt.nodes.new(kind)
 def link(value,socket):
  if isinstance(value,(int,float)):socket.default_value=value
  else:nt.links.new(value,socket)
 def math(op,a,b=0):
  n=node('ShaderNodeMath');n.operation=op;link(a,n.inputs[0]);link(b,n.inputs[1]);return n.outputs[0]
 output=node('ShaderNodeOutputMaterial');bsdf=node('ShaderNodeBsdfPrincipled');nt.links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
 geometry=node('ShaderNodeNewGeometry');separate=node('ShaderNodeSeparateXYZ');nt.links.new(geometry.outputs['Position'],separate.inputs[0]);x,y,z=[separate.outputs[n] for n in ['X','Y','Z']]
 noise=node('ShaderNodeTexNoise');noise.noise_dimensions='3D';noise.inputs['Scale'].default_value=220;noise.inputs['Detail'].default_value=2;noise.inputs['Roughness'].default_value=.6;nt.links.new(geometry.outputs['Position'],noise.inputs['Vector'])
 cotton=node('ShaderNodeMixRGB');cotton.blend_type='MIX';nt.links.new(noise.outputs['Fac'],cotton.inputs[0]);cotton.inputs[1].default_value=(.085,.109,.145,1);cotton.inputs[2].default_value=(.153,.177,.213,1)
 # A small flat lightning mark follows the front chest through the baked UVs.
 # Its mask adds no decal geometry and cannot leak onto the rear panel.
 center_x=-.10;center_z=manifest['collar_z']-.14
 outline=[(-.05,1),(-.65,-.05),(-.05,-.05),(-.3,-1),(.65,.25),(.10,.25),(.40,1)]
 polygon=[Vector((center_x+px*.022,center_z+pz*.024,0)) for px,pz in outline]
 mask=0
 for tri in tessellate_polygon([polygon]):
  a,b,c=[polygon[v] if isinstance(v,int) else v for v in tri];orientation=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);inside=1
  for a,b in [(a,b),(b,c),(c,a)]:
   cross=math('SUBTRACT',math('MULTIPLY',b.x-a.x,math('SUBTRACT',z,a.y)),math('MULTIPLY',b.y-a.y,math('SUBTRACT',x,a.x)))
   if orientation<0:cross=math('MULTIPLY',cross,-1)
   inside=math('MULTIPLY',inside,math('GREATER_THAN',cross,-1e-7))
  mask=math('MAXIMUM',mask,inside)
 mask=math('MULTIPLY',mask,math('GREATER_THAN',y,.025))
 logo=node('ShaderNodeMixRGB');logo.blend_type='MIX';link(mask,logo.inputs[0]);nt.links.new(cotton.outputs[0],logo.inputs[1]);logo.inputs[2].default_value=(.48,.52,.57,1);nt.links.new(logo.outputs[0],bsdf.inputs['Base Color'])
 rough=math('ADD',.82,math('MULTIPLY',noise.outputs['Fac'],.06));nt.links.new(rough,bsdf.inputs['Roughness']);bsdf.inputs['Metallic'].default_value=0
 bump=node('ShaderNodeBump');bump.inputs['Strength'].default_value=.6;bump.inputs['Distance'].default_value=.00035;nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
 low.data.materials.clear();low.data.materials.append(mat);low.hide_render=False
 donor=low.copy();donor.data=low.data.copy();donor.modifiers.clear();donor.name=low.name.replace('_LOD0','')+'_AuthoredCotton';source.objects.link(donor);donor.hide_render=False;donor.hide_set(False)
 assert digest(low)==before and digest(donor)==before
 report[sex]={'low_position_uv_sha256':before,'unchanged':True,'source':'Blender procedural cotton; ImageGen/Meshy retained as design reference','grain_scale_per_m':220,'bump_distance_m':.00035,'bump_strength':.6,'roughness_range':[.82,.88],'logo_height_m':.048,'logo_center':[center_x,center_z]}
(ASSET/'authored-cotton-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET/'PR_TshirtCotton_authored.blend'))
