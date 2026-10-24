"""Run through Blender MCP or Blender --background --python this_file.

Adapted from blender-image-to-3d/assets/build_template.py. Rebuild only this
phase's scene, leaving the user's other scenes and the source FBX intact.
"""
from pathlib import Path
import hashlib
import json
import math
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[4]
ASSET = ROOT / 'spikes/art-source/facial-pilot'
DEST = ROOT / 'spikes/Unity3D/Assets/Characters/FacialPilot'
PHASE = 'GRRIND male facial pilot'


def smooth(lo, hi, value):
    t = max(0.0, min(1.0, (value - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def square_face(p):
    """Metres, world +Y forward, native Quaternius scale. All offsets inferred.

    Concept: wider lower jaw, broad chin and two deliberate cheek/jaw planes.
    The crown, ears, eye sockets, nose, lips and collar are outside these masks.
    """
    q = p.copy()
    x = abs(p.x)
    if x < .029 and p.y > .080 and 1.614 < p.z < 1.700:
        return q
    face = smooth(.005, .035, p.y)
    lower = smooth(1.574, 1.594, p.z) * (1 - smooth(1.635, 1.681, p.z))
    lateral = smooth(.008, .040, x)
    # 12 mm per side at the jaw, tapered to zero at eyes and neck.
    q.x += math.copysign(.012 * lower * lateral * face, p.x)
    cheek = smooth(.025, .045, x) * (1 - smooth(.073, .083, x))
    cheek *= smooth(1.594, 1.612, p.z) * (1 - smooth(1.662, 1.681, p.z)) * face
    # Two broad planes meet along the lower cheek, as in ref/concept-three-views.
    upper_plane = .106 - .62 * abs(q.x) + .05 * (p.z - 1.65)
    jaw_plane = .099 - .45 * abs(q.x) + .25 * (p.z - 1.615)
    plane = min(upper_plane, jaw_plane)
    q.y += max(-.008, min(.008, plane - p.y)) * cheek
    chin = (1 - smooth(.020, .038, x)) * face
    chin *= smooth(1.576, 1.588, p.z) * (1 - smooth(1.606, 1.616, p.z))
    q.y += max(-.004, min(.004, .087 - p.y)) * chin
    return q


def wide_nose(p):
    """The same independent nose on either face; 35% wider alae, +3 mm tip.

    Source nose occupies z 1.643–1.697 m, y > .087 m, |x| < .022 m.
    The lower and lateral falloffs preserve lips and the eye sockets.
    """
    q = p.copy()
    weight = smooth(1.640, 1.648, p.z) * (1 - smooth(1.678, 1.699, p.z))
    weight *= smooth(.085, .101, p.y) * (1 - smooth(.018, .028, abs(p.x)))
    q.x *= 1 + .35 * weight
    q.y += .003 * weight
    return q


def fingerprint(mesh):
    return {
        'vertices': len(mesh.data.vertices),
        'triangles': sum(len(p.vertices) - 2 for p in mesh.data.polygons),
        'uv_sha256': hashlib.sha256(repr([tuple(v.uv) for v in mesh.data.uv_layers.active.data]).encode()).hexdigest(),
        'weights_sha256': hashlib.sha256(repr([[(g.group, g.weight) for g in v.groups] for v in mesh.data.vertices]).encode()).hexdigest(),
    }


def facial_planes(obj):
    """Dissolve the small coplanar cheek edges into real larger surface faces.

    Keep UV seams and material boundaries. Eyelids, lips, ears and the neck
    remain outside the selection. This is local modelling, not decimation.
    """
    bpy.context.view_layer.objects.active = obj
    if obj.data.has_custom_normals:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    def cheek(v):
        p = obj.matrix_world @ v.co
        return .022 < abs(p.x) < .081 and p.y > .025 and 1.590 < p.z < 1.674
    edges = [e for e in mesh.edges if all(cheek(v) for v in e.verts)]
    bmesh.ops.dissolve_limit(mesh, angle_limit=math.radians(18),
        verts=[], edges=edges, delimit={'UV', 'MATERIAL', 'SEAM'})
    for face in mesh.faces:
        if len(face.verts) > 4 and all(cheek(v) for v in face.verts):
            face.smooth = False
    mesh.to_mesh(obj.data)
    mesh.free()
    obj.data.update()


def make_variant(source, name, square):
    obj = source.copy()
    obj.data = source.data.copy()
    obj.name = name
    obj.data.name = name
    bpy.context.scene.collection.objects.link(obj)
    inverse = obj.matrix_world.inverted()
    original = [obj.matrix_world @ v.co for v in obj.data.vertices]
    if square:
        for v, p in zip(obj.data.vertices, original):
            v.co = inverse @ square_face(p)
    # Validate source-preserving coordinates before local coplanar edge dissolve.
    changed = [(obj.matrix_world @ v.co - p).length for v, p in zip(obj.data.vertices, original)]
    protected = [d for p, d in zip(original, changed) if p.z < 1.574 or p.z > 1.681 or p.y < .005]
    assert max(protected, default=0) < 1e-6, 'Crown, collar or back changed'
    if square:
        facial_planes(obj)
    obj.shape_key_add(name='Basis')
    nose = obj.shape_key_add(name='NoseWide')
    for key, vert in zip(nose.data, obj.data.vertices):
        key.co = inverse @ wide_nose(obj.matrix_world @ vert.co)
    obj.data.update()
    if not square:
        assert fingerprint(obj) == fingerprint(source), 'Original topology, UVs or rig weights changed'
    return obj, {'max_displacement_mm': max(changed) * 1000, **fingerprint(obj)}


def build():
    previous = bpy.data.scenes.get(PHASE)
    if previous:
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(previous)
    scene = bpy.data.scenes.new(PHASE)
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    DEST.mkdir(parents=True, exist_ok=True)
    measurements = {}
    for role, relative, match in [
        ('Fantasy', 'QuaterniusPOC/Head.fbx', 'QuaterniusHead'),
        ('Sport', 'Personalization/Male_Sport.fbx', 'Male_Sport_Skin'),
    ]:
        path = ROOT / 'spikes/Unity3D/Assets/Characters' / relative
        before = set(scene.objects)
        bpy.ops.import_scene.fbx(filepath=str(path))
        imported = set(scene.objects) - before
        source = next(o for o in imported if o.type == 'MESH' and o.name.startswith(match))
        rig = next(m.object for m in source.modifiers if m.type == 'ARMATURE')
        rig.name = 'CH_FacialPilot_' + role + '_Rig'
        variants = []
        for suffix, square in [('Original', False), ('Square', True)]:
            name = 'CH_FacialPilot_' + role + '_' + suffix
            obj, report = make_variant(source, name, square)
            variants.append(obj)
            measurements[name] = report
        for obj in imported:
            if obj != rig:
                bpy.data.objects.remove(obj, do_unlink=True)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in [rig] + variants:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = rig
        bpy.ops.export_scene.fbx(filepath=str(DEST / ('Male' + role + 'Face.fbx')),
            use_selection=True, object_types={'ARMATURE', 'MESH'}, add_leaf_bones=False,
            bake_anim=False, use_mesh_modifiers=False, mesh_smooth_type='FACE',
            apply_scale_options='FBX_SCALE_ALL')
        for obj in variants:
            obj.hide_render = True
            obj.hide_set(True)
    master = ASSET / 'CH_FacialPilotMale_master.blend'
    for obj in scene.objects:
        preview = obj.name == 'CH_FacialPilot_Fantasy_Square'
        obj.hide_render = not preview
        obj.hide_set(not preview)
        if preview:
            obj.data.shape_keys.key_blocks['NoseWide'].value = 1
    bpy.data.libraries.write(str(master), {scene}, fake_user=True)
    (ASSET / 'measurements.json').write_text(json.dumps(measurements, indent=2) + '\n')
    print(json.dumps({'master': str(master), 'meshes': measurements}, indent=2))


if __name__ == '__main__':
    build()
