"""Fit the Meshy visor to real iris samples, retaining source topology, UVs and normals."""
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


def fit(output):
    if not bpy.app.background:
        raise RuntimeError('Use a separate headless Blender scene')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.preferences.filepaths.save_version = 0
    output.mkdir(parents=True, exist_ok=True)
    mask = bpy.data.images.load(str(ASSET / 'source_textures/metallic.png'))
    mask.colorspace_settings.name = 'Non-Color'
    report = {'source': 'Meshy 7.1 + Meshy remesh; UVs/topology/normals retained', 'units': 'metres',
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
        original_faces = [tuple(face.vertices) for face in model.data.polygons]
        original_uv = [tuple(loop.uv) for loop in model.data.uv_layers.active.data]
        source_min, source_max = bounds([source_matrix @ vertex.co for vertex in model.data.vertices])
        # The measured Meshy lens is on -Y. Preserve proportions with uniform scale.
        rotation = Matrix.Rotation(math.pi, 4, 'Z')
        scale = (head_max.x - head_min.x) * 1.13 / (source_max.x - source_min.x)
        linear = Matrix.Scale(scale, 4) @ rotation @ source_matrix
        model.matrix_world = linear
        lens_min, lens_max = bounds(optics.lens_points())
        all_min, all_max = bounds([linear @ vertex.co for vertex in model.data.vertices])
        base = Vector((-(all_min.x + all_max.x) / 2, head_max.y + .012 - lens_max.y,
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
        assert original_faces == [tuple(face.vertices) for face in model.data.polygons]
        assert original_uv == [tuple(loop.uv) for loop in model.data.uv_layers.active.data]
        model.data.calc_loop_triangles()
        triangles = len(model.data.loop_triangles)
        assert triangles <= 6000
        bpy.ops.export_scene.fbx(filepath=str(output / (body + '.fbx')), use_selection=True,
                                 bake_anim=False, apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
        extent_min, extent_max = bounds([model.matrix_world @ vertex.co for vertex in model.data.vertices])
        report['variants'][body] = {'triangles': triangles, 'uniform_scale': scale, 'translation_m': list(offset),
                                    'bounds_m': [list(extent_min), list(extent_max)], 'iris_coverage': coverage}
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
