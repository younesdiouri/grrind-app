from pathlib import Path
from mathutils import Vector
import bpy, math
ROOT=Path(__file__).resolve().parents[2]
for name in ['fer-play','huilesson']:
 asset=ROOT/name;master=next(asset.glob('*_master.blend'));bpy.ops.wm.open_mainfile(filepath=str(master))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
 scene.render.resolution_x=512;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.render.film_transparent=True
 obj=next(o for o in scene.objects if o.type=='MESH');pts=[obj.matrix_world@Vector(c) for c in obj.bound_box];center=sum(pts,Vector())/8
 cam=bpy.data.objects.new('Review camera',bpy.data.cameras.new('Review camera'));scene.collection.objects.link(cam);scene.camera=cam
 cam.data.type='ORTHO';cam.data.ortho_scale=.94 if name=='fer-play' else .84
 for view,offset in [('front',(0,-3,0)),('side',(0,0,-3)),('back',(0,3,0)),('threequarter',(0,-3,1.5))]:
  cam.location=center+Vector(offset);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',-math.pi/2 if view in ['front','threequarter'] else math.pi/2)
  for old in [o for o in scene.objects if o.type=='LIGHT']:bpy.data.objects.remove(old,do_unlink=True)
  for pos,energy,size in [((1,-2,3),160,3),((0,2,1),90,3)]:
   light=bpy.data.objects.new('Studio',bpy.data.lights.new('Studio','AREA'));scene.collection.objects.link(light);light.location=pos;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
  scene.world=bpy.data.worlds.new('Studio world');scene.world.color=(.3,.3,.3);out=asset/'review';out.mkdir(exist_ok=True);scene.render.filepath=str(out/(view+'.png'));bpy.ops.render.render(write_still=True)
