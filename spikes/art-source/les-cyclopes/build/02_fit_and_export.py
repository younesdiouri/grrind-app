"""Preserve the Meshy visor and fit slim, natural stems to the real eyes and ears."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
CHARACTERS = ROOT / 'spikes/Unity3D/Assets/Characters'


def imported(path, kind):
    if kind == 'fbx':
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    return list(bpy.context.selected_objects)


def bounds(points):
    return [Vector(tuple(op(point[i] for point in points) for i in range(3))) for op in (min, max)]


def barycentric(point, a, b, c):
    v, w, q = b - a, c - a, point - a
    det = v.x * w.y - v.y * w.x
    if abs(det) < 1e-10:
        return None
    x, y = (q.x * w.y - q.y * w.x) / det, (v.x * q.y - v.y * q.x) / det
    return (1 - x - y, x, y)


def iris_points(eyes):
    mesh = eyes.data
    mesh.calc_loop_triangles()
    uv = mesh.uv_layers.active.data
    targets = [Vector((.5, .5))] + [Vector((.5 + .12 * math.cos(i * math.tau / 8),
                                                            .5 + .12 * math.sin(i * math.tau / 8))) for i in range(8)]
    result = []
    for side in (-1, 1):
        for target in targets:
            for triangle in mesh.loop_triangles:
                points = [eyes.matrix_world @ mesh.vertices[i].co for i in triangle.vertices]
                if sum(point.x for point in points) * side <= 0:
                    continue
                weights = barycentric(target, *(uv[index].uv for index in triangle.loops))
                if weights and min(weights) >= -1e-5:
                    result.append(sum((point * weight for point, weight in zip(points, weights)), Vector()))
                    break
            else:
                raise RuntimeError('Iris UV sample is missing; inspect the actual eye mesh')
    assert len(result) == 18
    return result


class Optics:
    def __init__(self, obj, mask):
        self.obj = obj
        mesh = obj.data
        mesh.calc_loop_triangles()
        self.triangles = [tuple(triangle.vertices) for triangle in mesh.loop_triangles]
        uv = mesh.uv_layers.active.data
        self.uv = [tuple(uv[index].uv.copy() for index in triangle.loops) for triangle in mesh.loop_triangles]
        self.width, self.height = mask.size
        self.pixels = np.empty(self.width * self.height * 4, dtype=np.float32)
        mask.pixels.foreach_get(self.pixels)

    def sample(self, uv):
        x, y = int(uv.x * self.width) % self.width, int(uv.y * self.height) % self.height
        return float(self.pixels[(y * self.width + x) * 4])

    def update(self):
        self.points = [self.obj.matrix_world @ vertex.co for vertex in self.obj.data.vertices]
        self.tree = BVHTree.FromPolygons(self.points, self.triangles, all_triangles=True)

    def coverage(self, pupils):
        self.update()
        results = {}
        for angle in (-25, 0, 25):
            direction = Vector((math.sin(math.radians(angle)), math.cos(math.radians(angle)), .02)).normalized()
            missed = 0
            for pupil in pupils:
                position, normal, index, distance = self.tree.ray_cast(pupil + direction * 2, -direction, 2)
                if position is None:
                    missed += 1
                    continue
                a, b, c = (self.points[i] for i in self.triangles[index])
                # Barycentric weights in the triangle's local 2D plane.
                v, w, q = b - a, c - a, position - a
                vv, vw, ww = v.dot(v), v.dot(w), w.dot(w)
                det = vv * ww - vw * vw
                u = (ww * q.dot(v) - vw * q.dot(w)) / det
                t = (vv * q.dot(w) - vw * q.dot(v)) / det
                uv = self.uv[index][0] * (1 - u - t) + self.uv[index][1] * u + self.uv[index][2] * t
                if self.sample(uv) < .55:
                    missed += 1
            results[str(angle)] = {'iris_samples': len(pupils), 'uncovered': missed}
        return results

    def lens_points(self):
        indices = set()
        for triangle, uv in zip(self.triangles, self.uv):
            if self.sample(sum(uv, Vector((0, 0))) / 3) > .65:
                indices.update(triangle)
        assert len(indices) > 100, 'The PBR mask must identify the mirror lens'
        return [self.obj.matrix_world @ self.obj.data.vertices[i].co for i in indices]

    def eye_relief(self, pupils):
        self.update()
        distances = [self.tree.ray_cast(point, Vector((0, 1, 0)), .15)[3] for point in pupils]
        assert all(distance is not None for distance in distances)
        return [min(distances), max(distances)]


def ear_tops(head):
    return {side: max((point for point in head if point.x * side > max(p.x * side for p in head) * .9),
                      key=lambda point: point.z) for side in (-1, 1)}


def rebuild_temples(model, skin, head, approach, optics):
    # The photo calls for a slim temple stem and a short, tucked return, not an arch around the pinna.
    mesh = model.data
    mesh.calc_loop_triangles()
    points = [vertex.co.copy() for vertex in mesh.vertices]
    uv = mesh.uv_layers.active.data
    corner_normals = [normal.vector.copy() for normal in mesh.corner_normals]
    cut_y = .072 - approach
    base = bpy.data.images.load(str(ASSET / 'source_textures/base_color.png'))
    pixels = np.empty(base.size[0] * base.size[1] * 4, dtype=np.float32)
    base.pixels.foreach_get(pixels)
    rgb = pixels.reshape(-1, 4)[:, :3]
    matte = optics.pixels.reshape(-1, 4)[:, 0] < .05

    def colour_uv(purple):
        score = -np.abs(rgb - np.array([.05, .01, .15])).sum(axis=1) if purple else np.minimum(rgb[:, 0], rgb[:, 1]) - rgb[:, 2]
        valid = matte & (rgb[:, 2] > rgb[:, 0]) if purple else matte
        index = int(np.argmax(np.where(valid, score, -100)))
        return Vector(((index % base.size[0] + .5) / base.size[0], (index // base.size[0] + .5) / base.size[1]))

    purple, yellow = colour_uv(True), colour_uv(False)
    vertices, faces, uvs, normals, cuts = [], [], [], [], []

    def face(corners):
        offset = len(vertices)
        vertices.extend(tuple(point) for point, texcoord, normal in corners)
        uvs.extend(tuple(texcoord) for point, texcoord, normal in corners)
        normals.extend(tuple(normal) for point, texcoord, normal in corners)
        faces.append(tuple(range(offset, offset + len(corners))))

    kept_lens = 0
    for triangle in mesh.loop_triangles:
        polygon = [(points[index].copy(), uv[loop].uv.copy(), corner_normals[loop].copy())
                   for index, loop in zip(triangle.vertices, triangle.loops)]
        if optics.sample(sum((corner[1] for corner in polygon), Vector((0, 0))) / 3) > .65:
            assert all(corner[0].y > cut_y for corner in polygon), 'The cut must leave the complete Meshy lens intact'
            kept_lens += 1
        clipped = []
        previous = polygon[-1]
        for current in polygon:
            before, after = previous[0].y >= cut_y, current[0].y >= cut_y
            if before != after:
                t = (cut_y - previous[0].y) / (current[0].y - previous[0].y)
                corner = tuple(a.lerp(b, t) for a, b in zip(previous, current))
                corner[0].y = cut_y
                clipped.append(corner)
                cuts.append(corner[0])
            if after:
                clipped.append(current)
            previous = current
        for i in range(1, len(clipped) - 1):
            face([clipped[0], clipped[i], clipped[i + 1]])

    # Close each removed arm section; the visor's UVs and corner normals above are copied exactly.
    for side in (-1, 1):
        boundary = {tuple(round(value, 6) for value in point): point for point in cuts if point.x * side > 0}
        ring = list(boundary.values())
        assert len(ring) >= 3
        centre = sum(ring, Vector()) / len(ring)
        ring.sort(key=lambda point: math.atan2(point.z - centre.z, point.x - centre.x))
        for a, b in zip(ring, ring[1:] + ring[:1]):
            face([(point, purple, Vector((0, -1, 0))) for point in (centre, a, b)])

    surface_points = [skin.matrix_world @ vertex.co for vertex in skin.data.vertices]
    surface = BVHTree.FromPolygons(surface_points, [tuple(poly.vertices) for poly in skin.data.polygons])
    report = {'retained_mirror_triangles': kept_lens, 'sides': {}}
    for side, ear in ear_tops(head).items():
        outer = max(point.x * side for point in head)
        anchor = max((point for point in points if point.x * side > outer * .95 and cut_y < point.y < cut_y + .012),
                     key=lambda point: point.z).copy()
        path = [anchor]
        crest = max(point.z for point in head if point.x * side > outer * .8
                    and abs(point.y - ear.y) < .025 and point.z < ear.z + .008)
        # Follow the scalp beside the superior ear fold; only the short rear return descends.
        controls = [(ear.y + dy, crest + dz) for dy, dz in ((.045, .002), (.006, .002), (-.005, .002), (-.014, -.002), (-.023, -.007))]
        for i, (y, z) in enumerate(controls):
            previous = path[-1]
            count = 1 if i == 0 else max(1, math.ceil(abs(y - previous.y) / .004))
            for step in range(1, count + 1):
                t = step / count
                sample_y, sample_z = previous.y + (y - previous.y) * t, previous.z + (z - previous.z) * t
                hits = [surface.ray_cast(Vector((0, sample_y, sample_z + dz)), Vector((side, 0, 0)), .15)[0]
                        for dz in (-.0016, 0, .0016)]
                assert all(hit is not None for hit in hits)
                x = max(hit.x * side for hit in hits) + .0025
                path.append(Vector((side * x, sample_y, sample_z)))
        rings = []
        for i, centre in enumerate(path):
            half_x, half_z, bevel = .0009, (.002 if i == 0 else .0016), .00045
            cross = [(-half_x + bevel, -half_z), (half_x - bevel, -half_z), (half_x, -half_z + bevel),
                     (half_x, half_z - bevel), (half_x - bevel, half_z), (-half_x + bevel, half_z),
                     (-half_x, half_z - bevel), (-half_x, -half_z + bevel)]
            rings.append([centre + Vector((x, 0, z)) for x, z in cross])
        for i, (a, b) in enumerate(zip(rings, rings[1:])):
            colour = yellow if path[i].y > ear.y + .006 and i > 0 else purple
            for j in range(8):
                quad = [a[j], a[(j + 1) % 8], b[(j + 1) % 8], b[j]]
                normal = (quad[1] - quad[0]).cross(quad[2] - quad[0]).normalized()
                face([(point, colour, normal) for point in quad])
        face([(point, purple, Vector((0, 1, 0))) for point in reversed(rings[0])])
        face([(point, purple, Vector((0, -1, 0))) for point in rings[-1]])
        report['sides'][side] = {'ear_top_m': list(ear), 'centreline_m': [list(point) for point in path],
                                 'stem_height_m': .0032, 'stem_thickness_m': .0018, 'return_drop_m': .009}
    result = bpy.data.meshes.new(model.name + '_NaturalTemples')
    result.from_pydata(vertices, [], faces)
    layer = result.uv_layers.new(name='UVMap')
    for loop, texcoord in zip(layer.data, uvs):
        loop.uv = texcoord
    for material in mesh.materials:
        result.materials.append(material)
    for poly in result.polygons:
        poly.use_smooth = True
    result.normals_split_custom_set(normals)
    model.data = result
    return report


def fit(output):
    if not bpy.app.background:
        raise RuntimeError('Use a separate headless Blender scene')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.preferences.filepaths.save_version = 0
    output.mkdir(parents=True, exist_ok=True)
    mask = bpy.data.images.load(str(ASSET / 'source_textures/metallic.png'))
    mask.colorspace_settings.name = 'Non-Color'
    report = {'source': 'Meshy mirror/frame retained; rear arms replaced by slim stems fitted to the scalp and ear fold', 'units': 'metres',
              'axes': 'Z up, +Y front in Blender; body-rest-space FBX, Humanoid Head attachment', 'variants': {}}
    for body in ('Male', 'Female'):
        refs = imported(CHARACTERS / 'Quaternius' / ('Superhero_' + body + '_FullBody.fbx'), 'fbx')
        eyes = next(obj for obj in refs if obj.type == 'MESH' and obj.name == 'Eyes')
        pupils = iris_points(eyes)
        eye_centre = sum(pupils, Vector()) / len(pupils)
        refs += imported(CHARACTERS / 'FacialPilot' / (body + 'SportFace_Faceted.fbx'), 'fbx')
        skin = next(obj for obj in refs if obj.type == 'MESH' and obj.name.endswith('_Sport_Skin'))
        head_group = skin.vertex_groups['Head'].index
        head = [skin.matrix_world @ vertex.co for vertex in skin.data.vertices
                if any(group.group == head_group and group.weight > .5 for group in vertex.groups)]
        head_min, head_max = bounds(head)
        for obj in refs:
            obj.name = 'REF_' + body + '_' + obj.name
            obj.hide_render = True
            obj.hide_set(True)
        model = next(obj for obj in imported(ASSET / 'source.glb', 'gltf') if obj.type == 'MESH')
        model.name = 'PR_LesCyclopes_' + body + '_LOD0'
        optics = Optics(model, mask)
        source_matrix = model.matrix_world.copy()
        source_min, source_max = bounds([source_matrix @ vertex.co for vertex in model.data.vertices])
        # The measured Meshy lens is on -Y. Preserve proportions with uniform scale.
        rotation = Matrix.Rotation(math.pi, 4, 'Z')
        scale = (head_max.x - head_min.x) * 1.13 / (source_max.x - source_min.x)
        linear = Matrix.Scale(scale, 4) @ rotation @ source_matrix
        model.matrix_world = linear
        lens_min, lens_max = bounds(optics.lens_points())
        all_min, all_max = bounds([linear @ vertex.co for vertex in model.data.vertices])
        # Measured closest fit retaining nose and all headband clearances in the phone pilot.
        approach = .016 if body == 'Male' else .018
        base = Vector((-(all_min.x + all_max.x) / 2, head_max.y + .012 - approach - lens_max.y,
                       eye_centre.z + .020 - lens_max.z))
        best = None
        # Optical calibration: the lens must cover irises, not merely avoid intersecting skin.
        for step in sorted(range(-12, 13), key=abs):
            offset = base + Vector((0, 0, step * .001))
            model.matrix_world = Matrix.Translation(offset) @ linear
            coverage = optics.coverage(pupils)
            if all(result['uncovered'] == 0 for result in coverage.values()):
                best = offset, coverage
                break
        if best is None:
            raise RuntimeError(body + ': no valid optical fit within 12 mm; revise the fit rather than export uncovered eyes')
        offset, coverage = best
        bpy.ops.object.select_all(action='DESELECT')
        model.select_set(True)
        bpy.context.view_layer.objects.active = model
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        temples = rebuild_temples(model, skin, head, approach, optics)
        optics = Optics(model, mask)
        coverage = optics.coverage(pupils)
        assert all(value["uncovered"] == 0 for value in coverage.values())
        model.data.calc_loop_triangles()
        triangles = len(model.data.loop_triangles)
        assert triangles <= 6000
        bpy.ops.export_scene.fbx(filepath=str(output / (body + '.fbx')), use_selection=True,
                                 bake_anim=False, apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
        extent_min, extent_max = bounds([model.matrix_world @ vertex.co for vertex in model.data.vertices])
        report['variants'][body] = {'triangles': triangles, 'uniform_scale': scale, 'translation_m': list(offset),
                                    'bounds_m': [list(extent_min), list(extent_max)], 'iris_coverage': coverage,
                                    'eye_relief_m': optics.eye_relief(pupils), 'approach_m': approach, 'temples': temples}
        model.hide_render = body != 'Male'
        model.hide_set(body != 'Male')
    for source, target in [('base_color.png', 'BaseColor.png'), ('metallic.png', 'MetalMask.png')]:
        shutil.copy2(ASSET / 'source_textures' / source, output / target)
    (ASSET / 'asset-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'PR_LesCyclopes_master.blend'))
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    fit(args.output.resolve())
