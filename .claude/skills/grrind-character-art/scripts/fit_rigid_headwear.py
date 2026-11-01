"""Fit one rigid GLB headpiece to the existing Quaternius heads, without remeshing."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[4]


def fit(asset, output, work_dir=None):
    if not bpy.app.background:
        raise RuntimeError('Run in background Blender; this creates a dedicated working scene.')
    asset, output = Path(asset).resolve(), Path(output).resolve()
    work_dir = Path(work_dir).resolve() if work_dir else output
    profile = json.loads((asset / 'headwear-fit.json').read_text())
    ratios = profile['size_ratios']
    margins = (profile['below_chin_m'], profile['rear_offset_m'])
    if len(ratios) != 3 or any(not math.isfinite(v) or v <= 0 for v in ratios):
        raise ValueError('size_ratios must contain three finite positive numbers.')
    if any(not math.isfinite(v) or v < 0 for v in margins):
        raise ValueError('Fit margins must be finite and non-negative.')
    if profile['source_front'] not in ('-Y', '+Y'):
        raise ValueError('source_front must be -Y or +Y; inspect the source before fitting.')
    name = profile['asset_name']
    if not name.replace('_', '').isalnum():
        raise ValueError('asset_name must contain only letters, numbers and underscores.')
    tasks = json.loads((asset / 'tasks.json').read_text())
    for path in (asset / 'source.glb', asset / 'source_base_color.png'):
        if not path.is_file():
            raise FileNotFoundError(path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = 'PR_' + name + '_master'
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    bpy.context.preferences.filepaths.save_version = 0

    def collection(label):
        result = bpy.data.collections.new(label)
        scene.collection.children.link(result)
        return result

    def move(obj, target):
        for previous in list(obj.users_collection):
            previous.objects.unlink(obj)
        target.objects.link(obj)

    refs, low, sockets = (collection(label) for label in ('REF', 'LOW', 'SOCKETS'))
    output.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        'units': 'metres', 'authoring_axes': 'Z up, +Y front to match imported Quaternius body rest space',
        'attachment': 'Unity Humanoid Head; FBX baked in body rest space, worldPositionStays',
        'source_task': tasks['task_id'], 'consumed_credits': tasks['consumed_credits'],
        'texture': {'file': 'BaseColor.png', 'color_space': 'sRGB', 'size': 2048},
        'inferred': profile['inferred'], 'variants': {},
    }
    for body in ('Male', 'Female'):
        bpy.ops.import_scene.fbx(filepath=str(ROOT / f'spikes/Unity3D/Assets/Characters/FacialPilot/{body}SportFace_Faceted.fbx'))
        imported = list(bpy.context.selected_objects)
        skin = next(o for o in imported if o.type == 'MESH' and o.name.endswith('_Sport_Skin'))
        rig = next(o for o in imported if o.type == 'ARMATURE')
        head_group = skin.vertex_groups['Head'].index
        points = [skin.matrix_world @ v.co for v in skin.data.vertices
                  if any(g.group == head_group and g.weight > .5 for g in v.groups)]
        head_min = Vector(tuple(min(p[i] for p in points) for i in range(3)))
        head_max = Vector(tuple(max(p[i] for p in points) for i in range(3)))
        head_size = head_max - head_min
        size = Vector(tuple(head_size[i] * ratios[i] for i in range(3)))
        centre = Vector((0, (head_min.y + head_max.y) / 2 - margins[1], head_min.z - margins[0] + size.z / 2))
        for obj in imported:
            obj.name = 'REF_' + body + '_' + obj.name
            move(obj, refs)
            obj.hide_render = True
            obj.hide_set(True)
        socket = bpy.data.objects.new('SOCKET_Head_' + body, None)
        socket.matrix_world = rig.matrix_world @ rig.data.bones['Head'].matrix_local
        sockets.objects.link(socket)
        bpy.ops.import_scene.gltf(filepath=str(asset / 'source.glb'))
        meshes = [o for o in bpy.context.selected_objects if o.type == 'MESH']
        if len(meshes) != 1:
            raise ValueError('Expected one rigid source mesh; prepare separate pieces in Blender first.')
        hood = meshes[0]
        hood.name = 'PR_' + name + '_' + body + '_LOD0'
        topology = [tuple(face.vertices) for face in hood.data.polygons]
        uvs = [[tuple(loop.uv) for loop in layer.data] for layer in hood.data.uv_layers]
        if not uvs:
            raise ValueError('The textured source must have UVs.')
        world = [hood.matrix_world @ v.co for v in hood.data.vertices]
        minimum = Vector(tuple(min(p[i] for p in world) for i in range(3)))
        maximum = Vector(tuple(max(p[i] for p in world) for i in range(3)))
        native_size, native_centre = maximum - minimum, (minimum + maximum) / 2
        if any(not math.isfinite(v) or v <= 0 for v in native_size):
            raise ValueError('Source dimensions must be finite and non-zero.')
        # Imported Quaternius faces +Y. Only a -Y source needs a 180-degree Z rotation.
        direction = -1 if profile['source_front'] == '-Y' else 1
        for vertex, point in zip(hood.data.vertices, world):
            vertex.co = Vector(tuple((point[i] - native_centre[i]) / native_size[i] * size[i]
                                     * (direction if i < 2 else 1) + centre[i] for i in range(3)))
        hood.matrix_world.identity()
        for face in hood.data.polygons:
            face.use_smooth = False
        hood.data.update()
        hood.data.name = hood.name
        assert topology == [tuple(face.vertices) for face in hood.data.polygons], 'Topology changed'
        assert uvs == [[tuple(loop.uv) for loop in layer.data] for layer in hood.data.uv_layers], 'UVs changed'
        move(hood, low)
        triangles = sum(len(face.vertices) - 2 for face in hood.data.polygons)
        bpy.ops.object.select_all(action='DESELECT')
        hood.select_set(True)
        bpy.context.view_layer.objects.active = hood
        bpy.ops.export_scene.fbx(filepath=str(output / (body + '.fbx')), use_selection=True,
                                 bake_anim=False, apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
        manifest['variants'][body] = {'triangles': triangles, 'head_bounds': [list(head_min), list(head_max)],
                                    'dimensions_m': list(size), 'centre_m': list(centre), 'scale': list(hood.scale)}
        hood.hide_set(True)

    shutil.copy2(asset / 'source_base_color.png', output / 'BaseColor.png')
    texture = bpy.data.images.load(str(asset / 'source_base_color.png'), check_existing=True)
    manifest['texture']['size'] = texture.size[0]
    for image in bpy.data.images:
        if image.size[0] and not image.packed_file:
            image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(work_dir / ('PR_' + name + '_master.blend')))
    (work_dir / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (output / 'PROVENANCE.json').write_text(json.dumps({
        'name': profile['display_name'], 'source': profile['source'],
        'task_id': manifest['source_task'], 'credits': manifest['consumed_credits'],
        'license': profile['license'], 'concept': profile['concept'],
        'changes': 'Body-specific affine fit in Blender, flat face shading; topology and UVs preserved',
        'triangles_per_fit': triangles,
        'texture': f'BaseColor.png, sRGB, {texture.size[0]}x{texture.size[1]}',
        'inferred': manifest['inferred'],
    }, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--work-dir', type=Path, help='Master/manifest directory; defaults to output.')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    print(json.dumps(fit(args.asset, args.output, args.work_dir)))
