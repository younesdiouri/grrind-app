"""Native deformation cage; Meshy is the material/design donor, not the final topology."""
from pathlib import Path
import json, math, heapq
import bpy, bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
DEST = ROOT/'spikes/Unity3D/Assets/Characters/Personalization'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system='METRIC'
groups={}
for name in ['REF','LOW','HIGH','EXPORT','RIG_DEF']:
    groups[name]=bpy.data.collections.new(name);scene.collection.children.link(groups[name])
def move(o, group):
    for c in list(o.users_collection):c.objects.unlink(o)
    groups[group].objects.link(o)
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
def copy_world(body,name):
    o=body.copy();o.data=body.data.copy();scene.collection.objects.link(o);o.name=name
    o.data.transform(o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
    o.modifiers.clear();active(o)
    if o.data.has_custom_normals:bpy.ops.mesh.customdata_custom_splitnormals_clear()
    return o
def cut(o,planes,weld=True):
    bm=bmesh.new();bm.from_mesh(o.data)
    if weld:bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    for point,normal in planes:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=point,plane_no=normal,clear_inner=True,dist=.000001)
    bm.to_mesh(o.data);bm.free();o.data.update()
def separate_head(o,z,keep_head):
    """A height cut also crosses male deltoid peaks: select only the head component."""
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,z),plane_no=(0,0,1),dist=.000001)
    todo={f for f in bm.faces if f.calc_center_median().z>z+.000001};components=[]
    while todo:
        stack=[todo.pop()];part=set(stack)
        while stack:
            f=stack.pop()
            for e in f.edges:
                for other in e.link_faces:
                    if other in todo:todo.remove(other);part.add(other);stack.append(other)
        components.append(part)
    head=max(components,key=lambda part:max(v.co.z for f in part for v in f.verts))
    remove=[f for f in bm.faces if (f not in head if keep_head else f in head)]
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    loose=[v for v in bm.verts if not v.link_faces]
    if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    bm.to_mesh(o.data);bm.free();o.data.update()
def apply(o,kind,**props):
    active(o);m=o.modifiers.new(kind,kind)
    for k,v in props.items():setattr(m,k,v)
    bpy.ops.object.modifier_apply(modifier=m.name)
def bind(o,rig):
    active(o);bpy.ops.object.vertex_group_limit_total(limit=4);bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    assert all(0<len(v.groups)<=4 and abs(sum(g.weight for g in v.groups)-1)<.0001 for v in o.data.vertices)
    m=o.modifiers.new('Native Quaternius weights','ARMATURE');m.object=rig
def follow_female_hem(o):
    # The raised thigh carries the loose hem during dodge. Preserve the bind
    # surface and trousers; blend only the bottom 11 cm toward the two thighs.
    # Apply after the original four-weight reduction (and after export rims),
    # matching the measured Unity field rather than changing its input weights.
    pelvis=o.vertex_groups['pelvis'].index
    left=o.vertex_groups['thigh_l'].index;right=o.vertex_groups['thigh_r'].index
    def smooth(t):
        t=max(0,min(1,t));return t*t*(3-2*t)
    for v in o.data.vertices:
        influence=.4*smooth((1.12-v.co.z)/.11)
        if influence<=0:continue
        weights={g.group:g.weight for g in v.groups}
        total=sum(weights.values());weights={i:w/total*(1-influence) for i,w in weights.items()}
        # FBX's Unity bind X is the inverse of Blender's X.
        q=smooth(.5-v.co.x/.12)
        weights[left]=weights.get(left,0)+influence*q
        weights[right]=weights.get(right,0)+influence*(1-q)
        if sum(w>1e-8 for w in weights.values())>4:
            threshold=sorted((w for i,w in weights.items() if i!=pelvis),reverse=True)[3]
            reduced={i:max(0,w-threshold) for i,w in weights.items() if i!=pelvis}
            reduced[pelvis]=sum(weights.values())-sum(reduced.values())
            weights=reduced
        total=sum(weights.values())
        for group in o.vertex_groups:group.remove([v.index])
        for index,w in weights.items():
            if w>1e-8:o.vertex_groups[index].add([v.index],w/total,'REPLACE')
        assert len(v.groups)<=4

def export(shirt,skin,rig,sex):
    delivery=shirt.copy();delivery.data=shirt.data.copy();groups['EXPORT'].objects.link(delivery)
    delivery.name='PR_TshirtCotton_'+sex
    delivery.modifiers.clear()
    # Only the opening rims need thickness. An unnecessary inner shell intersects
    # tight folds and creates lighting streaks while doubling every cloth triangle.
    apply(delivery,'SOLIDIFY',thickness=.0008,offset=-1,use_even_offset=False,use_rim_only=True)
    bind(delivery,rig)
    if sex=='Female':follow_female_hem(delivery)
    active(rig)
    for o in [delivery,skin]:o.hide_set(False);o.select_set(True)
    bpy.ops.export_scene.fbx(filepath=str(DEST/f'{sex}_Sport.fbx'),use_selection=True,add_leaf_bones=False,bake_anim=False,apply_scale_options='FBX_SCALE_ALL')
    delivery.hide_set(True);delivery.hide_render=True

manifest={'pipeline':'ImageGen reference → Meshy cotton source → Blender native retopology and PBR rebake → Unity',
 'topology_and_uvs_preserved':False,'native_skin_positions_preserved':True,'neck_join_weights_shared_with_collar':True,'collar_shared_weight_band_m':.018,'collar_weight_fade_end_m':.060,'source_credits_total':35,'units':'metres','variants':{}}
for sex in ['Male','Female']:
    bpy.ops.import_scene.fbx(filepath=str(ROOT/f'spikes/Unity3D/Assets/Characters/Quaternius/Superhero_{sex}_FullBody.fbx'))
    refs=list(bpy.context.selected_objects)
    body=next(o for o in refs if o.type=='MESH' and o.name.lower().startswith('superhero'))
    rig=next(m.object for m in body.modifiers if m.type=='ARMATURE')
    shoulder=rig.matrix_world@rig.data.bones['upperarm_l'].head_local
    collar=(rig.matrix_world@rig.data.bones['neck_01'].head_local).z+(.032 if sex=='Male' else .012)
    hem=1.035 if sex=='Male' else 1.01
    sleeve=abs(shoulder.x)+.14
    for o in refs:move(o,'RIG_DEF' if o==rig else 'REF')
    bpy.ops.import_scene.fbx(filepath=str(ROOT/f"spikes/Unity3D/Assets/Characters/QuaterniusPOC/{sex}_Peasant.fbx"))
    pants_import=list(bpy.context.selected_objects)
    pants=next(o for o in pants_import if o.type=="MESH" and o.name.endswith("_Legs"))
    pants_rig=next(m.object for m in pants.modifiers if m.type=='ARMATURE')
    pants.name=sex+'_SportTrousers'
    # Fit the intact hidden waistband in the actual native-body rest frame.
    # The Peasant and Superhero rigs have different rest matrices; account for
    # the same bone-name rebind Unity uses, rather than fitting the raw FBX.
    for vertex in pants.data.vertices:
        weights=sorted(vertex.groups,key=lambda g:g.weight,reverse=True)[:4]
        total=sum(g.weight for g in weights)
        rebind=Matrix(((0,0,0,0),)*4)
        for g in weights:
            name=pants.vertex_groups[g.group].name
            rebind+=(rig.matrix_world@rig.data.bones[name].matrix_local)@(pants_rig.matrix_world@pants_rig.data.bones[name].matrix_local).inverted()*(g.weight/total)
        point=rebind@pants.matrix_world@vertex.co
        t=max(0,min(1,(point.z-(hem-.07))/.085));t=t*t*(3-2*t)
        # The waist is concealed; 40% radial taper gives clearance without
        # cutting away a band and exposing the background under a moving hem.
        point.x*=1-.40*t
        point.y=-.04+(point.y+.04)*(1-.40*t)
        vertex.co=pants.matrix_world.inverted()@rebind.inverted()@point
    active(pants_rig);pants.select_set(True)
    bpy.ops.export_scene.fbx(filepath=str(DEST/f'{sex}_SportTrousers.fbx'),use_selection=True,add_leaf_bones=False,bake_anim=False,apply_scale_options='FBX_SCALE_ALL')
    pants_tree=BVHTree.FromPolygons([pants.matrix_world@v.co for v in pants.data.vertices],[list(p.vertices) for p in pants.data.polygons])
    for o in pants_import:move(o,"REF");o.hide_render=True;o.hide_set(True)
    shirt=copy_world(body,'PR_TshirtCotton_'+sex+'_LOD0');move(shirt,'LOW')
    cut(shirt,[((0,0,hem),(0,0,1)),((sleeve,0,0),(-1,0,0)),((-sleeve,0,0),(1,0,0))])
    separate_head(shirt,collar,False)
    bm=bmesh.new();bm.from_mesh(shirt.data)
    for _ in range(5):
        bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary],factor=.30,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    bm.normal_update()
    deform=bm.verts.layers.deform.active
    arm_indices=[g.index for g in shirt.vertex_groups if g.name.startswith('upperarm')]
    for v in bm.verts:
        v.co+=v.normal*.006
        # Inferred athletic cotton ease: smooth front drape, rather than individual abs.
        width=.27 if sex=='Male' else .23
        if v.co.y>.02 and hem-.005<v.co.z<collar-.09 and abs(v.co.x)<width:
            envelope=(.12 if sex=="Male" else .135)*math.sqrt(max(0,1-(v.co.x/width)**2))-.005
            arm_weight=sum(v[deform].get(i,0) for i in arm_indices)
            t=max(0,min(1,(collar-.09-v.co.z)/.10));t=t*t*(3-2*t)
            t*=max(0,1-arm_weight*4)
            if sex=="Female":
                # A continuous cotton panel bridges the two breast lobes instead
                # of inheriting the bare body under-breast return. Inferred profile.
                anchors=[(1.0,.105),(1.12,.112),(1.22,.127),(1.30,.130),(1.35,.130),(1.40,.103)]
                z=v.co.z
                for (za,ya),(zb,yb) in zip(anchors,anchors[1:]):
                    if za<=z<=zb:
                        u=(z-za)/(zb-za);u=u*u*(3-2*u)
                        envelope=(ya*(1-u)+yb*u)*math.sqrt(max(0,1-(v.co.x/.23)**4))
                        break
                v.co.y+=(envelope-v.co.y)*t
            else:v.co.y+=max(0,envelope-v.co.y)*t
    bm.to_mesh(shirt.data);bm.free()
    apply(shirt,'SUBSURF',levels=2,render_levels=2,subdivision_type='CATMULL_CLARK')
    # The covered torso may bridge muscular relief; only exposed openings must
    # follow the native skin. Wrapping the entire shirt restores hard muscle plates.
    opening=shirt.vertex_groups.new(name='FitOpenings')
    for v in shirt.data.vertices:
        w=max(0,min(1,(abs(v.co.x)-(sleeve-.06))/.035))
        if w:opening.add([v.index],w,'REPLACE')
    apply(shirt,'SHRINKWRAP',target=body,wrap_method='NEAREST_SURFACEPOINT',wrap_mode='OUTSIDE',offset=.008,vertex_group=opening.name)
    shirt.vertex_groups.remove(shirt.vertex_groups['FitOpenings'])
    bm=bmesh.new();bm.from_mesh(shirt.data)
    tree=BVHTree.FromPolygons([body.matrix_world@v.co for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
    neck_boundary=[]
    for v in bm.verts:
        if not v.is_boundary:continue
        if abs(v.co.x)>sleeve-.025:v.co.x=math.copysign(sleeve,v.co.x)
        elif v.co.z>collar-.025:
            v.co.z=collar;neck_boundary.append(v)
        elif v.co.z<hem+.025:v.co.z=hem
    # Keep the planar native opening and fair the surrounding fabric. A cylinder
    # cut through a sloping chest is not star-shaped; mapping it to an ellipse
    # creates folded radial strips. This narrow sewn rib keeps a 1:1 loop mapping.
    neckset=set(neck_boundary)
    edges={e for e in bm.edges if e.is_boundary and all(v in neckset for v in e.verts)}
    first=next(iter(edges)).verts[0];ordered=[first];previous=None;current=first
    while True:
        candidates=[e.other_vert(current) for e in current.link_edges if e in edges and e.other_vert(current)!=previous]
        assert candidates,(sex,'broken neckline loop')
        nxt=candidates[0]
        if nxt==first:break
        ordered.append(nxt);previous,current=current,nxt
    assert len(ordered)==len(edges)
    center=Vector((0,-.04,collar));radii=[]
    for i in range(96):
        a=i*math.tau/96;hit=tree.ray_cast(center,Vector((math.cos(a),math.sin(a),0)),.25)
        assert hit[0] is not None,(sex,'missing native neck ray',i)
        radii.append(hit[3])
    smooth=radii[:]
    for _ in range(12):smooth=[(smooth[(i-1)%96]+2*r+smooth[(i+1)%96])*.25 for i,r in enumerate(smooth)]
    clearance=.006+max(a-b for a,b in zip(radii,smooth))
    for v in ordered:
        direction=v.co-center;direction.z=0;direction.normalize()
        angle=math.atan2(direction.y,direction.x)%math.tau
        index=angle/math.tau*96;i=int(index)%96;t=index-int(index)
        radius=smooth[i]*(1-t)+smooth[(i+1)%96]*t+clearance
        v.co=center+direction*radius
    zone=set(ordered);frontier=set(ordered);rings=[]
    for _ in range(16):
        frontier={other for v in frontier for e in v.link_edges for other in e.verts}-zone
        rings.append(set(frontier))
        zone.update(frontier)
    for _ in range(60):
        bmesh.ops.smooth_vert(bm,verts=list(zone-set(ordered)-frontier),factor=.4,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    # The rib lies on the yoke; do not extrude an upright mock-neck tube.
    # Its edge receives the same bounded 0.8 mm rim as the sleeve openings.
    deform=bm.verts.layers.deform.active
    collarweights={}
    for v in ordered:
        for index,w in v[deform].items():collarweights[index]=collarweights.get(index,0)+w/len(ordered)
    # Keep a fixed four-bone palette through the neck blend. Truncating a
    # five-plus influence blend made Head abruptly replace spine_03 at a ring.
    def neck_palette(weights,groups):
        result={}
        for index,w in weights.items():
            name=groups[index].name
            name={'spine_03':'neck_01','upperarm_l':'clavicle_l','upperarm_r':'clavicle_r'}.get(name,name)
            target=groups[name].index
            result[target]=result.get(target,0)+w
        return result
    collarweights=neck_palette(collarweights,shirt.vertex_groups)
    # Smooth the interpolated native weight field over the sewn fabric,
    # before locking the neckline. The body weights were painted for bare
    # muscle relief, not fabric bridging that relief. Boundaries stay native.
    interiors=[v for v in bm.verts if not v.is_boundary]
    for _ in range(24):
        updates=[]
        for v in interiors:
            neighbors=[e.other_vert(v) for e in v.link_edges]
            keys=set(v[deform].keys())|{k for n in neighbors for k in n[deform].keys()}
            updates.append((v,{k:.5*v[deform].get(k,0)+.5*sum(n[deform].get(k,0) for n in neighbors)/len(neighbors) for k in keys}))
        for v,weights in updates:
            for k,w in weights.items():v[deform][k]=w
    # Cotton bridges anatomical lobes: a height-based spine field keeps one
    # continuous front panel through the back-bend, instead of rotating each
    # breast strip with the bare-body muscle weights. Native arms stay native.
    spine_names=["pelvis","spine_01","spine_02","spine_03"]
    spine_z=[(rig.matrix_world@rig.data.bones[n].head_local).z for n in spine_names]
    for v in bm.verts:
        arm=sum(v[deform].get(i,0) for i in arm_indices)
        top=max(0,min(1,(collar-.035-v.co.z)/.075))
        lateral=max(0,min(1,(abs(shoulder.x)+.02-abs(v.co.x))/.07))
        influence=max(0,1-arm*3)*top*lateral
        if influence<=0:continue
        weights={}
        if v.co.z<=spine_z[0]:weights[shirt.vertex_groups[spine_names[0]].index]=1
        elif v.co.z>=spine_z[-1]:weights[shirt.vertex_groups[spine_names[-1]].index]=1
        else:
            for i,(za,zb) in enumerate(zip(spine_z,spine_z[1:])):
                if za<=v.co.z<=zb:
                    t=(v.co.z-za)/(zb-za);t=t*t*(3-2*t)
                    weights[shirt.vertex_groups[spine_names[i]].index]=1-t
                    weights[shirt.vertex_groups[spine_names[i+1]].index]=t
                    break
        for index in list(v[deform].keys()):v[deform][index]*=1-influence
        for index,w in weights.items():v[deform][index]=v[deform].get(index,0)+w*influence
    # A row count is not a physical width. Previously the inner yoke already
    # regained clavicle weights while the overlapping skin still followed the
    # collar, so it crossed that skin despite positive bind-space clearance.
    # Hold the whole sewn join to one affine field, then fade by geodesic metres.
    bm.verts.index_update()
    distances={v:0.0 for v in ordered}
    queue=[(0.0,v.index,v) for v in ordered];heapq.heapify(queue)
    while queue:
        distance,_,v=heapq.heappop(queue)
        if distance>distances[v]+1e-9:continue
        for edge in v.link_edges:
            other=edge.other_vert(v);candidate=distance+edge.calc_length()
            if candidate<.060 and candidate<distances.get(other,float('inf')):
                distances[other]=candidate;heapq.heappush(queue,(candidate,other.index,other))
    for v,distance in distances.items():
        t=max(0,min(1,(distance-.018)/.042));blend=1-t*t*(3-2*t)
        for index in list(v[deform].keys()):v[deform][index]*=1-blend
        for index,w in collarweights.items():v[deform][index]=v[deform].get(index,0)+w*blend
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.normal_update()
    front=[f for f in bm.faces if abs(f.calc_center_median().x)<.08 and 1.15<f.calc_center_median().z<1.35 and f.calc_center_median().y>.03]
    assert front
    # Open garments have no closed volume to choose the global orientation from.
    if sum(f.normal.y for f in front)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.normal_update();assert sum(f.normal.y for f in front)/len(front)>.75
    # Keep the shirt hem outside the actual Peasant trousers, not just
    # outside the nude body. The skin and pants have different envelopes.
    for v in bm.verts:
        if v.co.z>1.11:continue
        center=Vector((0,-.04,v.co.z));direction=v.co-center;direction.z=0
        radius=direction.length
        if radius<.001:continue
        direction.normalize();hit=pants_tree.ray_cast(center,direction,.35)
        if hit[0] is not None and hit[3]+.007>radius:v.co=center+direction*(hit[3]+.007)
    bm.to_mesh(shirt.data);bm.free();shirt.data.update()
    for p in shirt.data.polygons:p.use_smooth=True
    active(shirt)
    shirt.data.materials.clear();mat=bpy.data.materials.new(sex+' retopology clay');mat.diffuse_color=(.35,.4,.45,1);shirt.data.materials.append(mat)
    for p in shirt.data.polygons:p.material_index=0
    while shirt.data.uv_layers:shirt.data.uv_layers.remove(shirt.data.uv_layers[0])
    shirt.data.uv_layers.new(name='GameUV')
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    apply(shirt,'TRIANGULATE')
    bind(shirt,rig)
    pieces=[];cutcloud=[];neckfloor=collar-.006
    for role,plane in [('Head',((0,0,neckfloor),(0,0,1))),('Left',((-sleeve+.006,0,0),(-1,0,0))),('Right',((sleeve-.006,0,0),(1,0,0)))]:
        part=copy_world(body,sex+'_Native_'+role)
        if role=='Head':
            separate_head(part,neckfloor,True)
            # Split the existing neck triangles at the weight transitions. UVs,
            # native positions and source weights interpolate at the new edges.
            skinbm=bmesh.new();skinbm.from_mesh(part.data)
            for z in [neckfloor+.020,neckfloor+.045]:
                bmesh.ops.bisect_plane(skinbm,geom=list(skinbm.verts)+list(skinbm.edges)+list(skinbm.faces),plane_co=(0,0,z),plane_no=(0,0,1),dist=.000001)
            skinbm.to_mesh(part.data);skinbm.free();part.data.update()
            for vertex in part.data.vertices:
                blend=max(0,min(1,(neckfloor+.045-vertex.co.z)/.025))
                weights={g.group:g.weight*(1-blend) for g in vertex.groups}
                for shirt_index,w in collarweights.items():
                    index=part.vertex_groups[shirt.vertex_groups[shirt_index].name].index
                    weights[index]=weights.get(index,0)+w*blend
                # Continuous four-influence reduction: a fifth influence must
                # vanish before another enters, rather than being cut off by rank.
                # Apply also to new split vertices at blend=0; untouched native
                # vertices already have <=4 weights and remain exactly native.
                neck=part.vertex_groups['neck_01'].index
                positive={i:w for i,w in weights.items() if w>0}
                if len(positive)>4:
                    nonneck=sorted((w for i,w in positive.items() if i!=neck),reverse=True)
                    threshold=nonneck[3]
                    reduced={i:max(0,w-threshold) for i,w in positive.items() if i!=neck}
                    reduced[neck]=sum(positive.values())-sum(reduced.values())
                    weights=reduced
                for group in part.vertex_groups:group.remove([vertex.index])
                for index,w in weights.items():
                    if w>0:part.vertex_groups[index].add([vertex.index],w,'REPLACE')
        else:cut(part,[plane])
        move(part,'EXPORT')
        if role!='Head':cutcloud.extend([list(v.co) for v in part.data.vertices if abs(abs(v.co.x)-(sleeve-.006))<.00001])
        pieces.append(part)
    active(pieces[0])
    for o in pieces:o.select_set(True)
    bpy.ops.object.join();skin=pieces[0];skin.name=sex+'_Sport_Skin';bind(skin,rig)
    export(shirt,skin,rig,sex)
    if sex=='Female':follow_female_hem(shirt)
    manifest['variants'][sex]={'hem_z':hem,'collar_z':collar,'sleeve_x_m':sleeve,'body_ease_m':.006,'cuff_ease_m':.008,'hem_thickness_m':.0008,'native_hidden_overlap_m':.006,
      'triangles':len(shirt.data.polygons),'skin_triangles':sum(len(p.vertices)-2 for p in skin.data.polygons),'arm_cut_points_bind_m':cutcloud,
      'cuffs':{side:{'skin_cut_axis_m':sleeve-.006} for side in ['l','r']},'neck_fit':{'neck_floor_m':neckfloor,'original_anatomy':True}}
    for o in refs+[shirt,skin]:o.hide_set(True);o.hide_render=True
(ASSET/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET/'PR_TshirtCotton_retopology.blend'))
print(json.dumps({sex:{k:v for k,v in data.items() if k in ["triangles","skin_triangles","collar_z","hem_z"]} for sex,data in manifest["variants"].items()}))
