"""Four low-poly hairstyles built on the athlete skin of each body (#304).

Run: Blender -b -P hair.py
Forms after ref/male-hair.png and ref/female-hair.png (Meshy nano-banana-2). A shell is cast from
the centre of the skull onto the skin, then offset: a coarse grid of flat faces reads as facets
without decimation. Every vertex is weighted to Head, on the armature of the body it was built on.
"""
from pathlib import Path
import math
import random
import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[4]
CHARACTERS = ROOT / 'spikes/Unity3D/Assets/Characters'
DEST = CHARACTERS / 'FacetedHair'
EYES = {'Male': 1.698, 'Female': 1.656}


def load(body):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(CHARACTERS / 'Personalization' / (body + '_Sport.fbx')))
    skin = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_Sport_Skin'))
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o != skin]:
        bpy.data.objects.remove(o)
    world = [skin.matrix_world @ v.co for v in skin.data.vertices]
    tree = BVHTree.FromPolygons(world, [p.vertices for p in skin.data.polygons])
    return skin, rig, tree


def surface(tree, centre, direction):
    hit = tree.ray_cast(centre, direction)[0]
    return hit if hit is not None else centre + direction * .09


def shell(tree, centre, offset, keep, rings=9, segments=18, skirt=None, lowest=-10):
    """Grid of (ring, segment) points over the skull. keep(theta, z) trims the face and ears;
    skirt(theta, ring point) extends the hair downward below the skull rings."""
    rows = []
    for r in range(1, rings + 1):
        phi = math.radians(90 - (90 - lowest) * r / rings)  # from the crown down to lowest degrees
        row = []
        for s in range(segments):
            theta = 2 * math.pi * s / segments  # 0 faces +Y, the front of the Quaternius head
            d = Vector((math.sin(theta) * math.cos(phi), math.cos(theta) * math.cos(phi), math.sin(phi)))
            row.append(surface(tree, centre, d) + d * (offset(phi) if callable(offset) else offset))
        rows.append(row)
    if skirt:
        rows += skirt(rows[-1])
    top = surface(tree, centre, Vector((0, 0, 1))) + Vector((0, 0, offset(math.pi / 2) if callable(offset) else offset))
    bm = bmesh.new()
    verts = [[bm.verts.new(p) for p in row] for row in rows]
    apex = bm.verts.new(top)
    for s in range(segments):
        n = (s + 1) % segments
        if keep(2 * math.pi * (s + .5) / segments, rows[0][s].z):
            bm.faces.new((apex, verts[0][s], verts[0][n]))
        for r in range(len(rows) - 1):
            z = (rows[r][s].z + rows[r + 1][s].z + rows[r][n].z + rows[r + 1][n].z) / 4
            if keep(2 * math.pi * (s + .5) / segments, z):
                bm.faces.new((verts[r][s], verts[r + 1][s], verts[r + 1][n], verts[r][n]))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    return bm


def hairline(eyes, front, side, back):
    """Lowest hair height by direction: front of the face, over the ears, at the nape."""
    def keep(theta, z):
        a = abs((theta + math.pi) % (2 * math.pi) - math.pi)  # 0 front, pi back
        limit = front if a < math.radians(55) else side if a < math.radians(115) else back
        return z > eyes + limit
    return keep


def cone(bm, base, tip, width, depth, axis):
    """A four-sided spike: the faceted tuft of the mohawk."""
    side = axis.cross(tip - base).normalized()
    corners = [bm.verts.new(base + side * width * a + axis * depth * b) for a, b in ((1, 0), (0, 1), (-1, 0), (0, -1))]
    apex = bm.verts.new(tip)
    for i in range(4):
        bm.faces.new((corners[i], corners[(i + 1) % 4], apex))


def tube(bm, points, radii, sides=6):
    """A tapered faceted tube along points: the ponytail."""
    rings = []
    for i, (p, radius) in enumerate(zip(points, radii)):
        forward = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        u = forward.cross(Vector((1, 0, 0))).normalized()
        v = forward.cross(u)
        rings.append([bm.verts.new(p + (u * math.cos(a) + v * math.sin(a)) * radius)
                      for a in (2 * math.pi * k / sides for k in range(sides))])
    for a, b in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new((a[k], b[k], b[(k + 1) % sides], a[(k + 1) % sides]))
    bm.faces.new(list(reversed(rings[0])))
    tip = bm.verts.new(points[-1] + (points[-1] - points[-2]) * .6)
    for k in range(sides):
        bm.faces.new((rings[-1][k], rings[-1][(k + 1) % sides], tip))


def jitter(bm, amount, seed):
    # Uneven facets, like the decimated Quaternius hair; symmetric so left and right still match.
    rng = random.Random(seed)
    cache = {}
    for v in bm.verts:
        key = (round(abs(v.co.x), 3), round(v.co.y, 3), round(v.co.z, 3))
        cache.setdefault(key, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * amount)
        d = cache[key]
        v.co += Vector((math.copysign(d.x, v.co.x) if abs(v.co.x) > 1e-4 else 0, d.y, d.z))


def finish(bm, name, rig, extra=None):
    mesh = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if extra is not None:  # an existing Quaternius hair joined under the new one
        bpy.ops.object.select_all(action='DESELECT')
        extra.select_set(True)
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.join()
    mesh = obj.data
    for p in mesh.polygons:
        p.use_smooth = False
    mesh.materials.clear()
    mesh.materials.append(bpy.data.materials.get('MI_Hair_1') or bpy.data.materials.new('MI_Hair_1'))
    uv = mesh.uv_layers.active or mesh.uv_layers.new()
    for loop in mesh.loops:  # the hair texture is an even grey tile: a planar projection is enough
        co = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (co.x * 4 + .5, co.z * 4 + co.y * 2)
    group = obj.vertex_groups.get('Head') or obj.vertex_groups.new(name='Head')
    group.add(range(len(mesh.vertices)), 1.0, 'REPLACE')
    # The Quaternius rig is turned half a turn: keep the hair where it was built.
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()
    obj.modifiers.new('Armature', 'ARMATURE').object = rig
    return obj


def export(objects, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.fbx(filepath=str(path), use_selection=True, object_types={'ARMATURE', 'MESH'},
        add_leaf_bones=False, bake_anim=False, mesh_smooth_type='FACE', apply_scale_options='FBX_SCALE_ALL')
    print('HAIR', path.name, sum(len(p.vertices) - 2 for o in objects if o.type == 'MESH' for p in o.data.polygons))


def male():
    eyes = EYES['Male']
    centre = Vector((0, -.01, eyes + .03))
    for name in ('Hair_Afro', 'Hair_Mohawk'):
        skin, rig, tree = load('Male')
        if name == 'Hair_Afro':
            # A rounded volume well off the skull, open on the face above the brows.
            # Fullest around the temples and the crown, tight at the nape: a ball, not a bowl.
            puff = lambda phi: .03 + .028 * math.sin(math.radians(35) + phi) ** 2 if phi > -math.radians(35) else .03
            bm = shell(tree, centre, puff, hairline(eyes, .05, .025, -.05), rings=9, segments=16, lowest=-40)
            # The rim tucks onto the skull, so the volume reads round instead of a cut edge.
            for v in [v for v in bm.verts if v.is_boundary]:
                d = (v.co - centre).normalized()
                v.co = surface(tree, centre, d) + d * .008
            jitter(bm, .006, 1)
            hair = finish(bm, name, rig)
        else:
            before = set(bpy.data.objects)
            bpy.ops.import_scene.fbx(filepath=str(DEST / 'Hair_Buzzed.fbx'))
            imported = set(bpy.data.objects) - before
            buzzed = next(o for o in imported if o.type == 'MESH')
            for o in imported:
                if o != buzzed:
                    bpy.data.objects.remove(o)
            placed = buzzed.matrix_world.copy()
            buzzed.parent = None
            buzzed.matrix_world = placed
            buzzed.modifiers.clear()
            # Nine tufts along the midline, from the hairline over the crown to the nape, leaning back.
            bm = bmesh.new()
            for i in range(9):
                a = math.radians(55 + 140 * i / 8)
                d = Vector((0, math.cos(a), math.sin(a)))
                base = surface(tree, centre, d) + d * .004
                height = .05 + .03 * math.sin(math.pi * i / 8)
                tip = base + (d + Vector((0, -.5, 0))).normalized() * height
                cone(bm, base, tip, .016, .022, Vector((0, -d.z, d.y)))
            hair = finish(bm, name, rig, extra=buzzed)
        export([rig, hair], DEST / (name + '.fbx'))


def female():
    eyes = EYES['Female']
    centre = Vector((0, -.012, eyes + .03))
    for name in ('Hair_Ponytail', 'Hair_Bob'):
        skin, rig, tree = load('Female')
        if name == 'Hair_Ponytail':
            # Slicked back close to the skull; a tied tail from the crown falls to the nape.
            bm = shell(tree, centre, .006, hairline(eyes, .045, .025, -.045), rings=10, segments=18, lowest=-35)
            jitter(bm, .0015, 2)
            crown = surface(tree, centre, Vector((0, -.55, .83)).normalized())
            out = Vector((0, -.55, .83)).normalized()
            points = [crown - out * .005, crown + out * .02, crown + Vector((0, -.06, .0)),
                      crown + Vector((0, -.09, -.06)), crown + Vector((0, -.085, -.14)), crown + Vector((0, -.06, -.2))]
            tube(bm, points, [.02, .022, .028, .026, .02, .012])
        else:
            # Chin-length straight hair with a blunt edge and a fringe down to the brows.
            def skirt(last):
                rows = []
                for drop, flare in ((.035, 1.06), (.07, 1.1), (.095, 1.12)):
                    rows.append([Vector((p.x * flare, p.y * flare if p.y < .02 else p.y, p.z - drop)) for p in last])
                return rows
            def keep(theta, z):
                a = abs((theta + math.pi) % (2 * math.pi) - math.pi)
                return z > eyes + (.02 if a < math.radians(48) else -1)
            bm = shell(tree, centre, .014, keep, rings=8, segments=18, skirt=skirt, lowest=-15)
            jitter(bm, .002, 3)
        hair = finish(bm, name, rig)
        export([rig, hair], DEST / (name + '.fbx'))


if __name__ == '__main__':
    male()
    female()
