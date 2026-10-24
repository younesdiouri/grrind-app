"""Keep Meshy faces/UVs. Calibrate metres and the proven 25 mm cylindrical grip."""
from pathlib import Path
from mathutils import Vector
import bpy,json
ROOT=Path(__file__).resolve().parents[2]
for name,height,grip_frac in [('fer-play',.85,.16),('huilesson',.76,.15)]:
 asset=ROOT/name;out=asset/'exports';out.mkdir(exist_ok=True)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.context.scene.unit_settings.system='METRIC'
 bpy.ops.import_scene.gltf(filepath=str(asset/'source.glb'))
 obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 points=[obj.matrix_world@v.co for v in obj.data.vertices]
 lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 scale=height/(hi.z-lo.z)
 # Source upright Z, front -Y. Delivery X follows the handle; origin sits in the palm.
 # Physical sizes and grip centre are inferred; preserve head silhouette from the reference.
 grip_z=lo.z+(hi.z-lo.z)*grip_frac
 grip=[p for p in points if lo.z+(hi.z-lo.z)*.07 < p.z < lo.z+(hi.z-lo.z)*.24]
 gx=(min(p.x for p in grip)+max(p.x for p in grip))/2
 gy=(min(p.y for p in grip)+max(p.y for p in grip))/2
 width=max(max(p.x for p in grip)-min(p.x for p in grip),max(p.y for p in grip)-min(p.y for p in grip))*scale
 for v,p in zip(obj.data.vertices,points):
  f=(p.z-lo.z)/(hi.z-lo.z)
  weight=max(0,min(1,(.34-f)/.06))
  narrow=(1-weight)+weight*.025/width
  # Right-handed rotation Z -> X, X -> -Z, retaining normals/triangle winding.
  v.co=Vector(((p.z-grip_z)*scale,(p.y-gy)*scale*narrow,-(p.x-gx)*scale*narrow))
 if name=='huilesson':
  # Meshy failed the open string grid. Replace only interior triangles, keeping frame/UVs.
  import bmesh,math
  bm=bmesh.new();bm.from_mesh(obj.data)
  remove=[]
  for face in bm.faces:
   c=face.calc_center_median()
   if ((c.x-.426)/.180)**2+(c.z/.131)**2<1:remove.append(face)
  bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(obj.data);bm.free()
  ivory=bpy.data.materials.new('Racket strings');ivory.use_nodes=True
  bsdf=next(n for n in ivory.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Base Color'].default_value=(.84,.79,.64,1);bsdf.inputs['Roughness'].default_value=.8
  strings=[]
  def string(a,b):
   delta=Vector(b)-Vector(a);mid=(Vector(a)+Vector(b))/2
   bpy.ops.mesh.primitive_cylinder_add(vertices=4,radius=.0022,depth=delta.length,location=mid)
   o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.data.materials.append(ivory);strings.append(o)
  # Ellipse and count inferred from reference, thickness enlarged for the combat framing.
  for z in [-.086,-.043,0,.043,.086]:
   half=.180*math.sqrt(1-(z/.131)**2);string((.426-half,0,z),(.426+half,0,z))
  for x in [.285,.332,.379,.426,.473,.520,.567]:
   half=.131*math.sqrt(1-((x-.426)/.180)**2);string((x,0,-half),(x,0,half))
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
  for o in strings:o.select_set(True)
  bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()
 obj.matrix_world.identity();obj.name='WP_'+('FerPlay' if name=='fer-play' else 'Huilesson')+'_LOD0';obj.data.name=obj.name+'_Mesh'
 low=bpy.data.collections.new('LOW');bpy.context.scene.collection.children.link(low)
 for old in list(obj.users_collection):old.objects.unlink(obj)
 low.objects.link(obj)
 for m in obj.data.materials:
  for n in m.node_tree.nodes:
   if n.type=='TEX_IMAGE' and n.image:
    n.image.pack();n.image.filepath_raw=str(out/'BaseColor.png');n.image.file_format='PNG';n.image.save()
 tris=sum(len(p.vertices)-2 for p in obj.data.polygons);assert tris<=2300 and obj.data.uv_layers
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.export_scene.fbx(filepath=str(out/('FerPlay.fbx' if name=='fer-play' else 'Huilesson.fbx')),use_selection=True,bake_anim=False,apply_scale_options='FBX_SCALE_ALL',path_mode='STRIP')
 bpy.ops.wm.save_as_mainfile(filepath=str(asset/(obj.name.replace('_LOD0','')+'_master.blend')))
 manifest=dict(units='metres',length_m=height,grip_diameter_m=.025,triangles=tris,vertices=len(obj.data.vertices),materials=len(obj.data.materials),long_axis='X',grip='origin',texture='BaseColor.png sRGB 2048',source_bounds=list(hi-lo),inferred=['physical dimensions','handle centre','back from generated views'],changes=('Scale, axis conversion and 25mm grip; original frame topology/UVs retained. Incomplete Meshy strings replaced by authored 5x7 grid, diameter 4.4mm; no decimation.' if name=='huilesson' else 'Uniform scale; rigid axis rotation; handle narrowed to 25mm. Original topology, UVs and winding retained; no decimation after texturing.'))
 (asset/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(name,json.dumps(manifest))
