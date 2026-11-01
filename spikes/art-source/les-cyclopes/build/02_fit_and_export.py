"""Preserve the mirror visor and extend its purple frame into continuous cycling temples."""
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
    # The purple frame itself turns into the arm: share the cut boundary, without a cap or overlaid bar.
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
        score = -np.abs(rgb - np.array([.25, .04, .65])).sum(axis=1) if purple else np.minimum(rgb[:, 0], rgb[:, 1]) - rgb[:, 2]
        valid = matte & (rgb[:, 2] > rgb[:, 0]) if purple else matte
        index = int(np.argmax(np.where(valid, score, -100)))
        return Vector(((index % base.size[0] + .5) / base.size[0], (index // base.size[0] + .5) / base.size[1]))

    def key(point):
        return tuple(round(value, 6) for value in point)

    purple, yellow = colour_uv(True), colour_uv(False)
    polygons, graph, boundary_points, locked = [], {}, {}, set()
    cut_points = []
    kept_lens = 0
    for triangle in mesh.loop_triangles:
        polygon = [(points[index].copy(), uv[loop].uv.copy(), corner_normals[loop].copy())
                   for index, loop in zip(triangle.vertices, triangle.loops)]
        metal = optics.sample(sum((corner[1] for corner in polygon), Vector((0, 0))) / 3)
        if metal > .65:
            assert all(corner[0].y > cut_y for corner in polygon)
            locked.update(key(corner[0]) for corner in polygon)
            kept_lens += 1
        if metal > .1:
            locked.update(key(corner[0]) for corner in polygon if corner[0].y > cut_y + .002)
        clipped, previous = [], polygon[-1]
        for current in polygon:
            before, after = previous[0].y >= cut_y, current[0].y >= cut_y
            if before != after:
                t = (cut_y - previous[0].y) / (current[0].y - previous[0].y)
                corner = tuple(a.lerp(b, t) for a, b in zip(previous, current))
                corner[0].y = cut_y
                clipped.append(corner)
            if after:
                clipped.append(current)
            previous = current
        if len(clipped) < 3:
            continue
        # UV seams compute the same cut with slightly different floats; share a geometric point.
        for i, (point, texcoord, normal) in enumerate(clipped):
            if abs(point.y - cut_y) < 1e-7:
                canonical = next((p for p in cut_points if (p - point).length < 2e-6), None)
                if canonical is None:
                    canonical = point.copy()
                    cut_points.append(canonical)
                clipped[i] = (canonical, texcoord, normal)
        polygons.append((clipped, metal))
        edge = {key(corner[0]): corner[0] for corner in clipped if abs(corner[0].y - cut_y) < 1e-7}
        if len(edge) == 2:
            u, v = edge
            graph.setdefault(u, set()).add(v)
            graph.setdefault(v, set()).add(u)
            boundary_points.update(edge)
    assert graph and all(len(neighbours) == 2 for neighbours in graph.values()), 'Inspect the source cut before joining the frame'
    remaining = {tuple(sorted((u, v))) for u, neighbours in graph.items() for v in neighbours}
    loops = []
    while remaining:
        start = next(iter(remaining))[0]
        ordered, current = [start], start
        while True:
            following = next((v for v in graph[current] if tuple(sorted((current, v))) in remaining), None)
            assert following is not None
            remaining.remove(tuple(sorted((current, following))))
            if following == start:
                break
            ordered.append(following)
            current = following
        ring = [boundary_points[k].copy() for k in ordered]
        area = sum(a.x * b.z - b.x * a.z for a, b in zip(ring, ring[1:] + ring[:1]))
        loops.append(ring if area > 0 else list(reversed(ring)))

    specifications = {}
    for side, ear in ear_tops(head).items():
        candidates = [ring for ring in loops if sum(point.x * side for point in ring) / len(ring) > .065]
        root = max(candidates, key=lambda ring: sum(point.x * side for point in ring) / len(ring))
        low, high = bounds(root)
        crest = max(point.z for point in head if point.x * side > max(p.x * side for p in head) * .8
                    and abs(point.y - ear.y) < .025 and point.z < ear.z + .008)
        # Author's red profile: broad, low side wing narrowing up to the ear, not a high top bar.
        specifications[side] = {'root': root, 'centre': (low + high) / 2, 'level': crest - .013,
                                'scale_x': .004 / (high.x - low.x), 'scale_z': .018 / (high.z - low.z), 'ear': ear}

    def warp(point):
        if key(point) in locked:
            return point.copy()
        side = 1 if point.x > 0 else -1
        spec = specifications[side]
        tx = max(0, min(1, (abs(point.x) - .060) / .028))
        ty = max(0, min(1, (cut_y + .030 - point.y) / .030))
        weight = tx * tx * (3 - 2 * tx) * ty * ty * (3 - 2 * ty)
        target = Vector((spec['centre'].x + (point.x - spec['centre'].x) * spec['scale_x'], point.y,
                         spec['level'] + (point.z - spec['centre'].z) * spec['scale_z']))
        return point.lerp(target, weight)

    vertices, faces, uvs, normals, vertex_indices = [], [], [], [], {}

    def face(corners):
        cleaned = []
        for corner in corners:
            if not cleaned or key(corner[0]) != key(cleaned[-1][0]):
                cleaned.append(corner)
        if len(cleaned) > 1 and key(cleaned[0][0]) == key(cleaned[-1][0]):
            cleaned.pop()
        corners = cleaned
        indices = []
        for point, texcoord, normal in corners:
            k = key(point)
            if k not in vertex_indices:
                vertex_indices[k] = len(vertices)
                vertices.append(tuple(point))
            indices.append(vertex_indices[k])
        if len(set(indices)) < 3:
            return
        faces.append(tuple(indices))
        uvs.extend(tuple(texcoord) for point, texcoord, normal in corners)
        normals.extend(tuple(normal) for point, texcoord, normal in corners)

    for polygon, metal in polygons:
        transformed = [(warp(point), texcoord, normal) for point, texcoord, normal in polygon]
        changed = any((a[0] - b[0]).length > 1e-8 for a, b in zip(polygon, transformed))
        assert not changed or metal <= .65, 'The mirror lens must remain fixed while reshaping the frame'
        for i in range(1, len(transformed) - 1):
            triangle = [transformed[0], transformed[i], transformed[i + 1]]
            if changed:
                normal = (triangle[1][0] - triangle[0][0]).cross(triangle[2][0] - triangle[0][0]).normalized()
                triangle = [(point, purple if metal < .1 else texcoord, normal) for point, texcoord, previous_normal in triangle]
            face(triangle)
    roots = {id(spec['root']) for spec in specifications.values()}
    for ring in loops:
        if id(ring) in roots:
            continue
        transformed = [warp(point) for point in ring]
        centre = sum(transformed, Vector()) / len(transformed)
        for a, b in zip(transformed, transformed[1:] + transformed[:1]):
            face([(point, purple, Vector((0, -1, 0))) for point in (centre, a, b)])

    surface_points = [skin.matrix_world @ vertex.co for vertex in skin.data.vertices]
    surface = BVHTree.FromPolygons(surface_points, [tuple(poly.vertices) for poly in skin.data.polygons])

    def skin_crossings(side, y, z):
        origin, hits = Vector((0, y, z)), []
        for _ in range(3):
            point = surface.ray_cast(origin, Vector((side, 0, 0)), .15)[0]
            if point is None:
                break
            hits.append(point.x * side)
            origin = point + Vector((side * .00001, 0, 0))
        return hits

    def ear_gap(side, y, z):
        # First crossing leaves the scalp; second enters the ear. Fit the whole 3 mm section.
        samples = [skin_crossings(side, y + dy, z + dz)
                   for dy in (-.0015, 0, .0015) for dz in (-.0015, 0, .0015)]
        if any(len(hits) != 3 for hits in samples):
            return None
        low, high = max(hits[0] for hits in samples), min(hits[1] for hits in samples)
        return side * (low + high) / 2 if high - low >= .0032 else None

    report = {'retained_mirror_triangles': kept_lens, 'junction_y_m': cut_y, 'sides': {}}
    joined_rings = {}
    for side, spec in specifications.items():
        ear, level = spec['ear'], spec['level']
        root = [warp(point) for point in spec['root']]
        root_centre = Vector((spec['centre'].x, cut_y, level))
        outer = max(point.x * side for point in head)
        support_x = max(outer + .004, abs(root_centre.x) - .007)
        support_z = ear.z + .0005
        support_y = ear.y + .006
        t = .012 / (cut_y - support_y)
        path = [root_centre, Vector((root_centre.x, cut_y - .012, level + (support_z - level) * t)),
                Vector((side * support_x, support_y, support_z))]
        heights = [.018, .018 + (.006 - .018) * t, .006]
        # Clear the top edge before moving medially into the ear/scalp gap.
        path.append(Vector((side * support_x, ear.y - .004, ear.z + .0035)))
        heights.append(.002)
        bridge_y, bridge_z = ear.y - .010, ear.z + .0045
        bridge_x = max(skin_crossings(side, bridge_y, bridge_z + dz)[0] for dz in (-.0015, .0015)) + .0025
        path.append(Vector((side * bridge_x, bridge_y, bridge_z)))
        heights.append(.002)
        hook_centres = []
        # The descending tip belongs in the scalp/pinna air gap, not beyond the ear silhouette.
        for drop in (.008, .012, .020):
            z = ear.z - drop
            candidates = sorted(range(6, 41), key=lambda mm: abs(mm - 24))
            fitted = [(ear.y - mm * .0005, ear_gap(side, ear.y - mm * .0005, z)) for mm in candidates]
            y, x = next(((y, x) for y, x in fitted if x is not None), (None, None))
            assert x is not None, 'No safe air gap between the ear and scalp for the return'
            target = Vector((x, y, z))
            hook_centres.append(list(target))
            previous = path[-1]
            steps = max(1, math.ceil((target - previous).length / .003))
            for step in range(1, steps + 1):
                point = previous.lerp(target, step / steps)
                path.append(point)
                heights.append(.003)
        assert path[0].z < ear.z - .006 and path[2].z > path[0].z + .009

        def section(direction, half_x, half_z):
            bevel = .0007
            outline = [(-1 + bevel / half_x, -1), (1 - bevel / half_x, -1), (1, -1 + bevel / half_z),
                       (1, 1 - bevel / half_z), (1 - bevel / half_x, 1), (-1 + bevel / half_x, 1),
                       (-1, 1 - bevel / half_z), (-1, -1 + bevel / half_z)]
            for a, b in zip(outline, outline[1:] + outline[:1]):
                edge = Vector(b) - Vector(a)
                det = direction.x * edge.y - direction.y * edge.x
                if abs(det) < 1e-10:
                    continue
                t = (a[0] * edge.y - a[1] * edge.x) / det
                u = (a[0] * direction.y - a[1] * direction.x) / det
                if t >= 0 and -.00001 <= u <= 1.00001:
                    return Vector((direction.x * t * half_x, 0, direction.y * t * half_z))
            raise RuntimeError('Invalid frame section')

        directions = [Vector(((point.x - root_centre.x) / .002, (point.z - level) / .009)) for point in root]
        rings = [root]
        for i, centre in enumerate(path[1:], 1):
            tangent = path[min(i + 1, len(path) - 1)] - path[i - 1]
            up = Vector((0, tangent.z, -tangent.y)).normalized() if i >= 4 else Vector((0, 0, 1))
            offsets = [section(direction, .002 if i < 3 else .001, heights[i] / 2) for direction in directions]
            rings.append([centre + Vector((offset.x, 0, 0)) + up * offset.z for offset in offsets])
        for i, (a, b) in enumerate(zip(rings, rings[1:])):
            for j in range(len(root)):
                quad = [a[j], a[(j + 1) % len(root)], b[(j + 1) % len(root)], b[j]]
                normal = (quad[1] - quad[0]).cross(quad[2] - quad[0]).normalized()
                colour = yellow if 1 <= i < 3 and normal.x * side > .75 and abs(normal.z) < .4 else purple
                face([(point, colour, normal) for point in quad])
        for a, b in zip(rings[-1], rings[-1][1:] + rings[-1][:1]):
            face([(point, purple, Vector((0, -1, 0))) for point in (path[-1], a, b)])
        joined_rings[side] = [vertex_indices[key(point)] for point in root]
        report['sides'][side] = {'ear_top_m': list(ear), 'centreline_m': [list(point) for point in path],
                                 'section_heights_m': heights, 'stem_thickness_m': .004,
                                 'hidden_hook_centres_m': hook_centres,
                                 'return_drop_m': max(point.z for point in path) - path[-1].z,
                                 'front_to_ear_rise_m': path[2].z - path[0].z, 'shared_frame_edges': len(root)}
    edge_counts = {}
    for polygon in faces:
        for a, b in zip(polygon, polygon[1:] + polygon[:1]):
            edge = tuple(sorted((a, b)))
            edge_counts[edge] = edge_counts.get(edge, 0) + 1
    for ring in joined_rings.values():
        assert all(edge_counts[tuple(sorted((a, b)))] == 2 for a, b in zip(ring, ring[1:] + ring[:1])), 'The frame/arm junction must be a shared closed surface'
    result = bpy.data.meshes.new(model.name + '_ContinuousFrame')
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
    report = {'source': 'Meshy mirror retained; the purple side frame is shaped and welded directly into the sport temples', 'units': 'metres',
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
